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
import { getSiteFilterConfig, shouldEnableOnSite } from './utils/siteFilter';
import { STORAGE_KEYS } from './config/storageKeys';
import { MESSAGE_ACTIONS } from './config/messageActions';
import { DETECTION_UI } from './config/uiConstants';
import {
    closeJsonDrawer,
    ensureJsonDrawerMounted,
    getJsonDrawerContent,
    getOrCreateJsonDrawer,
    openJsonDrawer,
    setJsonDrawerOutsideClickHandler,
} from './drawer/drawerHost';
import { detectJsonInElement } from './content/jsonDetection';
import { highlightJsonInElement } from './content/highlight';
import { registerContentMessageHandler } from './content/messages';
import { showNotification } from './content/notification';

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
                    const htmlTarget = target as HTMLElement;
                    highlightJsonInElement(htmlTarget, jsonContents, {
                        onOpenJson: showJsonByPreference,
                        onError: (message, error) => {
                            console.error(message, error);
                            if (message === 'Error showing JSON:') {
                                showNotification('无法显示JSON', 'error');
                            }
                        }
                    });
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

registerContentMessageHandler({
    getHoverDetectionEnabled: () => enableHoverDetection,
    setHoverDetectionEnabled: (enabled) => {
        enableHoverDetection = enabled;
    },
    getAutoDetectionTemporarilyEnabled: () => autoDetectionTemporarilyEnabled,
    getAutoDetectionTemporarilyDisabled: () => autoDetectionTemporarilyDisabled,
    setAutoDetectionTemporarilyEnabled: (enabled) => {
        autoDetectionTemporarilyEnabled = enabled;
    },
    setAutoDetectionTemporarilyDisabled: (disabled) => {
        autoDetectionTemporarilyDisabled = disabled;
    },
    enableHoverDetectionFeature,
    showJsonInDrawer,
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
