import React, { useState, useEffect, useRef } from 'react';
import JsonDiffViewer from './JsonDiffViewer';
import {
  calculateJsonDiff,
  getDiffStats,
  filterDiffs,
  sortObjectKeys,
  removeEmptyValues,
  convertKeyCase,
  findNextDiff,
  DiffResult,
  DiffType,
  DiffOptions,
} from '../utils/jsonDiff';
import { mergeJson, generateJsonPatch, MergeStrategy } from '../utils/jsonMerge';
import { convertMicrosoftJsonDate } from '../utils/dateConverter';
import { DEFAULT_LANGUAGE, getCurrentLanguage, getTranslations, LanguageCode, Translations } from '../utils/i18n';

interface JsonCompareProps {
  initialLeft?: string;
  initialRight?: string;
  initialMode?: 'edit' | 'view';
}

const JsonCompare: React.FC<JsonCompareProps> = ({ initialLeft = '', initialRight = '', initialMode = 'edit' }) => {
  // JSON 文本状态
  const [leftJson, setLeftJson] = useState<string>(initialLeft);
  const [rightJson, setRightJson] = useState<string>(initialRight);
  const [compareMode, setCompareMode] = useState<'edit' | 'view'>(initialMode);
  const [i18n, setI18n] = useState<Translations>(getTranslations(DEFAULT_LANGUAGE));
  const [leftLabel, setLeftLabel] = useState<string>(getTranslations(DEFAULT_LANGUAGE).sourceJsonLabel);
  const [rightLabel, setRightLabel] = useState<string>(getTranslations(DEFAULT_LANGUAGE).targetJsonLabel);

  // 解析后的 JSON 对象
  const [leftObj, setLeftObj] = useState<any>(null);
  const [rightObj, setRightObj] = useState<any>(null);

  // 错误状态
  const [leftError, setLeftError] = useState<string>('');
  const [rightError, setRightError] = useState<string>('');

  // 差异计算
  const [diffs, setDiffs] = useState<DiffResult[]>([]);
  const [currentDiffIndex, setCurrentDiffIndex] = useState<number>(-1);

  // 显示选项
  const [showOnlyDiffs, setShowOnlyDiffs] = useState<boolean>(true);
  const [showDiffSidebar, setShowDiffSidebar] = useState<boolean>(true);
  const [syncScroll, setSyncScroll] = useState<boolean>(true);

  // 宽度管理
  const [leftWidth, setLeftWidth] = useState<number>(33.33); // 百分比
  const [rightWidth, setRightWidth] = useState<number>(33.33); // 百分比
  const [sidebarWidth, setSidebarWidth] = useState<number>(33.34); // 百分比
  const [isDragging, setIsDragging] = useState<string | null>(null); // 'left-right' | 'right-sidebar' | null

  // 对比选项
  const [diffOptions, setDiffOptions] = useState<DiffOptions>({
    ignoreKeyOrder: false,
    ignoreWhitespace: false,
    ignoreCase: false,
    ignoreType: false,
    ignoreKeys: [],
  });

  // 引用
  const leftEditorRef = useRef<HTMLTextAreaElement>(null);
  const rightEditorRef = useRef<HTMLTextAreaElement>(null);
  const leftViewRef = useRef<HTMLDivElement>(null);
  const rightViewRef = useRef<HTMLDivElement>(null);
  const leftHighlightRef = useRef<HTMLDivElement>(null);
  const rightHighlightRef = useRef<HTMLDivElement>(null);
  const defaultLabelsRef = useRef({
    left: getTranslations(DEFAULT_LANGUAGE).sourceJsonLabel,
    right: getTranslations(DEFAULT_LANGUAGE).targetJsonLabel,
  });

  // 加载多语言
  useEffect(() => {
    let mounted = true;

    const loadLanguage = async () => {
      const lang = await getCurrentLanguage();
      if (mounted) {
        setI18n(getTranslations(lang));
      }
    };
    loadLanguage();

    const handleLanguageChange = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName === 'local' && changes.language?.newValue) {
        setI18n(getTranslations(changes.language.newValue as LanguageCode));
      }
    };

    chrome.storage.onChanged.addListener(handleLanguageChange);

    return () => {
      mounted = false;
      chrome.storage.onChanged.removeListener(handleLanguageChange);
    };
  }, []);

  // 当语言切换时，仅在用户未手动改过默认标签的情况下更新左右标签
  useEffect(() => {
    const prevDefaults = defaultLabelsRef.current;
    setLeftLabel(prev => (prev === prevDefaults.left ? i18n.sourceJsonLabel : prev));
    setRightLabel(prev => (prev === prevDefaults.right ? i18n.targetJsonLabel : prev));
    defaultLabelsRef.current = {
      left: i18n.sourceJsonLabel,
      right: i18n.targetJsonLabel,
    };
  }, [i18n]);

  // 初始化时解析 JSON
  useEffect(() => {
    if (initialLeft) {
      parseJson(initialLeft, 'left');
    }
    if (initialRight) {
      parseJson(initialRight, 'right');
    }
  }, []);

  // 当两侧 JSON 都有效时计算差异
  useEffect(() => {
    if (leftObj && rightObj) {
      const newDiffs = calculateJsonDiff(leftObj, rightObj, diffOptions);
      setDiffs(newDiffs);
      setCurrentDiffIndex(-1);
    }
  }, [leftObj, rightObj, diffOptions]);

  /**
   * 解析 JSON 文本
   */
  const parseJson = (text: string, side: 'left' | 'right') => {
    if (!text.trim()) {
      if (side === 'left') {
        setLeftObj(null);
        setLeftError('');
      } else {
        setRightObj(null);
        setRightError('');
      }
      return;
    }

    try {
      const parsed = JSON.parse(text);
      if (side === 'left') {
        setLeftObj(parsed);
        setLeftError('');
      } else {
        setRightObj(parsed);
        setRightError('');
      }
    } catch (error: any) {
      const errorMsg = `${i18n.jsonParseError}: ${error.message}`;
      if (side === 'left') {
        setLeftObj(null);
        setLeftError(errorMsg);
      } else {
        setRightObj(null);
        setRightError(errorMsg);
      }
    }
  };

  /**
   * 格式化 JSON
   */
  const formatJson = (side: 'left' | 'right', indent: number = 2) => {
    const text = side === 'left' ? leftJson : rightJson;
    try {
      const parsed = JSON.parse(text);
      const formatted = JSON.stringify(parsed, null, indent);
      if (side === 'left') {
        setLeftJson(formatted);
        parseJson(formatted, 'left');
      } else {
        setRightJson(formatted);
        parseJson(formatted, 'right');
      }
    } catch (error) {
      console.error('Format error:', error);
    }
  };

  /**
   * 压缩 JSON
   */
  const minifyJson = (side: 'left' | 'right') => {
    const text = side === 'left' ? leftJson : rightJson;
    try {
      const parsed = JSON.parse(text);
      const minified = JSON.stringify(parsed);
      if (side === 'left') {
        setLeftJson(minified);
        parseJson(minified, 'left');
      } else {
        setRightJson(minified);
        parseJson(minified, 'right');
      }
    } catch (error) {
      console.error('Minify error:', error);
    }
  };

  /**
   * 排序键
   */
  const sortKeys = (side: 'left' | 'right', recursive: boolean = true) => {
    const obj = side === 'left' ? leftObj : rightObj;
    if (!obj) return;

    const sorted = sortObjectKeys(obj, recursive);
    const sortedText = JSON.stringify(sorted, null, 2);

    if (side === 'left') {
      setLeftJson(sortedText);
      setLeftObj(sorted);
    } else {
      setRightJson(sortedText);
      setRightObj(sorted);
    }
  };

  /**
   * 转换键格式
   */
  const convertKeys = (side: 'left' | 'right', caseType: 'camel' | 'snake' | 'kebab') => {
    const obj = side === 'left' ? leftObj : rightObj;
    if (!obj) return;

    const converted = convertKeyCase(obj, caseType);
    const convertedText = JSON.stringify(converted, null, 2);

    if (side === 'left') {
      setLeftJson(convertedText);
      setLeftObj(converted);
    } else {
      setRightJson(convertedText);
      setRightObj(converted);
    }
  };

  /**
   * 移除空值
   */
  const removeEmpty = (side: 'left' | 'right') => {
    const obj = side === 'left' ? leftObj : rightObj;
    if (!obj) return;

    const cleaned = removeEmptyValues(obj, {
      removeNull: true,
    });
    const cleanedText = JSON.stringify(cleaned, null, 2);

    if (side === 'left') {
      setLeftJson(cleanedText);
      setLeftObj(cleaned);
    } else {
      setRightJson(cleanedText);
      setRightObj(cleaned);
    }
  };

  /**
   * 转换日期格式
   */
  const convertDates = (side: 'left' | 'right') => {
    const text = side === 'left' ? leftJson : rightJson;
    const converted = convertMicrosoftJsonDate(text);

    if (side === 'left') {
      setLeftJson(converted);
      parseJson(converted, 'left');
    } else {
      setRightJson(converted);
      parseJson(converted, 'right');
    }
  };

  /**
   * 导航到下一个差异
   */
  const navigateToNextDiff = () => {
    const changedDiffs = diffs.filter(diff => diff.type !== DiffType.UNCHANGED);
    if (changedDiffs.length === 0) return;

    const nextIndex = (currentDiffIndex + 1) % changedDiffs.length;
    setCurrentDiffIndex(nextIndex);
    scrollToDiff(changedDiffs[nextIndex]);
  };

  /**
   * 导航到上一个差异
   */
  const navigateToPrevDiff = () => {
    const changedDiffs = diffs.filter(diff => diff.type !== DiffType.UNCHANGED);
    if (changedDiffs.length === 0) return;

    const prevIndex = currentDiffIndex <= 0 ? changedDiffs.length - 1 : currentDiffIndex - 1;
    setCurrentDiffIndex(prevIndex);
    scrollToDiff(changedDiffs[prevIndex]);
  };

  /**
   * 滚动到指定差异
   */
  const scrollToDiff = (diff: DiffResult) => {
    console.log('Scroll to diff:', diff.path);
    
    // 获取差异路径的最后一部分作为搜索关键词
    const pathParts = diff.path.split('.');
    const lastPart = pathParts[pathParts.length - 1];
    
    if (!lastPart) return;
    
    // 在 JSON 文本中查找包含该键的行
    const searchKey = `"${lastPart}"`;
    
    // 在左右两侧都查找目标行
    const leftLines = leftJson.split('\n');
    const rightLines = rightJson.split('\n');
    
    let leftLineIndex = -1;
    let rightLineIndex = -1;
    
    // 查找左侧的行
    for (let i = 0; i < leftLines.length; i++) {
      if (leftLines[i].includes(searchKey)) {
        leftLineIndex = i;
        break;
      }
    }
    
    // 查找右侧的行
    for (let i = 0; i < rightLines.length; i++) {
      if (rightLines[i].includes(searchKey)) {
        rightLineIndex = i;
        break;
      }
    }
    
    // 计算行高
    const lineHeight = 21; // 根据 CSS 中的 line-height: 1.6 和 font-size: 13px 计算
    
    // 滚动左侧编辑器
    const leftScrollElement = compareMode === 'view' ? leftViewRef.current : leftEditorRef.current;
    const rightScrollElement = compareMode === 'view' ? rightViewRef.current : rightEditorRef.current;

    if (leftScrollElement && leftLineIndex !== -1) {
      const leftScrollTop = leftLineIndex * lineHeight;
      leftScrollElement.scrollTop = leftScrollTop;
      
      if (compareMode === 'edit' && leftHighlightRef.current) {
        leftHighlightRef.current.scrollTop = leftScrollTop;
      }
    }
    
    // 滚动右侧编辑器
    if (rightScrollElement && rightLineIndex !== -1) {
      const rightScrollTop = rightLineIndex * lineHeight;
      rightScrollElement.scrollTop = rightScrollTop;
      
      if (compareMode === 'edit' && rightHighlightRef.current) {
        rightHighlightRef.current.scrollTop = rightScrollTop;
      }
    }
    
    // 如果只在一侧找到，使用比例同步到另一侧
    if (leftLineIndex !== -1 && rightLineIndex === -1 && leftScrollElement && rightScrollElement) {
      const leftScrollTop = leftLineIndex * lineHeight;
      const leftScrollHeight = leftScrollElement.scrollHeight - leftScrollElement.clientHeight;
      const scrollRatio = leftScrollHeight > 0 ? leftScrollTop / leftScrollHeight : 0;
      
      const rightScrollHeight = rightScrollElement.scrollHeight - rightScrollElement.clientHeight;
      rightScrollElement.scrollTop = rightScrollHeight * scrollRatio;
      
      if (compareMode === 'edit' && rightHighlightRef.current) {
        const rightHighlightScrollHeight = rightHighlightRef.current.scrollHeight - rightHighlightRef.current.clientHeight;
        rightHighlightRef.current.scrollTop = rightHighlightScrollHeight * scrollRatio;
      }
    } else if (rightLineIndex !== -1 && leftLineIndex === -1 && rightScrollElement && leftScrollElement) {
      const rightScrollTop = rightLineIndex * lineHeight;
      const rightScrollHeight = rightScrollElement.scrollHeight - rightScrollElement.clientHeight;
      const scrollRatio = rightScrollHeight > 0 ? rightScrollTop / rightScrollHeight : 0;
      
      const leftScrollHeight = leftScrollElement.scrollHeight - leftScrollElement.clientHeight;
      leftScrollElement.scrollTop = leftScrollHeight * scrollRatio;
      
      if (compareMode === 'edit' && leftHighlightRef.current) {
        const leftHighlightScrollHeight = leftHighlightRef.current.scrollHeight - leftHighlightRef.current.clientHeight;
        leftHighlightRef.current.scrollTop = leftHighlightScrollHeight * scrollRatio;
      }
    }
    
    // 选中文本（针对 Modified 类型）
    if (compareMode === 'edit' && diff.type === DiffType.MODIFIED) {
      if (leftEditorRef.current && leftLineIndex !== -1) {
        const beforeText = leftLines.slice(0, leftLineIndex).join('\n');
        const startPos = beforeText.length + (leftLineIndex > 0 ? 1 : 0);
        const endPos = startPos + leftLines[leftLineIndex].length;
        
        leftEditorRef.current.focus();
        leftEditorRef.current.setSelectionRange(startPos, endPos);
      }
      
      if (rightEditorRef.current && rightLineIndex !== -1) {
        const rightBeforeText = rightLines.slice(0, rightLineIndex).join('\n');
        const rightStartPos = rightBeforeText.length + (rightLineIndex > 0 ? 1 : 0);
        const rightEndPos = rightStartPos + rightLines[rightLineIndex].length;
        rightEditorRef.current.setSelectionRange(rightStartPos, rightEndPos);
      }
    }
  };

  /**
   * 生成带高亮的 JSON 文本
   */
  const generateHighlightedJson = (
    jsonText: string,
    jsonObj: any,
    side: 'left' | 'right'
  ): JSX.Element => {
    if (!jsonText || !jsonObj) {
      return <span>{jsonText}</span>;
    }

    const lines = jsonText.split('\n');
    const highlightedLines: JSX.Element[] = [];

    const lineState = lines.map(() => ({
      highlightClass: 'highlight-unchanged',
      priority: 0,
      isActive: false,
    }));

    const getHighlightClass = (type: DiffType): string | null => {
      if (type === DiffType.ADDED && side === 'right') return 'highlight-added';
      if (type === DiffType.DELETED && side === 'left') return 'highlight-deleted';
      if (type === DiffType.MODIFIED) return 'highlight-modified';
      return null;
    };

    const getClassPriority = (cls: string): number => {
      if (cls === 'highlight-modified') return 3;
      if (cls === 'highlight-added' || cls === 'highlight-deleted') return 2;
      return 1;
    };

    const getLastPathKey = (path: string): string => {
      const keyMatches = path.match(/\.([^.\[\]]+)/g);
      if (!keyMatches || keyMatches.length === 0) return '';
      return keyMatches[keyMatches.length - 1].slice(1);
    };

    const findStartLineByKey = (key: string): number => {
      if (!key) return -1;
      const token = `"${key}"`;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(token)) return i;
      }
      return -1;
    };

    const findMatchingEndLine = (startLine: number, openingChar: '{' | '[', startColumn: number): number => {
      const closingChar = openingChar === '{' ? '}' : ']';
      let depth = 0;
      let inString = false;
      let escaped = false;

      for (let lineIndex = startLine; lineIndex < lines.length; lineIndex++) {
        const text = lines[lineIndex];
        const from = lineIndex === startLine ? Math.max(startColumn, 0) : 0;

        for (let col = from; col < text.length; col++) {
          const ch = text[col];

          if (escaped) {
            escaped = false;
            continue;
          }
          if (ch === '\\') {
            escaped = true;
            continue;
          }
          if (ch === '"') {
            inString = !inString;
            continue;
          }
          if (inString) continue;

          if (ch === openingChar) depth++;
          if (ch === closingChar) {
            depth--;
            if (depth === 0) return lineIndex;
          }
        }
      }

      return startLine;
    };

    const findValueEndLine = (startLine: number): number => {
      const line = lines[startLine] || '';
      const colonIndex = line.indexOf(':');
      const valueStartInLine = colonIndex >= 0 ? colonIndex + 1 : 0;
      const valueText = line.slice(valueStartInLine).trim();

      if (valueText.startsWith('{')) {
        const openIndex = line.indexOf('{', valueStartInLine);
        return findMatchingEndLine(startLine, '{', openIndex);
      }
      if (valueText.startsWith('[')) {
        const openIndex = line.indexOf('[', valueStartInLine);
        return findMatchingEndLine(startLine, '[', openIndex);
      }

      return startLine;
    };

    const applyLineHighlight = (startLine: number, endLine: number, cls: string, active: boolean) => {
      const priority = getClassPriority(cls);
      for (let i = startLine; i <= endLine && i < lineState.length; i++) {
        if (priority >= lineState[i].priority) {
          lineState[i].highlightClass = cls;
          lineState[i].priority = priority;
        }
        if (active) {
          lineState[i].isActive = true;
        }
      }
    };

    // 获取当前激活的差异路径
    const changedDiffs = diffs.filter(diff => diff.type !== DiffType.UNCHANGED);
    const activeDiffPath = currentDiffIndex >= 0 && changedDiffs[currentDiffIndex] 
      ? changedDiffs[currentDiffIndex].path 
      : '';

    changedDiffs.forEach(diff => {
      const highlightClass = getHighlightClass(diff.type);
      if (!highlightClass) return;

      const key = getLastPathKey(diff.path);
      const startLine = findStartLineByKey(key);
      if (startLine === -1) return;

      const endLine = findValueEndLine(startLine);
      applyLineHighlight(startLine, endLine, highlightClass, diff.path === activeDiffPath);
    });

    const renderJsonLine = (line: string, enableSyntaxHighlight: boolean): JSX.Element[] | string => {
      if (!enableSyntaxHighlight) return line;

      const tokens: JSX.Element[] = [];
      const tokenRegex = /"(?:\\.|[^"\\])*"|true|false|null|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g;
      let lastIndex = 0;
      let tokenIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = tokenRegex.exec(line)) !== null) {
        const matchedText = match[0];
        const start = match.index;
        const end = start + matchedText.length;

        if (start > lastIndex) {
          tokens.push(<span key={`plain-${tokenIndex++}`}>{line.slice(lastIndex, start)}</span>);
        }

        let tokenClass = '';
        if (matchedText.startsWith('"')) {
          const rest = line.slice(end);
          tokenClass = /^\s*:/.test(rest) ? 'json-token-key' : 'json-token-string';
        } else if (matchedText === 'true' || matchedText === 'false') {
          tokenClass = 'json-token-boolean';
        } else if (matchedText === 'null') {
          tokenClass = 'json-token-null';
        } else {
          tokenClass = 'json-token-number';
        }

        tokens.push(
          <span key={`token-${tokenIndex++}`} className={tokenClass}>
            {matchedText}
          </span>
        );
        lastIndex = end;
      }

      if (lastIndex < line.length) {
        tokens.push(<span key={`tail-${tokenIndex++}`}>{line.slice(lastIndex)}</span>);
      }

      return tokens;
    };

    lines.forEach((line, index) => {
      const { highlightClass, isActive } = lineState[index];

      highlightedLines.push(
        <span 
          key={index} 
          className={`highlight-line ${highlightClass} ${isActive ? 'highlight-active' : ''}`}
        >
          {renderJsonLine(line, true)}
        </span>
      );
    });

    return <>{highlightedLines}</>;
  };

  /**
   * 处理分隔条拖拽开始
   */
  const handleDividerMouseDown = (divider: 'left-right' | 'right-sidebar') => {
    setIsDragging(divider);
  };

  /**
   * 处理鼠标移动 - 调整宽度
   */
  useEffect(() => {
    if (!isDragging) return;

    // 添加拖拽中的 class 到 body
    document.body.classList.add('dragging');

    const handleMouseMove = (e: MouseEvent) => {
      const containerWidth = window.innerWidth;
      const mouseX = e.clientX;
      const percentage = (mouseX / containerWidth) * 100;

      if (isDragging === 'left-right') {
        // 调整左右编辑器之间的宽度比例，不影响侧边栏
        const editorsWidth = leftWidth + rightWidth;
        const editorsStartX = 0;
        const editorsEndX = containerWidth * (editorsWidth / 100);
        
        // 鼠标在编辑器区域内
        if (mouseX >= editorsStartX && mouseX <= editorsEndX) {
          const newLeftWidth = percentage;
          const newRightWidth = editorsWidth - newLeftWidth;
          
          // 设置最小宽度限制（至少10%）
          if (newLeftWidth >= 10 && newRightWidth >= 10) {
            setLeftWidth(newLeftWidth);
            setRightWidth(newRightWidth);
          }
        }
      } else if (isDragging === 'right-sidebar') {
        // 调整编辑器区域和侧边栏的宽度比例
        const newEditorsWidth = Math.max(30, Math.min(85, percentage));
        const newSidebarWidth = 100 - newEditorsWidth;
        
        // 按原有比例分配编辑器区域给左右两侧
        const leftRatio = leftWidth / (leftWidth + rightWidth);
        setLeftWidth(newEditorsWidth * leftRatio);
        setRightWidth(newEditorsWidth * (1 - leftRatio));
        setSidebarWidth(newSidebarWidth);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(null);
      document.body.classList.remove('dragging');
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.classList.remove('dragging');
    };
  }, [isDragging, leftWidth, rightWidth, sidebarWidth, showDiffSidebar]);

  /**
   * 当显示/隐藏侧边栏时重新分配宽度
   */
  useEffect(() => {
    if (showDiffSidebar) {
      // 显示侧边栏：给侧边栏分配 25% 的空间
      const totalEditorWidth = leftWidth + rightWidth;
      const newSidebarWidth = 25;
      const remainingWidth = 100 - newSidebarWidth;
      const leftRatio = leftWidth / totalEditorWidth;
      
      setLeftWidth(remainingWidth * leftRatio);
      setRightWidth(remainingWidth * (1 - leftRatio));
      setSidebarWidth(newSidebarWidth);
    } else {
      // 隐藏侧边栏：将空间重新分配给左右两侧
      const totalWidth = leftWidth + rightWidth + sidebarWidth;
      const leftRatio = leftWidth / (leftWidth + rightWidth);
      
      setLeftWidth(totalWidth * leftRatio);
      setRightWidth(totalWidth * (1 - leftRatio));
      setSidebarWidth(0);
    }
  }, [showDiffSidebar]);

  /**
   * 同步滚动 - 使用比例同步以处理不同长度的内容
   */
  const handleScroll = (e: React.UIEvent<HTMLElement>, source: 'left' | 'right') => {
    if (!syncScroll) return;

    const target = e.currentTarget;
    const other = compareMode === 'view'
      ? (source === 'left' ? rightViewRef.current : leftViewRef.current)
      : (source === 'left' ? rightEditorRef.current : leftEditorRef.current);
    const otherHighlight = compareMode === 'edit'
      ? (source === 'left' ? rightHighlightRef.current : leftHighlightRef.current)
      : null;
    const selfHighlight = compareMode === 'edit'
      ? (source === 'left' ? leftHighlightRef.current : rightHighlightRef.current)
      : null;

    // 计算当前滚动的比例（0-1之间）
    const scrollHeight = target.scrollHeight - target.clientHeight;
    const scrollRatio = scrollHeight > 0 ? target.scrollTop / scrollHeight : 0;

    // 同步水平滚动（保持一致）
    const scrollLeft = target.scrollLeft;

    // 根据比例同步另一侧的垂直滚动
    if (other) {
      const otherScrollHeight = other.scrollHeight - other.clientHeight;
      other.scrollTop = otherScrollHeight * scrollRatio;
      other.scrollLeft = scrollLeft;
    }
    
    if (otherHighlight) {
      const otherHighlightScrollHeight = otherHighlight.scrollHeight - otherHighlight.clientHeight;
      otherHighlight.scrollTop = otherHighlightScrollHeight * scrollRatio;
      otherHighlight.scrollLeft = scrollLeft;
    }
    
    // 同步自己的高亮层
    if (selfHighlight) {
      selfHighlight.scrollTop = target.scrollTop;
      selfHighlight.scrollLeft = scrollLeft;
    }
  };

  /**
   * 交换左右 JSON
   */
  const swapJsons = () => {
    const tempJson = leftJson;
    const tempObj = leftObj;
    const tempError = leftError;
    const tempLabel = leftLabel;

    setLeftJson(rightJson);
    setLeftObj(rightObj);
    setLeftError(rightError);
    setLeftLabel(rightLabel);

    setRightJson(tempJson);
    setRightObj(tempObj);
    setRightError(tempError);
    setRightLabel(tempLabel);
  };

  /**
   * 合并 JSON
   */
  const mergeJsons = (strategy: MergeStrategy) => {
    if (!leftObj || !rightObj) return;

    const merged = mergeJson(leftObj, rightObj, strategy);
    const mergedText = JSON.stringify(merged, null, 2);

    // 创建新窗口显示合并结果
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(`
        <html>
          <head>
            <title>${i18n.mergedJsonTitle}</title>
            <style>
              body { font-family: monospace; padding: 20px; }
              pre { background: #f5f5f5; padding: 15px; border-radius: 5px; }
            </style>
          </head>
          <body>
            <h2>${i18n.mergedJsonResult}</h2>
            <button onclick="navigator.clipboard.writeText(document.querySelector('pre').textContent)">
              ${i18n.copyToClipboard}
            </button>
            <pre>${mergedText}</pre>
          </body>
        </html>
      `);
    }
  };

  /**
   * 导出差异报告
   */
  const exportDiffReport = () => {
    const stats = getDiffStats(diffs);
    const changedDiffs = filterDiffs(diffs);

    const report = {
      timestamp: new Date().toISOString(),
      leftLabel,
      rightLabel,
      statistics: stats,
      differences: changedDiffs,
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `json-diff-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /**
   * 导出补丁文件
   */
  const exportPatchFile = () => {
    const patches = generateJsonPatch(diffs);
    const blob = new Blob([JSON.stringify(patches, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `json-patch-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 计算统计信息
  const stats = getDiffStats(diffs);
  const changedDiffs = filterDiffs(diffs);

  return (
    <div className="json-compare-container">
      {/* 顶部工具栏 */}
      <div className="compare-toolbar">
        <div className="toolbar-title">
          <span>{i18n.jsonCompareTitle}</span>
        </div>
        <div className="toolbar-actions">
          <button className="toolbar-button" onClick={swapJsons} title={i18n.swapLeftRight}>
            {i18n.swapLeftRight}
          </button>
          <button
            className="toolbar-button"
            onClick={() => setCompareMode(compareMode === 'view' ? 'edit' : 'view')}
            title={compareMode === 'view' ? i18n.switchToEditMode : i18n.switchToViewMode}
          >
            {compareMode === 'view' ? i18n.compareEditMode : i18n.compareViewMode}
          </button>
          <button
            className="toolbar-button"
            onClick={() => mergeJsons(MergeStrategy.SMART_MERGE)}
            title={i18n.smartMerge}
          >
            {i18n.smartMerge}
          </button>
          <button className="toolbar-button" onClick={exportDiffReport} title={i18n.exportDiffReport}>
            {i18n.exportDiffReport}
          </button>
          <button className="toolbar-button" onClick={exportPatchFile} title={i18n.exportPatch}>
            {i18n.exportPatch}
          </button>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="compare-main">
        <div className="compare-panes">
          {/* 左侧编辑器 */}
          <div className="compare-pane" style={{ width: `${leftWidth}%` }}>
            <div className="pane-header">
              <div className="pane-title">
                <input
                  type="text"
                  value={leftLabel}
                  onChange={(e) => setLeftLabel(e.target.value)}
                  placeholder={i18n.leftJsonLabelPlaceholder}
                />
              </div>
              <div className="pane-stats">
                {leftJson.length} {i18n.charsUnit} | {leftJson.split('\n').length} {i18n.linesUnit}
              </div>
            </div>
            <div className="pane-toolbar">
              <button className="pane-button" onClick={() => formatJson('left')}>
                {i18n.format}
              </button>
              <button className="pane-button" onClick={() => minifyJson('left')}>
                {i18n.minifyJson}
              </button>
              <button className="pane-button" onClick={() => sortKeys('left')}>
                {i18n.sortKeysLong}
              </button>
              <button className="pane-button" onClick={() => removeEmpty('left')}>
                {i18n.removeEmpty}
              </button>
              <button className="pane-button" onClick={() => convertDates('left')}>
                {i18n.convertDates}
              </button>
            </div>
            {compareMode === 'view' ? (
              <div
                ref={leftViewRef}
                className="pane-editor pane-viewer pane-viewer-highlight"
                onScroll={(e) => handleScroll(e, 'left')}
              >
                {generateHighlightedJson(leftJson, leftObj, 'left')}
              </div>
            ) : (
              <div className="pane-editor pane-editor-with-highlight">
                <div ref={leftHighlightRef} className="pane-editor-highlight">
                  {generateHighlightedJson(leftJson, leftObj, 'left')}
                </div>
                <textarea
                  ref={leftEditorRef}
                  value={leftJson}
                  onChange={(e) => {
                    setLeftJson(e.target.value);
                    parseJson(e.target.value, 'left');
                  }}
                  onScroll={(e) => handleScroll(e, 'left')}
                  placeholder={i18n.pasteLeftJsonHere}
                  spellCheck={false}
                />
              </div>
            )}
            {leftError && <div className="error-message">{leftError}</div>}
          </div>

          {/* 左右编辑器之间的分隔条 */}
          <div 
            className="compare-divider" 
            onMouseDown={() => handleDividerMouseDown('left-right')}
            style={{ cursor: isDragging === 'left-right' ? 'col-resize' : 'col-resize' }}
          ></div>

          {/* 右侧编辑器 */}
          <div className="compare-pane" style={{ width: `${rightWidth}%` }}>
            <div className="pane-header">
              <div className="pane-title">
                <input
                  type="text"
                  value={rightLabel}
                  onChange={(e) => setRightLabel(e.target.value)}
                  placeholder={i18n.rightJsonLabelPlaceholder}
                />
              </div>
              <div className="pane-stats">
                {rightJson.length} {i18n.charsUnit} | {rightJson.split('\n').length} {i18n.linesUnit}
              </div>
            </div>
            <div className="pane-toolbar">
              <button className="pane-button" onClick={() => formatJson('right')}>
                {i18n.format}
              </button>
              <button className="pane-button" onClick={() => minifyJson('right')}>
                {i18n.minifyJson}
              </button>
              <button className="pane-button" onClick={() => sortKeys('right')}>
                {i18n.sortKeysLong}
              </button>
              <button className="pane-button" onClick={() => removeEmpty('right')}>
                {i18n.removeEmpty}
              </button>
              <button className="pane-button" onClick={() => convertDates('right')}>
                {i18n.convertDates}
              </button>
            </div>
            {compareMode === 'view' ? (
              <div
                ref={rightViewRef}
                className="pane-editor pane-viewer pane-viewer-highlight"
                onScroll={(e) => handleScroll(e, 'right')}
              >
                {generateHighlightedJson(rightJson, rightObj, 'right')}
              </div>
            ) : (
              <div className="pane-editor pane-editor-with-highlight">
                <div ref={rightHighlightRef} className="pane-editor-highlight">
                  {generateHighlightedJson(rightJson, rightObj, 'right')}
                </div>
                <textarea
                  ref={rightEditorRef}
                  value={rightJson}
                  onChange={(e) => {
                    setRightJson(e.target.value);
                    parseJson(e.target.value, 'right');
                  }}
                  onScroll={(e) => handleScroll(e, 'right')}
                  placeholder={i18n.pasteRightJsonHere}
                  spellCheck={false}
                />
              </div>
            )}
            {rightError && <div className="error-message">{rightError}</div>}
          </div>

          {/* 编辑器区域与侧边栏之间的分隔条 */}
          {showDiffSidebar && (
            <div 
              className="compare-divider" 
              onMouseDown={() => handleDividerMouseDown('right-sidebar')}
              style={{ cursor: isDragging === 'right-sidebar' ? 'col-resize' : 'col-resize' }}
            ></div>
          )}

          {/* 差异侧边栏 */}
          {showDiffSidebar && (
            <div className="diff-sidebar" style={{ width: `${sidebarWidth}%` }}>
              <div className="sidebar-header">{i18n.differences} ({changedDiffs.length})</div>
              <div className="sidebar-content">
                <JsonDiffViewer
                  diffs={diffs}
                  showOnlyDiffs={showOnlyDiffs}
                  activeDiff={currentDiffIndex >= 0 ? changedDiffs[currentDiffIndex]?.path : ''}
                  onDiffClick={(diff) => scrollToDiff(diff)}
                  labels={{
                    deletedValueLabel: i18n.deletedValueLabel,
                    addedValueLabel: i18n.addedValueLabel,
                    beforeValueLabel: i18n.beforeValueLabel,
                    afterValueLabel: i18n.afterValueLabel,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 底部控制栏 */}
      <div className="compare-controls">
        <div className="controls-left">
          <button
            className="control-button"
            onClick={navigateToPrevDiff}
            disabled={changedDiffs.length === 0}
          >
            {i18n.prevDiff}
          </button>
          <button
            className="control-button"
            onClick={navigateToNextDiff}
            disabled={changedDiffs.length === 0}
          >
            {i18n.nextDiff}
          </button>
          <label className="option-item">
            <input
              type="checkbox"
              checked={showOnlyDiffs}
              onChange={(e) => setShowOnlyDiffs(e.target.checked)}
            />
            <span>{i18n.showOnlyDiffs}</span>
          </label>
          <label className="option-item">
            <input
              type="checkbox"
              checked={showDiffSidebar}
              onChange={(e) => setShowDiffSidebar(e.target.checked)}
            />
            <span>{i18n.showSidebar}</span>
          </label>
        </div>

        <div className="controls-right">
          <div className="diff-stats">
            <div className="diff-stat-item">
              <span>{i18n.addedLabel}:</span>
              <span className="stat-badge added">{stats.added}</span>
            </div>
            <div className="diff-stat-item">
              <span>{i18n.deletedLabel}:</span>
              <span className="stat-badge deleted">{stats.deleted}</span>
            </div>
            <div className="diff-stat-item">
              <span>{i18n.modifiedLabel}:</span>
              <span className="stat-badge modified">{stats.modified}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JsonCompare;
