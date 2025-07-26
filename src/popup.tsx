import React from 'react';
import ReactDOM from 'react-dom';
import './assets/styles/main.css';

const App: React.FC = () => {
  const [jsonHoverEnabled, setJsonHoverEnabled] = React.useState(true);
  const version = '1.0.2';

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
      </div>
      
      <div className="footer">
        <div>JSON Formatter & Viewer</div>
      </div>
    </div>
  );
};

const container = document.getElementById('app');
ReactDOM.render(<App />, container);