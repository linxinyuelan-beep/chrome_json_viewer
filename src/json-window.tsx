import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import ReactJson from '@microlink/react-json-view';

// JSON Window React Component
const JsonWindowApp: React.FC = () => {
  const [jsonData, setJsonData] = useState<any>(null);
  const [jsonSize, setJsonSize] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // 添加加载状态
  const [loadingMessage, setLoadingMessage] = useState('Loading JSON data...'); // 加载提示消息

  // 优化后的数据获取方法：并行处理多种数据源
  const getJsonData = async (): Promise<any> => {
    setIsLoading(true);
    setLoadingMessage('Loading JSON data...');
    
    // 创建多个数据获取Promise
    const promises: Promise<any>[] = [];
    
    // 1. 主动请求最新数据（对于刚创建的窗口）
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      const activeRequestPromise = new Promise<any>((resolve) => {
        chrome.runtime.sendMessage({
          action: 'requestLatestJsonData'
        }, (response) => {
          if (response && response.success && response.data) {
            try {
              resolve(JSON.parse(response.data.jsonData));
            } catch (e) {
              console.error('Error parsing latest JSON data:', e);
              resolve(null);
            }
          } else {
            resolve(null);
          }
        });
      });
      promises.push(activeRequestPromise);
    }
    
    // 2. 监听消息方式（缩短超时时间）
    const messagePromise = new Promise<any>((resolve) => {
      const messageListener = (request: any, sender: any, sendResponse: any) => {
        if (request.action === 'loadJsonData' && request.sessionId) {
          console.log('Received loadJsonData message with sessionId:', request.sessionId);
          
          chrome.runtime.sendMessage({
            action: 'requestJsonData',
            sessionId: request.sessionId
          }, (response) => {
            if (response && response.success && response.data) {
              try {
                const jsonData = JSON.parse(response.data.jsonData);
                resolve(jsonData);
              } catch (e) {
                console.error('Error parsing JSON data:', e);
                resolve(null);
              }
            } else {
              console.error('Failed to get JSON data:', response?.error);
              resolve(null);
            }
          });
          
          chrome.runtime.onMessage.removeListener(messageListener);
          return true;
        }
      };
      
      chrome.runtime.onMessage.addListener(messageListener);
      
      // 缩短超时时间到1.5秒
      setTimeout(() => {
        chrome.runtime.onMessage.removeListener(messageListener);
        resolve(null);
      }, 1500);
    });
    promises.push(messagePromise);
    
    // 3. 存储方法（直接并行执行）
    promises.push(getJsonFromStorage());
    
    try {
      // 并行执行所有方法，返回第一个成功的结果
      const results = await Promise.allSettled(promises);
      
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          console.log('Successfully loaded JSON data');
          return result.value;
        }
      }
      
      console.warn('All data loading methods failed');
      return null;
    } catch (error) {
      console.error('Error in getJsonData:', error);
      return null;
    }
  };
  
  // 从存储中获取JSON数据（回退方案）
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
      try {
        setIsLoading(true);
        setLoadingMessage('Loading JSON data...');
        
        const data = await getJsonData();
        
        if (data) {
          setJsonData(data);
          const jsonString = JSON.stringify(data);
          const size = new TextEncoder().encode(jsonString).length;
          setJsonSize(formatJsonSize(size));
          console.log('JSON data loaded successfully');
        } else {
          console.error('No JSON data could be loaded');
          setLoadingMessage('No JSON data provided');
        }
      } catch (error) {
        console.error('Error loading JSON data:', error);
        setLoadingMessage('Error loading JSON data');
      } finally {
        setIsLoading(false);
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


  // 如果正在加载或没有JSON数据
  if (isLoading || !jsonData) {
    return (
      <div className="json-window-container">
        <div className="json-window-header">
          <div>
            <span className="json-window-title">JSON Viewer</span>
          </div>
        </div>
        <div className="json-window-content">
          <div className="json-display">
            {isLoading ? (
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <div style={{ marginBottom: '10px' }}>
                  <span style={{ fontSize: '14px', color: '#666' }}>{loadingMessage}</span>
                </div>
                <div style={{ color: '#999' }}>
                  <span>⏳ Loading...</span>
                </div>
              </div>
            ) : (
              <p style={{ color: '#dc3545', padding: '20px' }}>{loadingMessage}</p>
            )}
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