# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Granola Sync for Obsidian** is an Obsidian plugin that automatically syncs meeting notes from Granola AI to an Obsidian vault. It's a standalone Obsidian plugin (not a bundled/compiled project) delivered as three main files: `main.js`, `manifest.json`, and `styles.css`.

- **Type**: Obsidian plugin
- **Language**: JavaScript (Node.js)
- **Size**: `main.js` is ~2000 lines; all code in a single file
- **Version**: Currently 1.6.3
- **Minimum Obsidian Version**: 1.6.6

## Architecture & Structure

### Single-File Architecture
All plugin code lives in `main.js` (1994 lines) with two main classes:

1. **`GranolaSyncPlugin`** (extends `obsidian.Plugin`)
   - Main plugin class handling lifecycle, initialization, and sync orchestration
   - **Key methods**:
     - `onload()` - Plugin initialization, ribbon icon, settings tab
     - `syncNotes()` - Main sync orchestration loop (fetches documents, processes them, updates daily notes)
     - `loadCredentials()` - Reads Granola auth token from local filesystem
     - `fetchGranolaDocuments(token)` - API call to get meeting notes list
     - `fetchTranscript(token, docId)` - Optional transcript fetching
     - `processDocument(doc)` - Converts Granola document to Obsidian note with markdown
     - `updateDailyNote()` / `updatePeriodicNote()` - Integrates today's meetings into daily notes
     - Auto-sync setup and interval management

2. **`GranolaSyncSettingTab`** (extends `obsidian.PluginSettingTab`)
   - Settings UI panel with 25+ configurable options
   - **Key settings**:
     - `syncDirectory` - Where to save notes (default: "Granola")
     - `filenameTemplate` - Customizable note naming with tokens like `{title}`, `{created_date}`
     - `dateFormat` - Date formatting (YYYY-MM-DD, DD-MM-YYYY, etc.)
     - `autoSyncFrequency` - Auto-sync interval in milliseconds
     - `includeAttendeeTags` - Tag notes with meeting attendees
     - `skipExistingNotes` - Preserve manual edits in existing notes
     - `enableGranolaFolders` - Organize by Granola folder structure
     - `existingNoteSearchScope` - Search strategy for finding duplicates (sync dir, entire vault, or specific folders)

### Key Integration Points

**Granola API Integration**:
- Reads auth token from local Granola app (`~/Library/Application Support/Granola/supabase.json` on macOS)
- Makes authenticated API calls to fetch documents, transcripts, and folders
- Handles token formats: legacy supabase tokens and newer `workos_tokens` structure

**Obsidian Integration**:
- Uses Obsidian's Plugin API for file management, settings, status bar, commands
- Detects and integrates with Daily Notes and Periodic Notes plugins
- Converts Granola's ProseMirror format to markdown
- Frontmatter includes: `granola_id` (for duplicate detection), `created_at`, `updated_at`, `tags`, `granola_url`

**ProseMirror Conversion**:
- `proseMirrorToMarkdown()` converts Granola's rich editor format to markdown
- Handles headings, lists, bold, italic, links, code blocks, blockquotes

### Document Processing Flow

```
fetchGranolaDocuments() → [documents]
  ↓
for each document:
  → fetchTranscript() if enabled
  → processDocument()
    → proseMirrorToMarkdown() [content conversion]
    → generateFilename() [template + date formatting]
    → createOrUpdateNote() [file I/O]
    → extractAttendees() + apply tags [if enabled]
    → apply folder tags [if enabled]
  ↓
if enableDailyNoteIntegration:
  → updateDailyNote() [append today's meetings]
if enablePeriodicNoteIntegration:
  → updatePeriodicNote() [via Periodic Notes plugin]
```

## Development Commands & Building

**No build process**: This is not a bundled project. The plugin is delivered as raw JavaScript files that Obsidian loads directly.

**Files to distribute**:
- `main.js` - All plugin code (no transpilation)
- `manifest.json` - Plugin metadata
- `styles.css` - Plugin UI styles
- `versions.json` - Version history for Obsidian's plugin browser

## Release & Versioning Process

**Important**: This project has a strict, automated release workflow. See `.claude_rules` for full details.

### Version Management
- **Format**: Semantic versioning without "v" prefix (e.g., `1.6.3`)
- Update both `manifest.json` and `versions.json` when bumping versions
- Version badge in `readme.md` is auto-updated by CI/CD

### Release Workflow (Automated via GitHub Actions)
1. Create a git tag with **only the version number** (no "v" prefix): `git tag 1.6.3`
2. Push the tag: `git push origin 1.6.3`
3. GitHub Actions workflow (`release.yml`) automatically:
   - Updates `manifest.json` version
   - Updates `readme.md` version badge
   - Creates a GitHub release with properly formatted notes
   - Attaches plugin files as individual assets
4. **Never manually upload release assets** - the workflow does this

### Obsidian Plugin Requirements
- Release tag must **exactly match** the version in `manifest.json`
- Plugin files must be available as individual assets (not just in archives)
- The zip file created by Actions is optional but helpful for users

## Settings & Configuration

The plugin has 25+ configurable settings stored in the plugin's data file. Key settings to understand:

- **Filename Templates**: Variables like `{title}`, `{created_date}`, `{updated_datetime}` are substituted
- **Date Formats**: Custom tokens (YYYY, MM, DD, HH, mm, ss) allow flexible date output
- **Search Scope**: When checking for duplicate notes, can search: sync directory only (fast), entire vault (slow), or specific folders
- **Attendee Tags**: Automatically extracts meeting attendees and creates tags like `person/john-smith` (configurable prefix)
- **Skip Existing Notes**: Uses `granola_id` frontmatter field to identify notes - safe to rename/move files as long as ID is preserved

## Common Development Tasks

### Adding a New Setting
1. Add to `DEFAULT_SETTINGS` object (~line 16)
2. Add UI control in `GranolaSyncSettingTab` constructor
3. Reference via `this.plugin.settings.yourNewSetting`
4. Call `await this.plugin.saveSettings()` to persist

### Modifying Note Format/Frontmatter
- Edit `processDocument()` method where frontmatter is built
- Example: `granola_id`, `created_at`, `updated_at`, `tags` are set here
- The frontmatter is YAML format between `---` delimiters at the top of the file

### Adding New API Integration
1. Get auth token via `loadCredentials()`
2. Make fetch requests to Granola API endpoints
3. Follow the pattern in `fetchGranolaDocuments()`, `fetchGranolaFolders()`, `fetchTranscript()`

### Debugging
- Check Obsidian console: `Cmd/Ctrl + Shift + I` → Console tab
- Status bar shows sync state (bottom right: "Granola Sync: Idle/Syncing/Error")
- Errors are logged to browser console and displayed as notices
- Auth path issues are common - check the path settings when sync fails

## Important Implementation Details

### Async/Await Pattern
All I/O operations (file, API, filesystem) are async. Always await and use try-catch:
```javascript
try {
  const token = await this.loadCredentials();
  const docs = await this.fetchGranolaDocuments(token);
} catch (error) {
  console.error('Error:', error);
}
```

### File Path Handling
- Uses Node.js `path` module (available in Obsidian via CommonJS)
- Relative paths are vault-relative (e.g., `Granola/note.md`)
- Absolute paths are OS-dependent for auth file location
- Always use `path.resolve()` for OS-agnostic path handling

### Status Bar Updates
Call `this.updateStatusBar(status, count)` with:
- `'Idle'` - Ready state
- `'Syncing'` - In progress
- `'Complete'` - Success with note count
- `'Error'` - Failure with error message

### Duplicate Detection Strategy
- Primary method: Check `granola_id` in frontmatter of existing notes
- Search scope configurable: sync dir only, entire vault, or specific folders
- Prevents creating duplicate notes when syncing same document twice
- Preserves file renames as long as `granola_id` is unchanged

## Testing the Plugin

1. **Manual testing in Obsidian**:
   - Copy `main.js`, `manifest.json`, `styles.css` to `.obsidian/plugins/granola-sync/`
   - Restart Obsidian or reload plugin (Cmd+Shift+I → reload)
   - Check settings and trigger manual sync

2. **Common test scenarios**:
   - First sync with empty vault
   - Syncing after adding a new Granola note
   - Re-syncing same notes (should skip if `skipExistingNotes` enabled)
   - Testing attendee tagging
   - Testing daily note integration

## Key Files Reference

| File | Purpose |
|------|---------|
| `main.js` | All plugin code (1994 lines) |
| `manifest.json` | Plugin metadata, version, Obsidian compatibility |
| `styles.css` | Plugin UI styles |
| `versions.json` | Version history for Obsidian plugin browser |
| `readme.md` | User documentation and feature descriptions |
| `CHANGELOG.md` | Detailed release notes |
| `.claude_rules` | Release workflow and version management rules |
| `.github/workflows/release.yml` | Automated release CI/CD pipeline |

## Related Plugin Dependencies

The plugin integrates with (but doesn't require):
- **Daily Notes plugin** - Core Obsidian plugin for daily note integration
- **Periodic Notes plugin** - Community plugin for flexible daily note management

Check for plugin availability before calling their APIs (plugin manager).
