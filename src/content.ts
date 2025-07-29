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
import { getDefaultViewType, JsonViewType } from './utils/jsonViewer';

// 是否启用悬停检测
let enableHoverDetection = true;

// 当前使用的 JSON 视图类型
let currentViewType: JsonViewType = 'react-json-view';

// 初始化加载默认视图类型
getDefaultViewType().then(viewType => {
    currentViewType = viewType;
    console.log(`Default JSON view type: ${currentViewType}`);
});

// 我们将不再使用直接的键盘事件监听器
// 而是通过Chrome命令 (chrome://extensions/shortcuts) 和background script的消息来处理

// 格式化选中的JSON文本
function formatSelectedJson(): void {
    // 获取选中的文本
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
        showNotification('没有选中任何文本', 'error');
        return;
    }
    
    // 获取选中的文本内容
    const selectedText = selection.toString();
    
    // 验证并格式化JSON
    if (isValidJson(selectedText)) {
        // 显示格式化后的JSON
        showJsonInDrawer(selectedText);
    } else {
        showNotification('所选文本不是有效的JSON', 'error');
    }
}



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

    // 先尝试检测特定服务的API日志格式
    if (text.includes('GdsOrderSystemServiceImpl')) {
        // 特殊处理GdsOrderSystemServiceImpl的API日志格式
        console.log("Detected GdsOrderSystemServiceImpl pattern");

        // 通用格式匹配，寻找任何req: 或 res: 后面的JSON
        const reqResPattern = /(req|res):(\{[\s\S]*?\})/ig;
        let reqResMatch;
        while ((reqResMatch = reqResPattern.exec(text)) !== null) {
            try {
                const jsonStr = reqResMatch[2];
                // console.log(`Found req/res pattern, JSON start: ${jsonStr.substring(0, 50)}...`);
                if (isValidJson(jsonStr)) {
                    // console.log(`Valid API req/res JSON detected with length ${jsonStr.length}`);
                    detectedJsons.push(jsonStr);
                }
            } catch (e) {
                console.error("Error parsing req/res JSON:", e);
            }
        }

        // 常规API模式匹配
        const apiPatterns = [
            /order system api logging,\s*class=GdsOrderSystemServiceImpl,\s*method=[\w.]+,\s*param=(\{[\s\S]*?\}|\[[\s\S]*?\])/ig,
            /class=GdsOrderSystemServiceImpl[\s\S]*?method=[\w.]+[\s\S]*?param=(\{[\s\S]*?\}|\[[\s\S]*?\])/ig,
            /GdsOrderSystemServiceImpl[\s\S]*?(\{[\s\S]*?\}|\[[\s\S]*?\])/ig,
            /GdsOrderSystemServiceImpl[\s\S]*(req|res):(\{[\s\S]*?\}|\[[\s\S]*?\])/ig
        ];

        for (const pattern of apiPatterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                // 根据捕获组数量判断JSON位置
                const jsonStr = match.length > 2 ? match[2] : match[1];
                if (jsonStr && isValidJson(jsonStr)) {
                    console.log(`Hover detected API log JSON: ${jsonStr.substring(0, 30)}...`);
                    detectedJsons.push(jsonStr);
                }
            }
        }
    }

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

// 在抽屉中显示JSON - 使用React JSON Viewer组件
function showJsonInDrawer(jsonString: string): void {
    console.log(`Displaying JSON in drawer, length: ${jsonString.length}`);
    
    // 导入React渲染器 - 使用动态导入确保只在需要时加载
    import('./utils/reactJsonDrawer').then(({ showJsonInDrawerWithReact }) => {
        console.log('React JSON drawer module loaded successfully');
        
        // 使用React组件显示JSON
        showJsonInDrawerWithReact(jsonString, EXTENSION_VERSION);
    }).catch(e => {
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
    });
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
        <div class="json-drawer-header">
            <div class="json-drawer-title">JSON Viewer</div>
            <button class="json-drawer-close">&times;</button>
        </div>
        <div class="json-drawer-content"></div>
    `;
    
    // Apply light theme styles
    drawer.style.backgroundColor = '#f8f9fa';
    drawer.style.color = '#333333';
    drawer.style.boxShadow = '-5px 0 15px rgba(0, 0, 0, 0.1)';
    drawer.style.padding = '0';
    
    // Style header
    const headerElement = drawer.querySelector('.json-drawer-header');
    if (headerElement) {
        (headerElement as HTMLElement).style.display = 'flex';
        (headerElement as HTMLElement).style.justifyContent = 'space-between';
        (headerElement as HTMLElement).style.alignItems = 'center';
        (headerElement as HTMLElement).style.padding = '8px 12px';
        (headerElement as HTMLElement).style.borderBottom = '1px solid #e0e0e0';
        (headerElement as HTMLElement).style.backgroundColor = '#e9f0f8';
        (headerElement as HTMLElement).style.margin = '0';
    }
    
    // Style title
    const titleElement = drawer.querySelector('.json-drawer-title');
    if (titleElement) {
        (titleElement as HTMLElement).style.fontWeight = 'bold';
        (titleElement as HTMLElement).style.fontSize = '14px';
        (titleElement as HTMLElement).style.color = '#2e7db5';
    }
    
    // Style close button
    const closeBtn = drawer.querySelector('.json-drawer-close');
    if (closeBtn) {
        (closeBtn as HTMLElement).style.color = '#666';
        (closeBtn as HTMLElement).style.fontSize = '18px';
        (closeBtn as HTMLElement).style.background = 'none';
        (closeBtn as HTMLElement).style.border = 'none';
        (closeBtn as HTMLElement).style.cursor = 'pointer';
        (closeBtn as HTMLElement).style.padding = '0 5px';
        
        // Close button click event
        closeBtn.addEventListener('click', () => {
            drawer.classList.remove('open');
        });
    }
    
    // 点击抽屉外部关闭
    const clickOutsideHandler = (event: MouseEvent) => {
        if (drawer.classList.contains('open') && 
            !drawer.contains(event.target as Node) &&
            !(event.target as Element).classList.contains('json-text-hover')) {
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

// 监听来自背景脚本的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'formatSelectedJson' && request.selectedText) {
        // 尝试格式化选中的 JSON
        if (isValidJson(request.selectedText)) {
            showJsonInDrawer(request.selectedText);
        } else {
            showNotification('所选文本不是有效的JSON', 'error');
        }
    } else if (request.action === 'toggleHoverDetection') {
        // 切换悬停检测状态
        enableHoverDetection = !enableHoverDetection;
        
        // 显示状态变化通知
        showNotification(
            `JSON悬停检测: ${enableHoverDetection ? '已启用' : '已禁用'}`,
            enableHoverDetection ? 'success' : 'info'
        );
        
        // 刷新页面以应用更改（如果启用悬停检测）
        if (enableHoverDetection) {
            location.reload();
        }
        
        // 发送响应
        sendResponse({ enabled: enableHoverDetection });
        
    } else if (request.action === 'getHoverDetectionState') {
        // 返回当前悬停检测状态
        sendResponse({ enabled: enableHoverDetection });
        
    } else if (request.action === 'updateDefaultViewType') {
        // 更新视图类型
        currentViewType = request.viewType;
        console.log(`Updated JSON view type: ${currentViewType}`);
        
        // 通知 JsonViewer 组件更新视图类型
        const event = new CustomEvent('json-view-type-updated', {
            detail: { viewType: currentViewType }
        });
        document.dispatchEvent(event);
        
        // 显示状态变化通知
        showNotification(
            `JSON视图类型已更新: ${currentViewType === 'react-json-view' ? 'JSON View' : 'Tree View'}`,
            'info'
        );
        
        // 发送响应
        sendResponse({ success: true });
    }
    
    // 必须返回 true 以支持异步响应
    return true;
});

window.addEventListener('load', () => {
    // 创建抽屉元素
    const drawer = createJsonDrawer();
    document.body.appendChild(drawer);    // 等待页面完全加载后再初始化JSON检测
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
                        text.includes('param=') && text.includes('GdsOrderSystemServiceImpl');

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

                                                // 只显示当前双击的JSON
                                                showJsonInDrawer(jsonString);
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
