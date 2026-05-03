import { isValidNestedJson } from '../utils/nestedJsonHandler';
import { parseJsonSafely } from '../utils/jsonParser';

const isValidJson = isValidNestedJson;

// 在元素中检测JSON内容
export function detectJsonInElement(element: Element): string[] {
  const text = element.textContent || '';
  if (text.length < 5) return [];

  const detectedJsons: string[] = [];
  const allPotentialJsons = findAllPotentialJsons(text);
  detectedJsons.push(...allPotentialJsons);

  const uniqueJsons = Array.from(new Set(detectedJsons));
  return uniqueJsons.sort((a, b) => b.length - a.length);
}

// 查找文本中所有潜在的JSON，增强精确度
function findAllPotentialJsons(text: string): string[] {
  const validJsons: string[] = [];
  const candidateJsons: string[] = [];

  const trimmedText = text.trim();
  if ((trimmedText.startsWith('{') && trimmedText.endsWith('}')) ||
    (trimmedText.startsWith('[') && trimmedText.endsWith(']'))) {
    try {
      if (isValidJson(trimmedText)) {
        validJsons.push(trimmedText);
        return validJsons;
      }
    } catch (e) {
      // Continue scanning for embedded JSON.
    }
  }

  findBalancedPatterns(text, '{', '}').forEach(jsonStr => {
    candidateJsons.push(jsonStr);
  });

  findBalancedPatterns(text, '[', ']').forEach(jsonStr => {
    candidateJsons.push(jsonStr);
  });

  const reqPatterns = [
    /req:\s*(\{[\s\S]*?[^\\]\})/g,
    /res:\s*(\{[\s\S]*?[^\\]\})/g,
    /param=\s*(\{[\s\S]*?[^\\]\}|\[[\s\S]*?[^\\]\])/g,
    /"params":\s*(\{[\s\S]*?[^\\]\}|\[[\s\S]*?[^\\]\])/g,
    /"data":\s*(\{[\s\S]*?[^\\]\}|\[[\s\S]*?[^\\]\])/g,
    /\[\{"success".*?\}\]/g,
    /\[\{"orderItemId".*?\}\]/g,
  ];

  for (const pattern of reqPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const jsonStr = match[1] || match[0];
      candidateJsons.push(jsonStr);
    }
  }

  for (const jsonStr of candidateJsons) {
    try {
      if (isValidJson(jsonStr) && jsonStr.length > 10) {
        const jsonObj = parseJsonSafely(jsonStr);
        if (typeof jsonObj === 'object' && jsonObj !== null) {
          let isSubset = false;
          for (const otherJson of candidateJsons) {
            if (otherJson !== jsonStr && otherJson.includes(jsonStr) &&
              isValidJson(otherJson) && otherJson.length > jsonStr.length) {
              isSubset = true;
              break;
            }
          }
          if (!isSubset) {
            validJsons.push(jsonStr);
          }
        }
      }
    } catch (e) {
      // Ignore invalid JSON candidates.
    }
  }

  return Array.from(new Set(validJsons));
}

// 查找文本中所有平衡的括号对，优化查找完整JSON
function findBalancedPatterns(text: string, openChar: string, closeChar: string): string[] {
  const results: string[] = [];
  const stack: number[] = [];
  const positions: number[][] = [];

  for (let i = 0; i < text.length; i++) {
    if (text[i] === openChar) {
      stack.push(i);
    } else if (text[i] === closeChar && stack.length > 0) {
      const startIdx = stack.pop()!;
      if (stack.length === 0) {
        positions.push([startIdx, i]);
      }
    }
  }

  const topLevelPositions = positions.filter(([start, end]) => {
    return !positions.some(([otherStart, otherEnd]) => {
      return (start > otherStart && end < otherEnd);
    });
  });

  topLevelPositions.forEach(([start, end]) => {
    const jsonStr = text.substring(start, end + 1);
    if (jsonStr.length > 5 && jsonStr.length <= text.length) {
      results.push(jsonStr);
    }
  });

  return results;
}
