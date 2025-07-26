// This file is the content script that interacts with web pages.
// It can manipulate the DOM of the pages the extension is active on.

// Import JSON drawer styles
import './assets/styles/json-drawer.css';

// 定义版本号常量
const EXTENSION_VERSION = "1.1.0";
console.log(`Content script loaded. JSON Detector version ${EXTENSION_VERSION}`);

// Listen for the keyboard shortcuts
document.addEventListener('keydown', (event) => {
    // 'W' key: Move tab to other window
    if (event.key === 'W') {
        console.log('W key pressed, sending message to background script');
        chrome.runtime.sendMessage({ action: 'moveTabToOtherWindow' });
    }
    
    // Ctrl+Shift+J or Cmd+Shift+J: Force JSON detection rescan
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'j') {
        console.log('Keyboard shortcut for forced JSON detection');
        event.preventDefault();
        
        // 重置处理状态
        resetProcessedElements();
        isProcessing = false;
        
        // 显示版本和执行扫描
        console.log(`%c🔍 JSON Detector v${EXTENSION_VERSION}: Forced scan initiated`, 
                    'background: #4285f4; color: white; padding: 2px 6px; border-radius: 2px;');
        
        // 先扫描可见区域
        scanVisibleArea();
        
        // 然后尝试全页扫描
        setTimeout(() => {
            scanEntirePage();
        }, 500);
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

// 高亮显示文本节点中的JSON
function highlightJsonInNode(textNode: Text, jsonString: string): void {
    const drawer = document.querySelector('.json-drawer') as HTMLElement || createJsonDrawer();
    if (!document.body.contains(drawer)) {
        document.body.appendChild(drawer);
    }
    
    const drawerContent = drawer.querySelector('.json-drawer-content');
    const nodeContent = textNode.textContent || '';
    
    // 创建新的元素，保持原有文本，但为JSON部分添加样式和事件
    const wrapper = document.createElement('span');
    
    // 找到JSON在文本中的位置
    const startIndex = nodeContent.indexOf(jsonString);
    
    if (startIndex !== -1) {
        const beforeJson = nodeContent.substring(0, startIndex);
        const afterJson = nodeContent.substring(startIndex + jsonString.length);
        
        // 添加JSON之前的文本
        if (beforeJson) {
            wrapper.appendChild(document.createTextNode(beforeJson));
        }
        
        // 创建JSON元素
        const jsonSpan = document.createElement('span');
        jsonSpan.className = 'json-text';
        jsonSpan.textContent = jsonString;
        jsonSpan.dataset.json = jsonString;
        
        // 添加点击事件
        jsonSpan.addEventListener('click', (event: MouseEvent) => {
            if (event.ctrlKey || event.metaKey) {
                if (drawerContent) {
                    drawerContent.innerHTML = formatJsonWithHighlight(jsonString);
                    drawer.classList.add('open');
                }
                event.preventDefault();
                event.stopPropagation();
            }
        });
        
        wrapper.appendChild(jsonSpan);
        
        // 添加JSON之后的文本
        if (afterJson) {
            wrapper.appendChild(document.createTextNode(afterJson));
        }
        
        // 替换原始节点
        if (textNode.parentNode) {
            textNode.parentNode.replaceChild(wrapper, textNode);
            console.log("Successfully highlighted JSON in the page");
        }
    }
}

// 添加直接的方法来处理页面上的文本内容
// 删除旧的JSON全页面搜索函数，使用可见区域扫描函数替代

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

// 查找页面中的文本节点并检查是否包含JSON
// 删除旧的全页面扫描函数，使用新的可见区域扫描函数替代

// 为了保持代码简洁，删除了不再使用的旧函数

// 检测可见区域的文本节点
function findVisibleJsonNodes(): void {
    // 设置处理状态
    if (isProcessing) {
        console.log("Already processing, skipping scan");
        return;
    }
    isProcessing = true;
    
    console.log("Start scanning visible area for JSON");
    
    // 确保抽屉已创建
    const drawer = document.querySelector('.json-drawer') as HTMLElement || createJsonDrawer();
    if (!document.body.contains(drawer)) {
        document.body.appendChild(drawer);
    }
    const drawerContent = drawer.querySelector('.json-drawer-content');
    
    // 遍历当前可见区域的文本节点
    const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: (node) => {
                // 跳过脚本和样式元素中的文本
                const parent = node.parentElement;
                if (!parent || ['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT'].includes(parent.tagName)) {
                    return NodeFilter.FILTER_REJECT;
                }
                
                // 检查节点是否在或接近可见区域
                if (!isTextNodeInViewport(node as Text)) {
                    return NodeFilter.FILTER_REJECT;
                }
                
                // 如果节点已经处理过且不是api日志特殊格式，跳过
                // 但特定格式的API日志需要重新检查
                if (processedElements.has(node)) {
                    return NodeFilter.FILTER_REJECT;
                }
                
                return NodeFilter.FILTER_ACCEPT;
            }
        }
    );
    
    // 提高处理的节点数量限制
    let processedCount = 0;
    const maxProcessPerScan = 100; // 提高限制
    
    console.log("Scanning nodes for JSON content");
    
    while (walker.nextNode() && processedCount < maxProcessPerScan) {
        const textNode = walker.currentNode as Text;
        const content = textNode.textContent || '';
        processedCount++;
        
        // 先尝试检查是否是API日志格式
        if (content.includes('class=GdsOrderSystemServiceImpl') && 
            (content.includes('method=exchangeSearchV3') || 
             content.includes('method=') ||
             content.includes('order system api logging'))) {
            
            console.log(`%c Found potential API log pattern match (v${EXTENSION_VERSION}) `, 
                       'background: #ff5500; color: white; border-radius: 3px; padding: 1px 4px;');
            
            // 使用更广泛的模式匹配
            const logPatterns = [
                // 精确匹配模式
                /order system api logging,\s*class=GdsOrderSystemServiceImpl,\s*method=exchangeSearchV3,\s*param=(\[.*\])/i,
                // 一般模式
                /class=GdsOrderSystemServiceImpl,\s*method=(\w+),\s*param=(\[.*\]|\{.*\})/i,
                // 只有类名和参数
                /class=GdsOrderSystemServiceImpl[\s,]*param=(\[.*\]|\{.*\})/i,
                // 任何param=后面跟着的JSON
                /param=(\[.*\]|\{.*\})/i
            ];
            
            // 尝试使用每种模式匹配
            for (const pattern of logPatterns) {
                const match = content.match(pattern);
                if (match) {
                    try {
                        // 根据捕获组数量确定JSON字符串位置
                        const jsonStr = match.length > 2 ? match[2] : match[1];
                        console.log("Matched API log pattern:", jsonStr.substring(0, 50) + "...");
                        
                        if (isValidJson(jsonStr)) {
                            console.log(`%c Valid API JSON detected from match (v${EXTENSION_VERSION}) `, 
                                      'background: #ff5500; color: white; border-radius: 3px; padding: 1px 4px;');
                            markJsonNode(textNode, jsonStr, drawer, drawerContent);
                            // 标记为已处理
                            processedElements.add(textNode);
                            // 返回true表示成功处理
                            continue;
                        }
                    } catch (e) {
                        console.error("Error processing API match:", e);
                    }
                }
            }
            
            // 尝试提取参数部分 - 回退到一般方式
            try {
                // 查找param=开始的位置
                const startPos = content.indexOf('param=');
                if (startPos !== -1) {
                    // 提取参数部分
                    let jsonStart = content.substring(startPos + 'param='.length);
                    
                    // 如果是数组格式，如 param=[{...}]
                    if (jsonStart.startsWith('[')) {
                        // 查找匹配的闭合括号
                        let bracketCount = 1;
                        let endPos = 1; // 从 [ 后的位置开始
                        
                        while (bracketCount > 0 && endPos < jsonStart.length) {
                            if (jsonStart[endPos] === '[') bracketCount++;
                            if (jsonStart[endPos] === ']') bracketCount--;
                            endPos++;
                        }
                        
                        if (bracketCount === 0) {
                            const jsonStr = jsonStart.substring(0, endPos);
                            console.log("Extracted API JSON array:", jsonStr.substring(0, 50) + "...");
                            
                            // 检查是否有效
                            if (isValidJson(jsonStr)) {
                                console.log("Valid API JSON array detected");
                                markJsonNode(textNode, jsonStr, drawer, drawerContent);
                                // 标记为已处理
                                processedElements.add(textNode);
                                continue;
                            }
                        }
                    }
                    // 如果是对象格式，如 param={...}
                    else if (jsonStart.startsWith('{')) {
                        // 查找匹配的闭合括号
                        let braceCount = 1;
                        let endPos = 1; // 从 { 后的位置开始
                        
                        while (braceCount > 0 && endPos < jsonStart.length) {
                            if (jsonStart[endPos] === '{') braceCount++;
                            if (jsonStart[endPos] === '}') braceCount--;
                            endPos++;
                        }
                        
                        if (braceCount === 0) {
                            const jsonStr = jsonStart.substring(0, endPos);
                            console.log("Extracted API JSON object:", jsonStr.substring(0, 50) + "...");
                            
                            // 检查是否有效
                            if (isValidJson(jsonStr)) {
                                console.log("Valid API JSON object detected");
                                markJsonNode(textNode, jsonStr, drawer, drawerContent);
                                // 标记为已处理
                                processedElements.add(textNode);
                                continue;
                            }
                        }
                    }
                }
            } catch (e) {
                console.error("Error extracting API log JSON:", e);
            }
        }
        
        // 一般JSON检测
        try {
            // 文本必须足够长才考虑检测JSON
            if (content.length < 2) {
                continue;
            }
            
            // 检查完整的JSON对象/数组
            if ((content.trim().startsWith('{') && content.trim().endsWith('}')) || 
                (content.trim().startsWith('[') && content.trim().endsWith(']'))) {
                
                const trimmed = content.trim();
                if (isValidJson(trimmed)) {
                    console.log("Found full JSON object/array");
                    markJsonNode(textNode, trimmed, drawer, drawerContent);
                    // 标记为已处理
                    processedElements.add(textNode);
                    continue;
                }
            }
            
            // 在文本中搜索JSON对象
            let found = false;
            
            // 尝试搜索JSON对象 {...}
            if (content.includes('{') && content.includes('}')) {
                let startPos = 0;
                while ((startPos = content.indexOf('{', startPos)) !== -1 && !found) {
                    // 查找匹配的闭合括号
                    let braceCount = 1;
                    let endPos = startPos + 1;
                    
                    while (braceCount > 0 && endPos < content.length) {
                        if (content[endPos] === '{') braceCount++;
                        if (content[endPos] === '}') braceCount--;
                        endPos++;
                    }
                    
                    if (braceCount === 0) {
                        const jsonStr = content.substring(startPos, endPos);
                        
                        // 检查是否有效
                        if (isValidJson(jsonStr) && jsonStr.length > 10) {
                            console.log("Found embedded JSON object");
                            markJsonNode(textNode, jsonStr, drawer, drawerContent);
                            found = true;
                            // 标记为已处理
                            processedElements.add(textNode);
                            break;
                        }
                    }
                    
                    startPos++;
                }
            }
            
            // 如果未找到对象，尝试搜索JSON数组 [...]
            if (!found && content.includes('[') && content.includes(']')) {
                let startPos = 0;
                while ((startPos = content.indexOf('[', startPos)) !== -1 && !found) {
                    // 查找匹配的闭合括号
                    let bracketCount = 1;
                    let endPos = startPos + 1;
                    
                    while (bracketCount > 0 && endPos < content.length) {
                        if (content[endPos] === '[') bracketCount++;
                        if (content[endPos] === ']') bracketCount--;
                        endPos++;
                    }
                    
                    if (bracketCount === 0) {
                        const jsonStr = content.substring(startPos, endPos);
                        
                        // 检查是否有效
                        if (isValidJson(jsonStr) && jsonStr.length > 10) {
                            console.log("Found embedded JSON array");
                            markJsonNode(textNode, jsonStr, drawer, drawerContent);
                            // 标记为已处理
                            processedElements.add(textNode);
                            break;
                        }
                    }
                    
                    startPos++;
                }
            }
        } catch (e) {
            console.debug('Error processing node for JSON:', e);
        }
    }
    
    console.log(`Processed ${processedCount} nodes, found JSONs in visible area`);
    isProcessing = false;
}

// 辅助函数：标记JSON节点
function markJsonNode(textNode: Text, jsonStr: string, drawer: HTMLElement, drawerContent: Element | null): void {
    const nodeContent = textNode.textContent || '';
    
    // 创建包装元素
    const wrapper = document.createElement('span');
    
    // 找到JSON在文本中的位置
    const startIndex = nodeContent.indexOf(jsonStr);
    
    if (startIndex !== -1) {
        const beforeJson = nodeContent.substring(0, startIndex);
        const afterJson = nodeContent.substring(startIndex + jsonStr.length);
        
        // 添加JSON之前的文本
        if (beforeJson) {
            wrapper.appendChild(document.createTextNode(beforeJson));
        }
        
        // 创建JSON元素
        const jsonSpan = document.createElement('span');
        jsonSpan.className = 'json-text';
        
        // 检查是否是API日志格式，添加特殊标记
        const isApiLog = nodeContent.includes('GdsOrderSystemServiceImpl') &&
                         (nodeContent.includes('exchangeSearchV3') || nodeContent.includes('method='));
        
        if (isApiLog) {
            // 为API日志JSON添加特殊样式
            jsonSpan.classList.add('api-json');
            jsonSpan.title = `API Log JSON - Ctrl+Click to view (v${EXTENSION_VERSION})`;
            
            // 添加更显眼的指示这是API日志JSON的标记
            const infoIcon = document.createElement('span');
            infoIcon.innerHTML = "🔍 API"; // 添加小图标和文本
            infoIcon.style.marginRight = "5px";
            infoIcon.style.fontSize = "0.9em";
            infoIcon.style.backgroundColor = "rgba(255, 85, 0, 0.15)";
            infoIcon.style.padding = "1px 4px";
            infoIcon.style.borderRadius = "3px";
            infoIcon.style.color = "#ff5500";
            infoIcon.style.fontWeight = "bold";
            jsonSpan.appendChild(infoIcon);
            
            // 为API日志添加边框效果，使其更明显
            jsonSpan.style.border = "1px solid rgba(255, 85, 0, 0.3)";
            jsonSpan.style.padding = "2px 4px";
            jsonSpan.style.borderRadius = "3px";
            jsonSpan.style.display = "inline-block";
            jsonSpan.style.margin = "2px 0";
        } else {
            jsonSpan.title = `JSON - Ctrl+Click to view (v${EXTENSION_VERSION})`;
            
            // 为普通JSON添加轻微的视觉指示
            const infoIcon = document.createElement('span');
            infoIcon.textContent = "{}"; // JSON符号
            infoIcon.style.marginRight = "3px";
            infoIcon.style.fontSize = "0.8em";
            infoIcon.style.color = "#007bff";
            infoIcon.style.opacity = "0.7";
            jsonSpan.appendChild(infoIcon);
        }
        
        // 添加内容和数据
        jsonSpan.appendChild(document.createTextNode(isApiLog ? nodeContent : jsonStr));
        jsonSpan.dataset.json = jsonStr;
        jsonSpan.dataset.detected = EXTENSION_VERSION; // 记录检测的版本号
        jsonSpan.dataset.type = isApiLog ? 'api-log' : 'standard-json';
        
        // 添加悬停效果
        jsonSpan.addEventListener('mouseover', () => {
            jsonSpan.style.boxShadow = isApiLog ? 
                '0 0 5px rgba(255, 85, 0, 0.5)' : 
                '0 0 5px rgba(0, 123, 255, 0.5)';
        });
        
        jsonSpan.addEventListener('mouseout', () => {
            jsonSpan.style.boxShadow = 'none';
        });
        
        // 添加Ctrl+点击事件
        jsonSpan.addEventListener('click', (event: MouseEvent) => {
            if (event.ctrlKey || event.metaKey) {
                if (drawerContent) {
                    const formattedContent = formatJsonWithHighlight(jsonStr);
                    
                    // 添加增强版本的版本号和类型信息到抽屉内容
                    drawerContent.innerHTML = `
                        <div style="margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
                            <span style="color: #888; font-size: 0.9em;">
                                Detected by JSON Detector v${EXTENSION_VERSION}
                            </span>
                            <span style="color: ${isApiLog ? '#ff5500' : '#007bff'}; font-size: 0.9em; font-weight: bold;">
                                ${isApiLog ? 'API Log JSON' : 'Standard JSON'}
                            </span>
                        </div>
                        ${formattedContent}
                    `;
                    drawer.classList.add('open');
                }
                event.preventDefault();
                event.stopPropagation();
            }
        });
        
        wrapper.appendChild(jsonSpan);
        
        // 添加JSON之后的文本
        if (afterJson && !isApiLog) {
            wrapper.appendChild(document.createTextNode(afterJson));
        }
        
        // 替换原始节点
        if (textNode.parentNode) {
            textNode.parentNode.replaceChild(wrapper, textNode);
            console.log(`Successfully highlighted ${isApiLog ? 'API Log' : ''} JSON in the page (v${EXTENSION_VERSION})`);
        }
    }
}

// 扫描可见区域的函数
function scanVisibleArea(): void {
    console.log(`=== JSON Detector v${EXTENSION_VERSION}: Scanning visible area for JSON content ===`);
    const startTime = Date.now();
    findVisibleJsonNodes();
    console.log(`Scan completed in ${Date.now() - startTime}ms`);
}

// 初始化JSON检测器 - 旧的方法，现在改用scanVisibleArea
function initJsonDetector(): void {
    console.log("Initializing JSON detector");
    
    // 使用可见区域扫描替代全页面扫描
    scanVisibleArea();
    
    // 监听DOM变化，使用增强的检查逻辑
    const observer = new MutationObserver(throttle((mutations: MutationRecord[]) => {
        // 检测可能的Tab切换和重要内容变化
        let shouldRescan = false;
        let isSignificantChange = false;
        
        for (const mutation of mutations) {
            // 检查是否有元素类名变化 (可能是Tab切换)
            if (mutation.type === 'attributes' && 
                mutation.attributeName === 'class') {
                const target = mutation.target as Element;
                
                // 如果元素有常见的Tab相关类名
                if (target.classList.contains('active') || 
                    target.classList.contains('selected') ||
                    target.classList.contains('tab') ||
                    target.classList.contains('nav-item') ||
                    target.getAttribute('role') === 'tab') {
                    console.log(`Tab change detected: ${target.outerHTML.substring(0, 50)}...`);
                    shouldRescan = true;
                    isSignificantChange = true;
                    break;
                }
            }
            
            // 检查是否有重要的内容添加
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                // 检查是否添加了重要元素
                for (let i = 0; i < mutation.addedNodes.length; i++) {
                    const node = mutation.addedNodes[i];
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const element = node as Element;
                        
                        // 如果添加了大块内容或可能的内容容器
                        if (element.tagName === 'DIV' || 
                            element.tagName === 'SECTION' || 
                            element.tagName === 'ARTICLE' ||
                            element.childNodes.length > 5) {
                            shouldRescan = true;
                            
                            // 检查是否包含json相关关键词
                            const html = element.innerHTML.toLowerCase();
                            if (html.includes('json') || 
                                html.includes('api') || 
                                html.includes('response') ||
                                html.includes('gdsordersystemserviceimpl')) {
                                isSignificantChange = true;
                                break;
                            }
                        }
                    }
                }
            }
        }
        
        if (shouldRescan) {
            if (isSignificantChange) {
                // 对于重要变化，先等待内容稳定再扫描
                console.log("Significant DOM change detected, scheduling full rescan...");
                
                // 重置处理记录，强制重新检测
                resetProcessedElements();
                
                setTimeout(() => {
                    scanVisibleArea();
                    
                    // 如果看起来是Tab切换，尝试全页扫描
                    if (isSignificantChange) {
                        setTimeout(() => {
                            console.log("Performing additional scan after tab change...");
                            scanVisibleArea();
                        }, 1000); // 再次延迟扫描，确保内容已完全加载
                    }
                }, 300);
            } else {
                // 对于小变化，直接扫描
                scanVisibleArea();
            }
        }
    }, 300));
    
    observer.observe(document.body, {
        childList: true,     // 监听子节点添加/删除
        subtree: true,       // 监听整个子树
        characterData: true, // 监听文本变化
        attributes: true,    // 监听属性变化
        attributeFilter: ['class', 'style', 'aria-selected', 'aria-hidden'] // 特别关注这些属性
    });
}

// 检查元素是否在视口中可见或接近可见
function isElementInViewport(el: Element): boolean {
    const rect = el.getBoundingClientRect();
    const windowHeight = window.innerHeight || document.documentElement.clientHeight;
    const windowWidth = window.innerWidth || document.documentElement.clientWidth;
    
    // 元素在视口中或接近视口的上下边缘300px内
    return (
        (rect.top >= -300 && rect.top <= windowHeight + 300) ||
        (rect.bottom >= -300 && rect.bottom <= windowHeight + 300) ||
        (rect.top <= 0 && rect.bottom >= windowHeight)
    );
}

// 检查文本节点是否在视口中可见
function isTextNodeInViewport(node: Text): boolean {
    // 获取文本节点的父元素
    const parent = node.parentElement;
    if (!parent) return false;
    return isElementInViewport(parent);
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
let isProcessing = false; // 防止并发处理

// 重置已处理元素记录
function resetProcessedElements(): void {
    // WeakSet不能直接清空，但可以创建新的实例并替换引用
    // 由于JavaScript的限制，我们将标记关键元素为未处理
    
    console.log("Resetting processed elements");
    
    // 找到所有可能的JSON文本节点，移除标记
    const jsonTextElements = document.querySelectorAll('.json-text');
    jsonTextElements.forEach(el => {
        const parent = el.parentElement;
        if (parent) {
            try {
                // 尝试还原原始文本
                const originalText = el.textContent || '';
                const textNode = document.createTextNode(originalText);
                parent.replaceChild(textNode, el);
            } catch (e) {
                console.error("Error resetting JSON element:", e);
            }
        }
    });
}

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
        console.log(`%c🔍 JSON Detector v${EXTENSION_VERSION}: Initializing`, 
                    'background: #4285f4; color: white; padding: 2px 6px; border-radius: 2px;');
        
        // 检测页面是否有Tab结构
        const hasTabs = document.querySelectorAll('a[role="tab"], .tab, .nav-tab, [aria-selected]').length > 0;
        
        if (hasTabs) {
            console.log("Tab structure detected on page, will monitor tab changes");
        }
        
        // 初始化JSON检测功能 - 仅检测可见区域
        scanVisibleArea();
        
        // 添加特别处理，如果页面内容很少，也尝试检测
        if (document.body.scrollHeight < window.innerHeight * 2) {
            console.log("Small page detected, scanning entire page");
            scanEntirePage();
        }
        
        // 对于含有Tab的页面，延迟再次扫描，因为Tab内容可能延迟加载
        if (hasTabs) {
            setTimeout(() => {
                console.log("Performing delayed scan for tabs...");
                scanVisibleArea();
            }, 1500);
            
            // 主动监听tab点击事件
            document.querySelectorAll('a[role="tab"], .tab, .nav-tab, [aria-selected="false"]').forEach(tab => {
                tab.addEventListener('click', () => {
                    console.log("Tab click detected");
                    
                    // 延迟执行以等待内容加载
                    setTimeout(() => {
                        console.log("Running scan after tab click");
                        resetProcessedElements();
                        scanVisibleArea();
                    }, 500);
                });
            });
        }
        
        // 监听滚动事件，使用节流控制频率
        window.addEventListener('scroll', throttle(() => {
            scanVisibleArea();
        }, 250)); // 250ms节流
        
        // 监听大小变化事件
        window.addEventListener('resize', throttle(() => {
            scanVisibleArea();
        }, 250)); // 250ms节流
        
        // 监听通用的点击事件，用于捕获可能的tab切换
        document.addEventListener('click', throttle((e) => {
            const target = e.target as Element;
            
            // 检查点击的元素是否可能是tab或导航元素
            if (target && (
                target.tagName === 'A' ||
                target.tagName === 'BUTTON' ||
                target.tagName === 'LI' ||
                target.getAttribute('role') === 'tab' ||
                target.classList.contains('tab') ||
                target.classList.contains('nav-item') ||
                target.closest('[role="tab"]') ||
                target.closest('.tab') ||
                target.closest('.nav-item')
            )) {
                // 可能是tab切换，延迟执行扫描
                console.log(`Potential tab navigation detected (v${EXTENSION_VERSION})`);
                setTimeout(() => {
                    console.log("Running scan after potential tab change");
                    scanVisibleArea();
                    
                    // 双保险：再次延迟扫描以捕获异步加载的内容
                    setTimeout(() => {
                        scanVisibleArea();
                    }, 1000);
                }, 300);
            }
        }, 300));
    }, 500); // 等待500ms确保页面内容完全加载
});

// 扫描整个页面 - 用于小型页面
function scanEntirePage(): void {
    console.log(`=== JSON Detector v${EXTENSION_VERSION}: Scanning entire page for JSON content ===`);
    const startTime = Date.now();
    
    // 直接扫描所有文本节点，不检查可见性
    const drawer = document.querySelector('.json-drawer') as HTMLElement || createJsonDrawer();
    if (!document.body.contains(drawer)) {
        document.body.appendChild(drawer);
    }
    const drawerContent = drawer.querySelector('.json-drawer-content');
    
    // 遍历所有文本节点
    const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: (node) => {
                // 跳过脚本和样式元素中的文本
                const parent = node.parentElement;
                if (!parent || ['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT'].includes(parent.tagName)) {
                    return NodeFilter.FILTER_REJECT;
                }
                
                // 如果节点已经处理过且不是api日志特殊格式，跳过
                const content = node.textContent || '';
                const isApiLog = content.includes('GdsOrderSystemServiceImpl') && 
                                content.includes('exchangeSearchV3');
                
                if (processedElements.has(node) && !isApiLog) {
                    return NodeFilter.FILTER_REJECT;
                }
                
                return NodeFilter.FILTER_ACCEPT;
            }
        }
    );
    
    let processedCount = 0;
    while (walker.nextNode() && processedCount < 500) {
        const textNode = walker.currentNode as Text;
        const content = textNode.textContent || '';
        processedCount++;
        
        // 检查API日志和一般JSON
        // 复用相同的检测逻辑，保持代码简洁
        
        // 先检查是否是API日志格式
        if (content.includes('class=GdsOrderSystemServiceImpl') && 
            content.includes('method=exchangeSearchV3') &&
            content.includes('param=')) {
            
            // 尝试提取参数部分
            try {
                const startPos = content.indexOf('param=');
                if (startPos !== -1) {
                    const jsonStart = content.substring(startPos + 'param='.length);
                    
                    // 如果是数组格式，如 [...]
                    if (jsonStart.startsWith('[')) {
                        // 提取到末尾，交给isValidJson验证
                        const jsonStr = jsonStart;
                        if (isValidJson(jsonStr)) {
                            console.log("Found API log JSON in full scan");
                            markJsonNode(textNode, jsonStr, drawer, drawerContent);
                            processedElements.add(textNode);
                            continue;
                        }
                    }
                }
            } catch (e) {
                console.error("Error extracting API log JSON in full scan:", e);
            }
        }
        
        // 一般JSON检测，简化逻辑
        if ((content.includes('{') && content.includes('}')) || 
            (content.includes('[') && content.includes(']'))) {
            
            try {
                // 简单匹配，尝试找到一个JSON子串，不使用s标志，保证兼容性
                const match = content.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
                if (match && match[0]) {
                    const potentialJson = match[0];
                    if (isValidJson(potentialJson) && potentialJson.length > 5) {
                        console.log("Found JSON in full scan");
                        markJsonNode(textNode, potentialJson, drawer, drawerContent);
                        processedElements.add(textNode);
                    }
                }
            } catch (e) {
                console.debug('Error processing JSON in full scan:', e);
            }
        }
    }
    
    console.log(`Full scan completed in ${Date.now() - startTime}ms, processed ${processedCount} nodes`);
}