/**
 * JSON History management utility
 * Handles storing, retrieving, and managing history of viewed JSON data
 */

// Maximum number of history entries to store
const MAX_HISTORY_ITEMS = 50;

// Interface for JSON history entry
export interface JsonHistoryItem {
  id: string;
  timestamp: number;
  preview: string;
  jsonData: string; // Full JSON string
  source: string; // Where the JSON was found (page URL)
  size: number; // Size in bytes
}

/**
 * Store JSON in history
 * @param jsonData The JSON data to store
 * @param url Current page URL
 */
export async function addToHistory(jsonData: string, url: string): Promise<string> {
  try {
    // Create a unique ID for this history entry
    const id = `json-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Get preview (first 50 chars)
    const preview = jsonData.substring(0, 50) + (jsonData.length > 50 ? '...' : '');
    
    // Create history item
    const historyItem: JsonHistoryItem = {
      id,
      timestamp: Date.now(),
      preview,
      jsonData,
      source: url,
      size: new TextEncoder().encode(jsonData).length
    };
    
    // Get current history
    const history = await getHistory();
    
    // Add new item at the beginning
    history.unshift(historyItem);
    
    // Limit history size
    if (history.length > MAX_HISTORY_ITEMS) {
      history.pop();
    }
    
    // Save history
    await saveHistory(history);
    
    console.log(`Added JSON to history, id: ${id}, size: ${historyItem.size} bytes`);
    
    // Return the ID of the added item
    return id;
  } catch (e) {
    console.error('Error adding JSON to history:', e);
    return '';
  }
}

/**
 * Get all history items
 * @returns Array of history items
 */
export async function getHistory(): Promise<JsonHistoryItem[]> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['jsonHistory'], (result) => {
      const history = result.jsonHistory || [];
      resolve(history);
    });
  });
}

/**
 * Save history to storage
 * @param history Array of history items to save
 */
async function saveHistory(history: JsonHistoryItem[]): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ jsonHistory: history }, () => {
      resolve();
    });
  });
}

/**
 * Clear all history
 */
export async function clearHistory(): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ jsonHistory: [] }, () => {
      resolve();
    });
  });
}

/**
 * Get a specific history item by ID
 * @param id ID of the history item to retrieve
 */
export async function getHistoryItem(id: string): Promise<JsonHistoryItem | null> {
  const history = await getHistory();
  return history.find(item => item.id === id) || null;
}

/**
 * Delete a specific history item by ID
 * @param id ID of the history item to delete
 */
export async function deleteHistoryItem(id: string): Promise<void> {
  const history = await getHistory();
  const newHistory = history.filter(item => item.id !== id);
  await saveHistory(newHistory);
}

/**
 * Format timestamp into readable date
 * @param timestamp Timestamp to format
 */
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString();
}

/**
 * Format JSON size into human-readable format
 * @param bytes Size in bytes
 */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
