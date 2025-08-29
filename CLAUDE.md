# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Chrome Extension called "JSON Formatter & Viewer" that detects, highlights, formats, and visualizes JSON on web pages. It provides automatic JSON detection, interactive viewing, and various JSON manipulation tools.

## Commands

### Development Commands
```bash
# Install dependencies
npm install

# Build commands
npm run build      # Production build
npm run dev        # Development build
npm run watch      # Watch mode for development

# Version management
npm run version-sync  # Sync version from package.json to manifest.json and version.ts
```

### Testing the Extension
1. Build the extension: `npm run build`
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the `public` directory
5. For quick testing, open `src/json-test-page.html` in browser

## Architecture

### Core Components
- **Content Script** (`src/content.ts`): Runs on all web pages, detects JSON content and manages the drawer UI
- **Background Script** (`src/background.ts`): Handles context menu integration and keyboard shortcuts
- **React Components**: Interactive JSON visualization with history and navigation
- **Utility Modules**: Handle JSON validation, history tracking, and drawer management

### Key Files
- `src/content.ts` - Main content script with JSON detection logic
- `src/popup.tsx` - React-based popup UI for extension controls
- `src/components/JsonViewer.tsx` - React component for JSON visualization
- `src/components/History.tsx` - History management component
- `src/utils/reactJsonDrawer.tsx` - Integration between content script and React components
- `src/utils/nestedJsonHandler.ts` - JSON validation utilities
- `src/utils/jsonHistory.ts` - Persistent storage of viewed JSON
- `src/utils/jsonNavigation.ts` - In-memory navigation history
- `src/config/version.ts` - Auto-generated version information (do not edit directly)

### Data Flow
1. **JSON Detection**: Content script detects potential JSON → validates with `nestedJsonHandler.ts` → displays in viewer
2. **History Management**: JSON stored via `jsonHistory.ts` (persistent) and `jsonNavigation.ts` (in-memory navigation)

## Build System

- **Webpack**: Bundles TypeScript/React into three entry points (background, content, popup)
- **TypeScript**: Compiles with React JSX support
- **Asset Management**: CopyWebpackPlugin handles static files and manifest
- **Version Sync**: Automatic synchronization from package.json to manifest.json and version.ts

## Version Management

The extension version is maintained in `package.json` and automatically synchronized:
- Version changes should only be made in `package.json`
- Run `npm run version-sync` to update `src/manifest.json` and `src/config/version.ts`
- The build process automatically runs version-sync

## JSON Detection Implementation

The extension uses multiple detection strategies:
- Automatic scanning of DOM text nodes using TreeWalker
- Hover-based detection (toggleable with Ctrl+Shift+H)
- Pattern matching for balanced braces/brackets
- Validation via `isValidNestedJson()` function

Detection patterns prioritize:
1. Complete JSON objects/arrays `{...}` or `[...]`
2. Balanced bracket matching
3. Valid JSON.parse() results
4. Minimum length thresholds to avoid false positives

## Keyboard Shortcuts

- `Ctrl+Shift+E` (Mac: `Cmd+Shift+E`): Format selected JSON text
- `Ctrl+Shift+H` (Mac: `Cmd+Shift+H`): Toggle hover detection

Shortcuts are defined in `src/manifest.json` and handled via background script messaging.

## Performance Considerations

- Throttled mousemove events (150ms) for hover detection
- Efficient DOM traversal using TreeWalker
- React component mounting/unmounting lifecycle management
- Large JSON handling with collapsed default view
- Lazy loading of React components via dynamic imports