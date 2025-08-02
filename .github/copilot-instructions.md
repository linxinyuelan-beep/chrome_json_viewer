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

### Data Flow
1. **JSON Detection** → **Validation** → **Viewer Display**:
   - Content script detects potential JSON strings using pattern matching
   - `nestedJsonHandler.ts` validates if the detected text is valid JSON
   - Upon validation, content script passes data to `reactJsonDrawer.tsx`
   - React components render and display the formatted JSON

2. **History Management**:
   - JSON data is stored in Chrome storage via `jsonHistory.ts`
   - In-memory navigation history is managed via `jsonNavigation.ts`
   - History component displays and allows interaction with past JSON items

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
- Manual JSON input via popup interface

Detection logic is in `detectJsonInElement()` and `findAllPotentialJsons()` functions in `content.ts`:
```typescript
// Find balanced patterns of braces/brackets to identify potential JSON
function findBalancedPatterns(text: string, openChar: string, closeChar: string): string[] {
  const results: string[] = [];
  const stack: number[] = [];
  const positions: number[][] = [];
  
  // Algorithm to find matching pairs of brackets
  for (let i = 0; i < text.length; i++) {
    if (text[i] === openChar) {
      stack.push(i);
    } else if (text[i] === closeChar && stack.length > 0) {
      const startIdx = stack.pop()!;
      if (stack.length === 0) {
        positions.push([startIdx, i]);
      }
    }
  }
  
  // Extract top-level patterns that aren't nested in other patterns
  const topLevelPositions = positions.filter(([start, end]) => {
    return !positions.some(([otherStart, otherEnd]) => 
      (start > otherStart && end < otherEnd));
  });
  
  return topLevelPositions.map(([start, end]) => 
    text.substring(start, end + 1));
}
```

JSON validation occurs via `isValidNestedJson()` in `nestedJsonHandler.ts`:
```typescript
export function isValidNestedJson(str: string): boolean {
  try {
    // Check if string is properly formatted as object or array
    const trimmed = str.trim();
    if (!((trimmed.startsWith('{') && trimmed.endsWith('}')) || 
         (trimmed.startsWith('[') && trimmed.endsWith(']')))) {
      return false;
    }
    
    // Attempt to parse and validate structure
    const result = JSON.parse(str);
    if (typeof result !== 'object' || result === null) {
      return false;
    }
    
    // Additional validation logic...
    return true;
  } catch (e) {
    return false;
  }
}
```

### 2. JSON Viewer
- Shows formatted JSON in a slide-out drawer
- Uses `@microlink/react-json-view` for rich JSON visualization
- Syntax highlighting for better readability
- Accessible via double-click on detected JSON
- Supports large JSON structures with optimized rendering

The viewer component in `JsonViewer.tsx` is built with React:
```typescript
const JsonViewerComponent: React.FC<JsonViewerProps> = ({ jsonData, version }) => {
  const [expanded, setExpanded] = useState<boolean>(true);
  const [jsonSize, setJsonSize] = useState<string>('');
  const [showHistory, setShowHistory] = useState<boolean>(false);
  // Internal component ID for re-rendering
  const [instanceId] = useState<string>(`json-viewer-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);
  // Navigation state
  const [canGoBack, setCanGoBack] = useState<boolean>(false);
  const [canGoForward, setCanGoForward] = useState<boolean>(false);
  
  // Component initialization and cleanup
  useEffect(() => {
    // Add to history and navigation
    const jsonString = JSON.stringify(jsonData);
    const currentUrl = window.location.href;
    addToHistory(jsonString, currentUrl);
    addToNavigationHistory(jsonString);
    
    // Update navigation button states
    setCanGoBack(canNavigateBack());
    setCanGoForward(canNavigateForward());
  }, [jsonData]);
  
  // Render component...
}
```

The JSON drawer is rendered through `reactJsonDrawer.tsx`:
```typescript
export function showJsonInDrawerWithReact(jsonString: string, version: string): void {
  if (!jsonString) return;

  try {
    // Parse JSON data
    const jsonData = JSON.parse(jsonString);
    
    // Get or create drawer and mount React component
    const drawer = document.querySelector('.json-drawer') || createJsonDrawerWithReactMount();
    const drawerContent = drawer.querySelector('.json-drawer-content');
    
    if (drawerContent) {
      mountJsonViewer(jsonData, drawerContent as HTMLElement, version);
      if (!document.body.contains(drawer)) {
        document.body.appendChild(drawer);
      }
      drawer.classList.add('open');
    }
  } catch (error) {
    console.error('Error displaying JSON:', error);
  }
}
```

### 3. JSON Manipulation Tools
The extension offers various JSON manipulation features:
- **JSON Minification**: Compresses JSON to a single line without whitespace
- **String Escaping/Unescaping**: Tools to escape and unescape JSON strings
- **Date Format Conversion**: Converting Microsoft-style dates (`/Date(timestamp)/`) to human-readable format

These features are implemented in:
- `src/popup.tsx` - UI for the manipulation tools
- `src/utils/dateConverter.ts` - Date conversion functionality

```typescript
// From dateConverter.ts - Converting Microsoft JSON date format
export function convertMicrosoftJsonDate(dateString: string): string {
    if (!dateString || typeof dateString !== 'string') return dateString;
    
    // Use regex to match date format
    const dateRegex = /\/Date\((\d+)(?:([+-])(\d{4}))?\)\//;
    const matches = dateString.match(dateRegex);
    
    if (!matches) return dateString;
    
    try {
        // Extract timestamp in milliseconds
        const timestamp = parseInt(matches[1], 10);
        
        // Create date object and format
        const date = new Date(timestamp);
        return formatDate(date);
    } catch (error) {
        console.error('Date conversion error:', error);
        return dateString;
    }
}
```

### 4. History Management
The extension maintains two types of history:
- **Persistent History**: Stored in Chrome storage via `jsonHistory.ts`
- **Navigation History**: In-memory for back/forward navigation via `jsonNavigation.ts`

History features include:
- Recent JSON dropdown in the viewer
- Full history panel with search and filtering
- Back/forward navigation between JSON views

History items in `jsonHistory.ts` contain:
```typescript
export interface JsonHistoryItem {
  id: string;           // Unique identifier
  timestamp: number;    // When the JSON was viewed
  preview: string;      // First 50 chars for display
  jsonData: string;     // Full JSON string
  source: string;       // Where the JSON was found (page URL)
  size: number;         // Size in bytes
}
```

Navigation history uses an in-memory stack:
```typescript
// From jsonNavigation.ts
let navigationHistory: string[] = [];
let currentPosition = -1;

export function addToNavigationHistory(jsonString: string): void {
  // Add to history and update position
  navigationHistory = [...navigationHistory.slice(0, currentPosition + 1), jsonString];
  currentPosition = navigationHistory.length - 1;
  
  // Dispatch event to notify components of navigation state
  dispatchNavigationUpdateEvent();
}

export function navigateBack(): string | null {
  if (!canNavigateBack()) return null;
  currentPosition--;
  dispatchNavigationUpdateEvent();
  return navigationHistory[currentPosition];
}
```

### 5. Keyboard Shortcuts
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
  },
  "toggle-hover-detection": {
    "suggested_key": {
      "default": "Ctrl+Shift+H",
      "mac": "Command+Shift+H"
    },
    "description": "Toggle JSON hover detection"
  }
}
```

The shortcuts are processed in `background.ts` and communicated to `content.ts` via Chrome messaging:
```typescript
chrome.commands.onCommand.addListener((command) => {
  if (command === 'format-selected-json') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id!, { action: 'format-selected-json' });
    });
  } else if (command === 'toggle-hover-detection') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id!, { action: 'toggle-hover-detection' });
    });
  }
});
```

## Common Development Tasks

### Enhancing JSON Detection
The `detectJsonInElement()` function in `content.ts` handles JSON detection:

```typescript
function detectJsonInElement(element: Element): string[] {
  // Get element text content
  const text = element.textContent || '';
  if (text.length < 5) return [];

  const detectedJsons: string[] = [];

  // Find all potential JSON in text
  const allPotentialJsons = findAllPotentialJsons(text);
  detectedJsons.push(...allPotentialJsons);

  // Remove duplicates and sort by length (longer JSON first)
  return Array.from(new Set(detectedJsons))
    .sort((a, b) => b.length - a.length);
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

The viewer uses the `@microlink/react-json-view` library which provides a feature-rich JSON display with the following capabilities:
- Collapsible/expandable nodes
- Copy functionality
- Syntax highlighting
- Interactive interface

### Working with History
JSON history management is handled by:
- `src/utils/jsonHistory.ts` - Persistent storage of viewed JSON
- `src/utils/jsonNavigation.ts` - In-memory navigation history

History items include metadata like:
- Preview text
- Source URL
- Size information
- Timestamp

To add new history features:
1. Update `jsonHistory.ts` for persistent storage changes
2. Update `History.tsx` component for UI representation
3. For navigation features, modify `jsonNavigation.ts`

## Performance Considerations
- **JSON Detection Optimization**:
  - Throttling for mouse movement events (150ms) in content.ts:
    ```typescript
    // Throttled mousemove handler to avoid excessive processing
    const throttledHandler = throttle((event: MouseEvent) => {
      if (!enableHoverDetection) return;
      handleMouseMove(event);
    }, 150);
    document.addEventListener('mousemove', throttledHandler);
    ```
  
  - Efficient text node processing via DOM TreeWalker:
    ```typescript
    function getAllTextNodes(element: HTMLElement): Node[] {
      const textNodes: Node[] = [];
      const walker = document.createTreeWalker(
        element, 
        NodeFilter.SHOW_TEXT, 
        null
      );
      
      let node;
      while ((node = walker.nextNode())) {
        textNodes.push(node);
      }
      return textNodes;
    }
    ```
  
  - Smart JSON detection by prioritizing complete patterns

- **DOM Manipulation**:
  - Careful restoration of original text nodes when removing highlights
  - Merging adjacent text nodes to prevent DOM fragmentation
  - Use of document fragments for batch insertions

- **React Optimizations**:
  - Component mounting/unmounting lifecycle management
  - Lazy loading via dynamic imports:
    ```typescript
    import('./utils/reactJsonDrawer').then(({ showJsonInDrawerWithReact }) => {
      showJsonInDrawerWithReact(jsonString, EXTENSION_VERSION);
    })
    ```
  - Unmounting React components when closing the drawer to prevent memory leaks

- **Large JSON Handling**:
  - Efficient rendering of large structures (collapsed by default)
  - Validation of JSON size before attempting to render

## Version Tracking
The extension version is defined in:
- `version` field in `package.json` (primary source)
- Synchronized to `src/manifest.json` and `src/config/version.ts` via `version-sync.js`

Version sync script (`scripts/version-sync.js`):
```javascript
const fs = require('fs');
const path = require('path');

// Read version from package.json
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const version = packageJson.version;

console.log(`Synchronizing version: ${version}`);

// Update manifest.json
const manifestPath = path.join(__dirname, '..', 'src', 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
manifest.version = version;
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

// Update version.ts
const versionTsPath = path.join(__dirname, '..', 'src', 'config', 'version.ts');
const versionTsContent = `// This file is auto-generated. Do not edit directly.
export const VERSION = '${version}';
`;
fs.writeFileSync(versionTsPath, versionTsContent);

console.log('Version synchronization complete!');
```

When releasing a new version:
1. Update version in `package.json`
2. Run `npm run version-sync` (or let the build process handle it)
3. Build the extension with `npm run build`
4. Test thoroughly before publishing to Chrome Web Store

## Troubleshooting & Debugging

### Common Extension Issues
1. **JSON Detection Not Working**:
   - Check if hover detection is enabled (toggle with Ctrl+Shift+H)
   - Verify the text is valid JSON using `isValidNestedJson()`
   - Look for console errors in content script

2. **React Component Loading Errors**:
   - Check for proper module imports
   - Verify React component mounting in `reactJsonDrawer.tsx`
   - Check browser console for React-specific errors

3. **Style Issues**:
   - CSS is injected via content script - check for conflicts with page styles
   - Check if drawer styles are properly applied in `json-drawer.css`
   - Inspect element to see if classes are correctly applied

### Development Tips
- Use Chrome's devtools to debug content scripts
- Access extension storage with `chrome.storage.local.get()` in devtools console
- For testing with different JSON formats, modify `json-test-page.html`
- Examine the DOM structure to check JSON highlighting is correctly applied

## Final Notes
- Extension architecture prioritizes non-interference with page content
- Version changes should always be synchronized across files
- Add specific detection patterns for common JSON formats in your environment
- When adding new features, consider both performance and browser compatibility

## Dependencies & Development Environment

### Key Dependencies
- **React**: `react` v17.0.2 and `react-dom` v17.0.2 for the UI components
- **JSON Visualization**: `@microlink/react-json-view` v1.27.0 for rich JSON display and interaction
- **Chrome API**: `@types/chrome` for TypeScript definitions of Chrome Extension APIs
- **Build Tools**: 
  - `webpack` v5.58.2 and `webpack-cli` v4.9.1 for bundling
  - `ts-loader` v9.2.6 for TypeScript compilation
  - `typescript` v4.4.4 for type checking
  - `copy-webpack-plugin` for static asset handling
  - `css-loader` and `style-loader` for CSS processing

### Environment Setup
1. **Prerequisites**:
   - Node.js and npm
   - Chrome browser for testing

2. **First-time setup**:
   ```bash
   git clone <repository-url>
   cd chrome_json_viewer
   npm install
   ```

3. **Webpack Configuration**:
   The project uses a three-entry-point structure in `webpack.config.js`:
   ```javascript
   entry: {
       background: './src/background.ts',
       content: './src/content.ts',
       popup: './src/popup.tsx',
   }
   ```

   Asset handling is managed by CopyWebpackPlugin:
   ```javascript
   new CopyWebpackPlugin({
       patterns: [
           { from: 'src/assets/images', to: 'images' },
           { from: 'src/manifest.json', to: 'manifest.json' },
           { from: 'src/popup.html', to: 'popup.html' }
       ],
   })
   ```

4. **TypeScript Configuration**:
   The project uses standard TypeScript configuration in `tsconfig.json` with React JSX support.
