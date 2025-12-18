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

interface JsonCompareProps {
  initialLeft?: string;
  initialRight?: string;
}

const JsonCompare: React.FC<JsonCompareProps> = ({ initialLeft = '', initialRight = '' }) => {
  // JSON 文本状态
  const [leftJson, setLeftJson] = useState<string>(initialLeft);
  const [rightJson, setRightJson] = useState<string>(initialRight);
  const [leftLabel, setLeftLabel] = useState<string>('Source JSON');
  const [rightLabel, setRightLabel] = useState<string>('Target JSON');

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
  const [showOnlyDiffs, setShowOnlyDiffs] = useState<boolean>(false);
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
  const leftHighlightRef = useRef<HTMLDivElement>(null);
  const rightHighlightRef = useRef<HTMLDivElement>(null);

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
      const errorMsg = `JSON parse error: ${error.message}`;
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
      removeEmptyString: true,
      removeEmptyObject: true,
      removeEmptyArray: true,
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
    if (leftEditorRef.current && leftLineIndex !== -1) {
      const leftScrollTop = leftLineIndex * lineHeight;
      leftEditorRef.current.scrollTop = leftScrollTop;
      
      if (leftHighlightRef.current) {
        leftHighlightRef.current.scrollTop = leftScrollTop;
      }
    }
    
    // 滚动右侧编辑器
    if (rightEditorRef.current && rightLineIndex !== -1) {
      const rightScrollTop = rightLineIndex * lineHeight;
      rightEditorRef.current.scrollTop = rightScrollTop;
      
      if (rightHighlightRef.current) {
        rightHighlightRef.current.scrollTop = rightScrollTop;
      }
    }
    
    // 如果只在一侧找到，使用比例同步到另一侧
    if (leftLineIndex !== -1 && rightLineIndex === -1 && leftEditorRef.current && rightEditorRef.current) {
      const leftScrollTop = leftLineIndex * lineHeight;
      const leftScrollHeight = leftEditorRef.current.scrollHeight - leftEditorRef.current.clientHeight;
      const scrollRatio = leftScrollHeight > 0 ? leftScrollTop / leftScrollHeight : 0;
      
      const rightScrollHeight = rightEditorRef.current.scrollHeight - rightEditorRef.current.clientHeight;
      rightEditorRef.current.scrollTop = rightScrollHeight * scrollRatio;
      
      if (rightHighlightRef.current) {
        const rightHighlightScrollHeight = rightHighlightRef.current.scrollHeight - rightHighlightRef.current.clientHeight;
        rightHighlightRef.current.scrollTop = rightHighlightScrollHeight * scrollRatio;
      }
    } else if (rightLineIndex !== -1 && leftLineIndex === -1 && rightEditorRef.current && leftEditorRef.current) {
      const rightScrollTop = rightLineIndex * lineHeight;
      const rightScrollHeight = rightEditorRef.current.scrollHeight - rightEditorRef.current.clientHeight;
      const scrollRatio = rightScrollHeight > 0 ? rightScrollTop / rightScrollHeight : 0;
      
      const leftScrollHeight = leftEditorRef.current.scrollHeight - leftEditorRef.current.clientHeight;
      leftEditorRef.current.scrollTop = leftScrollHeight * scrollRatio;
      
      if (leftHighlightRef.current) {
        const leftHighlightScrollHeight = leftHighlightRef.current.scrollHeight - leftHighlightRef.current.clientHeight;
        leftHighlightRef.current.scrollTop = leftHighlightScrollHeight * scrollRatio;
      }
    }
    
    // 选中文本（针对 Modified 类型）
    if (diff.type === DiffType.MODIFIED) {
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

    // 创建路径到差异类型的映射
    const pathToDiff = new Map<string, DiffType>();
    diffs.forEach(diff => {
      pathToDiff.set(diff.path, diff.type);
    });

    // 获取当前激活的差异路径
    const changedDiffs = diffs.filter(diff => diff.type !== DiffType.UNCHANGED);
    const activeDiffPath = currentDiffIndex >= 0 && changedDiffs[currentDiffIndex] 
      ? changedDiffs[currentDiffIndex].path 
      : '';

    // 简单的路径匹配逻辑
    lines.forEach((line, index) => {
      let highlightClass = 'highlight-unchanged';
      let isActiveLine = false;
      
      // 检查行中是否包含任何差异路径的键
      for (const [path, type] of pathToDiff.entries()) {
        if (type === DiffType.UNCHANGED) continue;
        
        const pathParts = path.split('.');
        const lastPart = pathParts[pathParts.length - 1];
        
        // 检查行中是否包含该键名
        if (lastPart && line.includes(`"${lastPart}"`)) {
          if (type === DiffType.ADDED && side === 'right') {
            highlightClass = 'highlight-added';
          } else if (type === DiffType.DELETED && side === 'left') {
            highlightClass = 'highlight-deleted';
          } else if (type === DiffType.MODIFIED) {
            highlightClass = 'highlight-modified';
          }
          
          // 检查是否是当前激活的差异
          if (path === activeDiffPath) {
            isActiveLine = true;
          }
          
          break;
        }
      }

      highlightedLines.push(
        <span 
          key={index} 
          className={`highlight-line ${highlightClass} ${isActiveLine ? 'highlight-active' : ''}`}
        >
          {line}
          {index < lines.length - 1 && '\n'}
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
  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>, source: 'left' | 'right') => {
    if (!syncScroll) return;

    const target = e.currentTarget;
    const other = source === 'left' ? rightEditorRef.current : leftEditorRef.current;
    const otherHighlight = source === 'left' ? rightHighlightRef.current : leftHighlightRef.current;
    const selfHighlight = source === 'left' ? leftHighlightRef.current : rightHighlightRef.current;

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
            <title>Merged JSON</title>
            <style>
              body { font-family: monospace; padding: 20px; }
              pre { background: #f5f5f5; padding: 15px; border-radius: 5px; }
            </style>
          </head>
          <body>
            <h2>Merged JSON Result</h2>
            <button onclick="navigator.clipboard.writeText(document.querySelector('pre').textContent)">
              Copy to Clipboard
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
          <span>⚖️</span>
          <span>JSON Compare Tool</span>
        </div>
        <div className="toolbar-actions">
          <button className="toolbar-button" onClick={swapJsons} title="Swap Left and Right">
            🔄 Swap
          </button>
          <button
            className="toolbar-button"
            onClick={() => mergeJsons(MergeStrategy.SMART_MERGE)}
            title="Smart Merge"
          >
            🔗 Merge
          </button>
          <button className="toolbar-button" onClick={exportDiffReport} title="Export Diff Report">
            📊 Export Report
          </button>
          <button className="toolbar-button" onClick={exportPatchFile} title="Export Patch">
            📋 Export Patch
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
                  placeholder="Left JSON Label"
                />
              </div>
              <div className="pane-stats">
                {leftJson.length} chars | {leftJson.split('\n').length} lines
              </div>
            </div>
            <div className="pane-toolbar">
              <button className="pane-button" onClick={() => formatJson('left')}>
                ✨ Format
              </button>
              <button className="pane-button" onClick={() => minifyJson('left')}>
                📦 Minify
              </button>
              <button className="pane-button" onClick={() => sortKeys('left')}>
                🔤 Sort Keys
              </button>
              <button className="pane-button" onClick={() => removeEmpty('left')}>
                🗑️ Remove Empty
              </button>
              <button className="pane-button" onClick={() => convertDates('left')}>
                📅 Convert Dates
              </button>
            </div>
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
                placeholder="Paste left JSON here..."
                spellCheck={false}
              />
            </div>
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
                  placeholder="Right JSON Label"
                />
              </div>
              <div className="pane-stats">
                {rightJson.length} chars | {rightJson.split('\n').length} lines
              </div>
            </div>
            <div className="pane-toolbar">
              <button className="pane-button" onClick={() => formatJson('right')}>
                ✨ Format
              </button>
              <button className="pane-button" onClick={() => minifyJson('right')}>
                📦 Minify
              </button>
              <button className="pane-button" onClick={() => sortKeys('right')}>
                🔤 Sort Keys
              </button>
              <button className="pane-button" onClick={() => removeEmpty('right')}>
                🗑️ Remove Empty
              </button>
              <button className="pane-button" onClick={() => convertDates('right')}>
                📅 Convert Dates
              </button>
            </div>
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
                placeholder="Paste right JSON here..."
                spellCheck={false}
              />
            </div>
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
              <div className="sidebar-header">Differences ({changedDiffs.length})</div>
              <div className="sidebar-content">
                <JsonDiffViewer
                  diffs={diffs}
                  showOnlyDiffs={showOnlyDiffs}
                  activeDiff={currentDiffIndex >= 0 ? changedDiffs[currentDiffIndex]?.path : ''}
                  onDiffClick={(diff) => scrollToDiff(diff)}
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
            ⏮️ Prev Diff
          </button>
          <button
            className="control-button"
            onClick={navigateToNextDiff}
            disabled={changedDiffs.length === 0}
          >
            ⏭️ Next Diff
          </button>
          <label className="option-item">
            <input
              type="checkbox"
              checked={showOnlyDiffs}
              onChange={(e) => setShowOnlyDiffs(e.target.checked)}
            />
            <span>Show Only Diffs</span>
          </label>
          <label className="option-item">
            <input
              type="checkbox"
              checked={showDiffSidebar}
              onChange={(e) => setShowDiffSidebar(e.target.checked)}
            />
            <span>Show Sidebar</span>
          </label>
        </div>

        <div className="controls-right">
          <div className="diff-stats">
            <div className="diff-stat-item">
              <span>Added:</span>
              <span className="stat-badge added">{stats.added}</span>
            </div>
            <div className="diff-stat-item">
              <span>Deleted:</span>
              <span className="stat-badge deleted">{stats.deleted}</span>
            </div>
            <div className="diff-stat-item">
              <span>Modified:</span>
              <span className="stat-badge modified">{stats.modified}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JsonCompare;
