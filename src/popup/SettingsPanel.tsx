import React from 'react';
import { languageOptions, LanguageCode, Translations } from '../utils/i18n';

interface SettingsPanelProps {
  translations: Translations;
  jsonHoverEnabled: boolean;
  language: LanguageCode;
  jsonDisplayMode: 'drawer' | 'window';
  defaultViewerMode: 'default' | 'editor';
  onHoverDetectionChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  onLanguageChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  onDisplayModeChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  onDefaultViewerModeChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  onOpenShortcuts: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  translations,
  jsonHoverEnabled,
  language,
  jsonDisplayMode,
  defaultViewerMode,
  onHoverDetectionChange,
  onLanguageChange,
  onDisplayModeChange,
  onDefaultViewerModeChange,
  onOpenShortcuts,
}) => {
  return (
    <div className="section">
      <h2>{translations.settingsHeading}</h2>
      <div className="settings-compact">
        <label className="language-select-label">
          {translations.hoverDetection}:
          <select
            className="language-select"
            value={jsonHoverEnabled ? 'enabled' : 'disabled'}
            onChange={onHoverDetectionChange}
          >
            <option value="enabled">{translations.statusEnabled}</option>
            <option value="disabled">{translations.statusDisabled}</option>
          </select>
        </label>

        <label className="language-select-label">
          {translations.language}:
          <select
            className="language-select"
            value={language}
            onChange={onLanguageChange}
          >
            {languageOptions.map(option => (
              <option key={option.code} value={option.code}>
                {option.flag} {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="language-select-label">
          {translations.jsonDisplayMode}:
          <select
            className="language-select"
            value={jsonDisplayMode}
            onChange={onDisplayModeChange}
          >
            <option value="drawer">{translations.jsonDisplayModeDrawer}</option>
            <option value="window">{translations.jsonDisplayModeWindow}</option>
          </select>
        </label>

        <label className="language-select-label">
          {translations.defaultViewerMode}:
          <select
            className="language-select"
            value={defaultViewerMode}
            onChange={onDefaultViewerModeChange}
          >
            <option value="default">{translations.viewerModeTreeView}</option>
            <option value="editor">{translations.viewerModeEditor}</option>
          </select>
        </label>

        <div className="settings-actions">
          <button className="button" onClick={onOpenShortcuts} aria-label="Open Chrome shortcuts settings">
            {translations.configureShortcuts}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;

