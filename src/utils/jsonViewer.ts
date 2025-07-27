// JSON Viewer helper functions

/**
 * Configuration for react-json-view
 * Since we're now using react-json-view directly in the React component,
 * we don't need this function anymore, but we keep the file for other utility functions.
 */

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
