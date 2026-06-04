# Release Notes - SweetHomePage

All notable changes and features implemented in this project are documented here.

## [0.0.1] - 2026-06-04

Initial release of **SweetHomePage** (a local, containerized clone of start.me web dashboard).

### Key Features Implemented

1. **Multi-Dashboard Switcher**:
   - Create, rename, delete, and switch between multiple custom dashboards.
   - Separate configuration JSON files are maintained for each start page to decouple configurations.

2. **Bookmarks & Recursive Folders**:
   - Organize bookmarks inside collapsible, nested folders with infinite nesting depth.
   - Attach metadata (titles, descriptions, tags) to both individual links and folder groups.

3. **Four Bookmark View Modes**:
   - **List View**: Compact single-line list with domain favicons and tags.
   - **Detailed View**: Large favicons, visible descriptions, and inline tags.
   - **Grid of Icons**: Large favicon cards with titles below and hover editing overlays.
   - **Cloud View**: Fluid tag-cloud list of pills that save space and show tools on hover.

4. **Drag-and-Drop Column Layout**:
   - Drag widgets by their header handle and move them between grid columns or sort them vertically.
   - High-fidelity drag over target feedback (dashed columns, Y-axis checked top/bottom border insertion lines).
   - Dynamic auto-balancing that places new widgets inside the column with the fewest panels.

5. **Independent Widget Card Heights**:
   - Grid layout stacks widgets in independent flex columns to prevent height-stretching across rows.

6. **Markdown Notepad & Auto-Growing Editor**:
   - Text notepad widget with safe HTML sanitization markdown renderer.
   - Editor mode automatically measures text lines (`scrollHeight`) and resizes height dynamically.

7. **Metadata Scraper & Optional Titles**:
   - Auto-scrapes title and description from website HTML tags on input blur.
   - Auto-falls back to domain name if title is left empty.

8. **Duplicate URL Warnings**:
   - Auto-checks if URL exists on any of the start pages during link creation/editing.
   - Displays warning alerts inside the modal form indicating where duplicate links are located.

9. **Broken Link Health Scanner & Diagnostics**:
   - Background fetcher to query and verify HTTP statuses of saved bookmarks.
   - Diagnostics control board to trace permanent redirections, dead links (e.g. 404, connection timeouts) and fix redirects automatically.

10. **Data Import/Export & Theme Settings**:
    - Import and export host settings configuration files.
    - Glassmorphic UI design system supporting dynamic Light Glass and Dark Glass themes.
