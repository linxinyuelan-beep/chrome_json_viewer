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
import { WINDOW_UI } from '../config/uiConstants';
import { isJsonSyntaxValid } from '../utils/jsonParse';
import { saveJsonPayload } from '../utils/jsonPayloadStore';
import { createJsonWindowPath, createPopupWindowFeatures } from '../utils/jsonWindowUrl';
import JsonViewerShell from './jsonViewer/JsonViewerShell';
import JsonViewerToolbar from './jsonViewer/JsonViewerToolbar';
import { useJsonClipboard } from './jsonViewer/useJsonClipboard';
import { useJsonHistoryDropdown } from './jsonViewer/useJsonHistoryDropdown';
import { useJsonNavigation } from './jsonViewer/useJsonNavigation';
import { useJsonPath } from './jsonViewer/useJsonPath';
import { useJsonViewerMode } from './jsonViewer/useJsonViewerMode';
import '../assets/styles/history.css';

interface JsonViewerProps {
  jsonData: any;
  version: string;
  onClose?: () => void;
  onOpenJson?: (jsonString: string) => void;
  key?: string; // 添加可选的 key 属性
}

const JsonViewerComponent: React.FC<JsonViewerProps> = ({ jsonData, version, onClose, onOpenJson }) => {
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
  } = useJsonNavigation(onOpenJson);
  const openFullHistory = React.useCallback(() => {
    setShowHistory(current => !current);
  }, []);
  const {
    historyItems,
    isDropdownOpen,
    toggleDropdown,
    viewAllHistory,
    handleSelectFromDropdown,
  } = useJsonHistoryDropdown(openFullHistory, onOpenJson);

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

  // 回退方案：使用 payload store + window.open
  const fallbackOpenWindow = async (jsonString: string) => {
    try {
      if (typeof chrome === 'undefined' || !chrome.storage || !chrome.runtime) {
        throw new Error('Chrome extension APIs are not available');
      }

      const payloadId = await saveJsonPayload(jsonString);
      const windowUrl = chrome.runtime.getURL(createJsonWindowPath(payloadId));
      window.open(
        windowUrl,
        '_blank',
        createPopupWindowFeatures(WINDOW_UI.JSON_WINDOW_WIDTH, WINDOW_UI.JSON_WINDOW_HEIGHT)
      );
    } catch (error) {
      console.error('Error in fallback window opening:', error);
      if (onOpenJson) {
        onOpenJson(jsonString);
      } else {
        alert('Failed to open JSON in new window');
      }
    }
  };

  const openCompare = () => {
    const jsonString = JSON.stringify(jsonData, null, 2);
    const url = chrome.runtime.getURL('json-compare.html?left=' + encodeURIComponent(jsonString));

    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({
        action: MESSAGE_ACTIONS.OPEN_JSON_COMPARE,
        url: url
      }, () => {
        if (chrome.runtime.lastError) {
          console.error('Error opening compare page:', chrome.runtime.lastError);
        }
      });
    } else {
      console.error('Chrome runtime API not available');
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
      if (onOpenJson) {
        onOpenJson(jsonString);
      } else {
        console.error('onOpenJson callback not available');
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
          <JsonViewerToolbar
            i18n={i18n}
            jsonSize={jsonSize}
            currentJsonPath={currentJsonPath}
            pathCopySuccess={pathCopySuccess}
            onCopyPath={copyCurrentPath}
            canGoBack={canGoBack}
            canGoForward={canGoForward}
            onNavigateBack={handleNavigateBack}
            onNavigateForward={handleNavigateForward}
            expanded={expanded}
            onToggleExpand={toggleExpand}
            viewMode={viewMode}
            onToggleViewMode={toggleViewMode}
            isKeySorted={isKeySorted}
            onToggleKeySort={toggleKeySort}
            copySuccess={copySuccess}
            onCopyJson={() => copyJson(jsonData, 'Failed to copy')}
            onOpenInNewWindow={openInNewWindow}
            onOpenCompare={openCompare}
            historyItems={historyItems}
            isDropdownOpen={isDropdownOpen}
            onToggleDropdown={toggleDropdown}
            onViewAllHistory={viewAllHistory}
            onSelectHistoryItem={handleSelectFromDropdown}
            onClose={onClose}
          />

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
