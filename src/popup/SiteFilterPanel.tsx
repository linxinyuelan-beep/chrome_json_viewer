import React from 'react';
import { FilterMode } from '../utils/siteFilter';
import { Translations } from '../utils/i18n';

interface SiteFilterPanelProps {
  translations: Translations;
  filterMode: FilterMode;
  siteList: string[];
  newSiteInput: string;
  currentSite: string;
  onFilterModeChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  onNewSiteInputChange: (value: string) => void;
  onAddSite: () => void;
  onAddCurrentSite: () => void;
  onRemoveSite: (site: string) => void;
}

const SiteFilterPanel: React.FC<SiteFilterPanelProps> = ({
  translations,
  filterMode,
  siteList,
  newSiteInput,
  currentSite,
  onFilterModeChange,
  onNewSiteInputChange,
  onAddSite,
  onAddCurrentSite,
  onRemoveSite,
}) => {
  return (
    <div className="section">
      <h2>{translations.siteFilterHeading}</h2>

      <div className="settings-compact">
        <label className="language-select-label">
          {translations.filterMode}:
          <select
            className="language-select"
            value={filterMode}
            onChange={onFilterModeChange}
          >
            <option value="disabled">{translations.filterModeDisabled}</option>
            <option value="blacklist">{translations.filterModeBlacklist}</option>
            <option value="whitelist">{translations.filterModeWhitelist}</option>
          </select>
        </label>

        <div className="filter-mode-description">
          {filterMode === 'disabled' && translations.filterModeDisabledDesc}
          {filterMode === 'blacklist' && translations.filterModeBlacklistDesc}
          {filterMode === 'whitelist' && translations.filterModeWhitelistDesc}
        </div>

        <div className="filter-warning">
          💡 {translations.refreshPageToApply}
        </div>
      </div>

      {filterMode !== 'disabled' && (
        <>
          <div className="site-filter-panel">
            <h3 className="site-list-title">{translations.siteList}</h3>

            <div className="site-input-row">
              <input
                type="text"
                value={newSiteInput}
                onChange={(e) => onNewSiteInputChange(e.target.value)}
                placeholder={translations.sitePatternPlaceholder}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    onAddSite();
                  }
                }}
                className="site-input"
              />
              <button
                className="json-button format site-add-btn"
                onClick={onAddSite}
              >
                {translations.addSite}
              </button>
            </div>

            {currentSite && (
              <div className="site-current-row">
                <button
                  className="json-button secondary"
                  onClick={onAddCurrentSite}
                >
                  {translations.addCurrentSite}: {currentSite}
                </button>
              </div>
            )}

            <div className="site-pattern-help">
              {translations.sitePatternHelp}
            </div>

            <div className="site-list-container">
              {siteList.length === 0 ? (
                <div className="site-empty">
                  {translations.noSitesAdded}
                </div>
              ) : (
                <ul className="site-list">
                  {siteList.map((site, index) => (
                    <li
                      key={index}
                      className={`site-item ${index < siteList.length - 1 ? 'with-divider' : ''}`}
                    >
                      <span className="site-name">{site}</span>
                      <button
                        onClick={() => onRemoveSite(site)}
                        className="site-remove-btn"
                      >
                        {translations.remove}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SiteFilterPanel;

