import React from 'react';
import { createRoot } from 'react-dom/client';
import JsonCompare from './components/JsonCompare';
import './assets/styles/theme.css';
import './assets/styles/json-compare.css';
import { initTheme } from './utils/theme';

/**
 * JSON 对比页面入口
 */

initTheme();

// 从 URL 参数获取初始 JSON 数据
const urlParams = new URLSearchParams(window.location.search);
const leftJson = urlParams.get('left') || '';
const rightJson = urlParams.get('right') || '';
const modeParam = urlParams.get('mode');
const initialMode: 'edit' | 'view' = modeParam === 'view' ? 'view' : 'edit';

// 解码 JSON 数据，兼容 URL 参数格式不合法的情况
function safeDecodeURIComponent(str: string): string {
  try {
    return decodeURIComponent(str);
  } catch {
    return str;
  }
}

const decodedLeft = leftJson ? safeDecodeURIComponent(leftJson) : '';
const decodedRight = rightJson ? safeDecodeURIComponent(rightJson) : '';
const container = document.getElementById('root');
const root = container ? createRoot(container) : null;

// 渲染应用
if (root) {
  root.render(
    <React.StrictMode>
      <JsonCompare initialLeft={decodedLeft} initialRight={decodedRight} initialMode={initialMode} />
    </React.StrictMode>
  );
}

// 监听来自 popup 或 content script 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'loadJsons') {
    // 接收新的 JSON 数据
    const { left, right } = message;
    
    // 重新渲染组件
    root?.render(
      <React.StrictMode>
        <JsonCompare initialLeft={left || ''} initialRight={right || ''} initialMode={message.mode === 'view' ? 'view' : initialMode} />
      </React.StrictMode>
    );
    
    sendResponse({ success: true });
  }
});
