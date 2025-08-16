# README.md

# Chrome Extension Project

This project is a simple Chrome extension that enhances the user experience by providing a user-friendly interface and useful functionalities.

## Project Structure

# JSON Formatter & Viewer Chrome Extension

A powerful Chrome extension that automatically detects, highlights, formats, and visualizes JSON on web pages, making it easier to work with JSON data while browsing.

![JSON Formatter & Viewer](https://raw.githubusercontent.com/linxinyuelan-beep/chrome_json_viewer/refs/heads/main/src/assets/images/icon.png)

## Features

- **Automatic JSON Detection**: Identifies JSON content on any web page
- **Hover Detection**: Highlights potential JSON on mouseover (toggle with Ctrl+Shift+H)
- **JSON Formatting**: One-click formatting of selected JSON text
- **Interactive Viewer**: View formatted JSON in a slide-out drawer
- **Manual JSON Input**: Input and format JSON directly from the popup
- **JSON Minification**: Compress JSON to a single line without whitespace
- **String Escaping/Unescaping**: Tools to escape and unescape JSON strings
- **Date Format Conversion**: Convert Microsoft-style dates to human-readable format
- **History Tracking**: Navigate through previously viewed JSON
- **Copy to Clipboard**: Easily copy formatted JSON
- **Keyboard Shortcuts**: Quick access to features
- **Automatic JSON Extraction**: Automatically extract JSON from log files and mixed content

## Project Structure

```
chrome-extension
├── src
│   ├── assets
│   │   ├── images             # Extension icons
│   │   └── styles
│   │       ├── json-drawer.css        # Styling for JSON drawer
│   │       ├── json-viewer-component.css  # Styling for JSON viewer
│   │       ├── history.css      # Styling for history component
│   │       └── main.css         # Global styles
│   ├── components
│   │   ├── History.tsx         # History management component
│   │   └── JsonViewer.tsx      # JSON visualization component
│   ├── config
│   │   └── version.ts          # Auto-generated version info
│   ├── utils
│   │   ├── jsonHistory.ts      # Persistent JSON history storage
│   │   ├── jsonNavigation.ts   # In-memory navigation history
│   │   ├── jsonViewer.ts       # Viewer utilities
│   │   ├── nestedJsonHandler.ts # JSON validation utilities
│   │   └── reactJsonDrawer.tsx # React integration for content script
│   ├── background.ts           # Background service worker
│   ├── content.ts              # Content script for JSON detection
│   ├── json-test-page.html     # Test page with JSON examples
│   ├── manifest.json           # Extension configuration
│   ├── popup.html              # Popup HTML
│   └── popup.tsx               # Popup UI component
├── public                      # Build output directory
├── scripts
│   └── version-sync.js         # Version synchronization script
├── package.json                # npm configuration
├── tsconfig.json               # TypeScript configuration
├── webpack.config.js           # Webpack configuration
└── README.md                   # Project documentation
```

## Getting Started

1. **Clone the repository**:
   ```bash
   git clone https://github.com/sangzhenya/chrome_json_viewer.git
   cd chrome_json_viewer
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Build the project**:
   ```bash
   npm run build  # Production build
   # or
   npm run dev    # Development build
   # or
   npm run watch  # Watch mode for development
   ```

4. **Load the extension in Chrome**:
   - Open Chrome and navigate to `chrome://extensions/`.
   - Enable "Developer mode".
   - Click "Load unpacked" and select the `public` directory.

## Usage

### JSON Detection
The extension automatically detects and highlights JSON content on web pages. You can:
- Hover over text to detect JSON (when hover detection is enabled)
- Double-click on highlighted JSON to open it in the viewer
- Select any text and press Ctrl+Shift+E (Cmd+Shift+E on Mac) to format it as JSON
- Click the extension icon and paste JSON directly into the popup

### JSON Viewer
The JSON viewer provides:
- Expandable/collapsible tree view of JSON data
- Back/Forward navigation through viewed JSON
- Copy formatted JSON to clipboard
- **JSON Path Display**: Click any JSON value to see its path in dot notation
- Copy JSON paths to clipboard for easy reference
- History dropdown to access recently viewed JSON

### Popup Interface
The extension popup offers:
- Direct JSON input and formatting
- JSON minification (compression to single line)
- String escaping and unescaping tools
- Date format conversion for Microsoft-style dates (/Date(timestamp)/)
- Key-value pair to JSON conversion
- Automatic JSON extraction from log files and mixed content
- Quick access to extension settings

### Keyboard Shortcuts
- `Ctrl+Shift+E` (Mac: `Cmd+Shift+E`): Format selected text as JSON
- `Ctrl+Shift+H` (Mac: `Cmd+Shift+H`): Toggle hover detection

## Development

### Version Management
```bash
# Update version in package.json first, then run:
npm run version-sync
```

### Testing
For quick testing of JSON detection features, open `src/json-test-page.html` after loading the extension.

## Contributing

Feel free to submit issues or pull requests for improvements or bug fixes. Contributions are welcome!

## License

This project is licensed under the MIT License.