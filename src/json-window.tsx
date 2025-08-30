import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import ReactJson from '@microlink/react-json-view';

// JSON Window React Component
const JsonWindowApp: React.FC = () => {
  const [jsonData, setJsonData] = useState<any>(null);
  const [jsonSize, setJsonSize] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState(false);
  
  // JSON path related states
  const [currentJsonPath, setCurrentJsonPath] = useState<string>('');
  const [pathCopySuccess, setPathCopySuccess] = useState(false);

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
        {/* JSON Path display */}
        {currentJsonPath && (
          <div className="json-window-path-display">
            <code className="json-window-path-value">{currentJsonPath}</code>
            <button 
              className={`json-window-path-copy-btn ${pathCopySuccess ? 'success' : ''}`}
              onClick={copyCurrentPath}
              title="Copy path to clipboard"
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
              onSelect={(select) => {
                // Handle JSON path display functionality
                handleJsonPathSelect(select);
              }}
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