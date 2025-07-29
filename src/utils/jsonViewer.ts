// JSON Viewer helper functions

/**
 * Configuration for react-json-view
 * Since we're now using react-json-view directly in the React component,
 * we don't need this function anymore, but we keep the file for other utility functions.
 */

// JSON view type options
export type JsonViewType = 'react-json-view' | 'react-json-tree';

// Storage key for JSON view type preference
const VIEW_TYPE_STORAGE_KEY = 'json_viewer_default_view_type';

// Function to format JSON size for display
export function formatJsonSize(bytes: number): string {
  if (bytes < 1024) {
    return bytes + ' bytes';
  } else if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(1) + ' KB';
  } else {
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
}

// Get the default JSON view type from storage
export function getDefaultViewType(): Promise<JsonViewType> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(VIEW_TYPE_STORAGE_KEY, (result) => {
      const viewType = result[VIEW_TYPE_STORAGE_KEY] as JsonViewType;
      resolve(viewType || 'react-json-view'); // Default to react-json-view if not set
    });
  });
}

// Save the default JSON view type to storage
export function saveDefaultViewType(viewType: JsonViewType): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ [VIEW_TYPE_STORAGE_KEY]: viewType }, () => {
      // Broadcast the change to all content scripts
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, { 
              action: 'updateDefaultViewType', 
              viewType 
            }).catch(() => {
              // Ignore errors for inactive tabs
            });
          }
        });
      });
      resolve();
    });
  });
}
