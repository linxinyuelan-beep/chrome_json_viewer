import { extractJsonCandidates, isJsonSyntaxValid } from './jsonParse';

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

  const trimmed = text.trim();
  if (isJsonSyntaxValid(trimmed)) {
    return text;
  }

  return extractJsonCandidates(text)[0] || null;
}
