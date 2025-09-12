/**
 * 从文本中提取 JSON 字符串
 * 
 * @param text 包含 JSON 的文本
 * @returns 提取出的 JSON 字符串，如果没有找到则返回 null
 */
export function extractJsonFromString(text: string): string | null {
  if (!text || typeof text !== 'string') {
    return null;
  }

  // 首先尝试直接解析整个文本，如果能成功则直接返回
  try {
    JSON.parse(text);
    return text;
  } catch (e) {
    // 如果直接解析失败，继续使用原有的提取逻辑
  }

  // 从第一个 '{' 开始查找
  let startIndex = text.indexOf('{');
  if (startIndex === -1) {
    // 如果没有找到对象，尝试查找数组
    startIndex = text.indexOf('[');
    if (startIndex === -1) {
      return null;
    }
  }
  
  // 使用栈来跟踪嵌套的结构
  const stack: string[] = [];
  let inString = false;
  let escapeNext = false;
  let i = startIndex;
  
  // 初始化栈
  if (text[startIndex] === '{') {
    stack.push('}');
  } else if (text[startIndex] === '[') {
    stack.push(']');
  }
  
  // 从开始位置向后遍历
  for (i = startIndex + 1; i < text.length && stack.length > 0; i++) {
    const char = text[i];
    
    // 处理转义字符
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    
    // 处理字符串内的字符
    if (inString) {
      if (char === '"' && !escapeNext) {
        inString = false;
      } else if (char === '\\') {
        escapeNext = true;
      }
      continue;
    }
    
    // 处理字符串开始
    if (char === '"') {
      inString = true;
      continue;
    }
    
    // 处理栈操作
    if (char === '{' || char === '[') {
      if (char === '{') {
        stack.push('}');
      } else {
        stack.push(']');
      }
    } else if (char === '}' || char === ']') {
      if (stack.length > 0 && stack[stack.length - 1] === char) {
        stack.pop();
      }
    }
  }
  
  // 如果栈为空，说明找到了完整的 JSON 结构
  if (stack.length === 0) {
    return text.substring(startIndex, i);
  }
  
  return null;
}