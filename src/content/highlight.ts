export interface JsonHighlightOptions {
  onOpenJson: (jsonString: string) => Promise<void> | void;
  onError?: (message: string, error: unknown) => void;
}

export interface JsonHighlightMatch {
  json: string;
  position: number;
}

// 获取元素内所有文本节点的辅助函数
function getAllTextNodes(element: HTMLElement): Node[] {
  const textNodes: Node[] = [];
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);

  let node;
  while ((node = walker.nextNode())) {
    textNodes.push(node);
  }

  return textNodes;
}

function findTextNodeAtPosition(
  element: HTMLElement,
  position: number
): { node: Node; offset: number } | null {
  const textNodes = getAllTextNodes(element);
  let currentPosition = 0;

  for (const node of textNodes) {
    const textLength = node.textContent?.length || 0;
    const nextPosition = currentPosition + textLength;
    if (position >= currentPosition && position <= nextPosition) {
      return {
        node,
        offset: position - currentPosition
      };
    }
    currentPosition = nextPosition;
  }

  return null;
}

// 恢复原始文本的辅助函数
function restoreOriginalText(highlightSpan: HTMLElement): void {
  const parent = highlightSpan.parentNode;
  if (!parent) return;

  // 获取span前后的相邻文本节点
  const prevTextNode = highlightSpan.previousSibling;
  const nextTextNode = highlightSpan.nextSibling;

  // 提取span中的文本
  const spanText = highlightSpan.textContent || '';

  // 移除span
  parent.removeChild(highlightSpan);

  // 创建新的文本节点包含span的内容
  const newTextNode = document.createTextNode(spanText);

  // 插入到适当的位置
  if (nextTextNode) {
    parent.insertBefore(newTextNode, nextTextNode);
  } else {
    parent.appendChild(newTextNode);
  }

  // 合并相邻的文本节点，避免文本碎片
  if (prevTextNode && prevTextNode.nodeType === Node.TEXT_NODE &&
    newTextNode.nodeType === Node.TEXT_NODE) {
    prevTextNode.textContent = (prevTextNode.textContent || '') + newTextNode.textContent;
    parent.removeChild(newTextNode);
  }

  // 合并后续文本节点，如果有的话
  if (nextTextNode && nextTextNode.nodeType === Node.TEXT_NODE &&
    newTextNode.parentNode && newTextNode.nodeType === Node.TEXT_NODE) {
    newTextNode.textContent = (newTextNode.textContent || '') + nextTextNode.textContent;
    parent.removeChild(nextTextNode);
  }
}

function clearExistingJsonHoverHighlights(): void {
  const highlightSpans = Array.from(document.querySelectorAll<HTMLElement>('.json-text-hover'));

  for (const highlightSpan of highlightSpans) {
    restoreOriginalText(highlightSpan);
  }
}

export function highlightJsonInElement(
  target: HTMLElement,
  jsonContents: string[],
  options: JsonHighlightOptions
): void {
  const originalText = target.textContent || '';

  // 为了防止处理过程中文本改变导致的位置错误，先记录所有要处理的JSON及其位置
  const jsonPositions: JsonHighlightMatch[] = [];

  // 查找每个JSON的位置
  for (const jsonContent of jsonContents) {
    const position = originalText.indexOf(jsonContent);
    if (position !== -1) {
      jsonPositions.push({ json: jsonContent, position });
    }
  }

  // 按位置排序，确保从后向前处理，避免前面的处理影响后面的位置
  jsonPositions.sort((a, b) => b.position - a.position);

  highlightJsonMatchesInElement(target, jsonPositions, options);
}

export function highlightJsonMatchesInElement(
  target: HTMLElement,
  jsonMatches: JsonHighlightMatch[],
  options: JsonHighlightOptions
): void {
  clearExistingJsonHoverHighlights();

  const sortedMatches = [...jsonMatches].sort((a, b) => b.position - a.position);

  for (const { json, position } of sortedMatches) {
    try {
      const textPosition = findTextNodeAtPosition(target, position);
      const nodeText = textPosition?.node.textContent;
      if (!textPosition || !nodeText) {
        // JSON text was no longer present in a single text node after earlier splits.
        continue;
      }

      const textNode = textPosition.node;
      const jsonPosInNode = textPosition.offset;

      if (nodeText.substring(jsonPosInNode, jsonPosInNode + json.length) !== json) {
        // The match spans multiple nodes or the text changed before we could wrap it.
        continue;
      }

      // 创建一个ID来标识这个JSON的高亮
      const jsonHighlightId = `json-highlight-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      // 分割文本节点
      const beforeTextNode = document.createTextNode(
        nodeText.substring(0, jsonPosInNode)
      );
      const jsonSpan = document.createElement('span');
      jsonSpan.className = 'json-text-hover';
      jsonSpan.dataset.jsonContent = json;
      jsonSpan.id = jsonHighlightId;
      jsonSpan.textContent = json;
      const afterTextNode = document.createTextNode(
        nodeText.substring(jsonPosInNode + json.length)
      );

      // 替换原始文本节点
      const parentNode = textNode.parentNode;
      if (!parentNode) continue;

      // 将分割后的节点插入DOM
      parentNode.insertBefore(beforeTextNode, textNode);
      parentNode.insertBefore(jsonSpan, textNode);
      parentNode.insertBefore(afterTextNode, textNode);
      parentNode.removeChild(textNode);

      // 添加临时双击事件处理器
      const dblClickHandlerForJson = ((jsonString: string) => (ce: Event) => {
        const mouseEvent = ce as MouseEvent;
        mouseEvent.preventDefault();
        mouseEvent.stopPropagation();

        // 根据用户设置显示JSON
        Promise.resolve(options.onOpenJson(jsonString)).catch(error => {
          options.onError?.('Error showing JSON:', error);
        });
      })(json);

      // 为当前jsonSpan添加双击处理
      jsonSpan.addEventListener('dblclick', dblClickHandlerForJson);

      // 鼠标移出时安全移除高亮
      const currentHighlightId = jsonHighlightId; // 保存当前ID以便在闭包中访问
      target.addEventListener('mouseleave', () => {
        try {
          // 找到我们添加的span元素
          const highlightSpan = document.getElementById(currentHighlightId);
          if (highlightSpan && highlightSpan.parentNode) {
            restoreOriginalText(highlightSpan);
          }
        } catch (e) {
          options.onError?.('Error removing JSON highlight:', e);
        }
      }, { once: true });
    } catch (e) {
      options.onError?.('Error highlighting JSON:', e);
    }
  }
}
