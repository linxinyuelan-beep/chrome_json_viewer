import './config/public-path';
import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { JsonEditorRef } from './components/JsonEditorWrapper';
import { DEFAULT_LANGUAGE, getCurrentLanguage, getTranslations, LanguageCode, Translations } from './utils/i18n';
import { STORAGE_KEYS } from './config/storageKeys';
import { consumeJsonPayload } from './utils/jsonPayloadStore';
import { parseJsonPreserveLargeNumbers } from './utils/jsonParse';
import { formatJsonSize } from './utils/jsonViewer';
import JsonViewerPathBar from './components/jsonViewer/JsonViewerPathBar';
import JsonViewerShell from './components/jsonViewer/JsonViewerShell';
import { useJsonClipboard } from './components/jsonViewer/useJsonClipboard';
import { useJsonPath } from './components/jsonViewer/useJsonPath';
import { useJsonViewerMode } from './components/jsonViewer/useJsonViewerMode';

// JSON Window React Component
const JsonWindowApp: React.FC = () => {
  const [jsonData, setJsonData] = useState<any>(null);
  const [jsonSize, setJsonSize] = useState<string>('');
  const [i18n, setI18n] = useState<Translations>(getTranslations(DEFAULT_LANGUAGE));
  const { copySuccess, copyJson } = useJsonClipboard();
  const {
    currentJsonPath,
    pathCopySuccess,
    handleJsonPathSelect,
    copyCurrentPath,
  } = useJsonPath({
    errorText: i18n.errorGettingPath,
    copyErrorText: i18n.failedToCopyPath,
  });
  const { viewMode, toggleViewMode } = useJsonViewerMode({
    storageKey: STORAGE_KEYS.PREFERRED_VIEW_MODE,
    persistOnToggle: true,
  });

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

  useEffect(() => {
    document.title = i18n.jsonViewerTitle;
  }, [i18n]);

  const getJsonFromPayload = async (): Promise<any> => {
    const params = new URLSearchParams(window.location.search);
    const payloadId = params.get('payloadId');

    if (!payloadId) {
      return null;
    }

    try {
      const jsonString = await consumeJsonPayload(payloadId);
      if (!jsonString) {
        console.log('No JSON payload found for id:', payloadId);
        return null;
      }
      return parseJsonPreserveLargeNumbers(jsonString);
    } catch (e) {
      console.error('Error loading JSON payload:', e);
      return null;
    }
  };

  // 初始化数据
  useEffect(() => {
    const loadData = async () => {
      const data = await getJsonFromPayload();
      if (data) {
        setJsonData(data);
        const jsonString = JSON.stringify(data);
        const size = new TextEncoder().encode(jsonString).length;
        setJsonSize(formatJsonSize(size));
      }
    };

    loadData();
  }, []);


  // Ref for JsonEditorWrapper
  const jsonEditorRef = useRef<JsonEditorRef>(null);

  // 切换展开/折叠
  const [expanded, setExpanded] = useState(true);
  const toggleExpand = () => {
    const newExpanded = !expanded;
    setExpanded(newExpanded);

    // If in editor mode, also trigger editor methods
    if (viewMode === 'editor' && jsonEditorRef.current) {
      if (newExpanded) {
        jsonEditorRef.current.expandAll();
      } else {
        jsonEditorRef.current.collapseAll();
      }
    }
  };

  // 如果没有JSON数据
  if (!jsonData) {
    return (
      <div className="json-window-container">
        <div className="json-window-header">
          <div>
            <span className="json-window-title">{i18n.jsonViewerTitle}</span>
          </div>
        </div>
        <div className="json-window-content">
          <div className="json-display">
            <p style={{ color: '#dc3545', padding: '20px' }}>{i18n.noJsonDataProvided}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="json-window-container">
      <div className="json-window-header">
        <div>
          <span className="json-window-title">{i18n.jsonViewerTitle}</span>
          {jsonSize && <span className="json-window-size-info">{i18n.sizeLabel}: {jsonSize}</span>}
        </div>
        <JsonViewerPathBar
          path={currentJsonPath}
          copySuccess={pathCopySuccess}
          onCopy={copyCurrentPath}
          title={i18n.copyPathToClipboard}
          containerClassName="json-window-path-display"
          valueClassName="json-window-path-value"
          buttonClassName="json-window-path-copy-btn"
        />
        <div className="json-window-actions">
          <button
            className="json-window-button secondary"
            onClick={toggleExpand}
          >
            {expanded ? i18n.collapseAll : i18n.expandAll}
          </button>
          <button
            className={`json-window-button ${viewMode === 'editor' ? 'active' : ''}`}
            onClick={toggleViewMode}
            title={i18n.switchBetweenTreeAndEditor}
          >
            {viewMode === 'default' ? i18n.switchToEditor : i18n.switchToTree}
          </button>
          <button
            className={`json-window-button ${copySuccess ? 'success' : ''}`}
            onClick={() => copyJson(jsonData, i18n.failedToCopyJsonToClipboard)}
          >
            {copySuccess ? `✓ ${i18n.copied}` : i18n.copyJson}
          </button>
        </div>
      </div>
      <div className="json-window-content">
        <div className="json-display">
          <JsonViewerShell
            data={jsonData}
            expanded={expanded}
            viewMode={viewMode}
            editorRef={jsonEditorRef}
            onPathSelect={handleJsonPathSelect}
            loadingText={i18n.loading}
            height="calc(100vh - 80px)"
            windowMode
            invalidJsonText={i18n.invalidJsonFormat}
          />
        </div>
      </div>
    </div>
  );
};

// 渲染应用到DOM
const container = document.getElementById('react-root');
if (container) {
  createRoot(container).render(<JsonWindowApp />);
} else {
  console.error('React root container not found');
}
