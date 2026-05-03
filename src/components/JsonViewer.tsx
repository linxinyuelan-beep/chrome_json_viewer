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
import { JsonEditorRef } from './JsonEditorWrapper';
import {
  formatJsonSize
} from '../utils/jsonViewer';
import { addToHistory } from '../utils/jsonHistory';
import History from './History';
import { DEFAULT_LANGUAGE, getCurrentLanguage, getTranslations, LanguageCode, Translations } from '../utils/i18n';
import { STORAGE_KEYS } from '../config/storageKeys';
import { MESSAGE_ACTIONS } from '../config/messageActions';
import { isJsonSyntaxValid } from '../utils/jsonParse';
import JsonViewerPathBar from './jsonViewer/JsonViewerPathBar';
import JsonViewerShell from './jsonViewer/JsonViewerShell';
import { useJsonClipboard } from './jsonViewer/useJsonClipboard';
import { useJsonHistoryDropdown } from './jsonViewer/useJsonHistoryDropdown';
import { useJsonNavigation } from './jsonViewer/useJsonNavigation';
import { useJsonPath } from './jsonViewer/useJsonPath';
import { useJsonViewerMode } from './jsonViewer/useJsonViewerMode';
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
  // 添加排序状态
  const [sortedData, setSortedData] = useState<any>(jsonData);
  const [isKeySorted, setIsKeySorted] = useState<boolean>(false);

  // Ref for JsonEditorWrapper
  const jsonEditorRef = useRef<JsonEditorRef>(null);
  const [i18n, setI18n] = useState<Translations>(getTranslations(DEFAULT_LANGUAGE));
  const { copySuccess, copyJson } = useJsonClipboard();
  const {
    currentJsonPath,
    pathCopySuccess,
    handleJsonPathSelect,
    copyCurrentPath,
  } = useJsonPath({
    errorText: 'Error getting path',
    copyErrorText: 'Failed to copy path',
  });
  const { viewMode, toggleViewMode } = useJsonViewerMode({
    storageKey: STORAGE_KEYS.DEFAULT_VIEWER_MODE,
    waitForStorage: true,
  });
  const {
    canGoBack,
    canGoForward,
    trackJson,
    handleNavigateBack,
    handleNavigateForward,
  } = useJsonNavigation(version);
  const openFullHistory = React.useCallback(() => {
    setShowHistory(current => !current);
  }, []);
  const {
    historyItems,
    isDropdownOpen,
    toggleDropdown,
    viewAllHistory,
    handleSelectFromDropdown,
  } = useJsonHistoryDropdown(version, openFullHistory);

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

    trackJson(jsonString);
  }, [jsonData, trackJson]);

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
          action: MESSAGE_ACTIONS.OPEN_JSON_WINDOW,
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

  // Handle selecting JSON from history (full history panel)
  const handleSelectFromHistory = (jsonString: string) => {
    try {
      if (!isJsonSyntaxValid(jsonString)) {
        throw new Error('Invalid JSON');
      }
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

  // 阻止点击事件冒泡，确保在JSON视图内部的点击不会关闭抽屉
  const stopPropagation = (e: React.MouseEvent) => {
    // 阻止事件冒泡到文档
    e.stopPropagation();
  };

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
          <div className="json-viewer-header">
            <div className="json-viewer-info">
              {/* Navigation buttons */}
              <div className="json-viewer-navigation">
                <button
                  className={`json-viewer-nav-button ${!canGoBack ? 'disabled' : ''}`}
                  onClick={handleNavigateBack}
                  disabled={!canGoBack}
                  title={i18n.backToPreviousJson}
                >
                  ◀
                </button>
                <button
                  className={`json-viewer-nav-button ${!canGoForward ? 'disabled' : ''}`}
                  onClick={handleNavigateForward}
                  disabled={!canGoForward}
                  title={i18n.forwardToNextJson}
                >
                  ▶
                </button>

                <span className="json-viewer-size">{i18n.sizeLabel}: {jsonSize}</span>
              </div>
            </div>
            <JsonViewerPathBar
              path={currentJsonPath}
              copySuccess={pathCopySuccess}
              onCopy={copyCurrentPath}
              title={i18n.copyPathToClipboard}
              containerClassName="json-viewer-path-display"
              valueClassName="json-viewer-path-value"
              buttonClassName="json-viewer-path-copy-btn"
            />
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
                onClick={() => copyJson(jsonData, 'Failed to copy')}
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
                      action: MESSAGE_ACTIONS.OPEN_JSON_COMPARE,
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
                        onClick={viewAllHistory}
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

          <JsonViewerShell
            data={sortedData}
            expanded={expanded}
            viewMode={viewMode}
            editorRef={jsonEditorRef}
            onPathSelect={handleJsonPathSelect}
            loadingText={i18n.loading}
            height="calc(100% - 50px)"
            editorKey={isKeySorted ? 'sorted' : 'unsorted'}
          />
        </>
      )}
    </div>
  );
};

export default JsonViewerComponent;
