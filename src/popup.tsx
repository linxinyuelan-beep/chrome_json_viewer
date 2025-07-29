import React from 'react';
import ReactDOM from 'react-dom';
import './assets/styles/main.css';
import { VERSION } from './config/version';
import { getDefaultViewType, saveDefaultViewType, JsonViewType } from './utils/jsonViewer';

const App: React.FC = () => {
  const [jsonHoverEnabled, setJsonHoverEnabled] = React.useState(true);
  const [defaultViewType, setDefaultViewType] = React.useState<JsonViewType>('react-json-view');
  const version = VERSION;

  // Load saved settings when popup opens
  React.useEffect(() => {
    // Get saved view type
    getDefaultViewType().then(viewType => {
      setDefaultViewType(viewType);
    });

    // Check if hover detection is enabled
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
  
  // Change default view type
  const changeDefaultViewType = async (viewType: JsonViewType) => {
    await saveDefaultViewType(viewType);
    setDefaultViewType(viewType);
  };

  return (
    <div className="popup">
      <div className="header">
        <h1>JSON Formatter & Viewer</h1>
        <div className="version">v{version}</div>
      </div>
      
      <div className="content">
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
          
          <div className="settings-group view-type-selection">
            <span className="setting-label">默认视图类型：</span>
            <div className="radio-group">
              <label className="radio-label">
                <input 
                  type="radio"
                  name="viewType"
                  value="react-json-view"
                  checked={defaultViewType === 'react-json-view'}
                  onChange={() => changeDefaultViewType('react-json-view')}
                />
                <span>JSON View</span>
              </label>
              <label className="radio-label">
                <input 
                  type="radio"
                  name="viewType"
                  value="react-json-tree"
                  checked={defaultViewType === 'react-json-tree'}
                  onChange={() => changeDefaultViewType('react-json-tree')}
                />
                <span>Tree View</span>
              </label>
            </div>
          </div>
        </div>
      </div>
      
      <div className="footer">
        <div>JSON Formatter & Viewer</div>
      </div>
    </div>
  );
};

const container = document.getElementById('app');
ReactDOM.render(<App />, container);