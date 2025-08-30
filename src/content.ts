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
import {getCurrentLanguage, getTranslations} from "./utils/i18n";

// 是否启用悬停检测
let enableHoverDetection = true;

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
    notification.style.zIndex = '100000';
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
        }, 500);
    }, 3000);
}

// 使用导入的 isValidNestedJson 函数，不再需要本地定义
const isValidJson = isValidNestedJson;

// 在元素中检测JSON内容
function detectJsonInElement(element: Element): string[] {
    // 获取元素的文本内容
    const text = element.textContent || '';
    if (text.length < 5) return [];

    const detectedJsons: string[] = [];

    // 查找文本中可能包含的所有JSON
    const allPotentialJsons = findAllPotentialJsons(text);
    detectedJsons.push(...allPotentialJsons);

    // 去除重复的JSON
    const uniqueJsons = Array.from(new Set(detectedJsons));

    // 按长度排序，优先选择较长的JSON (通常包含更多信息)
    return uniqueJsons.sort((a, b) => b.length - a.length);
}

// 查找文本中所有潜在的JSON，增强精确度
function findAllPotentialJsons(text: string): string[] {
    const validJsons: string[] = [];
    const candidateJsons: string[] = [];

    // 首先检查整个文本是否是JSON
    const trimmedText = text.trim();
    if ((trimmedText.startsWith('{') && trimmedText.endsWith('}')) ||
        (trimmedText.startsWith('[') && trimmedText.endsWith(']'))) {
        try {
            if (isValidJson(trimmedText)) {
                validJsons.push(trimmedText);
                return validJsons; // 如果整个文本是有效JSON，直接返回
            }
        } catch (e) {
            // 继续尝试查找嵌套JSON
        }
    }

    // 查找大括号配对的JSON对象
    findBalancedPatterns(text, '{', '}').forEach(jsonStr => {
        candidateJsons.push(jsonStr);
    });

    // 查找方括号配对的JSON数组
    findBalancedPatterns(text, '[', ']').forEach(jsonStr => {
        candidateJsons.push(jsonStr);
    });

    // 查找常见的格式，如req:后面跟着的JSON
    // 使用更精确的模式匹配，优先查找完整的JSON
    const reqPatterns = [
        /req:\s*(\{[\s\S]*?[^\\]\})/g, // 匹配最后一个非转义的大括号
        /res:\s*(\{[\s\S]*?[^\\]\})/g,
        /param=\s*(\{[\s\S]*?[^\\]\}|\[[\s\S]*?[^\\]\])/g,
        /"params":\s*(\{[\s\S]*?[^\\]\}|\[[\s\S]*?[^\\]\])/g,
        /"data":\s*(\{[\s\S]*?[^\\]\}|\[[\s\S]*?[^\\]\])/g,
        // 具体匹配用户示例中的格式
        /\[\{"success".*?\}\]/g,
        /\[\{"orderItemId".*?\}\]/g
    ];

    for (const pattern of reqPatterns) {
        let match;
        while ((match = pattern.exec(text)) !== null) {
            const jsonStr = match[1] || match[0]; // 使用完整匹配或第一个捕获组
            candidateJsons.push(jsonStr);
        }
    }

    // 验证所有候选JSON
    for (const jsonStr of candidateJsons) {
        try {
            if (isValidJson(jsonStr) && jsonStr.length > 10) {
                // 进行更严格的验证，确保是完整的JSON对象/数组
                const jsonObj = JSON.parse(jsonStr);
                if (typeof jsonObj === 'object' && jsonObj !== null) {
                    // 检查是否为顶层JSON（不是其他JSON的子集）
                    let isSubset = false;
                    for (const otherJson of candidateJsons) {
                        if (otherJson !== jsonStr && otherJson.includes(jsonStr) &&
                            isValidJson(otherJson) && otherJson.length > jsonStr.length) {
                            // 如果当前JSON是另一个更长有效JSON的子集，跳过它
                            isSubset = true;
                            break;
                        }
                    }
                    if (!isSubset) {
                        validJsons.push(jsonStr);
                    }
                }
            }
        } catch (e) {
            // 忽略无效JSON
        }
    }

    // 去除重复项
    const uniqueJsons = Array.from(new Set(validJsons));
    return uniqueJsons;
}

// 查找文本中所有平衡的括号对，优化查找完整JSON
function findBalancedPatterns(text: string, openChar: string, closeChar: string): string[] {
    const results: string[] = [];
    const stack: number[] = [];
    const positions: number[][] = []; // 存储所有可能的起始-结束位置对

    // 遍历文本，找出所有可能的平衡括号对
    for (let i = 0; i < text.length; i++) {
        if (text[i] === openChar) {
            stack.push(i);
        } else if (text[i] === closeChar && stack.length > 0) {
            const startIdx = stack.pop()!;
            // 如果这是最外层的括号对，保存结果位置
            if (stack.length === 0) {
                positions.push([startIdx, i]);
            }
        }
    }

    // 筛选出顶层的括号对（不是其他括号对的子集）
    const topLevelPositions = positions.filter(([start, end]) => {
        return !positions.some(([otherStart, otherEnd]) => {
            // 检查当前括号对是否完全包含在另一个括号对内
            return (start > otherStart && end < otherEnd);
        });
    });

    // 从文本中提取顶层括号对的内容
    topLevelPositions.forEach(([start, end]) => {
        const jsonStr = text.substring(start, end + 1);
        // 验证提取的字符串长度合理且格式正确
        if (jsonStr.length > 5 && jsonStr.length <= text.length) {
            results.push(jsonStr);
        }
    });

    return results;
}

// 在新窗口中打开JSON
async function openJsonInWindow(jsonString: string): Promise<void> {
    try {
        // 先保存JSON数据到background script的全局变量中
        await chrome.runtime.sendMessage({
            action: 'setJsonData',
            jsonString: jsonString
        });
        
        // 然后打开新标签页
        const response = await chrome.runtime.sendMessage({
            action: 'openJsonInTab'
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
        const result = await chrome.storage.local.get('jsonDisplayMode');
        const displayMode = result.jsonDisplayMode || 'drawer';
        
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
        const drawer = document.querySelector('.json-drawer') as HTMLElement || createJsonDrawer();
        if (!document.body.contains(drawer)) {
            document.body.appendChild(drawer);
        }

        const drawerContent = drawer.querySelector('.json-drawer-content');
        if (!drawerContent) return;

        drawerContent.innerHTML = `
            <div style="color: #d32f2f; background-color: #ffebee; padding: 10px; 
                border-radius: 4px; border-left: 4px solid #d32f2f; margin: 10px 0;">
                Error loading JSON Viewer: ${(e as Error).message}
                <br><br>
                <code>${jsonString.substring(0, 200)}${jsonString.length > 200 ? '...' : ''}</code>
            </div>
        `;
        
        drawer.classList.add('open');
        throw e; // 重新抛出错误以便调用者处理
    }
}

// These JSON rendering functions were removed as they are not used.
// The extension now uses React-based JSON viewer component.
// Create a simplified JSON drawer element
function createJsonDrawer(): HTMLElement {
    // Use a simple drawer implementation since we're now primarily using the React-based drawer
    // from reactJsonDrawer.tsx for the actual JSON viewing
    const drawer = document.createElement('div');
    drawer.className = 'json-drawer';
    drawer.innerHTML = `
        <div class="json-drawer-resize-handle" title="拖动调整宽度"></div>
        <div class="json-drawer-content"></div>
    `;

    // The close button is removed from here as the main UI is handled by React.
    // The fallback can be closed by clicking outside.

    // 添加拖动调整宽度功能
    const resizeHandle = drawer.querySelector('.json-drawer-resize-handle') as HTMLElement;
    if (resizeHandle) {
        let isResizing = false;
        let startX = 0;
        let startWidth = 0;

        const handleMouseDown = (e: MouseEvent) => {
            isResizing = true;
            startX = e.clientX;
            startWidth = drawer.offsetWidth;
            
            // 添加拖动状态样式
            drawer.classList.add('resizing');
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
            
            // 阻止默认行为和事件冒泡
            e.preventDefault();
            e.stopPropagation();
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;

            const deltaX = startX - e.clientX; // 向左拖动为正值
            const newWidth = startWidth + deltaX;
            
            // 限制最小和最大宽度
            const minWidth = 300;
            const maxWidth = Math.min(window.innerWidth * 0.9, 1600); // 增加到90%和1600px
            const constrainedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
            
            // 应用新宽度
            drawer.style.width = `${constrainedWidth}px`;
            
            // 阻止默认行为
            e.preventDefault();
        };

        const handleMouseUp = (e: MouseEvent) => {
            if (!isResizing) return;
            
            isResizing = false;
            
            // 移除拖动状态样式
            drawer.classList.remove('resizing');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            
            // 保存用户设置的宽度到localStorage
            const finalWidth = drawer.offsetWidth;
            try {
                localStorage.setItem('jsonDrawerWidth', finalWidth.toString());
            } catch (error) {
                console.warn('无法保存抽屉宽度设置到localStorage:', error);
            }
            
            // 阻止默认行为
            e.preventDefault();
        };

        // 绑定拖动事件
        resizeHandle.addEventListener('mousedown', handleMouseDown);
        
        // 全局鼠标事件
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        
        // 防止选中文本
        resizeHandle.addEventListener('selectstart', (e) => e.preventDefault());
        resizeHandle.addEventListener('dragstart', (e) => e.preventDefault());
    }

    // 从localStorage恢复保存的宽度设置
    try {
        const savedWidth = localStorage.getItem('jsonDrawerWidth');
        if (savedWidth) {
            const width = parseInt(savedWidth, 10);
            if (width >= 300 && width <= window.innerWidth * 0.9) { // 更新到90%
                drawer.style.width = `${width}px`;
            }
        }
    } catch (error) {
        console.warn('无法从localStorage恢复抽屉宽度设置:', error);
    }
    
    // 点击抽屉外部关闭
    const clickOutsideHandler = (event: MouseEvent) => {
        if (drawer.classList.contains('open') && 
            !drawer.contains(event.target as Node)) {
            // 不再排除点击在 json-text-hover 上的情况，允许点击高亮的JSON文本时关闭抽屉
            drawer.classList.remove('open');
        }
    };
    
    // 添加全局点击监听，确保点击抽屉外部时关闭抽屉
    document.addEventListener('click', clickOutsideHandler);
    
    return drawer;
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

// 初始化JSON格式化功能
function initializeJsonFormatter() {
    console.log('Initializing JSON formatter...');
    
    // 创建抽屉元素以便随时使用
    const drawer = createJsonDrawer();
    document.body.appendChild(drawer);
}

// 在DOMContentLoaded事件中初始化基本功能
document.addEventListener('DOMContentLoaded', () => {
    initializeJsonFormatter();
});

// 监听来自背景脚本的消息
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    const lang = await getCurrentLanguage();
    const i18n = getTranslations(lang);

    if (request.action === 'formatSelectedJson' && request.selectedText) {
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
        
    } else if (request.action === 'toggleHoverDetection') {
        // 切换悬停检测状态
        enableHoverDetection = !enableHoverDetection;
        
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
        
    } else if (request.action === 'getHoverDetectionState') {
        // 返回当前悬停检测状态
        sendResponse({ enabled: enableHoverDetection });
        return true; // 支持异步响应
        
    } else if (request.action === 'showJsonFromPopup') {
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
    }
    
    // 对于不识别的action，返回false表示不需要异步响应
    return false;
});

window.addEventListener('load', () => {
    // 等待页面完全加载后再初始化JSON检测
    setTimeout(() => {
        // 添加鼠标悬停检测功能
        if (enableHoverDetection) {
            console.log(`%c🔍 JSON Detector v${EXTENSION_VERSION}: Enabling hover detection`,
                'background: #4285f4; color: white; padding: 2px 6px; border-radius: 2px;');

            // 创建状态提示元素 - 只在调试模式显示
            console.log(`JSON Detector v${EXTENSION_VERSION} hover mode enabled`);

            // 添加全局鼠标移动监听器，用于悬停检测
            document.addEventListener('mousemove', throttle((e: MouseEvent) => {
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
                                            jsonSpan.title = "JSON检测到! 双击查看";                                            // 只存储这个特定的JSON字符串
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
            }, 150)); // 150ms的节流，保持响应性但不过度消耗性能
        }
    }, 500); // 等待500ms确保页面内容完全加载
});