import { extractJsonCandidates } from '../utils/jsonParse';

// 在元素中检测JSON内容
export function detectJsonInElement(element: Element): string[] {
  const text = element.textContent || '';
  if (text.length < 5) return [];

  const uniqueJsons = Array.from(new Set(extractJsonCandidates(text)));
  return uniqueJsons.sort((a, b) => b.length - a.length);
}
