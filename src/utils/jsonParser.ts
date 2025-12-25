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
  // 需要匹配两种情况：
  // 1. 键值对中的大整数：("key": 12345678901234567)
  // 2. 数组中的大整数：([12345678901234567] 或 [12345678901234567,)
  
  let processedJson = jsonString;
  
  // 匹配键值对中的大整数
  const keyValuePattern = /("[\w\d_-]+"\s*:\s*)(\d{17,})\b/g;
  processedJson = processedJson.replace(keyValuePattern, '$1"$2"');
  
  // 匹配数组中的大整数
  // 匹配: [数字 或 ,数字 或 :数字（后面可能跟 , ] } 或空格）
  const arrayPattern = /([\[,:\s])(\d{17,})\b(?=[\s,\]\}]|$)/g;
  processedJson = processedJson.replace(arrayPattern, '$1"$2"');
  
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
