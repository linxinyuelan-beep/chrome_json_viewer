/**
 * 日期格式转换工具
 * 用于将特殊格式的日期字符串转换为人类可读的日期格式
 */

/**
 * 将 "/Date(timestamp±offset)/" 格式的日期字符串转换为 "YYYY-MM-DD HH:MM:SS" 格式
 * @param dateString 日期字符串，例如 "/Date(1753779363000+0800)/"
 * @returns 格式化后的日期字符串，例如 "2025-07-29 16:56:03"
 */
export function convertMicrosoftJsonDate(dateString: string): string {
    if (!dateString || typeof dateString !== 'string') return dateString;
    
    // 使用正则表达式匹配日期格式
    const dateRegex = /\/Date\((\d+)(?:([+-])(\d{4}))?\)\//;
    const matches = dateString.match(dateRegex);
    
    if (!matches) return dateString; // 如果不是预期格式，则返回原字符串
    
    try {
        // 从匹配的正则提取时间戳（毫秒）
        const timestamp = parseInt(matches[1], 10);
        
        // 创建日期对象
        const date = new Date(timestamp);
        
        // 格式化日期为 "YYYY-MM-DD HH:MM:SS" 格式
        return formatDate(date);
    } catch (error) {
        console.error('日期转换错误:', error);
        return dateString; // 如果转换出错，则返回原字符串
    }
}

/**
 * 递归处理JSON对象中的所有日期字符串
 * @param json 要处理的JSON对象或值
 * @returns 处理后的JSON对象或值
 */
export function processJsonDates(json: any): any {
    if (!json) return json;
    
    // 如果是字符串，尝试转换日期
    if (typeof json === 'string') {
        return convertMicrosoftJsonDate(json);
    }
    
    // 如果是数组，处理所有元素
    if (Array.isArray(json)) {
        return json.map(item => processJsonDates(item));
    }
    
    // 如果是对象，处理所有属性
    if (typeof json === 'object') {
        const result: Record<string, any> = {};
        for (const key in json) {
            if (Object.prototype.hasOwnProperty.call(json, key)) {
                result[key] = processJsonDates(json[key]);
            }
        }
        return result;
    }
    
    // 其他类型直接返回
    return json;
}

/**
 * 格式化日期为 "YYYY-MM-DD HH:MM:SS" 格式
 * @param date 日期对象
 * @returns 格式化后的日期字符串
 */
function formatDate(date: Date): string {
    // 获取年、月、日
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    // 获取时、分、秒
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    // 组合成最终格式
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}
