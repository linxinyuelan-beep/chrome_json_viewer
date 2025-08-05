# JSON Formatter & Viewer - Documentation

This directory contains the documentation and demo pages for the JSON Formatter & Viewer Chrome extension.

## Files

### Main Pages
- **`index.html`** - 中文介绍主页 (Chinese homepage)
- **`index-en.html`** - English homepage
- **`privacy-policy.html`** - Privacy policy page

### Test Pages
- **`json-test-page.html`** - Test page with various JSON examples for development
- **`json-input-test.html`** - Input testing page

## Features Highlighted

The homepage showcases all the major features of the extension:

### 🔍 Smart Detection
- Automatic JSON content identification
- Hover detection mode
- Visual highlighting with dotted underlines

### ✨ Formatting & Visualization  
- One-click JSON formatting
- Syntax highlighting
- Interactive tree view
- Expandable/collapsible nodes

### 🔧 Utility Tools
- JSON minification/compression
- String escaping/unescaping
- Microsoft date format conversion (`/Date(timestamp)/` → human readable)
- Copy to clipboard functionality

### 📚 History & Navigation
- Persistent storage of viewed JSON
- Back/forward navigation
- Searchable history panel
- Recent items dropdown

### ⌨️ Keyboard Shortcuts
- `Ctrl+Shift+E` (Mac: `Cmd+Shift+E`) - Format selected JSON
- `Ctrl+Shift+H` (Mac: `Cmd+Shift+H`) - Toggle hover detection

## Viewing the Homepage

To view the homepage locally:

1. **Option 1: Direct file access**
   ```bash
   open docs/index.html
   # or for English version
   open docs/index-en.html
   ```

2. **Option 2: Local server** (recommended for full functionality)
   ```bash
   # From project root
   npx http-server docs -p 8080
   # Then visit http://localhost:8080
   ```

3. **Option 3: Live server** (VS Code extension)
   - Right-click on `index.html` → "Open with Live Server"

## Screenshots

The homepage is designed to include screenshots of the extension in action. To add screenshots:

1. Take screenshots of the extension features
2. Save them in the `docs/` directory with these names:
   - `screenshot-detection.png` - JSON detection in action
   - `screenshot-viewer.png` - JSON viewer interface
   - `screenshot-popup.png` - Extension popup interface

## Customization

The homepage is built with modern CSS and includes:
- Responsive design for mobile/tablet/desktop
- Smooth animations and transitions
- Gradient backgrounds and modern UI elements
- Interactive demo sections
- Syntax-highlighted JSON examples

Feel free to modify the styling, content, or layout to match your preferences or branding.

## Deployment

The homepage can be deployed to:
- GitHub Pages (put in `gh-pages` branch or `/docs` folder)
- Netlify (drag and drop the `docs` folder)
- Vercel (connect GitHub repository)
- Any static hosting service

For GitHub Pages:
1. Go to repository Settings → Pages
2. Select "Deploy from a branch"
3. Choose "main" branch and "/docs" folder
4. Your homepage will be available at `https://username.github.io/repository-name/`
