import './config/public-path';
// This file is the content script that interacts with web pages.
// It detects and formats JSON on web pages

// Import JSON drawer styles
import './assets/styles/json-drawer.css';
import './assets/styles/json-viewer-component.css';

// 导入版本号从中心配置
import { VERSION } from './config/version';
import { STORAGE_KEYS } from './config/storageKeys';
import { MESSAGE_ACTIONS } from './config/messageActions';
import { DETECTION_UI } from './config/uiConstants';
import { initTheme } from './utils/theme';
import {
    closeJsonDrawer,
    ensureJsonDrawerMounted,
    getJsonDrawerContent,
    getOrCreateJsonDrawer,
    openJsonDrawer,
    setJsonDrawerOutsideClickHandler,
} from './drawer/drawerHost';
import { detectJsonAtPointInElement, detectJsonInElement } from './content/jsonDetection';
import { highlightJsonInElement, highlightJsonMatchesInElement } from './content/highlight';
import { registerContentLifecycle } from './content/lifecycle';
import { registerContentMessageHandler } from './content/messages';
import { showNotification } from './content/notification';
import { loadContentSettings } from './content/settings';

const EXTENSION_VERSION = VERSION;
console.log(`Content script loaded. JSON Formatter & Viewer version ${EXTENSION_VERSION}`);
initTheme(document.documentElement, { colorScheme: false });

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
    const settings = await loadContentSettings(EXTENSION_VERSION);
    extensionEnabledOnCurrentSite = settings.extensionEnabledOnCurrentSite;
    enableHoverDetection = settings.hoverDetectionEnabled;
}

// 调用初始化函数
initializeSettings();

// 在新窗口中打开JSON
async function openJsonInWindow(jsonString: string): Promise<void> {
    try {
        const response = await chrome.runtime.sendMessage({
            action: MESSAGE_ACTIONS.OPEN_JSON_WINDOW,
            jsonData: jsonString
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
        const { showJsonInDrawerWithReact } = await import('./drawer/renderJsonDrawer');

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
                const jsonMatches = detectJsonAtPointInElement(target, e.clientX, e.clientY);
                const jsonContents = jsonMatches.length > 0 ? [] : detectJsonInElement(target);

                if (jsonMatches.length > 0 || jsonContents.length > 0) {
                    const htmlTarget = target as HTMLElement;
                    const highlightOptions = {
                        onOpenJson: showJsonByPreference,
                        onError: (message: string, error: unknown) => {
                            console.error(message, error);
                            if (message === 'Error showing JSON:') {
                                showNotification('无法显示JSON', 'error');
                            }
                        }
                    };

                    if (jsonMatches.length > 0) {
                        highlightJsonMatchesInElement(htmlTarget, jsonMatches, highlightOptions);
                    } else {
                        highlightJsonInElement(htmlTarget, jsonContents, highlightOptions);
                    }
                }
            }
        }
    }, DETECTION_UI.HOVER_THROTTLE_MS));

    // 标记为已添加
    hoverDetectionListenerAdded = true;
}

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

registerContentLifecycle({
    getExtensionEnabledOnCurrentSite: () => extensionEnabledOnCurrentSite,
    getHoverDetectionEnabled: () => enableHoverDetection,
    getAutoDetectionTemporarilyEnabled: () => autoDetectionTemporarilyEnabled,
    enableHoverDetectionFeature,
});
