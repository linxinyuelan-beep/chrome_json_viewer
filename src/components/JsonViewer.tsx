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
import ReactJson from 'react-json-view';
import { formatJsonSize } from '../utils/jsonViewer';
import { isValidNestedJson, decorateNestedJsonElement } from '../utils/nestedJsonHandler';

// 声明全局Window接口的扩展，以支持我们的自定义方法
declare global {
  interface Window {
    showNestedJsonInDrawer?: (jsonString: string) => void;
  }
}

// react-json-view类型补充
interface ReactJsonViewProps {
  src: any;
  name?: string | null;
  theme?: string;
  style?: React.CSSProperties;
  iconStyle?: string;
  indentWidth?: number;
  collapsed?: boolean;
  collapseStringsAfterLength?: number;
  shouldCollapse?: (field: any) => boolean;
  sortKeys?: boolean;
  quotesOnKeys?: boolean;
  displayDataTypes?: boolean;
  displayObjectSize?: boolean;
  enableClipboard?: boolean;
  groupArraysAfterLength?: number;
  indentSize?: number;
  displayArrayKey?: boolean;
  onEdit?: (edit: { updated_src: any }) => void;
  onAdd?: (add: { updated_src: any }) => void;
  onDelete?: (remove: { updated_src: any }) => void;
  onSelect?: (select: { name: string; namespace: string[]; value: any }) => boolean;
  validationMessage?: string;
  // 自定义属性
  onClickValue?: (info: { name: string; namespace: string[]; value: any }) => boolean;
  valueRenderer?: (props: { name: string; value: any }) => React.ReactNode;
}

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
  
  // 处理嵌套JSON的点击，允许查看嵌套的JSON字符串
  const handleNestedJsonClick = (e: React.MouseEvent, data: any) => {
    // 检查是否是字符串类型的数据
    if (typeof data === 'string') {
      // 使用我们的工具函数检查是否是有效的嵌套JSON
      if (isValidNestedJson(data)) {
        console.log('Nested JSON detected, showing in drawer', {
          stringLength: data.length,
          sample: data.substring(0, 50) + '...'
        });
        
        // 阻止冒泡和默认行为
        e.stopPropagation();
        e.preventDefault();
        
        // 调用全局函数显示JSON
        if (window.showNestedJsonInDrawer) {
          window.showNestedJsonInDrawer(data);
        } else {
          console.error('showNestedJsonInDrawer function not found on window object');
        }
        
        return true;
      } else {
        console.log('Not a valid nested JSON string');
      }
    }
    return false;
  };

  // 使用 useEffect 处理嵌套 JSON
  useEffect(() => {
    // 在组件挂载后添加嵌套JSON的处理
    const timeoutId = setTimeout(() => {
      // 找到所有可能的JSON字符串
      const strElements = document.querySelectorAll('.json-tree-container .string-value');
      
      strElements.forEach(el => {
        const text = el.textContent || '';
        // 移除引号，获取实际内容
        const content = text.replace(/^"|"$/g, '');
        
        // 使用工具函数检查是否是有效的嵌套JSON
        if (isValidNestedJson(content)) {
          // 使用工具函数装饰元素
          decorateNestedJsonElement(
            el as HTMLElement, 
            content, 
            (jsonContent) => {
              if (window.showNestedJsonInDrawer) {
                window.showNestedJsonInDrawer(jsonContent);
              }
            }
          );
        }
      });
    }, 500); // 等待渲染完成

    // 清理函数
    return () => clearTimeout(timeoutId);
  }, [jsonData]);

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
          theme={expanded ? "rjv-default" : "pop"}
          style={{ backgroundColor: 'transparent' }}
          collapsed={!expanded}
          collapseStringsAfterLength={80}
          displayDataTypes={false}
          displayObjectSize={true}
          enableClipboard={false} // We provide our own copy button
          name={null}
          // 将任何 onXXX 的事件回调包装为阻止冒泡
          onSelect={(select: any) => { 
            console.log('Selected:', select);
            // 检查这是否是一个嵌套的JSON字符串
            if (select && typeof select.value === 'string') {
              // 尝试处理嵌套JSON
              if (handleNestedJsonClick({ 
                stopPropagation: () => {}, 
                preventDefault: () => {} 
              } as React.MouseEvent<HTMLElement>, select.value)) {
                return false;
              }
            }
            return false; // 阻止默认行为
          }}
        />
      </div>
    </div>
  );
};

export default JsonViewerComponent;
