import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import ReactJson from '@microlink/react-json-view';

// JSON Window React Component
const JsonWindowApp: React.FC = () => {
  const [jsonData, setJsonData] = useState<any>(null);
  const [jsonSize, setJsonSize] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState(false);

  // 从存储中获取JSON数据
  const getJsonFromStorage = async (): Promise<any> => {
    const urlParams = new URLSearchParams(window.location.search);
    const storageKey = urlParams.get('key');
    const sessionKey = urlParams.get('sessionKey');
    
    // 优先尝试从Chrome存储获取
    if (storageKey && typeof chrome !== 'undefined' && chrome.storage) {
      try {
        return new Promise((resolve) => {
          chrome.storage.local.get(storageKey, (result) => {
            if (chrome.runtime.lastError) {
              console.error('Error getting data from storage:', chrome.runtime.lastError);
              resolve(null);
              return;
            }
            
            const jsonString = result[storageKey];
            if (jsonString) {
              try {
                resolve(JSON.parse(jsonString));
              } catch (e) {
                console.error('Error parsing JSON from storage:', e);
                resolve(null);
              }
            } else {
              console.error('No data found in storage for key:', storageKey);
              resolve(null);
            }
          });
        });
      } catch (e) {
        console.error('Error accessing Chrome storage:', e);
      }
    }
    
    // 回退到sessionStorage
    if (sessionKey) {
      try {
        const jsonString = sessionStorage.getItem(sessionKey);
        if (jsonString) {
          // 立即清理sessionStorage
          sessionStorage.removeItem(sessionKey);
          return JSON.parse(jsonString);
        }
      } catch (e) {
        console.error('Error getting data from sessionStorage:', e);
      }
    }
    
    // 最后尝试旧的URL参数方式（向后兼容）
    const encodedJson = urlParams.get('json');
    if (encodedJson) {
      try {
        return JSON.parse(decodeURIComponent(encodedJson));
      } catch (e) {
        console.error('Error parsing JSON from URL:', e);
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
      const data = await getJsonFromStorage();
      if (data) {
        setJsonData(data);
        const jsonString = JSON.stringify(data);
        const size = new TextEncoder().encode(jsonString).length;
        setJsonSize(formatJsonSize(size));
      }
    };
    
    loadData();
  }, []);


  // 切换展开/折叠
  const [expanded, setExpanded] = useState(true);
  const toggleExpand = () => {
    setExpanded(!expanded);
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
      alert('Failed to copy JSON to clipboard');
    }
  };


  // 如果没有JSON数据
  if (!jsonData) {
    return (
      <div className="json-window-container">
        <div className="json-window-header">
          <div>
            <span className="json-window-title">JSON Viewer</span>
          </div>
        </div>
        <div className="json-window-content">
          <div className="json-display">
            <p style={{ color: '#dc3545', padding: '20px' }}>No JSON data provided</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="json-window-container">
      <div className="json-window-header">
        <div>
          <span className="json-window-title">JSON Viewer</span>
          {jsonSize && <span className="json-window-size-info">Size: {jsonSize}</span>}
        </div>
        <div className="json-window-actions">
          <button 
            className="json-window-button secondary" 
            onClick={toggleExpand}
          >
            {expanded ? 'Collapse All' : 'Expand All'}
          </button>
          <button 
            className={`json-window-button ${copySuccess ? 'success' : ''}`}
            onClick={copyJson}
          >
            {copySuccess ? '✓ Copied' : 'Copy JSON'}
          </button>
        </div>
      </div>
      <div className="json-window-content">
        <div className="json-display">
          <div className="json-tree-container">
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
              validationMessage="Invalid JSON"
            />
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