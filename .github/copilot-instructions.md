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
- `src/utils/reactJsonDrawer.tsx` - Integration between content script and React components
- `src/utils/nestedJsonHandler.ts` - JSON validation and detection utilities
- `src/assets/styles/json-drawer.css` - Styling for JSON highlighting and drawer
- `src/assets/styles/json-viewer-component.css` - Styling for the JSON viewer
- `src/assets/styles/main.css` - General styling for the extension

### Architecture
- **Content Script**: Runs on all web pages, detecting JSON content and managing the drawer UI
- **Background Script**: Handles context menu integration and extension lifecycle events
- **React Components**: Provides interactive JSON visualization with history and navigation
- **Utility Modules**: Handle JSON validation, history tracking, and drawer management

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
3. Navigate to pages with JSON content to test detection and formatting

## Key Features & Implementation

### 1. JSON Detection
The extension uses multiple strategies to detect JSON:
- Automatic scanning of text nodes
- Hover-based detection (toggle with `Ctrl+Shift+H`)
- Special detection for API logs format
- Highlights JSON with dotted underlines

### 2. JSON Viewer
- Shows formatted JSON in a slide-out drawer
- Syntax highlighting for better readability
- Accessible via Ctrl+Click on detected JSON
- Supports large JSON structures

### 3. History Management
- Maintains history of viewed JSON for navigation
- Supports back/forward navigation between JSON views
- Provides a dropdown menu for quickly accessing recent JSON

### 4. Keyboard Shortcuts
- `Ctrl+Shift+E`: Format selected JSON text
- `Ctrl+Shift+H`: Toggle hover detection for JSON

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

Add new patterns by extending the detection logic in this function.

### Improving the JSON Viewer
The React-based JSON viewer is defined in `src/components/JsonViewer.tsx`. To add new features:

1. Update the component's state and handlers
2. Add UI elements to the viewer's toolbar
3. Update styling in `src/assets/styles/json-viewer-component.css`

### Working with History
JSON history management is handled by:
- `src/utils/jsonHistory.ts` - Persistent storage of viewed JSON
- `src/utils/jsonNavigation.ts` - In-memory navigation history

### Changing Keyboard Shortcuts
Modify the key detection in the keydown event listeners in `content.ts`:

```typescript
// Ctrl+Shift+E for formatting JSON
if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'e') {
  formatSelectedJson();
}
```

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
