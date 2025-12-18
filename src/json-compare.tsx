import React from 'react';
import ReactDOM from 'react-dom';
import JsonCompare from './components/JsonCompare';
import './assets/styles/json-compare.css';

/**
 * JSON 对比页面入口
 */

// 从 URL 参数获取初始 JSON 数据
const urlParams = new URLSearchParams(window.location.search);
const leftJson = urlParams.get('left') || '';
const rightJson = urlParams.get('right') || '';

// 解码 JSON 数据
const decodedLeft = leftJson ? decodeURIComponent(leftJson) : '';
const decodedRight = rightJson ? decodeURIComponent(rightJson) : '';

// 渲染应用
ReactDOM.render(
  <React.StrictMode>
    <JsonCompare initialLeft={decodedLeft} initialRight={decodedRight} />
  </React.StrictMode>,
  document.getElementById('root')
);

// 监听来自 popup 或 content script 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'loadJsons') {
    // 接收新的 JSON 数据
    const { left, right } = message;
    
    // 重新渲染组件
    ReactDOM.render(
      <React.StrictMode>
        <JsonCompare initialLeft={left || ''} initialRight={right || ''} />
      </React.StrictMode>,
      document.getElementById('root')
    );
    
    sendResponse({ success: true });
  }
});
