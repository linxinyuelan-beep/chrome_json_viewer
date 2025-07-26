// background.ts - Background service worker for JSON Formatter & Viewer

chrome.runtime.onInstalled.addListener(() => {
    console.log('JSON Formatter & Viewer extension installed');
    
    // 创建右键菜单项
    chrome.contextMenus.create({
        id: 'formatSelectedJson',
        title: '格式化 JSON (Ctrl+Shift+E)',
        contexts: ['selection'], // 仅在文本选中时显示
    });
});

// 处理右键菜单点击
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'formatSelectedJson' && tab?.id) {
        // 向内容脚本发送消息，格式化选中的JSON
        chrome.tabs.sendMessage(tab.id, { 
            action: 'formatSelectedJson', 
            selectedText: info.selectionText 
        });
    }
});

