#!/usr/bin/env node
// One-shot investigation script for the Granola SQLCipher path (issue #58).
//
// Read-only — copies granola.db + wal/shm to a tmp dir before opening anything.
// Output is redaction-safe (no tokens, no secrets, no DEK bytes) and intended
// to be pasted straight back into the GitHub issue.
//
// Usage:
//   brew install sqlcipher           # one-time
//   node scripts/investigate-granola-db.js
//
// You will get one or more macOS Keychain prompts (one per attempt at reading
// the Granola Safe Storage item). "Always Allow" makes future runs silent.

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFileSync, spawnSync } = require('child_process');

const GRANOLA_DIR = path.resolve(os.homedir(), 'Library/Application Support/Granola');

const log = {
	section: (s) => console.log('\n=== ' + s + ' ==='),
	ok:      (s) => console.log('  [ok] ' + s),
	info:    (s) => console.log('  [..] ' + s),
	bad:     (s) => console.log('  [!!] ' + s),
};

function redactBytes(buf) {
	if (!buf) return '(null)';
	const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
	const hex = b.toString('hex');
	if (hex.length <= 8) return '(' + b.length + ' bytes)';
	return hex.slice(0, 4) + '…' + hex.slice(-4) + ' (' + b.length + ' bytes)';
}

function runSqlcipher(dbPath, sql) {
	return spawnSync('sqlcipher', ['-batch', dbPath], { input: sql, encoding: 'utf8' });
}

// --- 0. environment --------------------------------------------------------
log.section('Environment');
log.info('Platform: ' + process.platform + ' ' + os.release());
log.info('Granola dir: ' + GRANOLA_DIR);
if (!fs.existsSync(GRANOLA_DIR)) {
	log.bad('Granola directory not found — script requires macOS + Granola installed');
	process.exit(1);
}

const interesting = fs.readdirSync(GRANOLA_DIR)
	.filter(f => f.endsWith('.enc') || f === 'storage.dek' || f.startsWith('granola.db'));
log.info('Files of interest:');
for (const f of interesting) {
	const st = fs.statSync(path.join(GRANOLA_DIR, f));
	console.log('    - ' + f.padEnd(30) + st.size.toString().padStart(8) + ' bytes  mtime ' + st.mtime.toISOString());
}

// First 16 bytes of granola.db: plain SQLite starts with "SQLite format 3\0",
// SQLCipher-encrypted dbs have random bytes here (full-file encryption incl header).
const dbPath = path.join(GRANOLA_DIR, 'granola.db');
if (fs.existsSync(dbPath)) {
	const head = fs.readFileSync(dbPath).slice(0, 16);
	const headStr = head.toString('utf8').replace(/[^\x20-\x7e]/g, '.');
	log.info('granola.db first 16 bytes (printable): "' + headStr + '"');
	log.info('  ' + (headStr.startsWith('SQLite format 3') ? '→ looks UNENCRYPTED' : '→ looks encrypted (random header)'));
}

// --- 1. enumerate Keychain items under "Granola*" --------------------------
log.section('Keychain items under known "Granola*" service names');
log.info('Attribute-only probe (no password prompts at this stage).');

// `security find-generic-password -s <svc>` without -w prints attributes only.
// Probing common variants so we catch any account/service we haven't seen.
const PROBE_SERVICES = [
	'Granola Safe Storage',
	'Granola',
	'Granola App',
	'Granola Key',
	'Granola DB',
	'Granola Database',
	'com.granola.app',
];
const foundItems = [];
for (const svc of PROBE_SERVICES) {
	const out = spawnSync('/usr/bin/security', ['find-generic-password', '-s', svc], { encoding: 'utf8' });
	if (out.status === 0) {
		const acct = (out.stdout.match(/"acct"<blob>="([^"]*)"/) || [])[1] || '(unknown)';
		const realSvc = (out.stdout.match(/"svce"<blob>="([^"]*)"/) || [])[1] || svc;
		foundItems.push({ service: realSvc, account: acct });
		log.ok('service="' + realSvc + '"  account="' + acct + '"');
	}
}
if (foundItems.length === 0) {
	log.bad('No items matched. As a fallback, run this and paste output:');
	log.bad('  security dump-keychain login.keychain 2>/dev/null | grep -i -B1 granola');
}

// --- 2. derive the DEK from storage.dek -----------------------------------
log.section('Step 2: derive 32-byte DEK from storage.dek');

function readKeychainPassword(service, account) {
	try {
		const args = ['find-generic-password', '-s', service];
		if (account && account !== '(unknown)') args.push('-a', account);
		args.push('-w');
		return execFileSync('/usr/bin/security', args, { encoding: 'utf8', timeout: 30000 }).replace(/\n$/, '');
	} catch (e) { return null; }
}

function decryptOsCryptV10(ciphertext, password) {
	if (ciphertext.length <= 3 || ciphertext.slice(0, 3).toString() !== 'v10') {
		throw new Error('not a v10 payload (first 3 bytes: ' + ciphertext.slice(0, 3).toString('hex') + ')');
	}
	const key = crypto.pbkdf2Sync(password, 'saltysalt', 1003, 16, 'sha1');
	const iv = Buffer.alloc(16, 0x20);
	const dec = crypto.createDecipheriv('aes-128-cbc', key, iv);
	return Buffer.concat([dec.update(ciphertext.slice(3)), dec.final()]);
}

const dekPath = path.join(GRANOLA_DIR, 'storage.dek');
if (!fs.existsSync(dekPath)) {
	log.bad('storage.dek not found — cannot proceed');
	process.exit(2);
}
const storageDek = fs.readFileSync(dekPath);
log.info('storage.dek size: ' + storageDek.length + ' bytes  first3: ' + storageDek.slice(0, 3).toString());

let dek = null;
let dekSourceMaster = null;
const masterCandidates = foundItems.length > 0 ? foundItems : [{ service: 'Granola Safe Storage', account: 'Granola Key' }];
for (const m of masterCandidates) {
	log.info('Trying master: service="' + m.service + '" account="' + m.account + '"');
	const pw = readKeychainPassword(m.service, m.account);
	if (!pw) { log.bad('  (no password returned — user denied or item not found)'); continue; }
	try {
		const candidate = decryptOsCryptV10(storageDek, pw);
		if (candidate.length === 32) {
			log.ok('  → 32-byte DEK derived ' + redactBytes(candidate));
			dek = candidate;
			dekSourceMaster = { ...m, password: pw };
			break;
		}
		log.bad('  → decrypted to ' + candidate.length + ' bytes (not 32); wrong master?');
	} catch (e) { log.bad('  → ' + e.message); }
}
if (!dek) {
	log.bad('Could not derive DEK. Stop here, paste this output, and we will iterate.');
	process.exit(3);
}

// --- 3. sanity-check DEK against stored-accounts.json.enc -----------------
log.section('Step 3: sanity-check DEK against stored-accounts.json.enc');
const encPath = path.join(GRANOLA_DIR, 'stored-accounts.json.enc');
if (fs.existsSync(encPath)) {
	const ct = fs.readFileSync(encPath);
	try {
		const nonce = ct.slice(0, 12);
		const tag = ct.slice(-16);
		const body = ct.slice(12, ct.length - 16);
		const dec = crypto.createDecipheriv('aes-256-gcm', dek, nonce);
		dec.setAuthTag(tag);
		const plain = Buffer.concat([dec.update(body), dec.final()]).toString('utf8');
		const parsed = JSON.parse(plain);
		log.ok('GCM decrypt OK. Top-level keys: ' + Object.keys(parsed).join(', '));
		if (parsed.workos_tokens) log.ok('  workos_tokens present');
		if (parsed.accounts)      log.ok('  accounts[] present (length=' + (Array.isArray(parsed.accounts) ? parsed.accounts.length : '?') + ')');
	} catch (e) {
		log.bad('GCM decrypt failed: ' + e.message);
		log.bad('  → empty-AAD assumption is likely wrong, OR layout differs from [nonce|ct|tag]');
	}
} else {
	log.info('No stored-accounts.json.enc to sanity-check against (skipping).');
}

// --- 4. probe SQLCipher with candidate keys -------------------------------
log.section('Step 4: probe SQLCipher key derivations against granola.db');

const which = spawnSync('/usr/bin/which', ['sqlcipher'], { encoding: 'utf8' });
if (which.status !== 0 || !which.stdout.trim()) {
	log.bad('`sqlcipher` not on PATH. Install with:  brew install sqlcipher');
	log.bad('Then re-run this script.');
	process.exit(4);
}
log.ok('sqlcipher: ' + which.stdout.trim());

// Snapshot the live db so we never touch what Granola is writing to.
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'granola-investigate-'));
const tmpDb = path.join(tmpDir, 'granola.db');
let copied = [];
for (const suffix of ['', '-wal', '-shm']) {
	const src = path.join(GRANOLA_DIR, 'granola.db' + suffix);
	if (fs.existsSync(src)) { fs.copyFileSync(src, tmpDb + suffix); copied.push('granola.db' + suffix); }
}
log.info('Snapshotted to ' + tmpDir + ' (' + copied.join(', ') + ')');

const dekHex = dek.toString('hex');
const dekB64 = dek.toString('base64');
const candidateKeys = [
	{ label: 'raw DEK as hex (PRAGMA key = "x\'…\'")',  pragma: 'PRAGMA key = "x\'' + dekHex + '\'";' },
	{ label: 'DEK as base64 passphrase',                 pragma: "PRAGMA key = '" + dekB64.replace(/'/g, "''") + "';" },
	{ label: 'Keychain master as passphrase',            pragma: "PRAGMA key = '" + dekSourceMaster.password.replace(/'/g, "''") + "';" },
];

let unlockedWith = null;
for (const c of candidateKeys) {
	log.info('Trying: ' + c.label);
	const out = runSqlcipher(tmpDb, c.pragma + ' SELECT count(*) FROM sqlite_master;');
	const stderr = (out.stderr || '').trim();
	const stdout = (out.stdout || '').trim();
	if (out.status === 0 && /^\d+$/.test(stdout) && !stderr) {
		log.ok('  → unlocked!  sqlite_master count = ' + stdout);
		unlockedWith = c;
		break;
	}
	log.bad('  → failed: ' + (stderr || stdout || '(no output)').slice(0, 180));
}

if (!unlockedWith) {
	log.bad('No candidate key unlocked the DB. We need more derivations. Paste output and we will iterate.');
	fs.rmSync(tmpDir, { recursive: true, force: true });
	process.exit(5);
}

// --- 5. cipher params + schema --------------------------------------------
log.section('Step 5: cipher params + schema');
const paramsOut = runSqlcipher(tmpDb, unlockedWith.pragma + [
	'PRAGMA cipher_version;',
	'PRAGMA cipher_provider;',
	'PRAGMA cipher_page_size;',
	'PRAGMA kdf_iter;',
	'PRAGMA cipher_kdf_algorithm;',
	'PRAGMA cipher_hmac_algorithm;',
].join(' '));
console.log(paramsOut.stdout);

const schemaOut = runSqlcipher(tmpDb, unlockedWith.pragma + '.schema');
console.log('-- .schema --');
console.log(schemaOut.stdout);

// --- 6. hunt for tokens ---------------------------------------------------
log.section('Step 6: locate access_token in the schema');

const tablesOut = runSqlcipher(tmpDb, unlockedWith.pragma + "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;");
const tables = tablesOut.stdout.split('\n').map(s => s.trim()).filter(Boolean);
log.info('Tables: ' + tables.join(', '));

for (const t of tables) {
	const ti = runSqlcipher(tmpDb, unlockedWith.pragma + 'PRAGMA table_info(' + JSON.stringify(t) + ');');
	const cols = ti.stdout.split('\n').map(s => s.split('|')[1]).filter(Boolean);
	const hot = cols.filter(c => /token|auth|cred|session|account|workos|jwt/i.test(c));
	if (hot.length) log.ok('  ' + t + '  cols=[' + cols.join(', ') + ']  hot=[' + hot.join(', ') + ']');
}

log.info('\nValue-level scan (counts only, no values printed):');
for (const t of tables) {
	const ti = runSqlcipher(tmpDb, unlockedWith.pragma + 'PRAGMA table_info(' + JSON.stringify(t) + ');');
	const cols = ti.stdout.split('\n').map(s => s.split('|')[1]).filter(Boolean);
	for (const c of cols) {
		const q = unlockedWith.pragma +
			'SELECT ' +
			'sum(CASE WHEN "' + c + '" LIKE \'eyJ%\' THEN 1 ELSE 0 END), ' +
			'sum(CASE WHEN "' + c + '" LIKE \'%access_token%\' THEN 1 ELSE 0 END), ' +
			'sum(CASE WHEN "' + c + '" LIKE \'%refresh_token%\' THEN 1 ELSE 0 END) ' +
			'FROM "' + t + '";';
		const out = runSqlcipher(tmpDb, q);
		const m = (out.stdout || '').trim().split('|').map(s => parseInt(s, 10) || 0);
		if (m.length === 3 && (m[0] + m[1] + m[2]) > 0) {
			log.ok('  ' + t + '.' + c + '  jwt=' + m[0] + '  access_token=' + m[1] + '  refresh_token=' + m[2]);
		}
	}
}

fs.rmSync(tmpDir, { recursive: true, force: true });
console.log('\nDone. Paste the above output in the issue — no tokens or secrets are printed.');
