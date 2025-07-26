# Tab Title Changer & JSON Detector Chrome Extension - AI Assistant Guide

## Project Overview
This is a Chrome extension with two main features:
1. **Tab Title Changer**: Allows users to change the titles of browser tabs based on URL patterns or manually
2. **JSON Detector**: Detects JSON content on web pages, highlights it, and provides a formatted view in a slide-out drawer

## Key Components

### Core Files
- `src/content.ts` - Content script with JSON detection and tab title functionality
- `src/background.ts` - Background service worker for handling tab operations and extension lifecycle
- `src/popup.tsx` - React-based popup UI for managing tab title rules
- `src/components/App.tsx` - Main React component for the popup interface
- `src/assets/styles/json-drawer.css` - Styling for JSON highlighting and drawer
- `src/assets/styles/main.css` - General styling for the extension

### Architecture
- **Content Script**: Runs on all web pages, detecting JSON and handling title changes
- **Background Script**: Manages tab operations, rule application, and cross-window functionality
- **Popup Interface**: React-based UI for setting and managing title change rules

## Development Workflow

### Build Process
```bash
npm run build  # Production build
npm run dev    # Development build
npm run watch  # Watch mode for development
```

The build process:
1. Compiles TypeScript files
2. Bundles with webpack
3. Outputs to `public/` directory
4. Copies static assets and manifest

### Testing the Extension
1. Build the extension
2. Load unpacked from Chrome's extension page (`chrome://extensions/`)
3. Navigate to pages to test tab title rules or JSON detection

## Key Features & Implementation

### 1. Tab Title Changer
- Allows setting URL patterns and corresponding titles
- Supports manual title changes through the popup
- Persists rules using Chrome storage sync API
- Applies rules automatically when tabs are updated

### 2. JSON Detection
The extension uses multiple strategies to detect JSON:
- Automatic scanning of text nodes
- Hover-based detection (toggle with `Ctrl+Shift+H`)
- Special detection for API logs format
- Highlights JSON with dotted underlines

### 3. JSON Viewer
- Shows formatted JSON in a slide-out drawer
- Syntax highlighting for better readability
- Accessible via Ctrl+Click on detected JSON
- Supports large JSON structures

### 4. Window Management
- Supports moving tabs between windows with keyboard shortcut 'W'

### 5. Keyboard Shortcuts
- `Ctrl+Shift+H`: Toggle hover detection for JSON
- `W`: Move current tab to another window

## Common Tasks

### Adding New Tab Title Rules
Add rules through the popup UI or modify the default rules in the storage.

### Enhancing JSON Detection
Extend the patterns in `detectJsonInElement()` function in `content.ts`.

### Modifying JSON Highlighting Style
Update the CSS classes in `src/assets/styles/json-drawer.css`.

### Changing Keyboard Shortcuts
Modify the key detection in the keydown event listeners in `content.ts`.

## Version Tracking
The extension version is defined in:
- `EXTENSION_VERSION` constant in `content.ts`
- `version` field in `src/manifest.json`
Update both when releasing new versions.

## Performance Considerations
- JSON detection uses throttling for mouse movement events
- Text node manipulation is optimized to avoid page disruption
- Uses WeakSet to track processed elements
- Implements careful DOM manipulation to restore original structure when removing highlights
