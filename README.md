# SweetHomePage

A lightweight, self-hosted browser start page you can run anywhere with Docker. Organize your bookmarks, folders, and notes in a personal dashboard that lives entirely on your own machine — no accounts, no cloud, no tracking.


---

## Key Features
- **Multi-Dashboard Switcher**: Switch dynamically between separate start page configurations.
- **Collapsible Recursive Folders**: Arrange links with infinite nested folder hierarchies.
- **Four Bookmark View Modes**: Switch each widget individually between *List*, *Detailed List*, *Grid of Icons*, and *Cloud View*.
- **Advanced Drag-and-Drop Editor**:
  - Reorder and move entire **widgets** between columns with real-time insertion preview guides.
  - Drag a **folder/sub-group** out of a bookmarks widget to extract it as a new independent widget.
  - Drag **individual bookmark links** between any bookmarks widgets or drop them directly into a sub-group folder (highlighted with an accent border on hover).
  - Drop a widget or folder onto another bookmarks widget to choose: *Place Above*, *Place Below*, or *Insert Inside*.
- **Browser Bookmark Import**: Import your existing bookmarks from a Firefox or Chrome HTML export file, preserving the full recursive folder structure. Includes a *Load Demo Bookmarks* button.
- **Markdown Notepad**: Take notes inside customizable markdown widgets with auto-resizing text boxes.
- **Broken Link Scanner & Diagnostics**: Background checks for saved URLs to trace HTTP redirects and dead links. Supports pause/stop controls for global scans and individual bookmark recheck actions.
- **HTML Scraper**: Autocompletes link titles and descriptions directly from URL metadata.
- **Duplicate Warnings**: Live warnings during bookmark entry if a URL is already saved on another page.
- **Stable Column Layout**: Column widths are strictly locked to equal fractions of the page width; long text wraps rather than stretching columns.


---

## Installation & Running

### Prerequisites
- [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/) installed on your machine.

### Run with Docker Compose (Recommended)
Clone this repository and launch the container at the root folder:

```bash
docker compose up --build -d
```

Once started, the server will compile all assets and boot up. Access the dashboard in your web browser:
- URL: **`http://localhost:3001`**
- API Documentation (Swagger UI): **`http://localhost:3001/api-docs`**

---

## Configuration & Volumes

The application stores all user settings, page configurations, and diagnostic files inside the container volume path `/app/data`.

In `docker-compose.yml`, this volume is bound to `./data` on your host machine:

```yaml
    volumes:
      - ./data:/app/data
```

### Environment Variables
You can configure the backend behavior using the following environment variables:
- `PORT` (default `3001`): The port the Express application server listens on.
- `DATA_DIR` (default `/app/data`): The directory where JSON configuration files are read and written.

---

## Backups & Synchronization

Since all page designs, widgets, and links are kept as plain JSON files, backing up your configurations is incredibly simple:

1. **Host Backup Directory**: All configurations reside in the `./data` directory relative to the repository folder:
   - `global-settings.json`: Tracks theme settings, active dashboard index, and pages list.
   - `page-<id>.json`: Keeps the widgets grid layout, bookmark trees, and notes content for each specific dashboard.
   - `broken-links.json`: Stores URL diagnostic report histories.

2. **Automated Sync**: You can directly point **Syncthing**, **Dropbox**, **Nextcloud**, or any file synchronization client to the `./data` folder. Since files are modified only upon dashboard updates, synchronization is lightweight and instant.

3. **Manual Import/Export**: You can also use the import/export controls inside the dashboard settings modal to manually download and upload single page JSON structures.

---

## Releases & Changes

For detailed features, updates, and changes from scratch, refer to the [Release Notes](docs/release-notes.md).
