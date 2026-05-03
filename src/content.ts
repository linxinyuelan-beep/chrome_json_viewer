import './config/public-path';
// This file is the content script that interacts with web pages.
// It detects and formats JSON on web pages

// Import JSON drawer styles
import './assets/styles/json-drawer.css';
import './assets/styles/json-viewer-component.css';

// 导入版本号从中心配置
import { VERSION } from './config/version';
const EXTENSION_VERSION = VERSION;
console.log(`Content script loaded. JSON Formatter & Viewer version ${EXTENSION_VERSION}`);


// 导入工具函数
import { isValidNestedJson } from './utils/nestedJsonHandler';
import { getCurrentLanguage, getTranslations } from "./utils/i18n";
import { getSiteFilterConfig, shouldEnableOnSite } from './utils/siteFilter';
import { STORAGE_KEYS } from './config/storageKeys';
import { MESSAGE_ACTIONS } from './config/messageActions';
import { DETECTION_UI, NOTIFICATION_UI } from './config/uiConstants';
import {
    closeJsonDrawer,
    ensureJsonDrawerMounted,
    getJsonDrawerContent,
    getOrCreateJsonDrawer,
    openJsonDrawer,
    setJsonDrawerOutsideClickHandler,
} from './drawer/drawerHost';
import { detectJsonInElement } from './content/jsonDetection';

// 是否启用悬停检测，从存储中加载
let enableHoverDetection = true;
// 临时禁用自动检测标志（仅在当前页面会话期间有效）
let autoDetectionTemporarilyDisabled = false;
// 临时启用自动检测标志（仅在当前页面会话期间有效）
let autoDetectionTemporarilyEnabled = false;
// 标志记录是否已添加悬停检测事件监听器
let hoverDetectionListenerAdded = false;
// 标志记录插件是否在当前网站上启用
let extensionEnabledOnCurrentSite = true;

// 初始化时加载设置
async function initializeSettings() {
  // 检查网站过滤设置
  const filterConfig = await getSiteFilterConfig();
  const currentUrl = window.location.href;
  extensionEnabledOnCurrentSite = shouldEnableOnSite(currentUrl, filterConfig);
  
  // 如果在当前网站上禁用，直接返回，不加载其他设置
  if (!extensionEnabledOnCurrentSite) {
    console.log(`%c🚫 JSON Detector v${EXTENSION_VERSION}: Disabled on this site`,
      'background: #f44336; color: white; padding: 2px 6px; border-radius: 2px;');
    return;
  }
  
  // 加载悬停检测设置
  chrome.storage.local.get(STORAGE_KEYS.HOVER_DETECTION_ENABLED, (result) => {
    enableHoverDetection = result[STORAGE_KEYS.HOVER_DETECTION_ENABLED] !== undefined ? result[STORAGE_KEYS.HOVER_DETECTION_ENABLED] : true;
  });
}

// 调用初始化函数
initializeSettings();

// 显示通知
function showNotification(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.left = '50%';
    notification.style.transform = 'translateX(-50%)';
    notification.style.padding = '10px 20px';
    notification.style.color = 'white';
    notification.style.borderRadius = '4px';
    notification.style.zIndex = NOTIFICATION_UI.Z_INDEX;
    notification.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    notification.style.transition = 'opacity 0.5s';
    notification.style.fontSize = '14px';

    // 根据类型设置样式
    switch (type) {
        case 'success':
            notification.style.backgroundColor = '#4caf50';
            break;
        case 'error':
            notification.style.backgroundColor = '#f44336';
            break;
        case 'info':
            notification.style.backgroundColor = '#2196f3';
            break;
    }

    notification.textContent = message;

    // 添加到页面
    document.body.appendChild(notification);

    // 3秒后淡出
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, NOTIFICATION_UI.FADE_MS);
    }, NOTIFICATION_UI.DURATION_MS);
}

// 使用导入的 isValidNestedJson 函数，不再需要本地定义
const isValidJson = isValidNestedJson;

// 在新窗口中打开JSON
async function openJsonInWindow(jsonString: string): Promise<void> {
    try {
        // 先保存JSON数据到background script的全局变量中
        const payloadResponse = await chrome.runtime.sendMessage({
            action: MESSAGE_ACTIONS.SET_JSON_DATA,
            jsonString: jsonString
        });

        // 然后打开新标签页
        const response = await chrome.runtime.sendMessage({
            action: MESSAGE_ACTIONS.OPEN_JSON_IN_TAB,
            payloadId: payloadResponse?.payloadId
        });

        if (!response || !response.success) {
            throw new Error(response?.error || 'Failed to open JSON in new tab');
        }
    } catch (error) {
        console.error('Error opening JSON in window:', error);
        showNotification('无法打开JSON窗口', 'error');
        // 回退到抽屉显示
        await showJsonInDrawer(jsonString);
    }
}

// 根据用户设置显示JSON
async function showJsonByPreference(jsonString: string): Promise<void> {
    try {
        // 获取用户的显示偏好设置
        const result = await chrome.storage.local.get(STORAGE_KEYS.JSON_DISPLAY_MODE);
        const displayMode = result[STORAGE_KEYS.JSON_DISPLAY_MODE] || 'drawer';

        if (displayMode === 'window') {
            await openJsonInWindow(jsonString);
        } else {
            await showJsonInDrawer(jsonString);
        }
    } catch (error) {
        console.error('Error showing JSON:', error);
        // 如果出错，回退到抽屉显示
        await showJsonInDrawer(jsonString);
    }
}

// 在抽屉中显示JSON - 使用React JSON Viewer组件
async function showJsonInDrawer(jsonString: string): Promise<void> {

    try {
        // 导入React渲染器 - 使用动态导入确保只在需要时加载
        const { showJsonInDrawerWithReact } = await import('./utils/reactJsonDrawer');

        // 使用React组件显示JSON
        showJsonInDrawerWithReact(jsonString, EXTENSION_VERSION);
    } catch (e) {
        console.error('Error importing React JSON drawer:', e);

        // Create a simple error message if React component fails to load
        const drawer = getOrCreateJsonDrawer();
        ensureJsonDrawerMounted(drawer);

        const drawerContent = getJsonDrawerContent(drawer);
        if (!drawerContent) return;

        drawerContent.innerHTML = `
            <div style="color: #d32f2f; background-color: #ffebee; padding: 10px; 
                border-radius: 4px; border-left: 4px solid #d32f2f; margin: 10px 0;">
                Error loading JSON Viewer: ${(e as Error).message}
                <br><br>
                <code>${jsonString.substring(0, 200)}${jsonString.length > 200 ? '...' : ''}</code>
            </div>
        `;

        setJsonDrawerOutsideClickHandler(drawer, () => {
            closeJsonDrawer(drawer);
        });
        openJsonDrawer(drawer);
        throw e; // 重新抛出错误以便调用者处理
    }
}

// 获取元素内所有文本节点的辅助函数
function getAllTextNodes(element: HTMLElement): Node[] {
    const textNodes: Node[] = [];
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);

    let node;
    while ((node = walker.nextNode())) {
        textNodes.push(node);
    }

    return textNodes;
}

// 恢复原始文本的辅助函数
function restoreOriginalText(highlightSpan: HTMLElement): void {
    const parent = highlightSpan.parentNode;
    if (!parent) return;

    // 获取span前后的相邻文本节点
    let prevTextNode = highlightSpan.previousSibling;
    let nextTextNode = highlightSpan.nextSibling;

    // 提取span中的文本
    const spanText = highlightSpan.textContent || '';

    // 移除span
    parent.removeChild(highlightSpan);

    // 创建新的文本节点包含span的内容
    const newTextNode = document.createTextNode(spanText);

    // 插入到适当的位置
    if (nextTextNode) {
        parent.insertBefore(newTextNode, nextTextNode);
    } else {
        parent.appendChild(newTextNode);
    }

    // 合并相邻的文本节点，避免文本碎片
    if (prevTextNode && prevTextNode.nodeType === Node.TEXT_NODE &&
        newTextNode.nodeType === Node.TEXT_NODE) {
        prevTextNode.textContent = (prevTextNode.textContent || '') + newTextNode.textContent;
        parent.removeChild(newTextNode);
    }

    // 合并后续文本节点，如果有的话
    if (nextTextNode && nextTextNode.nodeType === Node.TEXT_NODE &&
        newTextNode.parentNode && newTextNode.nodeType === Node.TEXT_NODE) {
        newTextNode.textContent = (newTextNode.textContent || '') + nextTextNode.textContent;
        parent.removeChild(nextTextNode);
    }
}

// 节流函数
function throttle<T extends (...args: any[]) => any>(
    func: T,
    delay: number
): (...args: Parameters<T>) => void {
    let lastCall = 0;
    let timeout: number | null = null;

    return function (...args: Parameters<T>) {
        const now = Date.now();
        if (now - lastCall < delay) {
            // 如果还没到延迟时间，取消之前的调用并设置新的延迟调用
            if (timeout) {
                clearTimeout(timeout);
            }
            timeout = window.setTimeout(() => {
                lastCall = now;
                func(...args);
            }, delay);
            return;
        }
        lastCall = now;
        func(...args);
    };
}

// 封装悬停检测功能，使其可以动态启用
function enableHoverDetectionFeature(): void {
    // 如果插件在当前网站上被禁用，不启用悬停检测
    if (!extensionEnabledOnCurrentSite) {
        console.log('Extension is disabled on this site, hover detection will not be enabled');
        return;
    }
    
    // 如果已经添加过了，不重复添加
    if (hoverDetectionListenerAdded) {
        console.log('Hover detection listener already added, skipping...');
        return;
    }

    console.log(`%c🔍 JSON Detector v${EXTENSION_VERSION}: Enabling hover detection${autoDetectionTemporarilyEnabled ? ' (temporarily enabled)' : ''}`,
        'background: #4285f4; color: white; padding: 2px 6px; border-radius: 2px;');

    // 创建状态提示元素 - 只在调试模式显示
    console.log(`JSON Detector v${EXTENSION_VERSION} hover mode enabled`);

    // 添加全局鼠标移动监听器，用于悬停检测
    document.addEventListener('mousemove', throttle((e: MouseEvent) => {
        // 如果临时禁用了自动检测，则不处理
        if (autoDetectionTemporarilyDisabled) {
            return;
        }

        // 获取鼠标下方的元素
        const target = document.elementFromPoint(e.clientX, e.clientY);

        if (!target) return;

        // 检查是否已经是被标记的JSON文本
        if (target.classList && target.classList.contains('json-text-hover')) {
            return;
        }

        // 如果目标是文本节点或有文本内容的元素
        if ((target.nodeType === Node.TEXT_NODE ||
            target.childNodes.length === 0 ||
            (target.textContent && target.textContent.length > 10)) &&
            !['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION'].includes(target.tagName || '')) {

            // 获取目标文本
            const text = target.textContent || '';

            // 快速检查是否可能包含JSON (预筛选)
            const mayContainJson = text.includes('{') && text.includes('}') ||
                text.includes('[') && text.includes(']') ||
                text.includes('param=');

            if (mayContainJson) {
                // 尝试提取和检测JSON
                const jsonContents = detectJsonInElement(target);

                if (jsonContents.length > 0) {
                    // 找到所有JSON在原始文本中的位置，分别高亮每一个
                    const htmlTarget = target as HTMLElement;
                    const originalText = htmlTarget.textContent || '';

                    // 为了防止处理过程中文本改变导致的位置错误，先记录所有要处理的JSON及其位置
                    const jsonPositions: { json: string, position: number }[] = [];

                    // 查找每个JSON的位置
                    for (const jsonContent of jsonContents) {
                        const position = originalText.indexOf(jsonContent);
                        if (position !== -1) {
                            jsonPositions.push({ json: jsonContent, position });
                        }
                    }

                    // 按位置排序，确保从后向前处理，避免前面的处理影响后面的位置
                    jsonPositions.sort((a, b) => b.position - a.position);

                    for (const { json, position } of jsonPositions) {
                        try {
                            // 为每个JSON查找包含它的文本节点
                            const textNodes = getAllTextNodes(htmlTarget);
                            let processedNode = false;

                            for (const textNode of textNodes) {
                                if (!textNode.textContent) continue;

                                const nodeText = textNode.textContent;
                                const jsonPosInNode = nodeText.indexOf(json);

                                if (jsonPosInNode !== -1) {
                                    // 创建一个ID来标识这个JSON的高亮
                                    const jsonHighlightId = `json-highlight-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

                                    // 分割文本节点
                                    const beforeTextNode = document.createTextNode(
                                        nodeText.substring(0, jsonPosInNode)
                                    );
                                    const jsonSpan = document.createElement('span');
                                    jsonSpan.className = 'json-text-hover';
                                    jsonSpan.dataset.jsonContent = json;
                                    jsonSpan.id = jsonHighlightId;
                                    jsonSpan.textContent = json;
                                    const afterTextNode = document.createTextNode(
                                        nodeText.substring(jsonPosInNode + json.length)
                                    );

                                    // 替换原始文本节点
                                    const parentNode = textNode.parentNode;
                                    if (!parentNode) continue;

                                    // 将分割后的节点插入DOM
                                    parentNode.insertBefore(beforeTextNode, textNode);
                                    parentNode.insertBefore(jsonSpan, textNode);
                                    parentNode.insertBefore(afterTextNode, textNode);
                                    parentNode.removeChild(textNode);

                                    // 添加临时双击事件处理器
                                    const dblClickHandlerForJson = ((jsonString: string) => (ce: Event) => {
                                        const mouseEvent = ce as MouseEvent;
                                        mouseEvent.preventDefault();
                                        mouseEvent.stopPropagation();

                                        // 根据用户设置显示JSON
                                        showJsonByPreference(jsonString).catch(error => {
                                            console.error('Error showing JSON:', error);
                                            showNotification('无法显示JSON', 'error');
                                        });
                                    })(json);

                                    // 为当前jsonSpan添加双击处理
                                    jsonSpan.addEventListener('dblclick', dblClickHandlerForJson);

                                    // 鼠标移出时安全移除高亮
                                    const currentHighlightId = jsonHighlightId; // 保存当前ID以便在闭包中访问
                                    htmlTarget.addEventListener('mouseleave', () => {
                                        try {
                                            // 找到我们添加的span元素
                                            const highlightSpan = document.getElementById(currentHighlightId);
                                            if (highlightSpan && highlightSpan.parentNode) {
                                                restoreOriginalText(highlightSpan);
                                            }
                                        } catch (e) {
                                            console.error('Error removing JSON highlight:', e);
                                        }
                                    }, { once: true });

                                    processedNode = true;
                                    break;
                                }
                            }

                            if (!processedNode) {
                                // console.log(`Could not find text node containing JSON: ${json.substring(0, 30)}...`);
                            }
                        } catch (e) {
                            console.error("Error highlighting JSON:", e);
                        }
                    }
                }
            }
        }
    }, DETECTION_UI.HOVER_THROTTLE_MS));

    // 标记为已添加
    hoverDetectionListenerAdded = true;
}

// 初始化JSON格式化功能
function initializeJsonFormatter() {
    // 如果插件在当前网站上被禁用，不初始化
    if (!extensionEnabledOnCurrentSite) {
        return;
    }
    
    console.log('Initializing JSON formatter...');

    // 创建抽屉元素以便随时使用
    const drawer = getOrCreateJsonDrawer();
    ensureJsonDrawerMounted(drawer);
}

// 在DOMContentLoaded事件中初始化基本功能
document.addEventListener('DOMContentLoaded', () => {
    initializeJsonFormatter();
});

// 监听来自背景脚本的消息
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    const lang = await getCurrentLanguage();
    const i18n = getTranslations(lang);

    if (request.action === MESSAGE_ACTIONS.FORMAT_SELECTED_JSON && request.selectedText) {
        // 尝试格式化选中的 JSON
        if (isValidJson(request.selectedText)) {
            showJsonInDrawer(request.selectedText)
                .then(() => {
                    sendResponse({ success: true });
                })
                .catch((error) => {
                    console.error('Error showing JSON in drawer:', error);
                    sendResponse({ success: false, error: (error as Error).message });
                });
        } else {
            showNotification(i18n.invalidJsonFormat, 'error');
            sendResponse({ success: false, error: 'Invalid JSON format' });
        }
        return true; // 支持异步响应

    } else if (request.action === MESSAGE_ACTIONS.SET_HOVER_DETECTION) {
        // 设置悬停检测状态
        enableHoverDetection = request.enabled;

        // 显示状态变化通知
        showNotification(
            `${i18n.hoverDetection}: ${enableHoverDetection ? i18n.statusEnabled : i18n.statusDisabled}`,
            enableHoverDetection ? 'success' : 'info'
        );

        // 如果启用悬停检测，刷新页面以应用更改
        if (enableHoverDetection) {
            location.reload();
        }

        sendResponse({ enabled: enableHoverDetection });
        return true; // 支持异步响应

    } else if (request.action === MESSAGE_ACTIONS.TOGGLE_HOVER_DETECTION) {
        // 保持兼容性，但现在也会保存到存储
        enableHoverDetection = !enableHoverDetection;

        // 保存到存储
        chrome.storage.local.set({ [STORAGE_KEYS.HOVER_DETECTION_ENABLED]: enableHoverDetection });

        // 显示状态变化通知
        showNotification(
            `${i18n.hoverDetection}: ${enableHoverDetection ? i18n.statusEnabled : i18n.statusDisabled}`,
            enableHoverDetection ? 'success' : 'info'
        );

        // 刷新页面以应用更改（如果启用悬停检测）
        if (enableHoverDetection) {
            location.reload();
        }

        // 发送响应
        sendResponse({ enabled: enableHoverDetection });
        return true; // 支持异步响应

    } else if (request.action === MESSAGE_ACTIONS.GET_HOVER_DETECTION_STATE) {
        // 返回当前悬停检测状态
        sendResponse({ enabled: enableHoverDetection });
        return true; // 支持异步响应

    } else if (request.action === MESSAGE_ACTIONS.SHOW_JSON_FROM_POPUP) {
        // 处理来自弹出窗口的JSON格式化请求
        console.log('Received showJsonFromPopup message with JSON length:', request.jsonString?.length);
        if (request.jsonString) {
            showJsonInDrawer(request.jsonString)
                .then(() => {
                    console.log('JSON drawer should be displayed now');
                    sendResponse({ success: true });
                })
                .catch((error) => {
                    console.error('Error showing JSON in drawer:', error);
                    sendResponse({ success: false, error: (error as Error).message });
                });
        } else {
            console.error('No JSON string provided in popup request');
            sendResponse({ success: false, error: 'No JSON string provided' });
        }
        return true; // 支持异步响应

    } else if (request.action === MESSAGE_ACTIONS.SHOW_JSON_IN_DRAWER) {
        // 处理来自background script的在抽屉中显示JSON的请求
        console.log('Received showJsonInDrawer message with JSON length:', request.jsonString?.length);
        if (request.jsonString) {
            showJsonInDrawer(request.jsonString)
                .then(() => {
                    console.log('JSON drawer displayed successfully');
                    sendResponse({ success: true });
                })
                .catch((error) => {
                    console.error('Error showing JSON in drawer:', error);
                    sendResponse({ success: false, error: (error as Error).message });
                });
        } else {
            console.error('No JSON string provided in showJsonInDrawer request');
            sendResponse({ success: false, error: 'No JSON string provided' });
        }
        return true; // 支持异步响应

    } else if (request.action === MESSAGE_ACTIONS.TOGGLE_AUTO_DETECTION_TEMPORARILY) {
        // 智能切换自动检测状态（临时开启或关闭，直到页面刷新）
        // 如果当前悬停检测已启用，则临时关闭；如果已禁用，则临时开启
        if (enableHoverDetection && !autoDetectionTemporarilyEnabled) {
            // 当前是开启状态（且不是临时启用的），临时关闭
            autoDetectionTemporarilyDisabled = true;
            autoDetectionTemporarilyEnabled = false;

            showNotification(
                `${i18n.autoDetectionDisabled}. ${i18n.autoDetectionWillResumeOnRefresh}`,
                'info'
            );
        } else {
            // 当前是关闭状态或临时启用状态，临时开启
            autoDetectionTemporarilyDisabled = false;
            autoDetectionTemporarilyEnabled = true;

            // 直接启用悬停检测功能，不需要刷新页面
            enableHoverDetectionFeature();

            showNotification(
                `${i18n.autoDetectionEnabled}. ${i18n.autoDetectionWillResumeOnRefresh}`,
                'success'
            );
        }

        sendResponse({ success: true, temporarilyDisabled: autoDetectionTemporarilyDisabled });
        return true; // 支持异步响应
    }

    // 对于不识别的action，返回false表示不需要异步响应
    return false;
});

window.addEventListener('load', () => {
    // 如果插件在当前网站上被禁用，不执行任何操作
    if (!extensionEnabledOnCurrentSite) {
        return;
    }
    
    // 等待页面完全加载后再初始化JSON检测
    setTimeout(() => {
        // 添加悬停检测功能
        // 如果设置中启用了悬停检测，或者临时启用了检测，则启用
        if (enableHoverDetection || autoDetectionTemporarilyEnabled) {
            enableHoverDetectionFeature();
        }
    }, DETECTION_UI.LOAD_INIT_DELAY_MS);
});
