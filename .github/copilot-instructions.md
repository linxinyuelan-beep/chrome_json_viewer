# JSON Formatter & Viewer Chrome Extension - AI Assistant Guide

## Project Overview
This Chrome extension provides:
1. **JSON Detection & Formatting**: Automatically detects JSON on web pages, highlights it, and provides a formatted view
2. **JSON Viewer**: Displays formatted JSON in a slide-out drawer with advanced features like history navigation and copying

## Key Components

### Core Files
- `src/content.ts` - Content script with JSON detection functionality
- `src/background.ts` - Background service worker for context menu integration
- `src/popup.tsx` - React-based popup UI for controlling extension features
- `src/components/JsonViewer.tsx` - React component for JSON visualization
- `src/components/History.tsx` - History management component
- `src/utils/reactJsonDrawer.tsx` - Integration between content script and React components
- `src/utils/nestedJsonHandler.ts` - JSON validation and detection utilities
- `src/utils/jsonHistory.ts` - Persistent storage of viewed JSON
- `src/utils/jsonNavigation.ts` - In-memory navigation history
- `src/config/version.ts` - Auto-generated version information
- `src/assets/styles/json-drawer.css` - Styling for JSON highlighting and drawer
- `src/assets/styles/json-viewer-component.css` - Styling for the JSON viewer
- `src/assets/styles/main.css` - General styling for the extension

### Architecture
- **Content Script**: Runs on all web pages, detecting JSON content and managing the drawer UI
- **Background Script**: Handles context menu integration and extension lifecycle events
- **React Components**: Provides interactive JSON visualization with history and navigation
- **Utility Modules**: Handle JSON validation, history tracking, and drawer management
- **Storage Layer**: Uses Chrome storage API for persistent history

## Development Workflow

### Version Management
The extension's version is maintained in `package.json` and synchronized across the codebase with:
```bash
npm run version-sync  # Updates version in manifest.json and version.ts
```

This script ensures consistent versioning across all files.

### Build Process
```bash
npm run build  # Production build
npm run dev    # Development build
npm run watch  # Watch mode for development
```

The build process:
1. Runs version-sync script to ensure consistent versioning
2. Compiles TypeScript files using ts-loader
3. Bundles with webpack
4. Outputs to `public/` directory
5. Copies static assets and manifest

### Testing the Extension
1. Build the extension: `npm run build`
2. Load unpacked from Chrome's extension page (`chrome://extensions/`)
3. Navigate to pages with JSON content to test detection and formatting
4. For quick testing, open `src/json-test-page.html` in browser

## Key Features & Implementation

### 1. JSON Detection
The extension uses multiple strategies to detect JSON:
- Automatic scanning of text nodes
- Hover-based detection (toggle with `Ctrl+Shift+H`)
- Special detection for API logs format
- Highlights JSON with dotted underlines

Detection logic is in `detectJsonInElement()` and `findAllPotentialJsons()` functions in `content.ts`:
```typescript
// Find balanced patterns of braces/brackets to identify potential JSON
function findBalancedPatterns(text: string, openChar: string, closeChar: string): string[] {
  const results: string[] = [];
  const stack: number[] = [];
  const positions: number[][] = [];
  
  // Algorithm to find matching pairs of brackets
  // ...
}
```

### 2. JSON Viewer
- Shows formatted JSON in a slide-out drawer
- Offers two view modes: JSON View (`react-json-view`) and Tree View (`react-json-tree`)
- Syntax highlighting for better readability
- Accessible via double-click on detected JSON
- Supports large JSON structures with optimized rendering

### 3. History Management
The extension maintains two types of history:
- **Persistent History**: Stored in Chrome storage via `jsonHistory.ts`
- **Navigation History**: In-memory for back/forward navigation via `jsonNavigation.ts`

History features include:
- Recent JSON dropdown in the viewer
- Full history panel with search and filtering
- Back/forward navigation between JSON views

### 4. Keyboard Shortcuts
- `Ctrl+Shift+E` (or `Command+Shift+E` on Mac): Format selected JSON text
- `Ctrl+Shift+H` (or `Command+Shift+H` on Mac): Toggle hover detection for JSON

These shortcuts are defined in `manifest.json`:
```json
"commands": {
  "format-selected-json": {
    "suggested_key": {
      "default": "Ctrl+Shift+E",
      "mac": "Command+Shift+E"
    },
    "description": "Format selected JSON text"
  }
}
```

## Common Development Tasks

### Enhancing JSON Detection
The `detectJsonInElement()` function in `content.ts` handles JSON detection:

```typescript
function detectJsonInElement(element: Element): string[] {
  // Special cases like API logs
  if (text.includes('GdsOrderSystemServiceImpl')) {
    // API-specific detection patterns
  }
  
  // General JSON detection for any valid objects/arrays
  const allPotentialJsons = findAllPotentialJsons(text);
  // ...
}
```

Add new detection patterns by:
1. Adding specialized pattern matching for specific formats
2. Extending `findAllPotentialJsons()` for general purpose detection
3. Testing with various JSON formats in `json-test-page.html`

### Improving the JSON Viewer
The React-based JSON viewer is defined in `src/components/JsonViewer.tsx`. To add new features:

1. Update the component's state and handlers
2. Add UI elements to the viewer's toolbar
3. Update styling in `src/assets/styles/json-viewer-component.css`

The viewer supports two different visualization libraries:
- `@microlink/react-json-view` - Feature-rich JSON editor and viewer
- `react-json-tree` - Lightweight tree view from Redux DevTools

### Working with History
JSON history management is handled by:
- `src/utils/jsonHistory.ts` - Persistent storage of viewed JSON
- `src/utils/jsonNavigation.ts` - In-memory navigation history

History items include metadata like:
- Preview text
- Source URL
- Size information
- Timestamp

## Performance Considerations
- JSON detection uses throttling for mouse movement events (150ms)
- Text node manipulation is optimized to avoid page disruption
- Large JSON structures are efficiently rendered with virtualized components
- Careful DOM manipulation to restore original structure when removing highlights
- React component mounting/unmounting is optimized for memory usage

## Version Tracking
The extension version is defined in:
- `version` field in `package.json` (primary source)
- Synchronized to `src/manifest.json` and `src/config/version.ts` via `version-sync.js`

When releasing a new version:
1. Update version in `package.json`
2. Run `npm run version-sync` (or let the build process handle it)
3. Build the extension with `npm run build`
