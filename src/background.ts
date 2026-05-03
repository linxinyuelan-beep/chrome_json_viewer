// background.ts - Background service worker for JSON Formatter & Viewer
import { detectLanguageByLocale, getCurrentLanguage, getTranslations } from "./utils/i18n";
import './config/public-path';
import { VERSION } from './config/version';
import { getSiteFilterConfig, shouldEnableOnSite } from './utils/siteFilter';
import { STORAGE_KEYS } from './config/storageKeys';
import { MESSAGE_ACTIONS, MESSAGE_COMMANDS } from './config/messageActions';
import { COMMAND_IDS, CONTEXT_MENU_IDS } from './config/contextMenus';
import { WINDOW_UI } from './config/uiConstants';
import { saveJsonPayload } from './utils/jsonPayloadStore';

let pendingJsonPayloadId: string | null = null;

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
                id: CONTEXT_MENU_IDS.FORMAT_SELECTED_JSON,
                title: i18n.formatSelectedJson,
                contexts: ['selection'],
            });

            // Get current hover detection setting to determine menu text
            const result = await chrome.storage.local.get(STORAGE_KEYS.HOVER_DETECTION_ENABLED);
            const hoverDetectionEnabled = result[STORAGE_KEYS.HOVER_DETECTION_ENABLED] !== undefined ? result[STORAGE_KEYS.HOVER_DETECTION_ENABLED] : true;
            const menuTitle = hoverDetectionEnabled ? i18n.disableAutoDetection : i18n.enableAutoDetection;

            // Create toggle auto-detection menu item
            chrome.contextMenus.create({
                id: CONTEXT_MENU_IDS.TOGGLE_AUTO_DETECTION,
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
    chrome.storage.local.get(STORAGE_KEYS.LANGUAGE, (result) => {
        if (!result[STORAGE_KEYS.LANGUAGE]) {
            chrome.storage.local.set({ [STORAGE_KEYS.LANGUAGE]: detectLanguageByLocale(navigator.language) });
        }
    });
});

// Listen for language changes, hover detection changes, or site filter changes to update the context menu
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && (
        changes[STORAGE_KEYS.LANGUAGE] ||
        changes[STORAGE_KEYS.HOVER_DETECTION_ENABLED] ||
        changes[STORAGE_KEYS.SITE_FILTER_CONFIG]
    )) {
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

// 处理右键菜单点击
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === CONTEXT_MENU_IDS.TOGGLE_AUTO_DETECTION) {
        // 切换自动检测状态（临时开启或关闭）
        if (tab && tab.id && !tab.url?.startsWith('chrome://') && !tab.url?.startsWith('chrome-extension://')) {
            chrome.tabs.sendMessage(tab.id, {
                action: MESSAGE_ACTIONS.TOGGLE_AUTO_DETECTION_TEMPORARILY
            });
        }
    } else if (info.menuItemId === CONTEXT_MENU_IDS.FORMAT_SELECTED_JSON) {
        if (!tab || tab.url?.startsWith('chrome://') || tab.url?.startsWith('chrome-extension://')) {
            // 保存选中文本并打开新窗口
            void openJsonWindowWithPayload(info.selectionText || '').catch((error) => {
                console.error('Error opening JSON window from selection:', error);
            });
            return;
        }
        // 读取用户设置，决定显示方式
        chrome.storage.local.get(STORAGE_KEYS.JSON_DISPLAY_MODE, (result) => {
            const displayMode = result[STORAGE_KEYS.JSON_DISPLAY_MODE] || 'drawer';

            if (displayMode === 'window') {
                void openJsonWindowWithPayload(info.selectionText || '').catch((error) => {
                    console.error('Error opening JSON window from selection:', error);
                });
            } else {
                // 在当前页面的抽屉中显示
                chrome.tabs.sendMessage(tab.id as number, {
                    action: MESSAGE_ACTIONS.SHOW_JSON_IN_DRAWER,
                    jsonString: info.selectionText
                });
            }
        });
    }
});

// 打开JSON窗口的函数
function openJsonWindow(payloadId?: string) {
    const path = payloadId ? `json-window.html?payloadId=${encodeURIComponent(payloadId)}` : 'json-window.html';
    const jsonH_url = chrome.runtime.getURL(path);
    chrome.windows.create({
        url: jsonH_url,
        type: "popup",
        width: WINDOW_UI.JSON_WINDOW_WIDTH,
        height: WINDOW_UI.JSON_WINDOW_HEIGHT
    });
}

async function openJsonWindowWithPayload(jsonString: string): Promise<void> {
    const payloadId = await saveJsonPayload(jsonString);
    openJsonWindow(payloadId);
}

// 监听命令快捷键
chrome.commands.onCommand.addListener(async (command) => {
    console.log(`Command received: ${command} `);

    // 获取当前标签页
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) return;

    if (command === COMMAND_IDS.FORMAT_SELECTED_JSON) {
        // 获取选中的文本
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => window.getSelection()?.toString() || '',
        }).then(injectionResults => {
            const selectedText = injectionResults[0].result;
            if (selectedText) {
                chrome.tabs.sendMessage(tab.id as number, {
                    action: MESSAGE_ACTIONS.FORMAT_SELECTED_JSON,
                    selectedText
                });
            }
        });
    } else if (command === COMMAND_IDS.TOGGLE_HOVER_DETECTION) {
        // 发送切换悬停检测模式的消息
        chrome.tabs.sendMessage(tab.id, {
            action: MESSAGE_ACTIONS.TOGGLE_HOVER_DETECTION
        });
    }
});

// 监听来自各个页面的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Background script received message:', request);

    // Legacy request kept for older windows without a payloadId.
    if (request.cmd === MESSAGE_COMMANDS.GET_JSON) {
        sendResponse(null);
        return true;
    }

    // 处理设置JSON数据的请求（新的实现方式）
    if (request.action === MESSAGE_ACTIONS.SET_JSON_DATA) {
        saveJsonPayload(request.jsonString)
            .then((payloadId) => {
                pendingJsonPayloadId = payloadId;
                sendResponse({ success: true, payloadId });
            })
            .catch((error) => {
                console.error('Error saving JSON payload:', error);
                sendResponse({ success: false, error: String(error) });
            });
        return true;
    }

    // 处理打开JSON标签页的请求（新的实现方式）
    if (request.action === MESSAGE_ACTIONS.OPEN_JSON_IN_TAB) {
        try {
            const payloadId = request.payloadId || pendingJsonPayloadId;
            pendingJsonPayloadId = null;
            openJsonWindow(payloadId);
            sendResponse({ success: true });
        } catch (error) {
            console.error('Error in openJsonInTab:', error);
            sendResponse({ success: false, error: String(error) });
        }
        return true;
    }

    if (request.action === MESSAGE_ACTIONS.SHOW_JSON_FROM_POPUP) {
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

    if (request.action === MESSAGE_ACTIONS.OPEN_JSON_WINDOW) {
        console.log('Background script received openJsonWindow request');
        try {
            // 保存 payload 并打开窗口
            if (request.jsonData) {
                saveJsonPayload(request.jsonData)
                    .then((payloadId) => {
                        openJsonWindow(payloadId);
                        sendResponse({ success: true, payloadId });
                    })
                    .catch((error) => {
                        console.error('Error saving JSON payload:', error);
                        sendResponse({ success: false, error: String(error) });
                    });
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
    if (request.action === MESSAGE_ACTIONS.OPEN_JSON_COMPARE) {
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
