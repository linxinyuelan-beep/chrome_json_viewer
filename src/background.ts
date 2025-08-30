// background.ts - Background service worker for JSON Formatter & Viewer
import {DEFAULT_LANGUAGE, getCurrentLanguage, getTranslations} from "./utils/i18n";

const CONTEXT_MENU_ID = 'formatSelectedJson';

// Function to create or update the context menu
async function setupContextMenu() {
    const lang = await getCurrentLanguage();
    const i18n = getTranslations(lang);

    // Use remove and create to handle both installation and updates
    chrome.contextMenus.remove(CONTEXT_MENU_ID, () => {
        // Ignore error in case the item doesn't exist (e.g., first install)
        void chrome.runtime.lastError;

        chrome.contextMenus.create({
            id: CONTEXT_MENU_ID,
            title: i18n.formatSelectedJson,
            contexts: ['selection'],
        });
    });
}

chrome.runtime.onInstalled.addListener(() => {
    console.log('JSON Formatter & Viewer extension installed');

    // Setup context menu
    setupContextMenu();

    // Initialize language settings if not already set
    chrome.storage.local.get('language', (result) => {
        if (!result.language) {
            chrome.storage.local.set({ language: DEFAULT_LANGUAGE });
        }
    });
});

// Listen for language changes to update the context menu title
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.language) {
        setupContextMenu();
    }
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
    
    if (request.action === 'openJsonInTab') {
        console.log('Background script received openJsonInTab request');
        try {
            // 生成唯一的存储键
            const storageKey = `json_data_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            
            // 将JSON数据存储到Chrome存储中
            chrome.storage.local.set({ [storageKey]: request.jsonString }, () => {
                if (chrome.runtime.lastError) {
                    console.error('Error storing JSON data:', chrome.runtime.lastError);
                    sendResponse({ success: false, error: chrome.runtime.lastError.message });
                    return;
                }
                
                // 创建新窗口，通过URL参数传递存储键
                const windowUrl = chrome.runtime.getURL(`json-window.html?key=${storageKey}`);
                chrome.windows.create({
                    url: windowUrl,
                    type: 'popup',
                    width: 1200,
                    height: 800,
                    focused: true
                }, (window) => {
                    if (chrome.runtime.lastError) {
                        console.error('Error creating window:', chrome.runtime.lastError);
                        // 清理存储的数据
                        chrome.storage.local.remove(storageKey);
                        sendResponse({ success: false, error: chrome.runtime.lastError.message });
                    } else {
                        console.log('Window created successfully:', window?.id);
                        sendResponse({ success: true, windowId: window?.id });
                        
                        // 设置定时器，在窗口关闭后清理存储的数据
                        setTimeout(() => {
                            chrome.storage.local.remove(storageKey, () => {
                                console.log('Cleaned up stored JSON data:', storageKey);
                            });
                        }, 60000); // 1分钟后清理
                    }
                });
            });
        } catch (error) {
            console.error('Error in openJsonInTab:', error);
            sendResponse({ success: false, error: String(error) });
        }
        return true; // 保持消息通道开放
    }
    
    if (request.action === 'openJsonWindow') {
        console.log('Background script received openJsonWindow request');
        try {
            // 生成唯一的存储键
            const storageKey = `json_data_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            
            // 将JSON数据存储到Chrome存储中
            chrome.storage.local.set({ [storageKey]: request.jsonData }, () => {
                if (chrome.runtime.lastError) {
                    console.error('Error storing JSON data:', chrome.runtime.lastError);
                    sendResponse({ success: false, error: chrome.runtime.lastError.message });
                    return;
                }
                
                // 创建新窗口，通过URL参数传递存储键
                const windowUrl = chrome.runtime.getURL(`json-window.html?key=${storageKey}`);
                chrome.windows.create({
                    url: windowUrl,
                    type: 'popup',
                    width: 1000,
                    height: 700,
                    focused: true
                }, (window) => {
                    if (chrome.runtime.lastError) {
                        console.error('Error creating window:', chrome.runtime.lastError);
                        // 清理存储的数据
                        chrome.storage.local.remove(storageKey);
                        sendResponse({ success: false, error: chrome.runtime.lastError.message });
                    } else {
                        console.log('Window created successfully:', window?.id);
                        sendResponse({ success: true, windowId: window?.id });
                        
                        // 设置定时器，在窗口关闭后清理存储的数据
                        setTimeout(() => {
                            chrome.storage.local.remove(storageKey, () => {
                                console.log('Cleaned up stored JSON data:', storageKey);
                            });
                        }, 60000); // 1分钟后清理，给足够时间让窗口加载
                    }
                });
            });
        } catch (error) {
            console.error('Error in openJsonWindow:', error);
            sendResponse({ success: false, error: String(error) });
        }
        return true; // 保持消息通道开放
    }
});

