import { extractJsonCandidates } from '../utils/jsonParse';

export interface DetectedJsonMatch {
  json: string;
  position: number;
}

type DocumentWithCaretRange = Document & {
  caretRangeFromPoint?: (x: number, y: number) => Range | null;
};

function getJsonMatchesInElement(element: Element): DetectedJsonMatch[] {
  const text = element.textContent || '';
  if (text.length < 5) return [];

  const uniqueJsons = Array.from(new Set(extractJsonCandidates(text)));
  const matches: DetectedJsonMatch[] = [];

  for (const json of uniqueJsons) {
    let position = text.indexOf(json);
    while (position !== -1) {
      matches.push({ json, position });
      position = text.indexOf(json, position + json.length);
    }
  }

  return matches.sort((a, b) => b.json.length - a.json.length);
}

function getTextOffsetFromPoint(element: Element, clientX: number, clientY: number): number | null {
  const ownerDocument = element.ownerDocument as DocumentWithCaretRange;
  const range = ownerDocument.caretRangeFromPoint?.(clientX, clientY);

  if (!range || !element.contains(range.startContainer)) {
    return null;
  }

  const textNode = range.startContainer;
  if (textNode.nodeType !== Node.TEXT_NODE) {
    return null;
  }

  const walker = ownerDocument.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  let offset = 0;
  let node: Node | null;

  while ((node = walker.nextNode())) {
    const textLength = node.textContent?.length || 0;
    if (node === textNode) {
      return offset + Math.min(range.startOffset, textLength);
    }
    offset += textLength;
  }

  return null;
}

// 在元素中检测JSON内容
export function detectJsonInElement(element: Element): string[] {
  const text = element.textContent || '';
  if (text.length < 5) return [];

  const uniqueJsons = Array.from(new Set(extractJsonCandidates(text)));
  return uniqueJsons.sort((a, b) => b.length - a.length);
}

export function detectJsonAtPointInElement(
  element: Element,
  clientX: number,
  clientY: number
): DetectedJsonMatch[] {
  const offset = getTextOffsetFromPoint(element, clientX, clientY);
  if (offset === null) {
    return [];
  }

  const matches = getJsonMatchesInElement(element).filter(match => {
    const start = match.position;
    const end = start + match.json.length;
    return offset >= start && offset <= end;
  });

  if (matches.length === 0 && offset > 0) {
    return getJsonMatchesInElement(element).filter(match => {
      const start = match.position;
      const end = start + match.json.length;
      return offset - 1 >= start && offset - 1 < end;
    }).slice(0, 1);
  }

  return matches.slice(0, 1);
}
