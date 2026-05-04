import React from 'react';
import { Translations } from '../utils/i18n';

interface JsonInputPanelProps {
  translations: Translations;
  jsonInput: string;
  jsonFormatError: string | null;
  onJsonInputChange: (value: string) => void;
  onFormatJson: () => void;
  onConvertDates: () => void;
  onClear: () => void;
  onMinify: () => void;
  onEscape: () => void;
  onUnescape: () => void;
  onConvertKeyValue: () => void;
  onOpenCompare: () => void;
}

const JsonInputPanel: React.FC<JsonInputPanelProps> = ({
  translations,
  jsonInput,
  jsonFormatError,
  onJsonInputChange,
  onFormatJson,
  onConvertDates,
  onClear,
  onMinify,
  onEscape,
  onUnescape,
  onConvertKeyValue,
  onOpenCompare,
}) => {
  return (
    <div className="json-input-section">
      <div className="json-input-container">
        <textarea
          className="json-textarea"
          value={jsonInput}
          onChange={(e) => onJsonInputChange(e.target.value)}
          placeholder={translations.pasteJsonHere}
          rows={10}
          autoFocus
        />
        {jsonFormatError && (
          <div className={`json-error-message ${jsonFormatError === translations.processing ? 'success' : ''}`}>
            {jsonFormatError}
          </div>
        )}
      </div>
      <div className="json-input-actions">
        <div className="action-row">
          <button className="json-button format" onClick={onFormatJson}>
            {translations.formatAndView}
          </button>
          <button className="json-button convert" onClick={onConvertDates}>
            {translations.formatAndConvert}
          </button>
          <button className="json-button clear" onClick={onClear}>
            {translations.clear}
          </button>
        </div>
        <div className="action-row">
          <button className="json-button minify" onClick={onMinify}>
            {translations.minifyJson}
          </button>
          <button className="json-button escape" onClick={onEscape}>
            {translations.escapeString}
          </button>
          <button className="json-button unescape" onClick={onUnescape}>
            {translations.unescapeString}
          </button>
        </div>
        <div className="action-row">
          <button className="json-button convert-kv" onClick={onConvertKeyValue}>
            {translations.convertKeyValue}
          </button>
          <button className="json-button compare" onClick={onOpenCompare}>
            {translations.compare}
          </button>
          <div className="action-spacer"></div>
        </div>
      </div>
      <div className="json-input-help">
        <ul>
          <li>{translations.jsonInputHelp1}</li>
          <li>{translations.jsonInputHelp2}</li>
          <li>{translations.jsonInputHelp3}</li>
          <li>{translations.jsonInputHelp4}</li>
        </ul>
      </div>
    </div>
  );
};

export default JsonInputPanel;

