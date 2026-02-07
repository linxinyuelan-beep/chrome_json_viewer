import './config/public-path';
import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import ReactJson from '@microlink/react-json-view';
import JsonEditorWrapper, { JsonEditorRef } from './components/JsonEditorWrapper';
import { DEFAULT_LANGUAGE, getCurrentLanguage, getTranslations, LanguageCode, Translations } from './utils/i18n';

// JSON Window React Component
const JsonWindowApp: React.FC = () => {
  const [jsonData, setJsonData] = useState<any>(null);
  const [jsonSize, setJsonSize] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState(false);

  // JSON path related states
  const [currentJsonPath, setCurrentJsonPath] = useState<string>('');
  const [pathCopySuccess, setPathCopySuccess] = useState(false);
  const [i18n, setI18n] = useState<Translations>(getTranslations(DEFAULT_LANGUAGE));

  // View mode state: 'default' (microlink) or 'editor' (jsoneditor)
  const [viewMode, setViewMode] = useState<'default' | 'editor'>('default');

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

  useEffect(() => {
    document.title = i18n.jsonViewerTitle;
  }, [i18n]);

  // Load view mode preference
  useEffect(() => {
    chrome.storage.local.get(['preferredViewMode'], (result) => {
      if (result.preferredViewMode) {
        setViewMode(result.preferredViewMode);
      }
    });
  }, []);

  // Toggle view mode
  const toggleViewMode = () => {
    const newMode = viewMode === 'default' ? 'editor' : 'default';
    setViewMode(newMode);
    chrome.storage.local.set({ preferredViewMode: newMode });
  };

  // 通过消息机制从后台脚本获取JSON数据
  const getJsonFromBackground = async (): Promise<any> => {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      try {
        return new Promise((resolve) => {
          chrome.runtime.sendMessage({ cmd: 'getJson' }, (response) => {
            if (chrome.runtime.lastError) {
              console.error('Error getting JSON from background:', chrome.runtime.lastError);
              resolve(null);
              return;
            }

            if (response) {
              try {
                // 如果响应是字符串，尝试解析为JSON
                if (typeof response === 'string') {
                  resolve(JSON.parse(response));
                } else {
                  // 如果已经是对象，直接返回
                  resolve(response);
                }
              } catch (e) {
                console.error('Error parsing JSON response:', e);
                resolve(null);
              }
            } else {
              console.log('No JSON data received from background');
              resolve(null);
            }
          });
        });
      } catch (e) {
        console.error('Error communicating with background script:', e);
      }
    }

    return null;
  };

  // 格式化JSON大小
  const formatJsonSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 初始化数据
  useEffect(() => {
    const loadData = async () => {
      const data = await getJsonFromBackground();
      if (data) {
        setJsonData(data);
        const jsonString = JSON.stringify(data);
        const size = new TextEncoder().encode(jsonString).length;
        setJsonSize(formatJsonSize(size));
      }
    };

    loadData();
  }, []);


  // Ref for JsonEditorWrapper
  const jsonEditorRef = useRef<JsonEditorRef>(null);

  // 切换展开/折叠
  const [expanded, setExpanded] = useState(true);
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

  // 复制JSON到剪贴板
  const copyJson = async () => {
    if (!jsonData) return;

    const jsonString = JSON.stringify(jsonData, null, 2);
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      alert(i18n.failedToCopyJsonToClipboard);
    }
  };

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
      setCurrentJsonPath(i18n.errorGettingPath);
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
      let errorMessage = i18n.unknownError;
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      alert(`${i18n.failedToCopyPath}: ${errorMessage}`);
    }
  };


  // 如果没有JSON数据
  if (!jsonData) {
    return (
      <div className="json-window-container">
        <div className="json-window-header">
          <div>
            <span className="json-window-title">{i18n.jsonViewerTitle}</span>
          </div>
        </div>
        <div className="json-window-content">
          <div className="json-display">
            <p style={{ color: '#dc3545', padding: '20px' }}>{i18n.noJsonDataProvided}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="json-window-container">
      <div className="json-window-header">
        <div>
          <span className="json-window-title">{i18n.jsonViewerTitle}</span>
          {jsonSize && <span className="json-window-size-info">{i18n.sizeLabel}: {jsonSize}</span>}
        </div>
        {/* JSON Path display */}
        {currentJsonPath && (
          <div className="json-window-path-display">
            <code className="json-window-path-value">{currentJsonPath}</code>
            <button
              className={`json-window-path-copy-btn ${pathCopySuccess ? 'success' : ''}`}
              onClick={copyCurrentPath}
              title={i18n.copyPathToClipboard}
            >
              {pathCopySuccess ? '✓' : '📋'}
            </button>
          </div>
        )}
        <div className="json-window-actions">
          <button
            className="json-window-button secondary"
            onClick={toggleExpand}
          >
            {expanded ? i18n.collapseAll : i18n.expandAll}
          </button>
          <button
            className={`json-window-button ${viewMode === 'editor' ? 'active' : ''}`}
            onClick={toggleViewMode}
            title={i18n.switchBetweenTreeAndEditor}
          >
            {viewMode === 'default' ? i18n.switchToEditor : i18n.switchToTree}
          </button>
          <button
            className={`json-window-button ${copySuccess ? 'success' : ''}`}
            onClick={copyJson}
          >
            {copySuccess ? `✓ ${i18n.copied}` : i18n.copyJson}
          </button>
        </div>
      </div>
      <div className="json-window-content">
        <div className="json-display">
          <div className="json-tree-container" style={{ height: 'calc(100vh - 80px)' }}>
            {viewMode === 'default' ? (
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
                iconStyle="triangle"
                indentWidth={2}
                quotesOnKeys={false}
                sortKeys={false}
                validationMessage={i18n.invalidJsonFormat}
                onSelect={(select) => {
                  // Handle JSON path display functionality
                  handleJsonPathSelect(select);
                }}
              />
            ) : (
              <JsonEditorWrapper
                ref={jsonEditorRef}
                data={jsonData}
                mode="view"
                expanded={expanded} // Pass expanded state
                onChange={(newData) => {
                  // Optional: update data if we want edits to reflect immediately
                  // setJsonData(newData);
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// 渲染应用到DOM
const container = document.getElementById('react-root');
if (container) {
  ReactDOM.render(<JsonWindowApp />, container);
} else {
  console.error('React root container not found');
}
