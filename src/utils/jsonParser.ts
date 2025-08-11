/**
 * 增强的 JSON 解析器，处理大整数精度问题
 * 使用此函数代替直接使用 JSON.parse() 可以保持大整数的精度
 * 
 * @param jsonString JSON 字符串
 * @returns 解析后的 JavaScript 对象，大整数被保留为字符串
 */
export function parseJsonSafely(jsonString: string): any {
  if (!jsonString) return null;
  
  // 预处理：使用正则表达式将大整数转换为字符串
  // 匹配键值对中的大整数（超过15位数字的整数，这是JS安全整数的大致范围）
  const bigIntPattern = /("[\w\d_-]+"\s*:\s*)(\d{16,}\b)/g;
  const processedJson = jsonString.replace(bigIntPattern, '$1"$2"');
  
  try {
    // 使用处理后的JSON字符串进行解析
    return JSON.parse(processedJson, (key, value) => {
      // 检查值是否是字符串，且只包含数字
      if (typeof value === 'string' && /^\d+$/.test(value) && value.length >= 16) {
        // 这里已经是字符串形式的大整数，直接返回即可
        return value;
      }
      return value;
    });
  } catch (e) {
    console.error('Error parsing JSON:', e);
    throw e; // 将错误向上传播，以便调用者处理
  }
}
