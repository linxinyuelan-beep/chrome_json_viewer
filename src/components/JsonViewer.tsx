/**
 * JSON Viewer Component using react-json-view
 * 
 * Alternative libraries to consider:
 * 1. @textea/json-viewer - https://github.com/TexteaInc/json-viewer
 *    Lightweight JSON display component
 * 
 * 2. react-json-tree - https://github.com/reduxjs/redux-devtools/tree/master/packages/react-json-tree
 *    Lightweight and focused on display only
 * 
 * 3. monaco-editor - https://github.com/microsoft/monaco-editor
 *    Professional editor (powers VS Code) with JSON support
 */

import React, { useState, useEffect } from 'react';
import ReactJson from '@microlink/react-json-view';
import { formatJsonSize } from '../utils/jsonViewer';

interface JsonViewerProps {
  jsonData: any;
  version: string;
  key?: string; // 添加可选的 key 属性
}

const JsonViewerComponent: React.FC<JsonViewerProps> = ({ jsonData, version }) => {
  const [expanded, setExpanded] = useState<boolean>(true);
  const [jsonSize, setJsonSize] = useState<string>('');
  // 添加内部组件 ID 用于强制重新渲染
  const [instanceId] = useState<string>(`json-viewer-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);

  // 确保组件初始化时记录日志
  useEffect(() => {
    console.log(`JSON Viewer mounted: ${instanceId}`, { dataSize: JSON.stringify(jsonData).length });
    
    // 清理函数
    return () => {
      console.log(`JSON Viewer unmounted: ${instanceId}`);
    };
  }, []);
  
  useEffect(() => {
    // Calculate JSON size
    const size = new TextEncoder().encode(JSON.stringify(jsonData)).length;
    setJsonSize(formatJsonSize(size));
    console.log(`JSON size calculated: ${size} bytes`);
  }, [jsonData]);

  // For react-json-view, we use predefined themes
  // Available themes: "apathy", "apathy:inverted", "ashes", "bespin", "brewer",
  // "bright:inverted", "bright", "chalk", "codeschool", "colors", "eighties",
  // "embers", "flat", "google", "grayscale", "grayscale:inverted", "greenscreen",
  // "harmonic", "hopscotch", "isotope", "marrakesh", "mocha", "monokai", "ocean",
  // "paraiso", "pop", "railscasts", "rjv-default", "shapeshifter", "shapeshifter:inverted",
  // "solarized", "summerfruit", "summerfruit:inverted", "threezerotwofour", "tomorrow",
  // "tube", "twilight"

  // Copy JSON to clipboard
  const copyJson = async () => {
    try {
      const formattedJson = JSON.stringify(jsonData, null, 2);
      await navigator.clipboard.writeText(formattedJson);
      // Show success feedback
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy JSON:', err);
    }
  };

  // Toggle expand/collapse all
  const toggleExpand = () => {
    setExpanded(!expanded);
  };

  // Copy success state
  const [copySuccess, setCopySuccess] = useState(false);

  // 阻止点击事件冒泡，确保在JSON视图内部的点击不会关闭抽屉
  const stopPropagation = (e: React.MouseEvent) => {
    // 阻止事件冒泡到文档
    e.stopPropagation();
  };
  
  return (
    <div 
      className="json-viewer-component" 
      onClick={stopPropagation} // 添加点击处理以阻止冒泡
    >
      {/* Info and actions bar */}
      <div className="json-viewer-header">
        <div className="json-viewer-info">
          <span className="json-viewer-version">v{version}</span>
          <span className="json-viewer-size">Size: {jsonSize}</span>
        </div>
        <div className="json-viewer-actions">
          <button 
            className="json-viewer-button" 
            onClick={toggleExpand}
          >
            {expanded ? 'Collapse All' : 'Expand All'}
          </button>
          <button 
            className={`json-viewer-button ${copySuccess ? 'success' : ''}`}
            onClick={copyJson}
          >
            {copySuccess ? '✓ Copied' : 'Copy JSON'}
          </button>
        </div>
      </div>

      {/* JSON Tree component */}
      <div className="json-tree-container">
        <ReactJson
          src={jsonData}
          theme="rjv-default" // Always use rjv-default theme for consistent coloring
          style={{ backgroundColor: 'transparent' }}
          collapsed={!expanded}
          collapseStringsAfterLength={false}
          displayDataTypes={false}
          displayObjectSize={true}
          enableClipboard={false} // We provide our own copy button
          name={null}
        />
      </div>
    </div>
  );
};

export default JsonViewerComponent;
