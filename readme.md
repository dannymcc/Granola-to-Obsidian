# Granola Sync Plus for Obsidian

[!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://buymeacoffee.com/d3hkz6gwle)


An Obsidian plugin that automatically syncs your [Granola AI](https://granola.ai) meeting notes to your Obsidian vault with full customization options and real-time status updates.

![Granola Sync Plugin](https://img.shields.io/badge/Obsidian-Plugin-purple) ![Version](https://img.shields.io/badge/version-1.11.0-blue) ![License](https://img.shields.io/badge/license-MIT-green)

![Granola Sync](https://i.imgur.com/EmFRYTO.png)

> **Note:** This plugin was recently renamed from "Granola Sync" to "Granola Sync Plus" and the plugin ID changed from `granola-sync` to `granola-sync-plus` as part of our submission to the [Obsidian Community Plugin catalog](https://github.com/obsidianmd/obsidian-releases/pull/10254). If you previously installed the plugin manually, you'll need to rename your `.obsidian/plugins/granola-sync/` folder to `.obsidian/plugins/granola-sync-plus/` and restart Obsidian.

## 🚀 Features

- **🔄 Automatic Sync**: Configurable auto-sync from every minute to daily, or manual-only
- **📊 Status Bar Integration**: Real-time sync status in the bottom right corner (no more popup spam!)
- **📅 Custom Date Formats**: Support for multiple date formats (YYYY-MM-DD, DD-MM-YYYY, etc.)
- **📝 Flexible Filename Templates**: Customize how notes are named with variables like date, time, and title
- **📁 Custom Directory**: Choose where in your vault to sync notes
- **🏷️ Note Prefixes**: Add custom prefixes to all synced notes
- **🔧 Custom Auth Path**: Override the default Granola credentials location
- **🗓️ Daily Note Integration**: Automatically add today's meetings to your Daily Note with times and links
- **📅 Periodic Notes Support**: Full integration with the Periodic Notes plugin for flexible daily note management
- **🏷️ Attendee Tagging**: Automatically extract meeting attendees and add them as organized tags (e.g., `person/john-smith`)
- **🔗 Attendee Backlinks**: Optionally write attendees as Obsidian wikilinks (e.g., `[[Eddie Brock]]`) in a configurable frontmatter property
- **🔗 Granola URL Links**: Add direct links back to original Granola notes in frontmatter for easy access
- **🔧 Smart Filtering**: Exclude your own name from attendee tags with configurable settings
- **🛡️ Preserve Manual Additions**: Option to skip updating existing notes, preserving your tags, summaries, and custom properties
- **✨ Rich Metadata**: Includes frontmatter with creation/update dates and Granola IDs
- **📋 Content Conversion**: Converts ProseMirror content to clean Markdown
- **🔄 Update Handling**: Intelligently updates existing notes instead of creating duplicates
- **🔍 Duplicate Detection**: Find and review duplicate notes with the "Find Duplicate Granola Notes" command
- **⚙️ Customizable Filename Separators**: Choose how words are separated in filenames (underscore, dash, or no separator)
- **🛡️ Smart File Conflict Handling**: Skip duplicate filenames or create timestamped versions automatically
- **📁 Granola Folder Organization**: Mirror your Granola folder structure in Obsidian with automatic folder-based tagging

## 🔒 Network use & background activity

This plugin reads your Granola notes from the official Granola API. You should know exactly what it does on the network and when:

- **Hosts contacted**: only `api.granola.ai`. No telemetry, analytics, error reporting, or third-party services. The plugin has no other network code paths.
- **What is sent**: standard Granola API requests using the access token from your local Granola install (the same token Granola itself uses). Nothing is sent to any other host.
- **What triggers a request**: a manual sync (ribbon icon / command palette), or — if you opt in — an **Auto-sync** timer. Auto-sync uses `setInterval` at the frequency you choose in settings, and each tick makes the same set of Granola API calls a manual sync would.
- **Turning background activity off**: set **Settings → Granola Sync Plus → Auto-sync frequency** to **Disabled**. The interval is cleared immediately and the plugin only contacts Granola when you ask it to.

The plugin is also marked `isDesktopOnly` and reads credentials from your local Granola install — it does not work without Granola installed on the same machine.

## 📁 Permissions & filesystem access

The plugin is marked `isDesktopOnly` because it needs to read Granola's auth token from your operating system, which the mobile sandbox doesn't allow. This section spells out exactly what it does on disk and why.

### Files read outside the vault (read-only, never written)

The plugin uses the Node.js `fs` module to read **one** file outside the vault — Granola's local credentials file — checked at one of these paths depending on your OS:

- **macOS**: `~/Library/Application Support/Granola/stored-accounts.json` (or legacy `supabase.json` for older Granola builds)
- **Windows**: `%APPDATA%\Granola\stored-accounts.json` (or legacy `supabase.json`)
- **Linux**: `~/.config/Granola/stored-accounts.json` (or legacy `supabase.json`)

These are the same files the Granola desktop app maintains for its own auth. The plugin extracts the access token from them and uses it for API requests. **Nothing outside the vault is ever written, deleted, or modified.** You can also override the path in **Settings → Auth Key Path**.

### Vault enumeration

To avoid creating duplicate notes when Granola sends the same document twice, the plugin scans for existing notes that carry a matching `granola_id` in their frontmatter. The scope of that scan is configurable:

| Setting (`Existing-note search scope`) | What it scans |
|---|---|
| **Sync directory only** *(default, recommended)* | Only the folder you've configured as the sync directory (and its subfolders). |
| **Specific folders** | A user-defined list of folders. |
| **Entire vault** | Every markdown file in the vault. Slowest; only needed if you move synced notes outside the sync directory. |

During the scan the plugin reads each candidate file's frontmatter via the standard Obsidian `vault.read` API in order to extract the `granola_id` field; no other field is inspected and no file is modified by the scan.

## 📦 Installation

### Manual Installation

1. Download the latest release from the [Releases page](https://github.com/dannymcc/Granola-to-Obsidian/releases)
2. Extract the files to your vault's plugins directory: `.obsidian/plugins/granola-sync-plus/`
3. Enable the plugin in Obsidian Settings → Community Plugins
4. Configure your sync settings

### Files to Download
- `main.js`
- `manifest.json` 
- `styles.css`
- `versions.json`

## ⚙️ Configuration

Access plugin settings via **Settings → Community Plugins → Granola Sync Plus**

### Sync Directory
Choose which folder in your vault to sync notes to (default: `Granola`)

### Note Prefix
Optional prefix to add to all synced note filenames (e.g., `meeting-`, `granola-`)

### Auth Key Path
Path to your Granola authentication file. Default locations:
- **macOS**: `Users/USERNAME/Library/Application Support/Granola/supabase.json`
- **Windows**: `AppData/Roaming/Granola/supabase.json`

The plugin automatically detects your operating system and sets the appropriate default path.

### Filename Template
Customize how your notes are named using these variables:
- `{title}` - The meeting/note title
- `{id}` - Granola document ID
- `{created_date}` - Creation date
- `{updated_date}` - Last updated date  
- `{created_time}` - Creation time
- `{updated_time}` - Last updated time
- `{created_datetime}` - Full creation date and time
- `{updated_datetime}` - Full updated date and time

**Example Templates:**
- `{created_date}_{title}` → `2025-06-06_Team_Standup_Meeting.md`
- `Meeting_{created_datetime}_{title}` → `Meeting_2025-06-06_14-30-00_Team_Standup_Meeting.md`

### Date Format
Customize date formatting using these tokens:
- `YYYY` - 4-digit year (2025)
- `YY` - 2-digit year (25)
- `MM` - 2-digit month (06)
- `DD` - 2-digit day (06)
- `HH` - 2-digit hours (14)
- `mm` - 2-digit minutes (30)
- `ss` - 2-digit seconds (45)

**Popular Formats:**
- `YYYY-MM-DD` → 2025-06-06 (ISO)
- `DD-MM-YYYY` → 06-06-2025 (European)
- `MM-DD-YYYY` → 06-06-2025 (US)
- `DD.MM.YY` → 06.06.25 (German)

### Attendee Tagging

Automatically extract meeting attendees from Granola and add them as organized tags in your note frontmatter.

#### Settings:
- **Include Attendee Tags**: Enable/disable attendee tagging (disabled by default)
- **Exclude My Name from Tags**: Remove your own name from attendee tags (recommended)
- **My Name**: Set your name as it appears in Granola meetings for filtering
- **Attendee Tag Template**: Customize the tag structure using `{name}` placeholder

#### Tag Format & Customization:
- **Default format**: `person/{name}` (e.g., "John Smith" → `person/john-smith`)
- **Customizable structure**: Use the template setting to organize tags your way
- **Template examples**:
  - `people/{name}` → `people/john-smith` (group under "people")
  - `meeting-attendees/{name}` → `meeting-attendees/john-smith` (descriptive grouping)
  - `attendees/{name}` → `attendees/john-smith` (simple grouping)
  - `contacts/work/{name}` → `contacts/work/john-smith` (multi-level hierarchy)
- **Name processing**: Special characters removed, spaces become hyphens, all lowercase

#### Benefits:
- **Easy searching**: Find all meetings with specific people using `#person/john-smith`
- **Clean organization**: All attendee tags grouped under `person/` prefix
- **Smart filtering**: Your name is automatically excluded from tags
- **Retroactive updates**: Can update existing notes with attendee tags while preserving content

### Attendee Backlinks

Optionally write meeting attendees as Obsidian wikilinks in a separate frontmatter property. This is additive — existing attendee tags are always preserved unchanged.

#### Settings:
- **Include Attendee Backlinks**: Enable/disable wikilink generation (disabled by default)
- **Attendee Backlink Property**: The frontmatter property name to use (default: `participants`)

#### How it works:
When enabled, each synced note gains a new frontmatter property containing `[[Name]]` wikilinks for every attendee (using the same "exclude my name" filter as tags):

```yaml
---
tags:
  - person/eddie-brock
  - person/gwen-stacy
participants:
  - "[[Eddie Brock]]"
  - "[[Gwen Stacy]]"
---
```

The attendee display name is used exactly as it appears in Granola — no normalization or aliasing is applied.

#### Benefits:
- **Graph view connections**: Attendees appear as linked nodes in Obsidian's graph view
- **Backlink panel**: Navigate directly to people pages from each meeting note
- **Additive**: Tags are never removed or altered; backlinks sit alongside them
- **Configurable property**: Rename the property to fit your vault's schema (e.g., `people`, `attendees`)

### Granola URL Integration

Add direct links back to your original Granola notes for seamless workflow integration.

#### Setting:
- **Include Granola URL**: Enable/disable URL links in frontmatter (disabled by default)

#### How it works:
When enabled, each synced note includes a `granola_url` field in the frontmatter that links directly to the original note in the Granola web app:

```yaml
granola_url: "https://notes.granola.ai/d/abc123def456"
```

#### Benefits:
- **Quick access**: One-click to open the original note in Granola
- **Cross-platform**: Works with both desktop and web versions of Granola
- **Always current**: URL automatically generated from document ID
- **Non-intrusive**: Appears cleanly in frontmatter without cluttering note content

### Auto-Sync Frequency
Choose how often to automatically sync:
- Never (manual only)
- Every 1-2 minutes (frequent)
- Every 5-15 minutes (recommended)
- Every 30 minutes to 24 hours (conservative)

### Filename Separator
Customize how words are separated in generated filenames:
- `_` (underscore) - Default: `Team_Standup_Meeting.md`
- `-` (dash): `Team-Standup-Meeting.md`
- `` (none): `TeamStandupMeeting.md`

**Use Case**: Match your preferred naming convention or organizational standards.

### File Conflict Handling
Choose what happens when a file with the same name already exists:
- **Skip** - Don't create a new file (preserves existing file)
- **Timestamp** - Create a timestamped version (e.g., `Meeting_14-30.md`)

**Use Case**: Prevents accidental overwrites while giving you flexibility in conflict resolution.

### Granola Folder Organization
Automatically organize synced notes to mirror your Granola folder structure:
- **Enable Granola Folders**: Organize notes by their Granola folder
- **Folder Tag Template**: Customize how folder hierarchy becomes tags (e.g., `folder/{name}`)

**Example**: A note in Granola's "Team Meetings/Standups" folder becomes tagged as `folder/Team_Meetings` and `folder/Standups`.

## 🎯 Usage

### Manual Sync
- Click the sync icon in the ribbon (left sidebar)
- Use Command Palette: "Sync Granola Notes"
- Click "Sync Now" in plugin settings
- **Watch the status bar** (bottom right) for real-time progress

### Auto-Sync
Set your preferred frequency in settings and the plugin will sync automatically in the background. Status updates appear in the status bar.

### Status Bar Indicators
- **"Granola Sync: Idle"** - Ready to sync
- **"Granola Sync: Syncing..."** - Currently syncing (with animation)
- **"Granola Sync: X notes synced"** - Success (shows for 3 seconds)
- **"Granola Sync: Error - [details]"** - Error occurred (shows for 5 seconds)

### Find Duplicate Granola Notes
Identify and manage duplicate notes that may have been created across multiple sync cycles.

**How to use:**
- Click the search icon in the ribbon (left sidebar)
- Use Command Palette: "Find Duplicate Granola Notes"
- The plugin scans your vault for notes with duplicate Granola IDs and creates a report file

**Output**: A duplicates report file listing all conflicts with their locations, making it easy to:
- Review which notes are duplicates
- Decide which versions to keep
- Clean up your vault manually if needed

**Note**: This uses the `granola_id` in frontmatter to identify duplicates, so renamed files are correctly recognized.

### Skip Existing Notes
When enabled, notes that already exist in your vault will not be updated during sync. This is perfect for preserving any manual additions you've made such as:
- Custom tags
- Personal summaries
- Additional notes or comments
- Custom frontmatter properties

**How it works**: The plugin uses the `granola_id` in the frontmatter to identify existing notes, so you can safely:
- Rename note files
- Change filename templates
- Modify note titles
- Move notes within the sync directory

As long as you don't modify the `granola_id` field, the plugin will recognize them as the same note.

**Note**: New notes from Granola will still be imported, but existing ones won't be overwritten.

### Duplicate Detection & File Management

This release includes robust duplicate and file conflict management:

#### Find Duplicate Notes
- **New Command**: Scans vault for notes with duplicate Granola IDs
- **Report Output**: Creates a dedicated duplicates file for easy review
- **Usage**: Ribbon icon or Command Palette → "Find Duplicate Granola Notes"

#### File Conflict Handling
Control how the plugin handles naming conflicts:
- **Skip Mode**: Don't create new files if a name already exists
- **Timestamp Mode**: Add timestamps to create unique filenames automatically

#### Why Use These Tools:
- **Avoid accidental duplicates**: Sync can create duplicates when notes have the same title or filename
- **Clean vault management**: Identify problematic duplicates and clean them up
- **Prevent overwrites**: Choose whether to skip or timestamp when conflicts occur

#### How to Use:
1. Run "Find Duplicate Granola Notes" to scan for existing duplicates
2. Review the generated report file
3. Manually clean up duplicates if needed
4. Set your preferred `existingFileAction` in settings for future syncs
5. Re-run sync with confidence

---

### 🧪 Experimental: Search Scope for Existing Notes

**⚠️ Please backup your vault before using this feature!**

This experimental feature allows you to control where the plugin searches for existing notes when checking for duplicates by `granola_id`.

#### Search Scope Options:
- **Sync Directory Only (Default)**: Only searches within your configured sync directory
- **Entire Vault**: Searches all markdown files in your vault (allows you to move notes anywhere)
- **Specific Folders**: Search only in folders you specify

#### Why Use This Feature:
- **Organize freely**: Move your Granola notes to different folders without creating duplicates
- **Flexible workflows**: Keep meeting notes in project folders, daily folders, or anywhere you prefer
- **Avoid duplicates**: Plugin finds existing notes regardless of their location

#### How to Use Safely:
1. **Backup your vault first!**
2. **Test with manual sync**: Change settings, then run manual sync to test
3. **Use the tools**:
   - "Find Duplicate Notes" - scan for existing duplicates
   - "Re-enable Auto-Sync" - restart auto-sync after testing
4. **Consider "Entire Vault"**: Safest option if you want to move notes around

#### Example Workflow:
```
1. You have notes in "Granola/" folder
2. You want to organize them by project: "Projects/ProjectA/", "Projects/ProjectB/"
3. Set search scope to "Entire Vault"
4. Move your existing notes to project folders
5. Run manual sync to test - no duplicates created!
6. Re-enable auto-sync
```

#### Avoiding Duplicates:
- **Before changing settings**: Move notes to new location OR use "Entire Vault" search
- **After changing settings**: Run manual sync first, then re-enable auto-sync
- **If you get duplicates**: Use "Find Duplicate Notes" tool to identify and clean them up

#### Settings Location:
Under **File Management & Duplicates** section in plugin settings.

### Daily Note Integration
When enabled, today's Granola meetings automatically appear in your Daily Note:

```markdown
## Granola Meetings
- 09:30 [[Granola/2025-06-09_Team_Standup|Team Standup]]
- 14:00 [[Granola/2025-06-09_Client_Review|Client Review Meeting]]
```

### Periodic Notes Integration
The plugin now supports the [Periodic Notes plugin](https://github.com/liamcain/obsidian-periodic-notes) for enhanced daily note management:

- **Independent Integration**: Works alongside or instead of Daily Notes integration
- **Plugin Detection**: Automatically detects if Periodic Notes plugin is available
- **Flexible Configuration**: Separate section heading configuration for Periodic Notes
- **Seamless Workflow**: Integrates with Periodic Notes' daily note creation and templating

**Setup Requirements:**
1. Install and enable the [Periodic Notes plugin](https://github.com/liamcain/obsidian-periodic-notes)
2. Configure your daily note templates in Periodic Notes settings
3. Enable "Periodic note integration" in Granola Sync settings
4. Customize the section heading as desired

### Attendee Tagging Usage

Once enabled, attendee tagging automatically enhances your meeting notes:

#### Finding Meetings by Attendee
- **Search by tag**: Use `#person/john-smith` to find all meetings with John Smith
- **Tag panel**: Browse all `person/` tags in Obsidian's tag panel
- **Graph view**: Visualize meeting connections through attendee relationships

#### Smart Name Detection
The plugin extracts attendee names from:
- Granola's `people` field (primary source)
- Google Calendar attendee information (if available)
- Email addresses (converts to readable names when needed)

#### Automatic Updates
When both "Skip Existing Notes" and "Include Attendee Tags" are enabled:
- **Content preserved**: Your manual edits, summaries, and custom properties remain untouched
- **Tags updated**: Attendee tags are refreshed based on current meeting data
- **Non-person tags preserved**: Your custom tags are kept alongside attendee tags

**Example workflow:**
1. Enable attendee tagging in settings
2. Set your name (e.g., "Danny McClelland") to exclude from tags
3. Run sync - existing notes get attendee tags, content stays the same
4. Future syncs keep attendee tags current while preserving your edits

### Preview Your Settings
Use the preview buttons in settings to see how your filename template and date format will look before syncing.

## 📄 Note Format

Synced notes include rich frontmatter with metadata:

```markdown
---
granola_id: abc123def456
title: "Team Standup Meeting"
granola_url: "https://notes.granola.ai/d/abc123def456"
created_at: 2025-06-06T14:30:00.000Z
updated_at: 2025-06-06T15:45:00.000Z
tags:
  - people/john-smith
  - people/sarah-jones
  - people/mike-wilson
---

# Team Standup Meeting

Your converted meeting content appears here in clean Markdown format.

- Action items are preserved
- Headings maintain their structure
- All formatting is converted appropriately
```

## 🔧 Requirements

- Obsidian v1.6.6+
- Active Granola AI account
- Granola desktop app installed and authenticated (available for macOS and Windows)

## 🐛 Troubleshooting

### Plugin Won't Enable
- Check that all plugin files are in the correct directory
- Ensure you have the latest version of Obsidian
- Check the console (Ctrl/Cmd + Shift + I) for error messages

### No Notes Syncing
- Verify your Granola auth key path is correct
- Check that you have meeting notes in your Granola account
- Ensure the sync directory exists or can be created
- Look for error messages in the Obsidian console

### Authentication Issues
- Make sure Granola desktop app is logged in
- Check that the auth key file exists at the expected location:
  - **macOS**: `~/Library/Application Support/Granola/supabase.json`
  - **Windows**: `C:\Users\[USERNAME]\AppData\Roaming\Granola\supabase.json`
- If the file is in a different location, update the "Auth Key Path" in plugin settings
- Try logging out and back in to Granola

### File Naming Issues
- Use the preview buttons to test your templates
- Avoid special characters in custom prefixes
- Check that your date format is valid

### Attendee Tagging Issues
- **No attendee tags appearing**: Check that "Include Attendee Tags" is enabled in settings
- **Your name still appears in tags**: Update "My Name" setting to match exactly how it appears in Granola
- **Missing attendees**: Some meeting platforms may not provide complete attendee information
- **Duplicate tags**: The plugin automatically prevents duplicate tags - check for variations in name formatting
- **Tags not updating**: Ensure both "Skip Existing Notes" and "Include Attendee Tags" are enabled for updates

### Duplicate Notes Issues
- **Seeing duplicates**: Use "Find Duplicate Granola Notes" command to identify and review them
- **Want to prevent duplicates**: Set "File Conflict Handling" to either "Skip" or "Timestamp"
- **Duplicates created during sync**: Likely from multiple sync runs with same notes - use the duplicate finder to clean up
- **Can't find duplicates tool**: Check ribbon icons (left sidebar) or use Command Palette

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Setup
1. Clone this repository
2. Run `npm install` to install dependencies
3. Run `npm run build` to compile
4. Copy files to your Obsidian plugins directory for testing

## 👥 Contributors

Thank you to all the contributors who have helped improve this plugin:

- [@amscad](https://github.com/amscad) - Duplicate detection, filename customization, and CLAUDE.md
- [@rylanfr](https://github.com/rylanfr) - Dynamic tag preservation and conditional fixes
- [@CaptainCucumber](https://github.com/CaptainCucumber) - Transcript inclusion and date-based folders
- [@andrewsong-tech](https://github.com/andrewsong-tech) - Historical notes sync and folder reorganization

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- With thanks to [Joseph Thacker](https://josephthacker.com/) for first discovering that it's possible to query the Granola [API using locally stored auth keys](https://josephthacker.com/hacking/2025/05/08/reverse-engineering-granola-notes.html)!
- [Granola AI](https://granola.ai) for creating an amazing meeting assistant
- The Obsidian community for plugin development resources
- Contributors and testers who helped improve this plugin

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/dannymcc/Granola-to-Obsidian/issues)
- **Documentation**: This README and plugin settings descriptions
- **Community**: [Obsidian Discord](https://discord.gg/veuWUTm) #plugin-dev channel

---

**Made with ❤️ by [Danny McClelland](https://github.com/dannymcc)**

*Not officially affiliated with Granola AI or Obsidian.*
