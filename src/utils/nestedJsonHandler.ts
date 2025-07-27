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