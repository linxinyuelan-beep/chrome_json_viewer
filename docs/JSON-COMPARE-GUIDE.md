# JSON Compare Feature - Usage Guide

## Overview
The JSON Compare feature allows you to compare two JSON objects side-by-side and visualize their differences with advanced formatting and analysis tools.

## Access Methods

### 1. From Popup
1. Click the extension icon in Chrome toolbar
2. Click on "⚖️ JSON Compare" tab
3. Click "🚀 Open JSON Compare Tool" button

### 2. From JSON Viewer
1. Double-click any detected JSON on a webpage to open the JSON Viewer
2. Click the "⚖️ Compare" button in the viewer toolbar
3. The compare tool will open with the current JSON pre-loaded in the left panel

### 3. Direct URL
Open: `chrome-extension://<extension-id>/json-compare.html`

## Features

### JSON Input & Processing
Each side (left and right) supports:
- **✨ Format**: Auto-format and beautify JSON with proper indentation
- **📦 Minify**: Compress JSON to a single line
- **🔤 Sort Keys**: Alphabetically sort all JSON keys (recursive)
- **🗑️ Remove Empty**: Remove null, empty strings, empty objects, and empty arrays
- **📅 Convert Dates**: Automatically convert Microsoft date format `/Date(...)/ `to readable format

### Comparison Features
- **Side-by-side View**: Two editable panels for comparing JSON
- **Diff Highlighting**:
  - 🟢 Green: Added (exists only in right JSON)
  - 🔴 Red: Deleted (exists only in left JSON)
  - 🟡 Yellow: Modified (different values)
  - ⚪ White: Unchanged

### Navigation & Filtering
- **⏮️ Prev Diff** / **⏭️ Next Diff**: Navigate through differences
- **Show Only Diffs**: Toggle to hide unchanged content
- **Show Sidebar**: View all differences in a structured list
- **Diff Statistics**: Real-time count of added/deleted/modified items

### Advanced Operations
- **🔄 Swap**: Exchange left and right JSON
- **🔗 Merge**: Smart merge of both JSONs (preserves unique content from both sides)
- **📊 Export Report**: Generate a detailed JSON diff report
- **📋 Export Patch**: Create a JSON Patch (RFC 6902) file for applying changes

## Keyboard Shortcuts
- `Ctrl/Cmd + V`: Paste into focused editor
- `Ctrl/Cmd + S`: Save/Export (context-dependent)
- `F3` / `Shift + F3`: Next/Previous difference

## Use Cases

### 1. API Response Comparison
Compare API responses before and after code changes:
```
Left Panel: Old API response
Right Panel: New API response
Action: Identify breaking changes
```

### 2. Configuration Migration
Compare configuration files during migration:
```
Left Panel: Development config
Right Panel: Production config
Action: Verify all required settings are present
```

### 3. Data Validation
Compare expected vs actual results:
```
Left Panel: Expected test data
Right Panel: Actual output
Action: Verify data processing correctness
```

## Tips & Best Practices

1. **Pre-process Before Compare**
   - Format both JSONs first for better readability
   - Sort keys if you want to ignore key order differences
   - Remove empty values if they're not significant

2. **Use Labels**
   - Edit the panel labels (click on "Source JSON"/"Target JSON") to identify your data

3. **Export for Documentation**
   - Use "Export Report" to document API changes
   - Use "Export Patch" for applying changes programmatically

4. **Merge Strategies**
   - Smart Merge: Combines both JSONs, keeps unique content from both
   - Use this when you want to preserve additions from both sides

## Technical Details

### Supported JSON Operations
- Deep nested object comparison
- Array element comparison by index
- Type-aware value comparison
- Configurable comparison options (ignore case, type, etc.)

### Export Formats
- **JSON Report**: Complete diff analysis with statistics
- **JSON Patch**: RFC 6902 compliant patch operations
- **Merged JSON**: Result of merge operation

### Browser Compatibility
- Chrome/Edge: Full support
- Works with any valid JSON structure
- Handles large JSON files (with performance warnings for 1MB+)

## Troubleshooting

### JSON Parse Errors
- **Issue**: "JSON parse error" message
- **Solution**: Ensure valid JSON syntax (use Format button to validate)

### Performance Issues
- **Issue**: Slow comparison with large JSONs
- **Solution**: 
  - Remove unnecessary whitespace (use Minify)
  - Compare smaller sections if possible
  - Use browser's Task Manager to monitor memory

### Missing Differences
- **Issue**: Expected differences not showing
- **Solution**:
  - Check if "Show Only Diffs" is enabled
  - Verify both JSONs are loaded correctly
  - Try sorting keys if order matters

## Future Enhancements
Planned features for future releases:
- Three-way comparison (base, left, right)
- Custom comparison rules
- Ignore specific paths/keys
- JSON Schema validation
- Direct API integration
- Diff history tracking

## Feedback & Support
- GitHub Issues: [Project Repository]
- Extension Store Reviews
- Email: [Contact Information]

---
**Version**: 1.0.22  
**Last Updated**: December 18, 2025
