import { isAutoDetectCandidate } from './jsonParse';

/**
 * 检测字符串是否为适合自动检测展示的 JSON。
 * 这是历史兼容入口；语法校验请使用 isJsonSyntaxValid。
 * @param str 要检测的字符串
 * @returns 是否为适合自动检测展示的 JSON
 */
export function isValidNestedJson(str: string): boolean {
  return isAutoDetectCandidate(str);
}
