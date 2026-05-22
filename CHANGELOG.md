# Changelog

All notable changes to this project will be documented in this file.

## [1.11.1] - 2026-05-22

### Fixed
- **🔐 macOS encrypted-credentials path now actually decrypts on Granola 7.255+**: 1.11.0 added the right code paths but two implementation details prevented them from running on real installs. The Keychain lookup was for account `Granola` but the real account is `Granola Key`, so `find-generic-password` silently returned "item not found" and the encrypted path fell back to the plain `stored-accounts.json` — itself a startup-only snapshot, hence the bug stayed hidden for the first ~6h of every Granola session. Once the Keychain lookup worked, decryption still failed because the `.enc` files are not Chromium os_crypt v10 payloads. Granola uses a two-level scheme: `storage.dek` is an os_crypt v10 envelope wrapping a base64-encoded 32-byte DEK, and the `*.json.enc` files are AES-256-GCM (`[12-byte nonce][ciphertext][16-byte tag]`, empty AAD) using that DEK. The plugin now performs both steps correctly, with strict base64-alphabet validation on the wrapped DEK. Reported in [#58](https://github.com/dannymcc/Granola-to-Obsidian/issues/58) and [#61](https://github.com/dannymcc/Granola-to-Obsidian/issues/61).

### Known issues
- **6h JWT staleness after Granola has been running a session**: `stored-accounts.json.enc` is written by Granola only at app startup, so the access token inside expires roughly 6h after the desktop app was launched. After that, the plugin's freshness check correctly identifies all file-based sources as expired and 401s on the next sync. The only continuously-fresh source is `granola.db` (SQLCipher); a reader for that is in active investigation on the `investigate/granola-db` branch and tracked in [#58](https://github.com/dannymcc/Granola-to-Obsidian/issues/58). **Workaround until then**: restart Granola to rewrite the encrypted snapshot with a fresh token.

### Credits
- Huge thanks to [@francescocinori-ops](https://github.com/francescocinori-ops) for the reverse-engineering (wrong Keychain account, two-level format hypothesis, GCM layout arithmetic) and to [@chuckchuck512](https://github.com/chuckchuck512) for independent corroboration plus the catch that the DEK is base64-wrapped inside the v10 envelope. This release shipped because both of you ran patches against real installs and reported back precisely.

## [1.11.0] - 2026-05-21

### Fixed
- **🔐 401s on Granola 7.255+ where the plaintext token file is frozen**: Recent Granola desktop builds stopped refreshing `stored-accounts.json` and now write auth state only to the encrypted `stored-accounts.json.enc` (Electron safeStorage) and `granola.db` (SQLCipher). The plugin was reading the frozen plaintext file, getting an expired JWT, and 401ing on every sync. The credential loader now decodes each candidate token's `exp` claim and picks the freshest source rather than the first parseable one (Fixes [#58](https://github.com/dannymcc/Granola-to-Obsidian/issues/58)).

### Added
- **🔓 macOS: decrypt `stored-accounts.json.enc` via the Keychain**: On macOS, the plugin can now read Granola's encrypted auth store directly. It reads Granola's safeStorage master key from the user's Keychain (you'll see a one-time Keychain Access prompt allowing Obsidian to read the "Granola Safe Storage" item) and decrypts the Chromium os_crypt v10 payload locally. No tokens leave the machine. Linux and Windows users still rely on the plaintext fallbacks for now — open an issue if you're hitting #58-style failures on those platforms.

### Credits
- Thanks to [@francescocinori-ops](https://github.com/francescocinori-ops) for the thorough diagnosis in [#58](https://github.com/dannymcc/Granola-to-Obsidian/issues/58), including the JWT-exp short-circuit analysis and the Chromium os_crypt v10 format reference that made the macOS decryption path straightforward.

## [1.10.0] - 2026-05-16

### Fixed
- **🔐 Credential loader prefers `stored-accounts.json`**: When a stale `supabase.json` was left behind by older Granola versions, the plugin was reading it first and short-circuiting with an expired token, never falling through to the new `stored-accounts.json` written by Granola 7.205+. The lookup order now tries `stored-accounts.json` first and skips paths that resolve to a directory (Fixes [#56](https://github.com/dannymcc/Granola-to-Obsidian/issues/56))
- **🛡️ "Skip existing notes" now actually skips**: Previously, if Granola had updated the source document, the plugin would fall through and overwrite the local file even with this setting enabled — silently destroying manual edits. The setting now truly protects existing notes; only additive frontmatter (attendee tags, attendee backlinks, Granola URL) is refreshed (Fixes [#48](https://github.com/dannymcc/Granola-to-Obsidian/issues/48)). **Behaviour change** for users who relied on `1.9.2`'s "Smart re-sync for updated notes"; if you want re-sync on Granola updates, disable "Skip existing notes".
- **📝 Notes without titles in Granola are no longer synced**: Granola creates the document as soon as a meeting starts, and users often add a title later. The plugin used to write these as `Untitled Granola Note.md` and never rename them. We now skip untitled documents and pick them up on the next sync once they have a title (Fixes [#53](https://github.com/dannymcc/Granola-to-Obsidian/issues/53))
- **📅 Daily-note links use the meeting's date, not the sync date**: A meeting that syncs the day after it took place now links into the correct day's daily/periodic note instead of being added to today's. Thanks to [@georgeguimaraes](https://github.com/georgeguimaraes) in [#44](https://github.com/dannymcc/Granola-to-Obsidian/pull/44)
- **📁 Nested Granola folders sync to nested vault folders**: Walks the `parent_document_list_id` chain so a sub-space syncs to `<syncDir>/Parent/Child/` instead of being flattened at the root. Thanks to [@michaeljauk](https://github.com/michaeljauk) in [#49](https://github.com/dannymcc/Granola-to-Obsidian/pull/49)

### Added
- **🔗 Optional attendee backlinks in frontmatter**: New toggle writes attendees as Obsidian `[[wikilinks]]` in a configurable frontmatter property (default `participants`), so attendees appear in the graph view and backlink panel. Off by default; existing attendee-tag behaviour is unchanged. Thanks to [@phenly](https://github.com/phenly) in [#51](https://github.com/dannymcc/Granola-to-Obsidian/pull/51)
- **⏱️ Toggle for per-speaker transcript timestamps**: New "Include transcript timestamps" setting hides the `(HH:MM:SS)` markers in transcripts for leaner notes / cleaner LLM input. On by default. Thanks to [@jsbirch](https://github.com/jsbirch) in [#50](https://github.com/dannymcc/Granola-to-Obsidian/pull/50)
- **🔒 README "Network use & background activity" section**: Explicit disclosure of the `setInterval` + network behaviour used by auto-sync, in line with the Obsidian community-plugin reviewer recommendation.

### Changed
- **📦 Release assets trimmed to plugin essentials**: Releases now contain only `main.js`, `manifest.json`, and `styles.css`, matching the Obsidian reviewer recommendation. The release-bundled `.zip` and `versions.json` were removed (Obsidian reads `versions.json` from the repo, not from releases).
- **🔏 Release artifacts are signed with GitHub artifact attestations**: `main.js` and `styles.css` now have build provenance attestations; verify with `gh attestation verify main.js --repo dannymcc/Granola-to-Obsidian`.

## [1.9.4] - 2026-05-11
### Fixed
- **🔐 Auth after Granola's encrypted-storage migration**: Granola's late-April / early-May 2026 desktop builds replaced the plaintext `supabase.json` with an encrypted `supabase.json.enc` and moved auth tokens into a new plaintext `stored-accounts.json` file. The plugin now reads tokens from `stored-accounts.json` (macOS, Windows and Linux paths) and parses the new multi-account `accounts[].tokens.access_token` shape. Existing `supabase.json` / `workos_tokens` / `cognito_tokens` paths still work as higher-priority fallbacks for users on older Granola builds (Fixes [#55](https://github.com/dannymcc/Granola-to-Obsidian/issues/55))

### Credits
- Thanks to [@brettjenkins](https://github.com/brettjenkins) for diagnosing the upstream change and implementing the fix in [#54](https://github.com/dannymcc/Granola-to-Obsidian/pull/54)

## [1.9.3] - 2026-02-15
### Changed
- **Plugin ID renamed**: Changed plugin ID from `granola-sync` to `granola-sync-plus` for community plugin catalog submission (existing ID was already taken)
- **Plugin name**: Renamed to "Granola Sync Plus" for catalog listing
- **Funding URL**: Added Buy Me a Coffee link to manifest

## [1.9.2] - 2026-02-12
### Fixed
- **🔧 Obsidian API Compatibility**: Replaced removed `vault.recurseChildren()` API call with `getMarkdownFiles().filter()`, fixing a crash that prevented all sync operations (Fixes [#42](https://github.com/dannymcc/Granola-to-Obsidian/issues/42))
- **📝 My Notes Extraction**: Added fallback to check `doc.content` directly when "My Notes" panel is not found in the panels array, fixing "Include My Notes" not producing any content (Fixes [#33](https://github.com/dannymcc/Granola-to-Obsidian/issues/33))
- **🔄 Smart Re-sync for Updated Notes**: Notes that have been updated in Granola (e.g., re-enhanced with a new template) are now automatically re-synced even when "Skip Existing Notes" is enabled, by comparing `updated_at` timestamps (Fixes [#21](https://github.com/dannymcc/Granola-to-Obsidian/issues/21))

## [1.9.1] - 2026-02-06
### Fixed
- **🔍 Duplicate Detection**: Fixed issue where notes in subfolders weren't found during duplicate detection
  - When using date-based folders or Granola folder organization, notes are now correctly found
  - Prevents duplicate notes being created when filename patterns are changed

### Resolves
- Fixes [#34](https://github.com/dannymcc/Granola-to-Obsidian/issues/34): Duplicated notes after selecting 2 different formats for sync

## [1.9.0] - 2026-02-05
### Added
- **⚙️ Frontmatter Customization**: New settings to fully customize the frontmatter of synced notes
  - **Include Title Toggle**: Option to exclude the `title` field from frontmatter — useful if you prefer the filename as the single source of truth
  - **Include Dates Toggle**: Option to exclude `created_at` and `updated_at` timestamps from frontmatter
  - **Date Format Selection**: Choose between ISO 8601 (full datetime), date-only (YYYY-MM-DD), or a custom format
  - **Custom Date Format**: Define your own date format using YYYY, MM, DD, HH, mm, ss tokens
  - **Additional Frontmatter**: Add custom key-value pairs to every synced note (e.g., `type: meeting`, `status: draft`)

### Resolves
- Fixes [#36](https://github.com/dannymcc/Granola-to-Obsidian/issues/36): Setting to adjust frontmatter (toggle individual fields)
- Fixes [#35](https://github.com/dannymcc/Granola-to-Obsidian/issues/35): Configure properties in synced note
- Fixes [#16](https://github.com/dannymcc/Granola-to-Obsidian/issues/16): Select date formats and property/ies to map to
- Addresses [#14](https://github.com/dannymcc/Granola-to-Obsidian/issues/14): Assign a template to created meeting file (via additional frontmatter)

## [1.8.0] - 2025-12-22
### Added
- **📝 My Notes Support**: New option to include your personal "My Notes" content from Granola under a dedicated "## My Notes" section
- **🤖 Enhanced Notes Control**: New option to control whether AI-generated Enhanced Notes are included (enabled by default)
- **🎯 Folder Filtering**: New feature to selectively sync only notes from specific Granola folders
  - Enable folder filter toggle to activate filtering
  - Refresh folder list from Granola API
  - Select/deselect individual folders with checkboxes
  - "Select All" and "Deselect All" buttons for convenience
- **📋 Note Content Settings**: New organized settings section for controlling what content appears in synced notes

### Fixed
- **🐛 Notes Without Enhanced Notes**: Fixed issue where notes without AI-generated enhanced notes would fail to sync entirely
  - Notes will now sync if they have My Notes, Enhanced Notes, or Transcript content
  - Gracefully handles missing content types instead of failing silently

### Enhanced
- **Transcript Heading**: Changed transcript section heading from "# Transcript" to "## Transcript" for consistent hierarchy
- **API Enhancement**: Now requests additional panel data from Granola API for My Notes support
- **Settings Organization**: Improved settings UI with clear section headings for Note Content, Filename Settings, etc.

### Resolves
- Fixes [#32](https://github.com/dannymcc/Granola-to-Obsidian/issues/32): Notes without enhanced notes fail to export
- Fixes [#31](https://github.com/dannymcc/Granola-to-Obsidian/issues/31): Select folders to sync
- Fixes [#27](https://github.com/dannymcc/Granola-to-Obsidian/issues/27): Include full transcript (setting now properly initialized in defaults)
- Fixes [#17](https://github.com/dannymcc/Granola-to-Obsidian/issues/17): Sync 'My Notes' and 'Enhanced Notes' under different headers

## [1.7.3] - 2025-12-06
### Fixed
- **🗓️ Daily Note Integration**: Fixed daily note detection for custom date formats including day-of-week suffixes (e.g., `YYYY-MM-DD-ddd` producing `2025-12-06-Sat`)
  - Now reads date format and folder settings directly from Obsidian's Daily Notes core plugin
  - Supports all moment.js date format tokens: `YYYY`, `YY`, `MMMM`, `MMM`, `MM`, `M`, `dddd`, `ddd`, `DD`, `D`
  - Falls back to legacy matching for users without Daily Notes plugin enabled
- **🔄 Duplicate Note Prevention**: Fixed issue where duplicate notes were created on every sync
  - Changed `skipExistingNotes` default to `true` for new installations
  - Added secondary `granola_id` check when filename collisions occur to prevent duplicates even when search scope misses the original file

### Resolves
- Fixes [#30](https://github.com/dannymcc/Granola-to-Obsidian/issues/30): Daily Note integration not working with YYYY-MM-DD-ddd date format

## [1.7.2] - 2025-11-28
### Added
- **📜 Historical Notes Sync**: New `syncAllHistoricalNotes` setting to sync all historical notes from Granola, not just recent ones
- **📊 Document Sync Limit**: New `documentSyncLimit` setting to control maximum number of documents synced in a single operation
- **📁 Folder Reorganization**: New command to reorganize existing Granola notes into new folder structures
- **💬 Enhanced Status Updates**: Improved status bar updates with custom message support

### Fixed
- Resolves [#25](https://github.com/dannymcc/Granola-to-Obsidian/issues/25): Not syncing full history of Granola notes
- Resolves [#18](https://github.com/dannymcc/Granola-to-Obsidian/issues/18): Incomplete/Partial Sync

### Contributors
- Special thanks to [@andrewsong-tech](https://github.com/andrewsong-tech) for implementing these features!

## [1.7.1] - 2025-11-16
### Added
- **👥 Contributors Section**: Added contributors section to README to recognize community contributions

### Enhanced
- **Documentation**: Improved documentation for all features

## [1.7.0] - 2025-11-03
### Added
- **🔍 Duplicate Note Detection**: New "Find Duplicate Granola Notes" command to identify and review duplicate syncs
- **🛡️ Smart File Conflict Handling**: New option to either skip or timestamp files when naming conflicts occur
- **🎨 Customizable Filename Separators**: Choose between underscores, dashes, or no separators between words in filenames
- **📁 Granola Folder Organization**: Mirror your Granola folder structure in Obsidian with automatic folder-based tagging
- **🏷️ Folder Tag Templates**: Customize how folder hierarchy becomes tags (e.g., `folder/{name}`)

### Fixed
- Resolves [#16](https://github.com/dannymcc/Granola-to-Obsidian/issues/16): Request for customizable filename separators
- Resolves [#20](https://github.com/dannymcc/Granola-to-Obsidian/issues/20): File conflict handling improvements
- Resolves [#23](https://github.com/dannymcc/Granola-to-Obsidian/issues/23): Granola folder structure support
- Dynamic tag preservation to prevent tag duplication with custom attendee tag prefixes (thanks [@rylanfr](https://github.com/rylanfr))

### Contributors
- Special thanks to [@amscad](https://github.com/amscad) for implementing duplicate detection, file handling improvements, and folder organization features!
- Thanks to [@rylanfr](https://github.com/rylanfr) for the dynamic tag preservation fix!

## [1.6.0]
### Added
- **🗓️ Periodic Notes Integration**: New support for the Periodic Notes plugin alongside existing Daily Notes integration
  - Independent toggle for Periodic Notes integration (can be used with or without Daily Notes)
  - Configurable section heading for Periodic Notes (separate from Daily Notes section)
  - Automatic detection of Periodic Notes plugin availability
  - Settings UI automatically disables when Periodic Notes plugin is not installed
  - Seamlessly integrates with Periodic Notes' daily note creation and management

### Enhanced
- **Dual Integration Support**: Users can now enable Daily Notes, Periodic Notes, both, or neither
- **User Choice**: Flexible integration options to match different Obsidian workflows
- **Backward Compatibility**: All existing Daily Notes functionality preserved unchanged

### Technical
- Added `enablePeriodicNoteIntegration` and `periodicNoteSectionName` settings
- Added `isPeriodicNotesPluginAvailable()` method for plugin detection
- Added `getPeriodicNote()` method for Periodic Notes API integration
- Added `updatePeriodicNote()` method mirroring Daily Notes functionality
- Enhanced sync logic to support both integrations independently
- All changes maintain 100% backward compatibility with existing settings and workflows

### Fixes Issue
- Resolves [#6](https://github.com/dannymcc/Granola-to-Obsidian/issues/6): Request for Periodic Notes plugin support

## [1.5.2]
### Fixed
- **Settings UI**: Fixed JavaScript errors that prevented all settings from displaying
- **Heading Syntax**: Corrected `setHeading()` calls to use proper `createEl()` syntax
- **Sync Functionality**: Resolved sync issues caused by cached JavaScript errors
- **Console Output**: Cleaned up debug logs for cleaner production experience

### Technical
- Fixed `containerEl.createEl().setHeading()` runtime errors
- Restored all 19 settings to be properly displayed and functional
- Improved error handling and reduced verbose logging

## [1.5.1]
### Fixed
- **Platform Support**: Added proper Linux authentication path support (`~/.config/Granola/supabase.json`)
- **Modern Obsidian APIs**: Replaced deprecated APIs with current best practices
  - Use `Platform` instead of Node.js `os` module
  - Use `window.setTimeout`/`window.setInterval` instead of global versions
  - Use `Vault.process` instead of `Vault.modify` for background file operations
  - Use `Vault.getFolderByPath` instead of `getAbstractFileByPath`
  - Use `Vault.recurseChildren` for recursive folder operations
  - Use `Vault.getAllFolders` for folder enumeration
  - Use `FileManager.processFrontMatter` for atomic frontmatter updates
  - Use `MetadataCache.getFileCache` instead of regex for heading detection
- **UI Consistency**: Converted all UI text to sentence case per Obsidian guidelines
- **Settings Improvements**: 
  - Use `setHeading()` instead of HTML heading elements
  - Remove hardcoded CSS styling
  - Remove top-level settings heading
  - Remove ribbon icon toggle (users can customize via Obsidian settings)
- **Code Quality**: 
  - Reduced unnecessary console logging while preserving essential error messages
  - Improved error handling and performance
- **Version Requirements**: Updated minAppVersion to 1.6.6 to support modern APIs

### Technical
- All changes maintain backward compatibility for user data and settings
- No breaking changes to plugin functionality or user experience
- Addresses all Obsidian plugin review feedback for official plugin store inclusion

## [1.5.0]
### Added
- **🧪 Experimental: Search Scope for Existing Notes**: Control where the plugin searches for existing notes when checking for duplicates by granola-id
- **Flexible Search Options**: Choose between "Sync Directory Only" (default), "Entire Vault", or "Specific Folders"
- **Duplicate Prevention Tools**: Added "Find Duplicate Notes" button to scan for and identify existing duplicates
- **Auto-Sync Safety**: New "Re-enable Auto-Sync" button to safely restart auto-sync after testing new settings
- **Enhanced Settings Safety**: Search scope settings now save without triggering auto-sync to prevent accidental duplicates

### Enhanced
- **Experimental Features Section**: Clear UI separation for experimental features with backup warnings
- **User Safety**: Prominent warnings about backing up vault before using experimental features
- **Duplicate Management**: Added comprehensive duplicate detection and management tools
- **Error Prevention**: Auto-sync temporarily disabled when changing search scope settings

### Technical
- **Recursive Folder Search**: Added support for searching all markdown files within specified folders and subfolders
- **Safe Settings Management**: New `saveSettingsWithoutSync()` method to prevent unwanted auto-sync triggers
- **Validation Improvements**: Enhanced folder path validation with user-friendly error messages
- **Search Scope Flexibility**: Infrastructure for different search strategies based on user needs

## [1.4.0]
### Added
- **Customizable Attendee Tag Structure**: New setting to customize how attendee tags are formatted and organized
- **Tag Template System**: Use `{name}` placeholder to create custom tag hierarchies (e.g., `people/{name}`, `meeting-attendees/{name}`)
- **Flexible Tag Organization**: Allows users to control their tag hierarchy and reduce root-level tag clutter in Obsidian

### Enhanced
- **Attendee Tag Generation**: Now uses customizable templates instead of hardcoded `person/` prefix
- **Tag Validation**: Automatic cleanup of invalid tag structures (double slashes, leading/trailing slashes)
- **Settings UI**: Added new "Attendee Tag Template" setting with helpful examples and validation

## [1.3.2]
### Fixed
- **Nested bullet preservation**: Fixed issue where sub-bullets from Granola were being flattened instead of maintaining proper indentation in Obsidian
- **List structure**: Improved ProseMirror to Markdown conversion to properly handle nested bullet lists with correct indentation
- **Bullet formatting**: Sub-bullets now display with proper 2-space indentation per nesting level

## [1.3.1]
### Fixed
- **Granola URL format**: Fixed incorrect URL format from `https://app.granola.ai/documents/{id}` to correct `https://notes.granola.ai/d/{id}`
- Updated documentation examples to reflect correct URL format

## [1.3.0]
### Added
- **Granola URL integration**: Add links back to original Granola notes in frontmatter (`granola_url`)
- **Enhanced attendee extraction**: Improved name resolution using detailed person data from Granola API
- **Multi-folder infrastructure**: Code infrastructure ready for when Granola API includes folder information
- **Organized settings UI**: Grouped related settings into clear sections (Metadata & Tags, Daily Note Integration, etc.)
- **Better deduplication**: Prevents duplicate attendees from multiple sources (people array + calendar events)

### Enhanced
- **Attendee name detection**: Now uses `fullName`, `givenName`, `familyName` fields for more accurate names
- **Settings organization**: Related settings grouped under clear headings for better UX
- **Metadata management**: Unified handling of tags, URLs, and other frontmatter data
- **Console output**: Cleaner debug information with better organization

### Technical
- **Future-ready folder support**: All infrastructure in place for multi-folder tagging when API supports it
- **Improved email tracking**: Prevents processing same attendee multiple times across different data sources
- **Enhanced error handling**: Better error messages and graceful fallbacks
- **Code organization**: Cleaner separation of concerns and modular design

## [1.2.2]
### Fixed
- **Critical bug**: Fixed issue where meetings with duplicate titles (e.g., recurring "Enterprise Team | Project Update") were being skipped instead of created with unique filenames
- Daily note integration now works correctly for meetings that would have been skipped due to filename collisions
- Added timestamp-based unique filename generation when title conflicts occur

## [1.2.1]
### Fixed
- **Critical bug**: Fixed daily note integration using hardcoded date instead of current date
- Daily note meetings now correctly appear in today's note instead of a previous date
- Enhanced daily note detection to work with multiple date formats (DD-MM-YYYY, YYYY-MM-DD, etc.)

## [1.2.0]
### Added
- **Attendee tagging system**: Automatically extract meeting attendees and add them as tags in note frontmatter
- **Smart name filtering**: Exclude your own name from attendee tags with configurable settings
- **Organised tag structure**: Uses `person/` prefix for clean tag organisation (e.g. `person/john-smith`)
- **Existing note updates**: Updates attendee tags in existing notes while preserving manual edits when enabled
- **Conservative defaults**: Attendee tagging disabled by default to avoid disrupting existing workflows

### Changed
- Enhanced settings UI with attendee tagging configuration options
- Improved case-insensitive name matching for more reliable filtering

## [1.1.2]
### Fixed
- Completely resolved daily note integration issues by implementing a robust file search-based approach
- Daily note integration now works regardless of complex Daily Notes plugin configurations
- Meetings from today are now properly added to the daily note section as expected

## [1.1.1]
### Fixed
- Resolved "File already exists" error by adding proper file name conflict detection
- Fixed daily note integration to work with hierarchical folder structures (e.g. Notes/Daily/YYYY/MM)
- Enhanced daily note detection with better logging and error handling
- Improved folder creation for date-based daily note structures

## [1.1.0]
### Added
- Customisable daily note section name setting - users can now customise the heading used for Granola meetings in their Daily Note

## [1.0.9]
### Changed
- New version number bump to adpot new versioning

## [1.0.8]
### Fixed
- Updated version numbering to use simple X.X.X format for Obsidian compatibility
- Fixed manifest.json to remove "v" prefix from version numbers

### Changed
- GitHub releases now use clean version tags (e.g., 1.0.8) instead of v-prefixed tags

## [1.0.7]
### Added
- Daily Note integration feature
- Skip existing notes option

### Fixed
- Improved error handling for sync operations

## [1.0.6]
### Added
- Custom filename templates with variables
- Better date formatting options

### Fixed
- Status bar updates during sync operations

## [1.0.5]
### Fixed
- Authentication path detection improvements
- Better error messages for sync failures

## [1.0.4]
### Added
- Auto-sync frequency options
- Status bar integration

### Fixed
- File naming edge cases

## [1.0.3]
### Fixed
- Content conversion improvements
- Better handling of missing data

## [1.0.2]
### Added
- Customizable sync directory
- Note prefix options

### Fixed
- Frontmatter formatting improvements

## [1.0.1]
### Fixed
- Initial bug fixes and stability improvements

## [1.0.0]
### Added
- Initial release of Granola Sync plugin
- Basic sync functionality for Granola AI notes
- Automatic content conversion from ProseMirror to Markdown
- Frontmatter with metadata support 