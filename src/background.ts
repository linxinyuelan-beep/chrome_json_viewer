// background.ts - Background service worker for JSON Formatter & Viewer
import { DEFAULT_LANGUAGE, getCurrentLanguage, getTranslations } from "./utils/i18n";
import './config/public-path';
import { VERSION } from './config/version';
import { getSiteFilterConfig, shouldEnableOnSite } from './utils/siteFilter';

const CONTEXT_MENU_ID = 'formatSelectedJson';
const TOGGLE_AUTO_DETECTION_MENU_ID = 'toggleAutoDetection';

// Function to create or update the context menu based on current tab
async function setupContextMenu(tabUrl?: string) {
    const lang = await getCurrentLanguage();
    const i18n = getTranslations(lang);
    
    // Get site filter configuration
    const filterConfig = await getSiteFilterConfig();
    
    // Determine if menu should be shown
    let shouldShowMenu = true;
    if (tabUrl) {
        // If we have a URL, check if extension should be enabled on this site
        shouldShowMenu = shouldEnableOnSite(tabUrl, filterConfig);
        console.log(`[Site Filter] URL: ${tabUrl}, Mode: ${filterConfig.mode}, Sites: ${filterConfig.sites.join(', ')}, Show Menu: ${shouldShowMenu}`);
    } else if (filterConfig.mode === 'whitelist') {
        // If no URL is provided and we're in whitelist mode,
        // don't show menu by default (only show on whitelisted sites)
        shouldShowMenu = false;
        console.log(`[Site Filter] No URL, Whitelist mode, Show Menu: false`);
    } else {
        console.log(`[Site Filter] No URL, Mode: ${filterConfig.mode}, Show Menu: ${shouldShowMenu}`);
    }

    // Remove all existing menu items first
    await new Promise<void>((resolve) => {
        chrome.contextMenus.removeAll(() => {
            if (chrome.runtime.lastError) {
                console.log('Error removing menus (may not exist):', chrome.runtime.lastError.message);
            }
            resolve();
        });
    });

    // Only create menu items if extension should be enabled
    if (shouldShowMenu) {
        try {
            // Create format JSON menu item
            chrome.contextMenus.create({
                id: CONTEXT_MENU_ID,
                title: i18n.formatSelectedJson,
                contexts: ['selection'],
            });

            // Get current hover detection setting to determine menu text
            const result = await chrome.storage.local.get('hoverDetectionEnabled');
            const hoverDetectionEnabled = result.hoverDetectionEnabled !== undefined ? result.hoverDetectionEnabled : true;
            const menuTitle = hoverDetectionEnabled ? i18n.disableAutoDetection : i18n.enableAutoDetection;

            // Create toggle auto-detection menu item
            chrome.contextMenus.create({
                id: TOGGLE_AUTO_DETECTION_MENU_ID,
                title: menuTitle,
                contexts: ['page', 'selection'],
            });
            
            console.log('[Site Filter] Context menus created');
        } catch (error) {
            console.error('[Site Filter] Error creating context menus:', error);
        }
    } else {
        console.log('[Site Filter] Context menus not created (extension disabled on this site)');
    }
}

chrome.runtime.onInstalled.addListener(() => {
    console.log('JSON Formatter & Viewer extension installed');

    // Setup context menu with current active tab URL
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const currentTabUrl = tabs[0]?.url;
        setupContextMenu(currentTabUrl);
    });

    // Initialize language settings if not already set
    chrome.storage.local.get('language', (result) => {
        if (!result.language) {
            chrome.storage.local.set({ language: DEFAULT_LANGUAGE });
        }
    });
});

// Listen for language changes, hover detection changes, or site filter changes to update the context menu
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && (changes.language || changes.hoverDetectionEnabled || changes.siteFilterConfig)) {
        // Get current tab URL and update menu
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const currentTabUrl = tabs[0]?.url;
            setupContextMenu(currentTabUrl);
        });
    }
});

// Listen for tab updates to refresh context menu based on site filter
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Only update when URL changes or page is loaded
    if (changeInfo.url || changeInfo.status === 'complete') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            // Only update if this is the active tab
            if (tabs[0]?.id === tabId) {
                setupContextMenu(tab.url);
            }
        });
    }
});

// Listen for tab activation to refresh context menu
chrome.tabs.onActivated.addListener((activeInfo) => {
    chrome.tabs.get(activeInfo.tabId, (tab) => {
        if (tab.url) {
            setupContextMenu(tab.url);
        }
    });
});

// 全局变量用于临时存储选中的JSON内容
(chrome as any).action = (chrome as any).action || {};

// 处理右键菜单点击
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === TOGGLE_AUTO_DETECTION_MENU_ID) {
        // 切换自动检测状态（临时开启或关闭）
        if (tab && tab.id && !tab.url?.startsWith('chrome://') && !tab.url?.startsWith('chrome-extension://')) {
            chrome.tabs.sendMessage(tab.id, {
                action: 'toggleAutoDetectionTemporarily'
            });
        }
    } else if (info.menuItemId === 'formatSelectedJson') {
        if (!tab || tab.url?.startsWith('chrome://') || tab.url?.startsWith('chrome-extension://')) {
            // 保存选中文本到全局变量并打开新窗口
            (chrome as any).action.sJson = info.selectionText;
            openJsonWindow();
            return;
        }
        // 读取用户设置，决定显示方式
        chrome.storage.local.get('jsonDisplayMode', (result) => {
            const displayMode = result.jsonDisplayMode || 'drawer';

            if (displayMode === 'window') {
                (chrome as any).action.sJson = info.selectionText;
                openJsonWindow();
            } else {
                // 在当前页面的抽屉中显示
                chrome.tabs.sendMessage(tab.id as number, {
                    action: 'showJsonInDrawer',
                    jsonString: info.selectionText
                });
            }
        });
    }
});

// 打开JSON窗口的函数
function openJsonWindow() {
    const jsonH_url = chrome.runtime.getURL("json-window.html");
    chrome.windows.create({
        url: jsonH_url,
        type: "popup",
        width: 1024,
        height: 768
    });
}

// 监听命令快捷键
chrome.commands.onCommand.addListener(async (command) => {
    console.log(`Command received: ${command} `);

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

// 监听来自各个页面的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Background script received message:', request);

    // 处理获取JSON数据的请求（新的实现方式）
    if (request.cmd === 'getJson') {
        const jsonData = (chrome as any).action?.sJson || null;
        sendResponse(jsonData);
        // 清空缓存，避免重复使用
        if ((chrome as any).action) {
            (chrome as any).action.sJson = null;
        }
        return true;
    }

    // 处理设置JSON数据的请求（新的实现方式）
    if (request.action === 'setJsonData') {
        (chrome as any).action = (chrome as any).action || {};
        (chrome as any).action.sJson = request.jsonString;
        sendResponse({ success: true });
        return true;
    }

    // 处理打开JSON标签页的请求（新的实现方式）
    if (request.action === 'openJsonInTab') {
        try {
            openJsonWindow();
            sendResponse({ success: true });
        } catch (error) {
            console.error('Error in openJsonInTab:', error);
            sendResponse({ success: false, error: String(error) });
        }
        return true;
    }

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

    if (request.action === 'openJsonWindow') {
        console.log('Background script received openJsonWindow request');
        try {
            // 使用新的方式：保存到全局变量并打开窗口
            if (request.jsonData) {
                (chrome as any).action = (chrome as any).action || {};
                (chrome as any).action.sJson = request.jsonData;
                openJsonWindow();
                sendResponse({ success: true });
            } else {
                sendResponse({ success: false, error: 'No JSON data provided' });
            }
        } catch (error) {
            console.error('Error in openJsonWindow:', error);
            sendResponse({ success: false, error: String(error) });
        }
        return true;
    }

    // 处理打开 JSON Compare 页面的请求
    if (request.action === 'openJsonCompare') {
        console.log('Background script received openJsonCompare request');
        try {
            if (request.url) {
                chrome.tabs.create({ url: request.url }, (tab) => {
                    if (chrome.runtime.lastError) {
                        console.error('Error creating tab:', chrome.runtime.lastError);
                        sendResponse({ success: false, error: chrome.runtime.lastError.message });
                    } else {
                        sendResponse({ success: true, tabId: tab.id });
                    }
                });
            } else {
                sendResponse({ success: false, error: 'No URL provided' });
            }
        } catch (error) {
            console.error('Error in openJsonCompare:', error);
            sendResponse({ success: false, error: String(error) });
        }
        return true;
    }
});

