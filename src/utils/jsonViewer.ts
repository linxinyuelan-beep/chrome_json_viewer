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

// Import the consistent JSON validation function
import { isValidNestedJson } from './nestedJsonHandler';

// Re-export for backward compatibility
export const isValidJson = isValidNestedJson;

// Copy JSON to clipboard with formatting
export async function copyFormattedJson(jsonData: any): Promise<void> {
  try {
    const formattedJson = JSON.stringify(jsonData, null, 2);
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(formattedJson);
      return;
    }
    
    // Fallback method
    const textArea = document.createElement('textarea');
    textArea.value = formattedJson;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    
    if (!success) {
      throw new Error('Copy command was unsuccessful');
    }
  } catch (err) {
    console.error('Copy failed:', err);
    throw err;
  }
}
