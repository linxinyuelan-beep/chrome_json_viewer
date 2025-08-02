import React from 'react';
import ReactDOM from 'react-dom';
import './assets/styles/main.css';
import { VERSION } from './config/version';
import { 
  formatJsonSize
} from './utils/jsonViewer';
import { isValidNestedJson } from './utils/nestedJsonHandler';
import { processJsonDates } from './utils/dateConverter';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState<'settings' | 'json-input'>('json-input');
  const [jsonHoverEnabled, setJsonHoverEnabled] = React.useState(true);
  const [jsonInput, setJsonInput] = React.useState('');
  const [jsonFormatError, setJsonFormatError] = React.useState<string | null>(null);
  const version = VERSION;

  // Load saved settings when popup opens
  React.useEffect(() => {
    // 获取所有保存的设置
    const loadSettings = async () => {
      try {
        // 检查悬停检测是否启用
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]?.id) {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'getHoverDetectionState' })
              .then(response => {
                if (response && response.enabled !== undefined) {
                  setJsonHoverEnabled(response.enabled);
                }
              })
              .catch(error => {
                console.log('Error getting hover detection state:', error);
              });
          }
        });
      } catch (error) {
        console.error("Error loading settings:", error);
      }
    };
    
    loadSettings();
  }, []);

  // Toggle JSON hover detection
  const toggleHoverDetection = async () => {
    // Send message to content script to toggle hover detection
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'toggleHoverDetection' });
      }
    });
    setJsonHoverEnabled(!jsonHoverEnabled);
  };

  // 格式化JSON输入的函数
  const formatJsonInput = () => {
    try {
      if (!jsonInput.trim()) {
        setJsonFormatError('请输入JSON文本');
        return;
      }

      if (!isValidNestedJson(jsonInput)) {
        setJsonFormatError('无效的JSON格式');
        return;
      }

      // 解析并格式化JSON
      const parsedJson = JSON.parse(jsonInput);
      const formattedJson = JSON.stringify(parsedJson, null, 2);
      setJsonInput(formattedJson);
      setJsonFormatError(null);
      
      // 添加一个状态指示
      setJsonFormatError('正在处理中...');
      
      // 先通过background.js发送消息（这样可以处理跨域问题）
      chrome.runtime.sendMessage(
        { 
          action: 'showJsonFromPopup',
          jsonString: formattedJson,
          version: version
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.log('Error sending message through background:', chrome.runtime.lastError);
            
            // 尝试直接发送到当前标签页
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
              if (tabs[0]?.id) {
                chrome.tabs.sendMessage(
                  tabs[0].id,
                  { 
                    action: 'showJsonFromPopup',
                    jsonString: formattedJson,
                    version: version
                  },
                  (tabResponse) => {
                    if (chrome.runtime.lastError) {
                      console.log('Error sending JSON directly to tab:', chrome.runtime.lastError);
                      // 所有尝试都失败，打开新标签页显示JSON
                      openJsonInNewTab(formattedJson);
                    } else {
                      console.log('Message sent successfully to tab:', tabResponse);
                      // 关闭弹出窗口
                      window.close();
                    }
                  }
                );
              } else {
                // 如果没有活动标签页，打开新标签页显示JSON
                openJsonInNewTab(formattedJson);
              }
            });
          } else {
            console.log('Message sent successfully through background:', response);
            // 关闭弹出窗口
            window.close();
          }
        }
      );
    } catch (error) {
      setJsonFormatError(`解析JSON出错：${(error as Error).message}`);
    }
  };
  
  // 在新标签页中打开JSON
  const openJsonInNewTab = (jsonString: string) => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    chrome.tabs.create({ url });
  };
  
  // 格式化并转换JSON中的日期格式，然后显示在抽屉中
  const convertJsonDates = () => {
    try {
      if (!jsonInput.trim()) {
        setJsonFormatError('没有JSON可转换');
        return;
      }

      if (!isValidNestedJson(jsonInput)) {
        setJsonFormatError('无效的JSON格式');
        return;
      }

      // 解析JSON
      const parsedJson = JSON.parse(jsonInput);
      
      // 处理并转换日期格式
      const convertedJson = processJsonDates(parsedJson);
      
      // 格式化转换后的JSON
      const formattedJson = JSON.stringify(convertedJson, null, 2);
      
      // 更新文本框中的内容
      setJsonInput(formattedJson);
      setJsonFormatError('正在处理中...');
      
      // 复制到剪贴板
      navigator.clipboard.writeText(formattedJson)
        .then(() => {
          console.log('日期格式转换成功并已复制到剪贴板');
          // 剪贴板操作成功，但不显示消息，因为我们要关闭弹窗
        })
        .catch(err => {
          console.log('剪贴板复制失败，但JSON已转换:', err);
        })
        .finally(() => {
          // 无论剪贴板操作成功与否，都发送转换后的JSON到内容脚本并打开抽屉
          // 先通过background.js发送消息（这样可以处理跨域问题）
          chrome.runtime.sendMessage(
            { 
              action: 'showJsonFromPopup',
              jsonString: formattedJson,
              version: version
            },
            (response) => {
              if (chrome.runtime.lastError) {
                console.log('Error sending message through background:', chrome.runtime.lastError);
                
                // 尝试直接发送到当前标签页
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                  if (tabs[0]?.id) {
                    chrome.tabs.sendMessage(
                      tabs[0].id,
                      { 
                        action: 'showJsonFromPopup',
                        jsonString: formattedJson,
                        version: version
                      },
                      (tabResponse) => {
                        if (chrome.runtime.lastError) {
                          console.log('Error sending JSON directly to tab:', chrome.runtime.lastError);
                          // 所有尝试都失败，打开新标签页显示JSON
                          openJsonInNewTab(formattedJson);
                        } else {
                          console.log('Message sent successfully to tab:', tabResponse);
                          // 关闭弹出窗口
                          window.close();
                        }
                      }
                    );
                  } else {
                    // 如果没有活动标签页，打开新标签页显示JSON
                    openJsonInNewTab(formattedJson);
                  }
                });
              } else {
                console.log('Message sent successfully through background:', response);
                // 关闭弹出窗口
                window.close();
              }
            }
          );
        });
    } catch (error) {
      setJsonFormatError(`解析JSON出错：${(error as Error).message}`);
    }
  };

  // 清空JSON输入
  const clearJsonInput = () => {
    setJsonInput('');
    setJsonFormatError(null);
  };

  // JSON压缩/最小化
  const minifyJson = () => {
    try {
      if (!jsonInput.trim()) {
        setJsonFormatError('请输入JSON文本');
        return;
      }

      if (!isValidNestedJson(jsonInput)) {
        setJsonFormatError('无效的JSON格式');
        return;
      }

      // 解析并压缩JSON (没有缩进和空白)
      const parsedJson = JSON.parse(jsonInput);
      const minifiedJson = JSON.stringify(parsedJson);
      
      // 直接更新输入框中的内容
      setJsonInput(minifiedJson);
      setJsonFormatError('JSON已压缩');
      
      // 复制到剪贴板
      navigator.clipboard.writeText(minifiedJson)
        .then(() => {
          setJsonFormatError('JSON已压缩并复制到剪贴板');
        })
        .catch(err => {
          console.log('剪贴板复制失败，但JSON已压缩:', err);
        });
    } catch (error) {
      setJsonFormatError(`解析JSON出错：${(error as Error).message}`);
    }
  };

  // 转义JSON字符串
  const escapeJsonString = () => {
    try {
      if (!jsonInput.trim()) {
        setJsonFormatError('请输入需要转义的文本');
        return;
      }

      // 如果输入是有效的JSON，则先格式化它
      let inputToEscape = jsonInput;
      if (isValidNestedJson(jsonInput)) {
        const parsedJson = JSON.parse(jsonInput);
        inputToEscape = JSON.stringify(parsedJson);
      }
      
      // 转义字符串 (对字符串进行JSON序列化后去掉首尾引号)
      const escapedString = JSON.stringify(inputToEscape).slice(1, -1);
      
      // 更新输入框中的内容
      setJsonInput(escapedString);
      setJsonFormatError('文本已转义');
      
      // 复制到剪贴板
      navigator.clipboard.writeText(escapedString)
        .then(() => {
          setJsonFormatError('文本已转义并复制到剪贴板');
        })
        .catch(err => {
          console.log('剪贴板复制失败，但文本已转义:', err);
        });
    } catch (error) {
      setJsonFormatError(`转义出错：${(error as Error).message}`);
    }
  };

  // 反转义JSON字符串
  const unescapeJsonString = () => {
    try {
      if (!jsonInput.trim()) {
        setJsonFormatError('请输入需要反转义的文本');
        return;
      }

      // 为字符串添加引号并解析
      const unescapedString = JSON.parse(`"${jsonInput}"`);
      
      // 更新输入框中的内容
      setJsonInput(unescapedString);
      setJsonFormatError('文本已反转义');
      
      // 复制到剪贴板
      navigator.clipboard.writeText(unescapedString)
        .then(() => {
          setJsonFormatError('文本已反转义并复制到剪贴板');
        })
        .catch(err => {
          console.log('剪贴板复制失败，但文本已反转义:', err);
        });
    } catch (error) {
      setJsonFormatError(`反转义出错：${(error as Error).message}`);
    }
  };

  return (
    <div className="popup">
      <div className="header">
        <h1>JSON Formatter & Viewer</h1>
        <div className="version">v{version}</div>
      </div>
      
      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'json-input' ? 'active' : ''}`}
          onClick={() => setActiveTab('json-input')}
        >
          JSON格式化
        </button>
        <button 
          className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          设置
        </button>
      </div>
      
      <div className="content">
        {activeTab === 'settings' ? (
          <>
            <div className="section">
              <h2>键盘快捷键</h2>
              <ul className="shortcut-list">
                <li><kbd>Ctrl+Shift+E</kbd> 格式化选中的JSON</li>
                <li><kbd>Ctrl+Shift+H</kbd> 切换悬停检测</li>
              </ul>
            </div>
            
            <div className="section">
              <h2>使用方式</h2>
              <ul className="feature-list">
                <li>将鼠标悬停在可能包含JSON的文本上</li>
                <li>双击检测到的JSON以查看格式化视图</li>
                <li>右键点击并选择"格式化 JSON"菜单项</li>
                <li>选择JSON文本后使用键盘快捷键</li>
              </ul>
            </div>

            <div className="section">
              <h2>设置</h2>
              <div className="settings-group">
                <label className="toggle-switch">
                  <input 
                    type="checkbox"
                    checked={jsonHoverEnabled}
                    onChange={toggleHoverDetection}
                  />
                  <span className="toggle-slider"></span>
                  <span className="toggle-label">悬停检测</span>
                </label>
              </div>
              
              {/* 默认视图类型设置已移除 */}
              
              {/* 自动切换视图类型相关代码已移除 */}
            </div>
          </>
        ) : (
          <div className="json-input-section">
            <div className="json-input-container">
              <textarea
                className="json-textarea"
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder="在此粘贴JSON文本..."
                rows={10}
                autoFocus
              />
              {jsonFormatError && (
                <div className={`json-error-message ${jsonFormatError === '复制成功！' || jsonFormatError === '正在处理中...' ? 'success' : ''}`}>
                  {jsonFormatError}
                </div>
              )}
            </div>
            <div className="json-input-actions">
              <div className="action-row">
                <button className="json-button format" onClick={formatJsonInput}>
                  格式化并查看
                </button>
                <button className="json-button convert" onClick={convertJsonDates}>
                  格式化并转换
                </button>
                <button className="json-button clear" onClick={clearJsonInput}>
                  清空
                </button>
              </div>
              <div className="action-row">
                <button className="json-button minify" onClick={minifyJson}>
                  JSON压缩
                </button>
                <button className="json-button escape" onClick={escapeJsonString}>
                  转义字符串
                </button>
                <button className="json-button unescape" onClick={unescapeJsonString}>
                  反转义字符串
                </button>
              </div>
            </div>
            <div className="json-input-help">
              <p>将JSON文本粘贴在上方，然后点击"格式化并查看"以显示格式化后的JSON</p>
              <p>点击"格式化并转换"可将特殊日期格式 <code>/Date(timestamp)/</code> 转换为可读日期并显示</p>
              <p>点击"JSON压缩"可将JSON压缩为单行，"转义字符串"和"反转义字符串"用于处理特殊字符</p>
            </div>
          </div>
        )}
      </div>
      
      <div className="footer">
        <div>JSON Formatter & Viewer</div>
      </div>
    </div>
  );
};

const container = document.getElementById('app');
ReactDOM.render(<App />, container);