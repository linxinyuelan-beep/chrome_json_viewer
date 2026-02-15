/**
 * JSON Viewer Component using react-json-view
 * 
 * @microlink/react-json-view
 * Feature-rich JSON editor and viewer
 * 
 * Other alternative libraries:
 * 1. @textea/json-viewer - https://github.com/TexteaInc/json-viewer
 *    Lightweight JSON display component
 * 
 * 2. monaco-editor - https://github.com/microsoft/monaco-editor
 *    Professional editor (powers VS Code) with JSON support
 */

import React, { useState, useEffect, useRef } from 'react';
import ReactJson from '@microlink/react-json-view';
import JsonEditorWrapper, { JsonEditorRef } from './JsonEditorWrapper';
import {
  formatJsonSize
} from '../utils/jsonViewer';
import { addToHistory } from '../utils/jsonHistory';
import {
  addToNavigationHistory,
  navigateBack,
  navigateForward,
  canNavigateBack,
  canNavigateForward
} from '../utils/jsonNavigation';
import History from './History';
import { DEFAULT_LANGUAGE, getCurrentLanguage, getTranslations, LanguageCode, Translations } from '../utils/i18n';
import '../assets/styles/history.css';

// Declare global function that will be added to window by reactJsonDrawer.tsx
declare global {
  interface Window {
    showJsonInDrawerWithReact?: (jsonString: string, version: string) => void;
  }
}

interface JsonViewerProps {
  jsonData: any;
  version: string;
  onClose?: () => void;
  key?: string; // 添加可选的 key 属性
}

const JsonViewerComponent: React.FC<JsonViewerProps> = ({ jsonData, version, onClose }) => {
  const [expanded, setExpanded] = useState<boolean>(true);
  const [jsonSize, setJsonSize] = useState<string>('');
  const [showHistory, setShowHistory] = useState<boolean>(false);
  // 添加内部组件 ID 用于强制重新渲染
  const [instanceId] = useState<string>(`json-viewer-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);
  // 添加导航按钮状态
  const [canGoBack, setCanGoBack] = useState<boolean>(false);
  const [canGoForward, setCanGoForward] = useState<boolean>(false);
  // 添加排序状态
  const [sortedData, setSortedData] = useState<any>(jsonData);
  const [isKeySorted, setIsKeySorted] = useState<boolean>(false);

  // View mode state: 'default' (microlink) or 'editor' (jsoneditor)
  // Initialize as null to wait for settings to load
  const [viewMode, setViewMode] = useState<'default' | 'editor' | null>(null);

  // Ref for JsonEditorWrapper
  const jsonEditorRef = useRef<JsonEditorRef>(null);
  const [i18n, setI18n] = useState<Translations>(getTranslations(DEFAULT_LANGUAGE));

  useEffect(() => {
    let mounted = true;

    const loadLanguage = async () => {
      const lang = await getCurrentLanguage();
      if (mounted) {
        setI18n(getTranslations(lang));
      }
    };
    loadLanguage();

    const handleLanguageChange = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName === 'local' && changes.language?.newValue) {
        setI18n(getTranslations(changes.language.newValue as LanguageCode));
      }
    };

    chrome.storage.onChanged.addListener(handleLanguageChange);

    return () => {
      mounted = false;
      chrome.storage.onChanged.removeListener(handleLanguageChange);
    };
  }, []);

  // Load view mode from settings (defaultViewerMode)
  useEffect(() => {
    chrome.storage.local.get(['defaultViewerMode'], (result) => {
      // Set the mode from settings, or default to 'default' if not set
      setViewMode(result.defaultViewerMode || 'default');
    });
  }, []);

  // Toggle view mode (only for current session, doesn't persist)
  const toggleViewMode = () => {
    if (viewMode === null) return; // Don't toggle if still loading
    const newMode = viewMode === 'default' ? 'editor' : 'default';
    setViewMode(newMode);
    // Note: We no longer persist this preference, it only affects the current view
    // The default mode is controlled by the settings page
  };

  // 确保组件初始化时记录日志
  useEffect(() => {
    // 清理函数
    return () => {
      // console.log(`JSON Viewer unmounted: ${instanceId}`);
    };
  }, []);

  // 排序JSON键的函数
  const sortObjectKeys = (obj: any): any => {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => sortObjectKeys(item));
    }

    const sortedKeys = Object.keys(obj).sort((a, b) => a.localeCompare(b));
    const sortedObj: any = {};

    for (const key of sortedKeys) {
      sortedObj[key] = sortObjectKeys(obj[key]);
    }

    return sortedObj;
  };

  // 切换键排序状态
  const toggleKeySort = () => {
    if (isKeySorted) {
      // 恢复原始数据
      setSortedData(jsonData);
      setIsKeySorted(false);
    } else {
      // 排序数据
      const sorted = sortObjectKeys(jsonData);
      setSortedData(sorted);
      setIsKeySorted(true);
    }
  };

  useEffect(() => {
    // 重置排序状态和数据
    setSortedData(jsonData);
    setIsKeySorted(false);

    // Calculate JSON size
    const size = new TextEncoder().encode(JSON.stringify(jsonData)).length;
    setJsonSize(formatJsonSize(size));

    // Add to history when JSON data is loaded
    // Use current URL as source
    const jsonString = JSON.stringify(jsonData);
    const currentUrl = window.location.href;
    addToHistory(jsonString, currentUrl)
      .catch(err => console.error('Error adding to history:', err));

    // 添加到导航历史
    addToNavigationHistory(jsonString);

    // 更新导航按钮状态
    setCanGoBack(canNavigateBack());
    setCanGoForward(canNavigateForward());
  }, [jsonData]);

  // 监听导航状态更新事件
  useEffect(() => {
    const handleNavigationUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail) {
        setCanGoBack(customEvent.detail.canGoBack);
        setCanGoForward(customEvent.detail.canGoForward);
      }
    };

    // 添加事件监听器
    document.addEventListener('json-navigation-updated', handleNavigationUpdate);

    // 清理函数
    return () => {
      document.removeEventListener('json-navigation-updated', handleNavigationUpdate);
    };
  }, []);

  // For react-json-view, we use predefined themes
  // Available themes: "apathy", "apathy:inverted", "ashes", "bespin", "brewer",
  // "bright:inverted", "bright", "chalk", "codeschool", "colors", "eighties",
  // "embers", "flat", "google", "grayscale", "grayscale:inverted", "greenscreen",
  // "harmonic", "hopscotch", "isotope", "marrakesh", "mocha", "monokai", "ocean",
  // "paraiso", "pop", "railscasts", "rjv-default", "shapeshifter", "shapeshifter:inverted",
  // "solarized", "summerfruit", "summerfruit:inverted", "threezerotwofour", "tomorrow",
  // "tube", "twilight"

  // Open JSON in new window
  const openInNewWindow = () => {
    try {
      // 准备JSON数据
      const jsonString = JSON.stringify(jsonData);

      // 发送消息给background script来打开新窗口
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({
          action: 'openJsonWindow',
          jsonData: jsonString // 直接传递JSON字符串，不进行URL编码
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('Error opening new window:', chrome.runtime.lastError);
            // 回退到普通窗口打开（使用存储API）
            fallbackOpenWindow(jsonString);
          } else if (response && response.success) {
            console.log('New window opened successfully');
          } else {
            console.error('Failed to open new window:', response?.error);
            fallbackOpenWindow(jsonString);
          }
        });
      } else {
        // 如果chrome API不可用，使用回退方案
        fallbackOpenWindow(jsonString);
      }
    } catch (error) {
      console.error('Error preparing JSON for new window:', error);
    }
  };

  // 回退方案：使用存储API + window.open
  const fallbackOpenWindow = async (jsonString: string) => {
    try {
      // 生成唯一的键名用于存储
      const storageKey = `json_data_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      // 将JSON数据存储到Chrome存储中
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set({ [storageKey]: jsonString }, () => {
          const windowUrl = chrome.runtime.getURL(`json-window.html?key=${storageKey}`);
          window.open(windowUrl, '_blank', 'width=1000,height=700,scrollbars=yes,resizable=yes');
        });
      } else {
        // 最后的回退方案：使用sessionStorage
        const storageKey = `json_data_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        sessionStorage.setItem(storageKey, jsonString);
        const windowUrl = `/json-window.html?sessionKey=${storageKey}`;
        window.open(windowUrl, '_blank', 'width=1000,height=700,scrollbars=yes,resizable=yes');
      }
    } catch (error) {
      console.error('Error in fallback window opening:', error);
      alert('Failed to open JSON in new window');
    }
  };

  // Copy JSON to clipboard
  const copyJson = async () => {
    try {
      const formattedJson = JSON.stringify(jsonData, null, 2);

      // First try the modern clipboard API
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(formattedJson);
      } else {
        // Fallback to execCommand for older browsers or when Clipboard API is not available
        const textArea = document.createElement('textarea');
        textArea.value = formattedJson;
        // Make the textarea out of viewport
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        const successful = document.execCommand('copy');
        if (!successful) {
          throw new Error('Failed to copy using execCommand');
        }

        document.body.removeChild(textArea);
      }

      // Show success feedback
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err: unknown) {
      console.error('Failed to copy JSON:', err);
      // Show error feedback to the user
      let errorMessage = 'Unknown error';
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      alert('Failed to copy: ' + errorMessage);
    }
  };

  // Toggle expand/collapse all
  const toggleExpand = () => {
    const newExpanded = !expanded;
    setExpanded(newExpanded);

    // If in editor mode, also trigger editor methods
    if (viewMode === 'editor' && jsonEditorRef.current) {
      if (newExpanded) {
        jsonEditorRef.current.expandAll();
      } else {
        jsonEditorRef.current.collapseAll();
      }
    }
  };

  // 视图类型切换功能已移除

  // Handle navigation back
  const handleNavigateBack = () => {
    const previousJson = navigateBack();
    if (previousJson && window.showJsonInDrawerWithReact) {
      window.showJsonInDrawerWithReact(previousJson, version);
    }
  };

  // Handle navigation forward
  const handleNavigateForward = () => {
    const nextJson = navigateForward();
    if (nextJson && window.showJsonInDrawerWithReact) {
      window.showJsonInDrawerWithReact(nextJson, version);
    }
  };

  // Copy success state
  const [copySuccess, setCopySuccess] = useState(false);

  // JSON path state
  const [currentJsonPath, setCurrentJsonPath] = useState<string>('');
  const [pathCopySuccess, setPathCopySuccess] = useState(false);

  // Handle JSON path selection and display
  const handleJsonPathSelect = (selectInfo: any) => {
    try {
      console.log('Select info:', selectInfo); // Debug log to see what we get

      // Build JSON path from namespace and current key
      let pathParts: (string | number)[] = [];

      // Add namespace parts if available
      if (selectInfo.namespace && selectInfo.namespace.length > 0) {
        pathParts = [...selectInfo.namespace];
      }

      // Add current key name if available and not null
      if (selectInfo.name !== null && selectInfo.name !== undefined) {
        pathParts.push(selectInfo.name);
      }

      let path = '';
      if (pathParts.length > 0) {
        // Convert path parts array to dot notation
        path = pathParts.map((key: any) => {
          // Handle array indices and object keys
          if (typeof key === 'number') {
            return `[${key}]`;
          } else if (typeof key === 'string') {
            // 如果是数字字符串，则作为数组索引处理
            if (/^\d+$/.test(key)) {
              return `[${key}]`;
            }
            // Check if key contains special characters that need bracket notation
            if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key)) {
              return `.${key}`;
            } else {
              return `["${key}"]`;
            }
          }
          return `.${key}`;
        }).join('');

        // Remove leading dot if present
        if (path.startsWith('.')) {
          path = path.substring(1);
        }

        // Add root prefix if needed
        if (path) {
          path = `$${path.startsWith('[') ? '' : '.'}${path}`;
        } else {
          path = '$';
        }
      } else {
        path = '$';
      }

      // Update current path display
      setCurrentJsonPath(path);

      // Log the path for debugging
      console.log('JSON Path selected:', path);
      console.log('Path parts:', pathParts);
    } catch (err: unknown) {
      console.error('Failed to process JSON path:', err);
      setCurrentJsonPath('Error getting path');
    }
  };

  // Copy current path to clipboard
  const copyCurrentPath = async () => {
    if (!currentJsonPath) {
      return;
    }

    try {
      // Copy path to clipboard
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(currentJsonPath);
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = currentJsonPath;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        const successful = document.execCommand('copy');
        if (!successful) {
          throw new Error('Failed to copy using execCommand');
        }

        document.body.removeChild(textArea);
      }

      // Show success feedback
      setPathCopySuccess(true);
      setTimeout(() => setPathCopySuccess(false), 2000);

      console.log('JSON Path copied:', currentJsonPath);
    } catch (err: unknown) {
      console.error('Failed to copy JSON path:', err);
      let errorMessage = 'Unknown error';
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      alert('Failed to copy path: ' + errorMessage);
    }
  };

  // State for history dropdown
  const [historyItems, setHistoryItems] = useState<Array<{ id: string, preview: string, timestamp: number }>>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Load history items for dropdown when needed
  const loadHistoryForDropdown = async () => {
    try {
      // Import dynamically to avoid circular dependency
      const { getHistory } = await import('../utils/jsonHistory');
      const items = await getHistory();
      // Format items for dropdown display
      const formattedItems = items.map(item => ({
        id: item.id,
        preview: item.preview,
        timestamp: item.timestamp
      }));
      setHistoryItems(formattedItems);
    } catch (e) {
      console.error('Error loading history for dropdown:', e);
    }
  };

  // Toggle history panel for full view
  const toggleHistory = () => {
    setShowHistory(!showHistory);
  };

  // Toggle dropdown
  const toggleDropdown = async () => {
    if (!isDropdownOpen) {
      await loadHistoryForDropdown();
    }
    setIsDropdownOpen(!isDropdownOpen);
  };

  // Handle selecting JSON from history (full history panel)
  const handleSelectFromHistory = (jsonString: string) => {
    try {
      JSON.parse(jsonString); // Validate JSON
      // Replace the current JSON with the selected one from history
      if (window.showJsonInDrawerWithReact) {
        window.showJsonInDrawerWithReact(jsonString, version);
      } else {
        console.error('showJsonInDrawerWithReact function not available');
      }
    } catch (e) {
      console.error('Error parsing JSON from history:', e);
    }
  };

  // Handle selecting JSON from dropdown
  const handleSelectFromDropdown = async (id: string) => {
    try {
      // Close the dropdown
      setIsDropdownOpen(false);

      // Import dynamically
      const { getHistoryItem } = await import('../utils/jsonHistory');
      const item = await getHistoryItem(id);

      if (item && item.jsonData) {
        // Use the same function to display the selected JSON
        if (window.showJsonInDrawerWithReact) {
          window.showJsonInDrawerWithReact(item.jsonData, version);
        } else {
          console.error('showJsonInDrawerWithReact function not available');
        }
      }
    } catch (e) {
      console.error('Error selecting from dropdown:', e);
    }
  };

  // 阻止点击事件冒泡，确保在JSON视图内部的点击不会关闭抽屉
  const stopPropagation = (e: React.MouseEvent) => {
    // 阻止事件冒泡到文档
    e.stopPropagation();
  };

  // 添加点击外部关闭下拉框的事件处理
  useEffect(() => {
    if (isDropdownOpen) {
      const handleClickOutside = (event: MouseEvent) => {
        const dropdown = document.querySelector('.json-viewer-dropdown-container');
        if (dropdown && !dropdown.contains(event.target as Node)) {
          setIsDropdownOpen(false);
        }
      };

      // 添加事件监听器
      document.addEventListener('click', handleClickOutside);

      // 清理函数
      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [isDropdownOpen]);;

  return (
    <div
      className="json-viewer-component"
      onClick={stopPropagation} // 添加点击处理以阻止冒泡
    >
      {showHistory ? (
        <History
          onSelect={handleSelectFromHistory}
          onClose={() => setShowHistory(false)}
          translations={i18n}
        />
      ) : (
        <>
          {/* Info and actions bar */}
          <div className="json-drawer-header">
            <div className="json-viewer-actions left-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* Navigation buttons */}
              <button
                className={`json-viewer-button ${!canGoBack ? 'disabled' : ''}`}
                onClick={handleNavigateBack}
                disabled={!canGoBack}
                title={i18n.backToPreviousJson}
                style={{ padding: '0 8px' }}
              >
                ◀
              </button>
              <button
                className={`json-viewer-button ${!canGoForward ? 'disabled' : ''}`}
                onClick={handleNavigateForward}
                disabled={!canGoForward}
                title={i18n.forwardToNextJson}
                style={{ padding: '0 8px' }}
              >
                ▶
              </button>

              <span className="json-viewer-size" style={{ fontSize: '12px', color: '#6b7280', marginLeft: '8px' }}>
                {i18n.sizeLabel}: {jsonSize}
              </span>
            </div>

            {/* JSON Path display */}
            {currentJsonPath && (
              <div className="json-viewer-path-display" style={{ 
                flex: 1, 
                margin: '0 16px', 
                background: '#f3f4f6', 
                padding: '4px 8px', 
                borderRadius: '4px',
                fontSize: '12px',
                color: '#374151',
                fontFamily: 'monospace',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <code className="json-viewer-path-value" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentJsonPath}</code>
                <button
                  className={`json-viewer-path-copy-btn ${pathCopySuccess ? 'success' : ''}`}
                  onClick={copyCurrentPath}
                  title={i18n.copyPathToClipboard}
                  style={{ 
                    border: 'none', 
                    background: 'transparent', 
                    cursor: 'pointer', 
                    fontSize: '14px',
                    marginLeft: '8px',
                    padding: '0 4px' 
                  }}
                >
                  {pathCopySuccess ? '✓' : '📋'}
                </button>
              </div>
            )}

            <div className="json-viewer-actions">
              <button
                className="json-viewer-button"
                onClick={toggleExpand}
              >
                {expanded ? i18n.collapseAll : i18n.expandAll}
              </button>
              <button
                className={`json-viewer-button ${viewMode === 'editor' ? 'active' : ''}`}
                onClick={toggleViewMode}
                title={i18n.switchBetweenTreeAndEditor}
              >
                {viewMode === 'default' ? i18n.switchToEditor : i18n.switchToTree}
              </button>
              <button
                className={`json-viewer-button ${isKeySorted ? 'active' : ''}`}
                onClick={toggleKeySort}
                title={i18n.sortJsonKeysAlphabetically}
              >
                {isKeySorted ? i18n.unsortKeys : i18n.sortKeys}
              </button>
              <button
                className={`json-viewer-button ${copySuccess ? 'success' : ''}`}
                onClick={copyJson}
              >
                {copySuccess ? `✓ ${i18n.copied}` : i18n.copyJson}
              </button>
              <button
                className="json-viewer-button"
                onClick={openInNewWindow}
                title={i18n.openJsonInNewWindow}
              >
                {i18n.newWindow}
              </button>
              <button
                className="json-viewer-button"
                onClick={() => {
                  const jsonString = JSON.stringify(jsonData, null, 2);
                  const url = chrome.runtime.getURL('json-compare.html?left=' + encodeURIComponent(jsonString));

                  // 通过消息传递让 background script 创建标签页
                  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
                    chrome.runtime.sendMessage({
                      action: 'openJsonCompare',
                      url: url
                    }, (response) => {
                      if (chrome.runtime.lastError) {
                        console.error('Error opening compare page:', chrome.runtime.lastError);
                      }
                    });
                  } else {
                    console.error('Chrome runtime API not available');
                  }
                }}
                title={i18n.compareWithAnotherJson}
              >
                {`${i18n.compare}`}
              </button>

              {/* History dropdown */}
              <div className="json-viewer-dropdown-container">
                <button
                  className="json-viewer-button history-dropdown-button"
                  onClick={toggleDropdown}
                  title={i18n.viewHistory}
                >
                  {`${i18n.history} ▾`}
                </button>
                {isDropdownOpen && (
                  <div className="json-viewer-dropdown-menu">
                    <div className="json-viewer-dropdown-header">
                      <span>{i18n.recentJson}</span>
                      <button
                        className="json-viewer-dropdown-view-all"
                        onClick={() => {
                          setIsDropdownOpen(false);
                          toggleHistory();
                        }}
                      >
                        {i18n.viewAll}
                      </button>
                    </div>
                    {historyItems.length === 0 ? (
                      <div className="json-viewer-dropdown-empty">{i18n.noHistoryFound}</div>
                    ) : (
                      <>
                        {historyItems.slice(0, 10).map(item => (
                          <div
                            key={item.id}
                            className="json-viewer-dropdown-item"
                            onClick={() => handleSelectFromDropdown(item.id)}
                            title={new Date(item.timestamp).toLocaleString()}
                          >
                            {item.preview}
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
              <button className="json-drawer-close" onClick={onClose}>&times;</button>
            </div>
          </div>

          {/* JSON Viewer component */}
          <div className="json-tree-container" style={{ height: 'calc(100% - 50px)' }}>
            {viewMode === null ? (
              // Loading state while fetching settings
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#666' }}>
                {i18n.loading}
              </div>
            ) : viewMode === 'default' ? (
              <ReactJson
                src={sortedData}
                theme="rjv-default"
                style={{ backgroundColor: 'transparent' }}
                collapsed={!expanded}
                collapseStringsAfterLength={false}
                displayDataTypes={false}
                displayObjectSize={true}
                enableClipboard={(copy) => {
                  // Custom clipboard handler to remove quotes from string values
                  let textToCopy: string;
                  if (typeof copy.src === 'string') {
                    // For string values, copy without quotes
                    textToCopy = copy.src;
                  } else {
                    // For objects/arrays, copy as formatted JSON
                    textToCopy = JSON.stringify(copy.src, null, 2);
                  }

                  // Copy to clipboard
                  if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(textToCopy).catch(err => {
                      console.error('Failed to copy:', err);
                    });
                  } else {
                    // Fallback for older browsers
                    const textArea = document.createElement('textarea');
                    textArea.value = textToCopy;
                    textArea.style.position = 'fixed';
                    textArea.style.left = '-999999px';
                    textArea.style.top = '-999999px';
                    document.body.appendChild(textArea);
                    textArea.focus();
                    textArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textArea);
                  }
                }}
                escapeStrings={false}
                name={null}
                onSelect={(select) => {
                  // Handle JSON path display functionality
                  handleJsonPathSelect(select);
                }}
              />
            ) : (
              <JsonEditorWrapper
                ref={jsonEditorRef}
                key={isKeySorted ? 'sorted' : 'unsorted'}
                data={sortedData}
                mode="view"
                expanded={expanded} // Pass expanded state
                onChange={(newData) => {
                  // Optional: if we want to update the source data when edited
                  // setSortedData(newData); 
                }}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default JsonViewerComponent;
