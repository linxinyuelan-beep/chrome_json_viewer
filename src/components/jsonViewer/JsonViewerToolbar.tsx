import React from 'react';
import { Translations } from '../../utils/i18n';
import { JsonViewerMode } from './types';
import JsonViewerPathBar from './JsonViewerPathBar';

interface HistoryDropdownItem {
  id: string;
  preview: string;
  timestamp: number;
}

interface JsonViewerToolbarProps {
  i18n: Translations;
  jsonSize: string;
  currentJsonPath: string;
  pathCopySuccess: boolean;
  onCopyPath: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
  onNavigateBack: () => void;
  onNavigateForward: () => void;
  expanded: boolean;
  onToggleExpand: () => void;
  viewMode: JsonViewerMode | null;
  onToggleViewMode: () => void;
  isKeySorted: boolean;
  onToggleKeySort: () => void;
  copySuccess: boolean;
  onCopyJson: () => void;
  onOpenInNewWindow: () => void;
  onOpenCompare: () => void;
  historyItems: HistoryDropdownItem[];
  isDropdownOpen: boolean;
  onToggleDropdown: () => void;
  onViewAllHistory: () => void;
  onSelectHistoryItem: (id: string) => void;
  onClose?: () => void;
}

const JsonViewerToolbar: React.FC<JsonViewerToolbarProps> = ({
  i18n,
  jsonSize,
  currentJsonPath,
  pathCopySuccess,
  onCopyPath,
  canGoBack,
  canGoForward,
  onNavigateBack,
  onNavigateForward,
  expanded,
  onToggleExpand,
  viewMode,
  onToggleViewMode,
  isKeySorted,
  onToggleKeySort,
  copySuccess,
  onCopyJson,
  onOpenInNewWindow,
  onOpenCompare,
  historyItems,
  isDropdownOpen,
  onToggleDropdown,
  onViewAllHistory,
  onSelectHistoryItem,
  onClose,
}) => {
  return (
    <div className="json-viewer-header">
      <div className="json-viewer-info">
        <div className="json-viewer-navigation">
          <button
            className={`json-viewer-nav-button ${!canGoBack ? 'disabled' : ''}`}
            onClick={onNavigateBack}
            disabled={!canGoBack}
            title={i18n.backToPreviousJson}
          >
            ◀
          </button>
          <button
            className={`json-viewer-nav-button ${!canGoForward ? 'disabled' : ''}`}
            onClick={onNavigateForward}
            disabled={!canGoForward}
            title={i18n.forwardToNextJson}
          >
            ▶
          </button>

          <span className="json-viewer-size">{i18n.sizeLabel}: {jsonSize}</span>
        </div>
      </div>
      <JsonViewerPathBar
        path={currentJsonPath}
        copySuccess={pathCopySuccess}
        onCopy={onCopyPath}
        title={i18n.copyPathToClipboard}
        containerClassName="json-viewer-path-display"
        valueClassName="json-viewer-path-value"
        buttonClassName="json-viewer-path-copy-btn"
      />
      <div className="json-viewer-actions">
        <button
          className="json-viewer-button"
          onClick={onToggleExpand}
        >
          {expanded ? i18n.collapseAll : i18n.expandAll}
        </button>
        <button
          className={`json-viewer-button ${viewMode === 'editor' ? 'active' : ''}`}
          onClick={onToggleViewMode}
          title={i18n.switchBetweenTreeAndEditor}
        >
          {viewMode === 'default' ? i18n.switchToEditor : i18n.switchToTree}
        </button>
        <button
          className={`json-viewer-button ${isKeySorted ? 'active' : ''}`}
          onClick={onToggleKeySort}
          title={i18n.sortJsonKeysAlphabetically}
        >
          {isKeySorted ? i18n.unsortKeys : i18n.sortKeys}
        </button>
        <button
          className={`json-viewer-button ${copySuccess ? 'success' : ''}`}
          onClick={onCopyJson}
        >
          {copySuccess ? `✓ ${i18n.copied}` : i18n.copyJson}
        </button>
        <button
          className="json-viewer-button"
          onClick={onOpenInNewWindow}
          title={i18n.openJsonInNewWindow}
        >
          {i18n.newWindow}
        </button>
        <button
          className="json-viewer-button"
          onClick={onOpenCompare}
          title={i18n.compareWithAnotherJson}
        >
          {`${i18n.compare}`}
        </button>

        <div className="json-viewer-dropdown-container">
          <button
            className="json-viewer-button history-dropdown-button"
            onClick={onToggleDropdown}
            title={i18n.viewHistory}
          >
            {`${i18n.history} ▾`}
          </button>
          {isDropdownOpen && (
            <div className="json-viewer-dropdown-menu">
              <div className="json-viewer-dropdown-header">
                <span>{i18n.recentJson}</span>
                <button
                  className="json-viewer-dropdown-view-all"
                  onClick={onViewAllHistory}
                >
                  {i18n.viewAll}
                </button>
              </div>
              {historyItems.length === 0 ? (
                <div className="json-viewer-dropdown-empty">{i18n.noHistoryFound}</div>
              ) : (
                <>
                  {historyItems.slice(0, 10).map(item => (
                    <div
                      key={item.id}
                      className="json-viewer-dropdown-item"
                      onClick={() => onSelectHistoryItem(item.id)}
                      title={new Date(item.timestamp).toLocaleString()}
                    >
                      {item.preview}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
        <button className="json-drawer-close" onClick={onClose}>&times;</button>
      </div>
    </div>
  );
};

export default JsonViewerToolbar;
