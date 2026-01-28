# Albert Desktop

A minimal desktop widget for organizing shortcuts, apps, and folders. Clean Apple-inspired design with automatic icon extraction from executables.

## Features

- **Multiple Tabs** — Organize by category (Applications, Games, Folders, etc.)
- **Automatic Icons** — Extracts real icons from .exe and .lnk files
- **Always on Top** — Widget stays visible above other windows  
- **System Tray** — Lives in hidden icons, not the taskbar
- **Auto-Start** — Loads automatically with Windows
- **Drag & Drop** — Drop files and folders directly onto the widget
- **Collapsible** — Minimize to a thin title bar
- **Glass UI** — Frosted glass aesthetic with adjustable opacity

## Setup

### Prerequisites

Node.js v18 or later — [nodejs.org](https://nodejs.org/)

### Install & Run

```bash
# Install dependencies
npm install

# Run in development
npm start

# Build portable .exe
npm run build
```

The executable will be in `dist/AlbertDesktop.exe`

## Usage

### Adding Shortcuts

- **Drag & Drop** — Drag any file, folder, or .lnk shortcut onto the widget
- **Manual** — Click the + button, enter name and path

### Managing Tabs

- **Add** — Click + in the tab bar
- **Rename** — Double-click a tab, or right-click → Rename
- **Delete** — Right-click a tab → Delete Tab

### Controls

| Action | How |
|--------|-----|
| Move | Drag the title bar |
| Resize | Drag bottom-right corner |
| Collapse | Click the − button |
| Settings | Click the gear icon |
| Show/Hide | Click the tray icon |

### System Tray

Right-click the tray icon:
- Show/Hide widget
- Toggle Always on Top
- Toggle Start with Windows
- Clear Icon Cache
- Quit

## Data Location

```
%APPDATA%/albert-desktop/
├── config.json       # Window settings
├── shortcuts.json    # Your tabs and shortcuts
└── icon-cache/       # Extracted app icons
```

## Troubleshooting

**Icons not loading?**  
Right-click tray → Clear Icon Cache, then restart

**Not starting with Windows?**  
Enable "Start with Windows" in the tray menu

**Widget invisible?**  
Click the tray icon to show it

## License

MIT
