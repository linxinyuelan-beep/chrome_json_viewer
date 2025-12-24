# Site Filter Feature - Quick Start Guide

## 🎯 Feature Overview

The Site Filter feature allows you to control where the JSON Formatter & Viewer extension is active. You can create blacklists (disable on specific sites) or whitelists (enable only on specific sites).

## 📋 Quick Setup

### Step 1: Open the Extension Popup
Click the extension icon in your browser toolbar.

### Step 2: Navigate to Site Filter Tab
Click on the "Site Filter" (网站过滤) tab in the popup.

### Step 3: Choose Your Mode

**Option A: Blacklist Mode**
- Select "Blacklist" from the Filter Mode dropdown
- Add sites where you want to DISABLE the extension
- The extension will work everywhere except the listed sites

**Option B: Whitelist Mode**
- Select "Whitelist" from the Filter Mode dropdown
- Add sites where you want to ENABLE the extension
- The extension will ONLY work on the listed sites

**Option C: Disabled (Default)**
- Select "Disabled" to make the extension work on all sites

### Step 4: Add Sites

**Method 1: Add Current Site**
- While on a website, click "Add Current Site" button
- The current site's hostname will be automatically added

**Method 2: Manual Entry**
- Type a site pattern in the input box
- Press Enter or click "Add Site"

### Step 5: Manage Your List
- View all added sites in the list
- Click "Remove" next to any site to delete it
- Changes are saved automatically

## 🔧 Pattern Examples

### Exact Domain Match
```
example.com
```
Matches: `example.com`, `www.example.com`, `subdomain.example.com`

### Subdomain Wildcard
```
*.example.com
```
Matches: `www.example.com`, `api.example.com`  
Does NOT match: `example.com` (main domain)

### Global Wildcard
```
*example*
```
Matches: Any domain containing "example"

### Localhost
```
localhost
```
Matches: `localhost` (useful for development)

## 💡 Usage Scenarios

### For Developers
**Whitelist Mode - Development Only**
```
localhost
127.0.0.1
*.dev.company.com
*.staging.company.com
```
Enable extension only on development environments.

### For API Testing
**Whitelist Mode - API Endpoints**
```
api.example.com
*.api.example.com
postman.com
```
Enable extension only when viewing API responses.

### For Privacy
**Blacklist Mode - Sensitive Sites**
```
bank.com
*.financial-site.com
intranet.company.com
```
Disable extension on sensitive or internal sites.

## ⚠️ Important Notes

1. **Page Refresh Required**: After changing settings, affected pages will be automatically reloaded
2. **One Mode at a Time**: You can only use blacklist OR whitelist mode, not both
3. **Local Storage**: Site list is stored locally in your browser
4. **Pattern Matching**: Wildcards (*) can be used anywhere in the pattern

## 🧪 Testing Your Setup

1. Open the test page: `docs/site-filter-test.html`
2. Configure your filter settings
3. Refresh the test page
4. Try hovering over or double-clicking the JSON examples
5. Verify the extension behaves according to your settings

## 🐛 Troubleshooting

**Extension not working after adding to whitelist?**
- Make sure you're in whitelist mode (not blacklist)
- Check the pattern matches the current site
- Try refreshing the page

**Extension still working after adding to blacklist?**
- Verify you're in blacklist mode
- Check the site pattern is correct
- Reload the page to apply changes

**Patterns not matching?**
- Check for typos in domain names
- Ensure wildcards are used correctly
- Try using the "Add Current Site" button for exact matching

## 📚 More Information

For detailed documentation, see:
- [Site Filter Guide](./site-filter-guide.md) - Complete documentation
- [GitHub Repository](https://github.com/linxinyuelan-beep/chrome_json_viewer) - Source code and issues

---

**Version**: 1.0.24+  
**Last Updated**: December 24, 2024
