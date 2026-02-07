/**
 * History component for JSON Viewer
 * Displays a list of previously viewed JSON data
 */

import React, { useState, useEffect } from 'react';
import { 
  getHistory, 
  deleteHistoryItem, 
  clearHistory, 
  JsonHistoryItem, 
  formatTimestamp,
  formatSize 
} from '../utils/jsonHistory';
import { Translations } from '../utils/i18n';

interface HistoryProps {
  onSelect: (jsonString: string) => void;
  onClose: () => void;
  translations: Translations;
}

const History: React.FC<HistoryProps> = ({ onSelect, onClose, translations }) => {
  const [history, setHistory] = useState<JsonHistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [confirmClear, setConfirmClear] = useState<boolean>(false);

  // Load history on component mount
  useEffect(() => {
    loadHistory();
  }, []);

  // Load history from storage
  const loadHistory = async () => {
    setLoading(true);
    try {
      const historyItems = await getHistory();
      setHistory(historyItems);
    } catch (e) {
      console.error('Error loading history:', e);
    } finally {
      setLoading(false);
    }
  };

  // Handle selecting a history item
  const handleSelect = (item: JsonHistoryItem) => {
    onSelect(item.jsonData);
    onClose();
  };

  // Handle deleting a history item
  const handleDelete = async (event: React.MouseEvent, id: string) => {
    event.stopPropagation(); // Prevent item selection
    try {
      await deleteHistoryItem(id);
      // Refresh history
      loadHistory();
    } catch (e) {
      console.error('Error deleting history item:', e);
    }
  };

  // Handle clearing all history
  const handleClearHistory = async () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }

    try {
      await clearHistory();
      setHistory([]);
      setConfirmClear(false);
    } catch (e) {
      console.error('Error clearing history:', e);
    }
  };

  // Cancel clear confirmation
  const handleCancelClear = () => {
    setConfirmClear(false);
  };

  // Format domain from URL
  const formatDomain = (url: string) => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch (e) {
      return url;
    }
  };

  return (
    <div className="json-history">
      <div className="json-history-header">
        <h3>{translations.jsonHistory}</h3>
        <div className="json-history-actions">
          <button 
            className="json-history-close" 
            onClick={onClose}
            title={translations.closeHistory}
          >
            ×
          </button>
        </div>
      </div>

      {loading ? (
        <div className="json-history-loading">{translations.loadingHistory}</div>
      ) : history.length === 0 ? (
        <div className="json-history-empty">{translations.noHistoryFound}</div>
      ) : (
        <>
          <div className="json-history-clear">
            {confirmClear ? (
              <div className="json-history-confirm">
                <span>{translations.areYouSure}</span>
                <button 
                  onClick={handleClearHistory}
                  className="json-history-button confirm"
                >
                  {translations.yesClearAll}
                </button>
                <button 
                  onClick={handleCancelClear}
                  className="json-history-button cancel"
                >
                  {translations.cancel}
                </button>
              </div>
            ) : (
              <button 
                onClick={handleClearHistory}
                className="json-history-button clear"
              >
                {translations.clearHistory}
              </button>
            )}
          </div>

          <div className="json-history-list">
            {history.map(item => (
              <div 
                key={item.id} 
                className="json-history-item"
                onClick={() => handleSelect(item)}
              >
                <div className="json-history-item-content">
                  <div className="json-history-item-preview">
                    {item.preview}
                  </div>
                  <div className="json-history-item-details">
                    <span className="json-history-item-source" title={item.source}>
                      {formatDomain(item.source)}
                    </span>
                    <span className="json-history-item-time">
                      {formatTimestamp(item.timestamp)}
                    </span>
                    <span className="json-history-item-size">
                      {formatSize(item.size)}
                    </span>
                  </div>
                </div>
                <button 
                  className="json-history-item-delete"
                  onClick={(e) => handleDelete(e, item.id)}
                  title={translations.deleteFromHistory}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default History;
