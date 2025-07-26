// This file is the content script that interacts with web pages.
// It can manipulate the DOM of the pages the extension is active on.

// Import JSON drawer styles
import './assets/styles/json-drawer.css';

// 定义版本号常量
const EXTENSION_VERSION = "1.1.13";
console.log(`Content script loaded. JSON Detector version ${EXTENSION_VERSION}`);

// 是否启用悬停检测
let enableHoverDetection = true;

// Listen for the keyboard shortcuts
document.addEventListener('keydown', (event) => {
    // 'W' key: Move tab to other window
    if (event.key === 'W') {
        console.log('W key pressed, sending message to background script');
        chrome.runtime.sendMessage({ action: 'moveTabToOtherWindow' });
    }
    
    
    // Ctrl+Shift+H or Cmd+Shift+H: 切换悬停检测模式
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'h') {
        console.log('Keyboard shortcut for toggling hover detection');
        event.preventDefault();
        
        // 切换悬停检测状态
        enableHoverDetection = !enableHoverDetection;
        
        // 创建通知元素
        const notification = document.createElement('div');
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.left = '50%';
        notification.style.transform = 'translateX(-50%)';
        notification.style.padding = '10px 20px';
        notification.style.backgroundColor = enableHoverDetection ? '#4caf50' : '#f44336';
        notification.style.color = 'white';
        notification.style.borderRadius = '4px';
        notification.style.zIndex = '100000';
        notification.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
        notification.style.transition = 'opacity 0.5s';
        notification.style.fontSize = '14px';
        notification.textContent = `JSON Hover Detection: ${enableHoverDetection ? 'Enabled' : 'Disabled'}`;
        
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
        
        // 刷新页面（如果启用悬停检测）
        if (enableHoverDetection) {
            location.reload();
        }
    }
});

interface Rule {
    pattern: string;
    template: string;
}

function updateTitle(rules: Rule[]) {
    const url = window.location.href;

    for (const rule of rules) {
        try {
            if (url === rule.pattern) {
                document.title = rule.template;
                return;
            }
        } catch (error) {
            console.error('Error processing rule:', rule, error);
        }
    }
}

// 监听存储变化
chrome.storage.onChanged.addListener((changes) => {
    if (changes.urlRules) {
        updateTitle(changes.urlRules.newValue);
    }
});

// 初始化
chrome.storage.sync.get(['urlRules'], (result) => {
    if (result.urlRules) {
        updateTitle(result.urlRules);
    }
});

// 页面加载完成后执行，确保 DOM 已经准备好
// 判断字符串是否是有效的JSON
function isValidJson(str: string): boolean {
    try {
        const result = JSON.parse(str);
        return typeof result === 'object' && result !== null;
    } catch (e) {
        console.log("Invalid JSON:", str.substring(0, 50) + "...");
        return false;
    }
}

// 在元素中检测JSON内容
function detectJsonInElement(element: Element): string | null {
    // 获取元素的文本内容
    const text = element.textContent || '';
    if (text.length < 5) return null;
    
    // 先尝试检测特定服务的API日志格式
    if (text.includes('GdsOrderSystemServiceImpl')) {
        // 特殊处理GdsOrderSystemServiceImpl的API日志格式
        console.log("Detected GdsOrderSystemServiceImpl pattern");
        
        // 通用格式匹配，寻找任何req: 或 res: 后面的JSON
        const reqResPattern = /(req|res):(\{[\s\S]*\})/i;
        const reqResMatch = text.match(reqResPattern);
        if (reqResMatch && reqResMatch[2]) {
            try {
                // 尝试解析完整的JSON
                const jsonStr = reqResMatch[2];
                console.log(`Found req/res pattern, JSON start: ${jsonStr.substring(0, 50)}...`);
                if (isValidJson(jsonStr)) {
                    console.log(`Valid API req/res JSON detected with length ${jsonStr.length}`);
                    return jsonStr;
                }
            } catch (e) {
                console.error("Error parsing req/res JSON:", e);
            }
        }
        
        // 常规API模式匹配
        const apiPatterns = [
            /order system api logging,\s*class=GdsOrderSystemServiceImpl,\s*method=[\w.]+,\s*param=(\{[\s\S]*?\}|\[[\s\S]*?\])/i,
            /class=GdsOrderSystemServiceImpl[\s\S]*?method=[\w.]+[\s\S]*?param=(\{[\s\S]*?\}|\[[\s\S]*?\])/i,
            /GdsOrderSystemServiceImpl[\s\S]*?(\{[\s\S]*?\}|\[[\s\S]*?\])/i,
            /GdsOrderSystemServiceImpl[\s\S]*(req|res):(\{[\s\S]*?\}|\[[\s\S]*?\])/i
        ];
        
        for (const pattern of apiPatterns) {
            const match = text.match(pattern);
            if (match) {
                // 根据捕获组数量判断JSON位置
                const jsonStr = match.length > 2 ? match[2] : match[1];
                if (jsonStr && isValidJson(jsonStr)) {
                    console.log(`Hover detected API log JSON: ${jsonStr.substring(0, 30)}...`);
                    return jsonStr;
                }
            }
        }
    }
    
    // 查找文本中可能包含的所有JSON
    const allPotentialJsons = findAllPotentialJsons(text);
    if (allPotentialJsons.length > 0) {
        // 按长度排序，优先选择较长的JSON (通常包含更多信息)
        allPotentialJsons.sort((a, b) => b.length - a.length);
        return allPotentialJsons[0];
    }
    
    return null;
}

// 查找文本中所有潜在的JSON
function findAllPotentialJsons(text: string): string[] {
    const validJsons: string[] = [];
    
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
        try {
            if (isValidJson(jsonStr) && jsonStr.length > 10) {
                validJsons.push(jsonStr);
            }
        } catch (e) {
            // 忽略无效JSON
        }
    });
    
    // 查找方括号配对的JSON数组
    findBalancedPatterns(text, '[', ']').forEach(jsonStr => {
        try {
            if (isValidJson(jsonStr) && jsonStr.length > 10) {
                validJsons.push(jsonStr);
            }
        } catch (e) {
            // 忽略无效JSON
        }
    });
    
    // 查找常见的格式，如req:后面跟着的JSON
    const reqPatterns = [
        /req:(\{[\s\S]*?\})/g,
        /res:(\{[\s\S]*?\})/g,
        /param=(\{[\s\S]*?\}|\[[\s\S]*?\])/g,
        /"params":(\{[\s\S]*?\}|\[[\s\S]*?\])/g,
        /"data":(\{[\s\S]*?\}|\[[\s\S]*?\])/g
    ];
    
    for (const pattern of reqPatterns) {
        let match;
        while ((match = pattern.exec(text)) !== null) {
            try {
                const jsonStr = match[1];
                if (jsonStr && isValidJson(jsonStr) && jsonStr.length > 10) {
                    validJsons.push(jsonStr);
                }
            } catch (e) {
                // 继续尝试下一个匹配
            }
        }
    }
    
    return validJsons;
}

// 查找文本中所有平衡的括号对
function findBalancedPatterns(text: string, openChar: string, closeChar: string): string[] {
    const results: string[] = [];
    const stack: number[] = [];
    
    // 遍历文本
    for (let i = 0; i < text.length; i++) {
        if (text[i] === openChar) {
            stack.push(i);
        } else if (text[i] === closeChar && stack.length > 0) {
            const startIdx = stack.pop()!;
            // 如果这是最外层的括号对，保存结果
            if (stack.length === 0) {
                const jsonStr = text.substring(startIdx, i + 1);
                results.push(jsonStr);
            }
        }
    }
    
    return results;
}

// 在抽屉中显示JSON
function showJsonInDrawer(jsonStr: string): void {
    // 获取或创建抽屉
    const drawer = document.querySelector('.json-drawer') as HTMLElement || createJsonDrawer();
    if (!document.body.contains(drawer)) {
        document.body.appendChild(drawer);
    }
    
    // 获取抽屉内容区域
    const drawerContent = drawer.querySelector('.json-drawer-content');
    if (!drawerContent) return;
    
    // 格式化JSON并显示
    try {
        const formattedContent = formatJsonWithHighlight(jsonStr);
        
        // 添加版本号和来源信息
        drawerContent.innerHTML = `
            <div style="margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #888; font-size: 0.9em;">
                    Detected by JSON Detector v${EXTENSION_VERSION} (Hover Mode)
                </span>
                <span style="color: #007bff; font-size: 0.9em; font-weight: bold;">
                    Hover Detected JSON
                </span>
            </div>
            ${formattedContent}
        `;
        
        // 打开抽屉
        drawer.classList.add('open');
        
    } catch (e) {
        console.error('Error showing JSON in drawer:', e);
    }
}

// 格式化JSON字符串并添加语法高亮
function formatJsonWithHighlight(jsonStr: string): string {
    try {
        const obj = JSON.parse(jsonStr);
        const formatted = JSON.stringify(obj, null, 2);
        
        // 添加语法高亮
        return formatted.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
            let cls = 'json-number';
            if (/^"/.test(match)) {
                if (/:$/.test(match)) {
                    cls = 'json-key';
                } else {
                    cls = 'json-string';
                }
            } else if (/true|false/.test(match)) {
                cls = 'json-boolean';
            } else if (/null/.test(match)) {
                cls = 'json-null';
            }
            return `<span class="${cls}">${match}</span>`;
        });
    } catch (e) {
        const error = e as Error;
        return `<div class="json-error">Error formatting JSON: ${error.message}</div>`;
    }
}

// 创建JSON抽屉元素
function createJsonDrawer(): HTMLElement {
    const drawer = document.createElement('div');
    drawer.className = 'json-drawer';
    drawer.innerHTML = `
        <div class="json-drawer-header">
            <div class="json-drawer-title">JSON Viewer</div>
            <button class="json-drawer-close">&times;</button>
        </div>
        <div class="json-drawer-content"></div>
    `;
    
    // 关闭按钮的点击事件
    const closeBtn = drawer.querySelector('.json-drawer-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            drawer.classList.remove('open');
        });
    }
    
    // 点击抽屉外部关闭
    document.addEventListener('click', (event: MouseEvent) => {
        if (drawer.classList.contains('open') && 
            !drawer.contains(event.target as Node) && 
            !(event.target as Element).classList.contains('json-text')) {
            drawer.classList.remove('open');
        }
    });
    
    return drawer;
}


// 节流函数
function throttle<T extends (...args: any[]) => any>(
    func: T, 
    delay: number
): (...args: Parameters<T>) => void {
    let lastCall = 0;
    let timeout: number | null = null;

    return function(...args: Parameters<T>) {
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

// 已处理的元素记录
const processedElements = new WeakSet<Node>();

window.addEventListener('load', () => {
    chrome.storage.sync.get(['urlRules'], (result) => {
        if (result.urlRules) {
            updateTitle(result.urlRules);
        }
    });
    
    // 创建抽屉元素
    const drawer = createJsonDrawer();
    document.body.appendChild(drawer);
    
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
                if (target.classList && target.classList.contains('json-text')) {
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
                        const jsonContent = detectJsonInElement(target);
                        
                        if (jsonContent) {
                            // 找到JSON在原始文本中的位置
                            const htmlTarget = target as HTMLElement;
                            const originalText = htmlTarget.textContent || '';
                            const jsonStartIndex = originalText.indexOf(jsonContent);
                            
                            if (jsonStartIndex !== -1) {
                                // 只对JSON部分进行处理
                                try {
                                    // 创建一个范围用于包装JSON文本
                                    const range = document.createRange();
                                    const textNode = Array.from(htmlTarget.childNodes).find(
                                        node => node.nodeType === Node.TEXT_NODE && 
                                        node.textContent && 
                                        node.textContent.includes(jsonContent)
                                    );
                                    
                                    // 如果找不到包含JSON的文本节点，退出
                                    if (!textNode || !textNode.textContent) return;
                                    
                                    // 找到JSON在节点内的位置
                                    const nodeText = textNode.textContent;
                                    const jsonPositionInNode = nodeText.indexOf(jsonContent);
                                    if (jsonPositionInNode === -1) return;
                                    
                                    // 创建一个ID来标识这个JSON的高亮
                                    const jsonHighlightId = `json-highlight-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
                                    
                                    // 分割文本节点
                                    const beforeTextNode = document.createTextNode(
                                        nodeText.substring(0, jsonPositionInNode)
                                    );
                                    const jsonSpan = document.createElement('span');
                                    jsonSpan.className = 'json-text-hover';
                                    jsonSpan.title = "JSON检测到! Ctrl+点击查看";
                                    jsonSpan.dataset.jsonContent = jsonContent;
                                    jsonSpan.id = jsonHighlightId;
                                    jsonSpan.textContent = jsonContent;
                                    const afterTextNode = document.createTextNode(
                                        nodeText.substring(jsonPositionInNode + jsonContent.length)
                                    );
                                    
                                    // 替换原始文本节点
                                    const parentNode = textNode.parentNode;
                                    if (!parentNode) return;
                                    
                                    // 将分割后的节点插入DOM
                                    parentNode.insertBefore(beforeTextNode, textNode);
                                    parentNode.insertBefore(jsonSpan, textNode);
                                    parentNode.insertBefore(afterTextNode, textNode);
                                    parentNode.removeChild(textNode);
                                    
                                    // 添加临时点击事件处理器
                                    const clickHandler = (ce: Event) => {
                                        const mouseEvent = ce as MouseEvent;
                                        if (mouseEvent.ctrlKey || mouseEvent.metaKey) {
                                            mouseEvent.preventDefault();
                                            mouseEvent.stopPropagation();
                                            
                                            // 显示JSON
                                            showJsonInDrawer(jsonContent);
                                        }
                                    };
                                    
                                    // 添加点击事件
                                    jsonSpan.addEventListener('click', clickHandler);
                                    
                                    // 鼠标移出时安全移除高亮，重新创建文本节点
                                    htmlTarget.addEventListener('mouseleave', () => {
                                        try {
                                            // 找到我们添加的span元素
                                            const highlightSpan = document.getElementById(jsonHighlightId);
                                            if (highlightSpan && highlightSpan.parentNode) {
                                                const parent = highlightSpan.parentNode;
                                                
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
                                        } catch (e) {
                                            console.error('Error removing JSON highlight:', e);
                                        }
                                    }, { once: true });
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
