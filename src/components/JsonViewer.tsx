/**
 * JSON Viewer Component with switchable view between react-json-tree and react-json-view
 * 
 * 1. react-json-tree from Redux DevTools
 *    See: https://github.com/reduxjs/redux-devtools/tree/master/packages/react-json-tree
 *    Lightweight and focused on display only
 * 
 * 2. @microlink/react-json-view
 *    Feature-rich JSON editor and viewer
 * 
 * Other alternative libraries:
 * 1. @textea/json-viewer - https://github.com/TexteaInc/json-viewer
 *    Lightweight JSON display component
 * 
 * 2. monaco-editor - https://github.com/microsoft/monaco-editor
 *    Professional editor (powers VS Code) with JSON support
 */

import React, { useState, useEffect } from 'react';
import { JSONTree } from 'react-json-tree';
import ReactJson from '@microlink/react-json-view';
import { 
  formatJsonSize, 
  getDefaultViewType, 
  getAutoSwitchRules,
  determineViewTypeByContent, 
  JsonViewType,
  AutoSwitchRule
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
  key?: string; // 添加可选的 key 属性
}

const JsonViewerComponent: React.FC<JsonViewerProps> = ({ jsonData, version }) => {
  const [expanded, setExpanded] = useState<boolean>(true);
  const [jsonSize, setJsonSize] = useState<string>('');
  const [showHistory, setShowHistory] = useState<boolean>(false);
  // 添加视图类型状态，初始值会在 useEffect 中被覆盖
  const [viewType, setViewType] = useState<JsonViewType>('react-json-view');
  // 添加自动切换规则状态
  const [autoSwitchRules, setAutoSwitchRules] = useState<AutoSwitchRule[]>([]);
  // 添加内部组件 ID 用于强制重新渲染
  const [instanceId] = useState<string>(`json-viewer-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);
  // 添加导航按钮状态
  const [canGoBack, setCanGoBack] = useState<boolean>(false);
  const [canGoForward, setCanGoForward] = useState<boolean>(false);

  // 加载默认视图类型和自动切换规则
  useEffect(() => {
    // 获取默认视图类型
    const loadSettings = async () => {
      const defaultViewType = await getDefaultViewType();
      const rules = await getAutoSwitchRules();
      setAutoSwitchRules(rules);
      
      // 如果有自动切换规则，根据JSON内容决定视图类型
      const jsonString = JSON.stringify(jsonData);
      const determinedType = determineViewTypeByContent(jsonString, defaultViewType, rules);
      setViewType(determinedType);
    };
    
    loadSettings();
  }, [jsonData]);

  // 监听视图类型和自动切换规则更新事件
  useEffect(() => {
    const handleViewTypeUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{viewType: JsonViewType}>;
      if (customEvent.detail && customEvent.detail.viewType) {
        setViewType(customEvent.detail.viewType);
      }
    };
    
    const handleAutoSwitchRulesUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{rules: AutoSwitchRule[]}>;
      if (customEvent.detail && customEvent.detail.rules) {
        setAutoSwitchRules(customEvent.detail.rules);
        
        // 重新根据规则评估视图类型
        getDefaultViewType().then((defaultViewType) => {
          const jsonString = JSON.stringify(jsonData);
          const determinedType = determineViewTypeByContent(jsonString, defaultViewType, customEvent.detail.rules);
          setViewType(determinedType);
        });
      }
    };
    
    // 添加事件监听器
    document.addEventListener('json-view-type-updated', handleViewTypeUpdate);
    document.addEventListener('json-auto-switch-rules-updated', handleAutoSwitchRulesUpdate);
    
    // 清理函数
    return () => {
      document.removeEventListener('json-view-type-updated', handleViewTypeUpdate);
      document.removeEventListener('json-auto-switch-rules-updated', handleAutoSwitchRulesUpdate);
    };
  }, [jsonData]);

  // 确保组件初始化时记录日志
  useEffect(() => {
    console.log(`JSON Viewer mounted: ${instanceId}`, { dataSize: JSON.stringify(jsonData).length });
    
    // 清理函数
    return () => {
      console.log(`JSON Viewer unmounted: ${instanceId}`);
    };
  }, []);
  
  useEffect(() => {
    // Calculate JSON size
    const size = new TextEncoder().encode(JSON.stringify(jsonData)).length;
    setJsonSize(formatJsonSize(size));
    console.log(`JSON size calculated: ${size} bytes`);
    
    // Add to history when JSON data is loaded
    // Use current URL as source
    const jsonString = JSON.stringify(jsonData);
    const currentUrl = window.location.href;
    addToHistory(jsonString, currentUrl)
      .then(id => console.log(`Added to history with ID: ${id}`))
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
    setExpanded(!expanded);
  };
  
  // Toggle between JSON view implementations
  const toggleViewType = () => {
    setViewType(viewType === 'react-json-view' ? 'react-json-tree' : 'react-json-view');
  };

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

  // State for history dropdown
  const [historyItems, setHistoryItems] = useState<Array<{id: string, preview: string, timestamp: number}>>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Load history items for dropdown when needed
  const loadHistoryForDropdown = async () => {
    try {
      // Import dynamically to avoid circular dependency
      const { getHistory, formatTimestamp } = await import('../utils/jsonHistory');
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
      const parsedJson = JSON.parse(jsonString);
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
        />
      ) : (
        <>
          {/* Info and actions bar */}
          <div className="json-viewer-header">
            <div className="json-viewer-info">
              {/* Navigation buttons */}
              <div className="json-viewer-navigation">
                <button 
                  className={`json-viewer-nav-button ${!canGoBack ? 'disabled' : ''}`}
                  onClick={handleNavigateBack}
                  disabled={!canGoBack}
                  title="Back to previous JSON"
                >
                  ◀
                </button>
                <button 
                  className={`json-viewer-nav-button ${!canGoForward ? 'disabled' : ''}`}
                  onClick={handleNavigateForward}
                  disabled={!canGoForward}
                  title="Forward to next JSON"
                >
                  ▶
                </button>

                <span className="json-viewer-version">v{version}</span>
                <span className="json-viewer-size">Size: {jsonSize}</span>
              </div>
            </div>
            <div className="json-viewer-actions">
              <button 
                className="json-viewer-button" 
                onClick={toggleExpand}
              >
                {expanded ? 'Collapse All' : 'Expand All'}
              </button>
              <button 
                className={`json-viewer-button ${copySuccess ? 'success' : ''}`}
                onClick={copyJson}
              >
                {copySuccess ? '✓ Copied' : 'Copy JSON'}
              </button>
              
              {/* Toggle view type button */}
              <button
                className={`json-viewer-button view-toggle-button ${viewType === 'react-json-tree' ? 'tree-active' : 'json-active'}`}
                onClick={toggleViewType}
                title={`Switch to ${viewType === 'react-json-view' ? 'react-json-tree' : 'react-json-view'}`}
              >
                {viewType === 'react-json-view' ? 'Tree View' : 'JSON View'}
              </button>
              
              {/* History dropdown */}
              <div className="json-viewer-dropdown-container">
                <button 
                  className="json-viewer-button history-dropdown-button"
                  onClick={toggleDropdown}
                  title="View history"
                >
                  History ▾
                </button>
                {isDropdownOpen && (
                  <div className="json-viewer-dropdown-menu">
                    <div className="json-viewer-dropdown-header">
                      <span>Recent JSON</span>
                      <button 
                        className="json-viewer-dropdown-view-all"
                        onClick={() => {
                          setIsDropdownOpen(false);
                          toggleHistory();
                        }}
                      >
                        View All
                      </button>
                    </div>
                    {historyItems.length === 0 ? (
                      <div className="json-viewer-dropdown-empty">No history found</div>
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
            </div>
          </div>

          {/* JSON Viewer components - conditionally render based on viewType */}
          <div className="json-tree-container">
            {viewType === 'react-json-tree' ? (
              <JSONTree
                data={jsonData}
                theme={{
                  scheme: 'default',
                  base00: 'transparent', // background
                  base01: '#f5f5f5',     // lines
                  base02: '#e0e0e0',     // borders
                  base03: '#999999',     // punctuation
                  base04: '#777777',     // comments
                  base05: '#333333',     // text
                  base06: '#222222',     // highlights
                  base07: '#111111',     // value text
                  base08: '#b5404a',     // null
                  base09: '#b5622e',     // number
                  base0A: '#9e40b5',     // boolean
                  base0B: '#288c28',     // string
                  base0C: '#0086b3',     // date
                  base0D: '#2e7db5',     // key
                  base0E: '#9e40b5',     // regex
                  base0F: '#777777'      // function
                }}
                invertTheme={false}
                getItemString={() => null}
                shouldExpandNodeInitially={() => expanded}
                hideRoot={false}
                sortObjectKeys={false}
              />
            ) : (
              <ReactJson
                src={jsonData}
                theme="rjv-default"
                style={{ backgroundColor: 'transparent' }}
                collapsed={!expanded}
                collapseStringsAfterLength={false}
                displayDataTypes={false}
                displayObjectSize={true}
                enableClipboard={true}
                escapeStrings={false}
                name={null}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default JsonViewerComponent;
