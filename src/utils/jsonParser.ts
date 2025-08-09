/**
 * 增强的 JSON 解析器，处理大整数精度问题
 * 使用此函数代替直接使用 JSON.parse() 可以保持大整数的精度
 * 
 * @param jsonString JSON 字符串
 * @returns 解析后的 JavaScript 对象，大整数被保留为字符串
 */
export function parseJsonSafely(jsonString: string): any {
  if (!jsonString) return null;

  try {
    // 使用 reviver 函数来处理大整数
    return JSON.parse(jsonString, (key, value) => {
      // 检查值是否可能是大整数（是数字且不是安全整数）
      if (typeof value === 'number' && !Number.isSafeInteger(value)) {
        // 尝试从原始 JSON 字符串中提取该键对应的原始值
        const originalValue = jsonString.match(new RegExp(`"${key}"\\s*:\\s*(\\d+)`, 'g'));
        if (originalValue && originalValue.length > 0) {
          const matches = originalValue[0].match(/:\s*(\d+)/);
          if (matches && matches[1]) {
            return matches[1]; // 返回原始字符串表示
          }
        }
      }
      return value;
    });
  } catch (e) {
    console.error('Error parsing JSON:', e);
    throw e; // 将错误向上传播，以便调用者处理
  }
}
