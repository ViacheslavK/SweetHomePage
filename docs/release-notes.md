# Release Notes - SweetHomePage

All notable changes and features implemented in this project are documented here.

---

## [0.0.3] - 2026-06-04

### New Features

#### 1. Individual Link Recheck
- Added a **Recheck** button next to occurrences in the diagnostics view.
- Allows users to re-test the health of a specific link without running a full scan across the entire dashboard.
- If the rechecked link is healthy (`type === 'ok'`), it is automatically removed from the list of diagnostics.
- If the rechecked link is still failing, its state (status, redirect URL, or failure message) is dynamically updated in the list of results.

#### 2. Scan Pause and Stop Controls
- Added dedicated **Pause/Resume** and **Stop** buttons to the header of the diagnostics view during active scans.
- **Pause/Resume**: Temporarily suspends the background scanner queue, stopping the visual rotation of progress indicators. Resuming immediately continues processing remaining URLs.
- **Stop**: Immediately aborts the remaining queue workers, terminates the scanning job, and writes back the partial diagnostics results gathered up to that point.

### Technical Changes

| File | Change |
|---|---|
| `backend/src/checker.ts` | Added `isPaused` and `isStopped` flags; implemented `pauseChecker`, `resumeChecker`, `stopChecker`, and `recheckUrl` functions; updated worker loop to check flags. |
| `backend/src/routes.ts` | Added route endpoints `/checker/pause`, `/checker/resume`, `/checker/stop`, `/checker/recheck`; returned `paused` status in `/checker/results`. |
| `backend/src/swagger.ts` | Added path descriptions for the new endpoints. |
| `frontend/src/components/BrokenLinksModal.tsx` | Added UI controls (Play, Pause, Square, RotateCw buttons), states for `paused` and `recheckingUrls`, and API call triggers. |

---

## [0.0.2] - 2026-06-04

### New Features

#### 1. Widget & Folder Drag-and-Drop Overhaul
- **Folder extraction**: Drag any sub-group/folder header out of a bookmarks widget and drop it onto a column or between widgets to instantly promote it to a standalone independent bookmarks widget.
- **Folder merge (insert inside)**: When dragging a folder or a whole bookmarks widget and hovering over the center of another bookmarks widget, a placement modal appears offering:
  - *Place Above* — insert above the hovered widget as a sibling.
  - *Place Below* — insert below the hovered widget as a sibling.
  - *Insert Inside* — nest the dragged content inside the target widget as a root-level folder group.
- Hovering over a non-bookmarks widget (e.g. Notes) bypasses the modal and performs a direct positional drop.

#### 2. Individual Bookmark Drag-and-Drop
- Individual bookmark links are now draggable in **all four view modes** (List, Detailed, Icons, Cloud).
- Drag a link from any widget and drop it on:
  - **Another bookmarks widget** — link is removed from the source and appended at the root of the target widget.
  - **A sub-group/folder header** inside any bookmarks widget — link is inserted directly into that group's children. Folder header highlights with an accent border when hovered.
  - Works recursively at any nesting depth (folder inside folder inside folder).
- Dropping onto a Notes widget, empty column space, or columns is blocked — no drop indicator is shown.

#### 3. Browser Bookmark Import
- New **"Add widget" dropdown** in the header replaces the previous `+ Notes Notepad` button. Currently offers *Notes Notepad* (more widget types planned).
- New **"Import Bookmarks" dropdown** option under the bookmarks button opens an import dialog with:
  - **Import from file**: Parses standard Netscape HTML bookmark exports from Firefox and Chrome. Preserves full folder hierarchy (recursive groups). Bookmarks Toolbar folder is normalized to the `"bookmarks toolbar"` group name.
  - **Import from current browser**: Provides step-by-step manual export guide with screenshots per browser. Includes a **Load Demo Bookmarks** button for immediate preview.

#### 4. Column Width Stability
- Column widths are now strictly locked to `1/n` of the page width (where `n` = number of columns).
- Long bookmark titles, URLs, and descriptions wrap onto multiple rows instead of stretching the column.

### Bug Fixes

- **Bookmark import persistence** (critical): Imported bookmarks, extracted folders, and drag-and-drop reorderings previously disappeared on page refresh. Root causes:
  1. The backend Express body-parser limit defaulted to `100 KB`. Large HTML bookmark imports (`bookmarks.html`) triggered a `413 Payload Too Large` error that was silently swallowed by the frontend.
  2. Several state-mutating handlers (`handleAddWidget`, `handleAddImportedBookmarks`, `handleDeleteWidget`, `handleUpdateWidgetTitle`, and drop decision handlers) called `fetch` directly without checking `response.ok`, so server errors went undetected.
  - **Fix**: Increased body-parser limit to `10 MB` in `backend/src/server.ts`. Refactored all page config PUT calls to route through the centralized `savePageConfig` helper, which checks the response status, alerts the user on failure, and rolls back local state to the server's last known good state.

### Technical Changes

| File | Change |
|---|---|
| `backend/src/server.ts` | Increased `express.json()` body size limit from default `100kb` → `10mb` |
| `frontend/src/App.tsx` | Added `savePageConfig` helper; added `Add widget` / `Import Bookmarks` dropdowns; added folder & bookmark drag-and-drop handlers; added drop placement modal; added `handleDropLinkOnGroup`; added `insertItemIntoGroup` helper |
| `frontend/src/components/BookmarkGroup.tsx` | Made links draggable in all view modes; added folder `onDragOver`/`onDragLeave`/`onDrop` for link-into-group drops with accent highlight; threaded `onDropLinkOnGroup` recursively |
| `frontend/src/components/BookmarkWidget.tsx` | Threaded `onDropLinkOnGroup` prop down to `BookmarkGroup` |
| `frontend/src/utils/bookmarkParser.ts` | *(new)* Netscape HTML bookmark file parser using browser `DOMParser`; normalises bookmarks toolbar folder name |

---


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
