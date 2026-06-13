import React from 'react';
import ReactJson from '@microlink/react-json-view';
import JsonEditorWrapper, { JsonEditorRef } from '../JsonEditorWrapper';
import { copyJsonViewValue } from './useJsonClipboard';
import { JsonViewerMode } from './types';
import { useResolvedTheme } from '../../utils/useResolvedTheme';

interface JsonViewerShellProps {
  data: unknown;
  expanded: boolean;
  viewMode: JsonViewerMode | null;
  editorRef: React.RefObject<JsonEditorRef | null>;
  onPathSelect: (selectInfo: any) => void;
  loadingText: string;
  height: string;
  editorKey?: string;
  windowMode?: boolean;
  invalidJsonText?: string;
}

const JsonViewerShell: React.FC<JsonViewerShellProps> = ({
  data,
  expanded,
  viewMode,
  editorRef,
  onPathSelect,
  loadingText,
  height,
  editorKey,
  windowMode = false,
  invalidJsonText,
}) => {
  const resolvedTheme = useResolvedTheme();
  const jsonViewTheme = resolvedTheme === 'dark' ? 'monokai' : 'rjv-default';

  return (
    <div className="json-tree-container" style={{ height }}>
      {viewMode === null ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#666' }}>
          {loadingText}
        </div>
      ) : viewMode === 'default' ? (
        <ReactJson
          src={data as any}
          theme={jsonViewTheme}
          style={{ backgroundColor: 'transparent' }}
          collapsed={!expanded}
          collapseStringsAfterLength={false}
          displayDataTypes={false}
          displayObjectSize={true}
          enableClipboard={windowMode ? true : (copy) => {
            copyJsonViewValue(copy.src).catch(err => {
              console.error('Failed to copy:', err);
            });
          }}
          escapeStrings={false}
          name={null}
          iconStyle={windowMode ? 'triangle' : undefined}
          indentWidth={windowMode ? 2 : undefined}
          quotesOnKeys={windowMode ? false : undefined}
          sortKeys={windowMode ? false : undefined}
          validationMessage={invalidJsonText}
          onSelect={onPathSelect}
        />
      ) : (
        <JsonEditorWrapper
          ref={editorRef}
          key={editorKey}
          data={data}
          mode="view"
          expanded={expanded}
        />
      )}
    </div>
  );
};

export default JsonViewerShell;
