// 嵌套JSON处理工具函数

/**
 * 检测字符串是否为有效的JSON
 * @param str 要检测的字符串
 * @returns 是否为有效的JSON
 */
export function isValidNestedJson(str: string): boolean {
  try {
    if (!str || typeof str !== 'string') {
      return false;
    }
    
    const trimmed = str.trim();
    if (!(
      (trimmed.startsWith('{') && trimmed.endsWith('}')) || 
      (trimmed.startsWith('[') && trimmed.endsWith(']'))
    )) {
      return false;
    }
    
    const result = JSON.parse(str);
    
    // 检查是否是对象或数组
    if (typeof result !== 'object' || result === null) {
      return false;
    }
    
    // 检查数据结构是否有意义
    if (Array.isArray(result)) {
      if (result.length === 0) {
        return false; // 忽略空数组
      }
      // 对于数组，至少有一个元素是对象
      return result.some(item => typeof item === 'object' && item !== null);
    } else {
      // 对于对象，至少有一个属性
      return Object.keys(result).length > 0;
    }
  } catch (e) {
    return false;
  }
}

/**
 * 修饰嵌套的JSON字符串元素，添加点击事件和样式
 * @param element 要处理的DOM元素
 * @param jsonContent JSON字符串内容
 * @param showJsonCallback 显示JSON的回调函数
 */
export function decorateNestedJsonElement(
  element: HTMLElement, 
  jsonContent: string,
  showJsonCallback: (content: string) => void
): void {
  // 添加样式
  element.style.textDecoration = 'underline';
  element.style.textDecorationStyle = 'dotted';
  element.style.textDecorationColor = '#007bff';
  element.style.cursor = 'pointer';
  element.title = "嵌套JSON - 点击查看";
  
  // 添加点击事件
  element.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    showJsonCallback(jsonContent);
  });
}

/**
 * 扫描文档中的文本节点，查找并处理嵌套的JSON字符串
 * @param showJsonCallback 显示JSON的回调函数
 */
export function scanForNestedJson(showJsonCallback: (content: string) => void): void {
  // 等待页面加载完成后再扫描
  setTimeout(() => {
    // 使用MutationObserver来监视DOM的变化
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        // 对于每个变化，检查添加的节点
        mutation.addedNodes.forEach(node => {
          // 检查是否为元素节点
          if (node.nodeType === Node.ELEMENT_NODE) {
            processElement(node as HTMLElement);
          }
        });
      });
    });
    
    // 配置观察选项
    const config = { childList: true, subtree: true };
    
    // 开始监视document.body的变化
    observer.observe(document.body, config);
    
    // 扫描当前文档
    processElement(document.body);
    
    // 处理元素及其子元素
    function processElement(element: HTMLElement) {
      // 先检查元素本身是否包含JSON
      const textContent = element.textContent;
      if (!textContent || textContent.length < 10) return;
      
      // 检查是否是文本或字符串显示元素
      if (element.nodeType === Node.TEXT_NODE || 
          ['SPAN', 'DIV', 'P', 'PRE', 'CODE'].includes(element.tagName)) {
        // 检查文本内容是否可能是JSON
        const text = element.textContent || '';
        
        // 匹配可能的JSON字符串
        const jsonPattern = /\{.*\}|\[.*\]/;
        const matches = text.match(jsonPattern);
        
        if (matches && matches[0]) {
          const jsonStr = matches[0];
          if (isValidNestedJson(jsonStr)) {
            // 找到嵌套JSON，添加样式和事件处理
            decorateNestedJsonElement(element, jsonStr, showJsonCallback);
          }
        }
      }
      
      // 检查子元素
      if (element.children) {
        Array.from(element.children).forEach(child => {
          processElement(child as HTMLElement);
        });
      }
    }
  }, 1000); // 等待页面加载完成
}
