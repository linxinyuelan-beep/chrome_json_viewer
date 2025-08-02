// background.ts - Background service worker for JSON Formatter & Viewer

chrome.runtime.onInstalled.addListener(() => {
    console.log('JSON Formatter & Viewer extension installed');
    
    // 创建右键菜单项
    chrome.contextMenus.create({
        id: 'formatSelectedJson',
        title: '格式化 JSON',
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

// 监听命令快捷键
chrome.commands.onCommand.addListener(async (command) => {
    console.log(`Command received: ${command}`);

    // 获取当前标签页
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) return;

    if (command === 'format-selected-json') {
        // 获取选中的文本
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => window.getSelection()?.toString() || '',
        }).then(injectionResults => {
            const selectedText = injectionResults[0].result;
            if (selectedText) {
                chrome.tabs.sendMessage(tab.id as number, { 
                    action: 'formatSelectedJson', 
                    selectedText
                });
            }
        });
    } else if (command === 'toggle-hover-detection') {
        // 发送切换悬停检测模式的消息
        chrome.tabs.sendMessage(tab.id, { 
            action: 'toggleHoverDetection'
        });
    }
});

// 监听来自 popup 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Background script received message:', request);
    
    if (request.action === 'showJsonFromPopup') {
        console.log('Background script received showJsonFromPopup request');
        // 转发消息到当前活动标签页
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.id) {
                chrome.tabs.sendMessage(tabs[0].id, request, (response) => {
                    console.log('Response from content script:', response);
                    sendResponse(response);
                });
            } else {
                sendResponse({ success: false, error: 'No active tab found' });
            }
        });
        return true; // 保持消息通道开放
    }
});

