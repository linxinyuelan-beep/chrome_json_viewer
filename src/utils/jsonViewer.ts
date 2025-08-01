// JSON Viewer helper functions

/**
 * Configuration for react-json-view
 * Since we're now using react-json-view directly in the React component,
 * we don't need this function anymore, but we keep the file for other utility functions.
 */

// JSON view type options
export type JsonViewType = 'react-json-view' | 'react-json-tree';

// 自动切换配置类型
export interface AutoSwitchRule {
  enabled: boolean;
  patterns: string[]; // 包含这些内容的JSON将触发自动切换
  targetViewType: JsonViewType; // 切换到的目标视图类型
}

// Storage key for JSON view type preference
const VIEW_TYPE_STORAGE_KEY = 'json_viewer_default_view_type';
const AUTO_SWITCH_RULES_KEY = 'json_viewer_auto_switch_rules';

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

// 获取自动切换规则
export function getAutoSwitchRules(): Promise<AutoSwitchRule[]> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(AUTO_SWITCH_RULES_KEY, (result) => {
      const rules = result[AUTO_SWITCH_RULES_KEY] as AutoSwitchRule[];
      resolve(rules || [{ 
        enabled: false, 
        patterns: [], 
        targetViewType: 'react-json-tree' 
      }]); // 默认空规则
    });
  });
}

// 保存自动切换规则
export function saveAutoSwitchRules(rules: AutoSwitchRule[]): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ [AUTO_SWITCH_RULES_KEY]: rules }, () => {
      // 广播规则变化
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, { 
              action: 'updateAutoSwitchRules', 
              rules 
            }).catch(() => {
              // 忽略非活动标签页的错误
            });
          }
        });
      });
      resolve();
    });
  });
}

// 根据JSON内容决定视图类型
export function determineViewTypeByContent(
  jsonString: string, 
  defaultType: JsonViewType, 
  autoSwitchRules: AutoSwitchRule[]
): JsonViewType {
  // 如果没有启用自动规则，直接返回默认类型
  const enabledRules = autoSwitchRules.filter(rule => rule.enabled);
  if (enabledRules.length === 0) {
    return defaultType;
  }

  // 检查每条规则
  for (const rule of enabledRules) {
    if (rule.patterns.some(pattern => pattern && jsonString.includes(pattern))) {
      return rule.targetViewType;
    }
  }

  // 如果没有匹配的规则，返回默认类型
  return defaultType;
}
