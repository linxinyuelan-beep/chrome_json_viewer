import React from 'react';
import ReactDOM from 'react-dom';
import './assets/styles/main.css';
import { VERSION } from './config/version';
import { isValidNestedJson } from './utils/nestedJsonHandler';
import { processJsonDates } from './utils/dateConverter';
import { parseJsonSafely } from './utils/jsonParser';
import { extractJsonFromString } from './utils/jsonExtractor';
import { 
  LanguageCode,
  DEFAULT_LANGUAGE, 
  getTranslations, 
  getCurrentLanguage, 
  saveLanguage,
  languageOptions,
  Translations
} from './utils/i18n';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState<'settings' | 'json-input'>('json-input');
  const [jsonHoverEnabled, setJsonHoverEnabled] = React.useState(true);
  const [jsonDisplayMode, setJsonDisplayMode] = React.useState<'drawer' | 'window'>('drawer');
  const [jsonInput, setJsonInput] = React.useState('');
  const [jsonFormatError, setJsonFormatError] = React.useState<string | null>(null);
  const [language, setLanguage] = React.useState<LanguageCode>(DEFAULT_LANGUAGE);
  const [translations, setTranslations] = React.useState<Translations>(getTranslations(DEFAULT_LANGUAGE));
  const version = VERSION;

  // Load saved settings when popup opens
  React.useEffect(() => {
    // Load all saved settings
    const loadSettings = async () => {
      try {
        // Get the current language setting
        const currentLang = await getCurrentLanguage();
        setLanguage(currentLang);
        setTranslations(getTranslations(currentLang));
        
        // Load JSON display mode setting
        chrome.storage.local.get('jsonDisplayMode', (result) => {
          const mode = result.jsonDisplayMode || 'drawer';
          setJsonDisplayMode(mode);
        });
        
        // Load hover detection setting from storage
        chrome.storage.local.get('hoverDetectionEnabled', (result) => {
          const enabled = result.hoverDetectionEnabled !== undefined ? result.hoverDetectionEnabled : true;
          setJsonHoverEnabled(enabled);
        });
      } catch (error) {
        console.error("Error loading settings:", error);
      }
    };
    
    loadSettings();
  }, []);

  // Handle hover detection setting change
  const handleHoverDetectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const enabled = e.target.value === 'enabled';
    setJsonHoverEnabled(enabled);
    
    // Save to storage
    chrome.storage.local.set({ hoverDetectionEnabled: enabled });
    
    // Send message to content script to update hover detection
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { 
          action: 'setHoverDetection', 
          enabled: enabled 
        });
      }
    });
  };
  
  // Change language
  const handleLanguageChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value as LanguageCode;
    await saveLanguage(newLang);
    setLanguage(newLang);
    setTranslations(getTranslations(newLang));
  };

  // Change JSON display mode
  const handleDisplayModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMode = e.target.value as 'drawer' | 'window';
    setJsonDisplayMode(newMode);
    chrome.storage.local.set({ jsonDisplayMode: newMode });
  };

  // 新增：打开 Chrome 快捷键设置页面
  const openShortcutsPage = () => {
    try {
      chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
    } catch (e) {
      console.error('Failed to open shortcuts page', e);
    }
  };

  // Format JSON input function
  const formatJsonInput = () => {
    try {
      let jsonToFormat = jsonInput.trim();
      
      if (!jsonToFormat) {
        setJsonFormatError(translations.enterJsonText);
        return;
      }

      // 尝试从输入文本中提取 JSON
      const extractedJson = extractJsonFromString(jsonToFormat);
      if (extractedJson) {
        jsonToFormat = extractedJson;
      }

      if (!isValidNestedJson(jsonToFormat)) {
        setJsonFormatError(translations.invalidJsonFormat);
        return;
      }

      // 使用增强的 JSON 解析器处理大整数精度问题
      const parsedJson = parseJsonSafely(jsonToFormat);
      const formattedJson = JSON.stringify(parsedJson, null, 2);
      
      // 如果提取了 JSON，则更新输入框并显示提示
      if (extractedJson && extractedJson !== jsonInput) {
        setJsonInput(formattedJson);
        setJsonFormatError(translations.jsonExtracted);
      } else {
        setJsonInput(formattedJson);
        setJsonFormatError(null);
      }
      
      // Add a status indication
      setJsonFormatError(translations.processing);
      
      // 先通过background.js发送消息（这样可以处理跨域问题）
      chrome.runtime.sendMessage(
        { 
          action: 'showJsonFromPopup',
          jsonString: formattedJson,
          version: version
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.log('Error sending message through background:', chrome.runtime.lastError);
            
            // 尝试直接发送到当前标签页
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
              if (tabs[0]?.id) {
                chrome.tabs.sendMessage(
                  tabs[0].id,
                  { 
                    action: 'showJsonFromPopup',
                    jsonString: formattedJson,
                    version: version
                  },
                  (tabResponse) => {
                    if (chrome.runtime.lastError) {
                      console.log('Error sending JSON directly to tab:', chrome.runtime.lastError);
                      // 所有尝试都失败，打开新标签页显示JSON
                      openJsonInNewTab(formattedJson);
                    } else {
                      console.log('Message sent successfully to tab:', tabResponse);
                      // 关闭弹出窗口
                      window.close();
                    }
                  }
                );
              } else {
                // 如果没有活动标签页，打开新标签页显示JSON
                openJsonInNewTab(formattedJson);
              }
            });
          } else {
            console.log('Message sent successfully through background:', response);
            // 关闭弹出窗口
            window.close();
          }
        }
      );
    } catch (error) {
      setJsonFormatError(`解析JSON出错：${(error as Error).message}`);
    }
  };
  
  // 在新标签页中打开JSON
  const openJsonInNewTab = (jsonString: string) => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    chrome.tabs.create({ url });
  };
  
  // Format and convert JSON date formats, then display in drawer
  const convertJsonDates = () => {
    try {
      let jsonToConvert = jsonInput.trim();
      
      if (!jsonToConvert) {
        setJsonFormatError(translations.noJsonToConvert);
        return;
      }

      // 尝试从输入文本中提取 JSON
      const extractedJson = extractJsonFromString(jsonToConvert);
      if (extractedJson) {
        jsonToConvert = extractedJson;
      }

      if (!isValidNestedJson(jsonToConvert)) {
        setJsonFormatError(translations.invalidJsonFormat);
        return;
      }

      // 使用增强的 JSON 解析器处理大整数精度问题
      const parsedJson = parseJsonSafely(jsonToConvert);
      
      // Process and convert date formats
      const convertedJson = processJsonDates(parsedJson);
      
      // Format the converted JSON
      const formattedJson = JSON.stringify(convertedJson, null, 2);
      
      // 如果提取了 JSON，则更新输入框并显示提示
      if (extractedJson && extractedJson !== jsonInput) {
        setJsonInput(formattedJson);
        setJsonFormatError(translations.jsonExtracted);
      } else {
        // Update content in the text box
        setJsonInput(formattedJson);
        setJsonFormatError(translations.processing);
      }
      
      // 复制到剪贴板
      navigator.clipboard.writeText(formattedJson)
        .then(() => {
          console.log('日期格式转换成功并已复制到剪贴板');
          // 剪贴板操作成功，但不显示消息，因为我们要关闭弹窗
        })
        .catch(err => {
          console.log('剪贴板复制失败，但JSON已转换:', err);
        })
        .finally(() => {
          // 无论剪贴板操作成功与否，都发送转换后的JSON到内容脚本并打开抽屉
          // 先通过background.js发送消息（这样可以处理跨域问题）
          chrome.runtime.sendMessage(
            { 
              action: 'showJsonFromPopup',
              jsonString: formattedJson,
              version: version
            },
            (response) => {
              if (chrome.runtime.lastError) {
                console.log('Error sending message through background:', chrome.runtime.lastError);
                
                // 尝试直接发送到当前标签页
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                  if (tabs[0]?.id) {
                    chrome.tabs.sendMessage(
                      tabs[0].id,
                      { 
                        action: 'showJsonFromPopup',
                        jsonString: formattedJson,
                        version: version
                      },
                      (tabResponse) => {
                        if (chrome.runtime.lastError) {
                          console.log('Error sending JSON directly to tab:', chrome.runtime.lastError);
                          // 所有尝试都失败，打开新标签页显示JSON
                          openJsonInNewTab(formattedJson);
                        } else {
                          console.log('Message sent successfully to tab:', tabResponse);
                          // 关闭弹出窗口
                          window.close();
                        }
                      }
                    );
                  } else {
                    // 如果没有活动标签页，打开新标签页显示JSON
                    openJsonInNewTab(formattedJson);
                  }
                });
              } else {
                console.log('Message sent successfully through background:', response);
                // 关闭弹出窗口
                window.close();
              }
            }
          );
        });
    } catch (error) {
      setJsonFormatError(`解析JSON出错：${(error as Error).message}`);
    }
  };

  // Clear JSON input
  const clearJsonInput = () => {
    setJsonInput('');
    setJsonFormatError(null);
  };

  // JSON minification
  const minifyJson = () => {
    try {
      if (!jsonInput.trim()) {
        setJsonFormatError(translations.enterJsonText);
        return;
      }

      if (!isValidNestedJson(jsonInput)) {
        setJsonFormatError(translations.invalidJsonFormat);
        return;
      }

      // Parse and compress JSON (no indentation or whitespace)
      const parsedJson = parseJsonSafely(jsonInput);
      const minifiedJson = JSON.stringify(parsedJson);
      
      // Directly update the content in the input field
      setJsonInput(minifiedJson);
      setJsonFormatError(translations.jsonMinified);
      
      // Copy to clipboard
      navigator.clipboard.writeText(minifiedJson)
        .then(() => {
          setJsonFormatError(translations.jsonMinifiedAndCopied);
        })
        .catch(err => {
          console.log('Clipboard copy failed, but JSON is minified:', err);
        });
    } catch (error) {
      setJsonFormatError(`${translations.invalidJsonFormat}: ${(error as Error).message}`);
    }
  };

  // Escape JSON string
  const escapeJsonString = () => {
    try {
      if (!jsonInput.trim()) {
        setJsonFormatError(translations.enterTextToEscape);
        return;
      }

      // If input is valid JSON, format it first
      let inputToEscape = jsonInput;
      if (isValidNestedJson(jsonInput)) {
        const parsedJson = parseJsonSafely(jsonInput);
        inputToEscape = JSON.stringify(parsedJson);
      }
      
      // Escape string (JSON serialize the string and remove the quotes)
      const escapedString = JSON.stringify(inputToEscape).slice(1, -1);
      
      // Update content in the input field
      setJsonInput(escapedString);
      setJsonFormatError(translations.textEscaped);
      
      // Copy to clipboard
      navigator.clipboard.writeText(escapedString)
        .then(() => {
          setJsonFormatError(translations.textEscapedAndCopied);
        })
        .catch(err => {
          console.log('Clipboard copy failed, but text is escaped:', err);
        });
    } catch (error) {
      setJsonFormatError(`${translations.escapeError}${(error as Error).message}`);
    }
  };

  // Unescape JSON string
  const unescapeJsonString = () => {
    try {
      if (!jsonInput.trim()) {
        setJsonFormatError(translations.enterTextToUnescape);
        return;
      }

      // Add quotes to the string and parse
      const unescapedString = JSON.parse(`"${jsonInput}"`);
      
      // Update the content in the input field
      setJsonInput(unescapedString);
      setJsonFormatError(translations.textUnescaped);
      
      // Copy to clipboard
      navigator.clipboard.writeText(unescapedString)
        .then(() => {
          setJsonFormatError(translations.textUnescapedAndCopied);
        })
        .catch(err => {
          console.log('Clipboard copy failed, but text is unescaped:', err);
        });
    } catch (error) {
      setJsonFormatError(`${translations.unescapeError}${(error as Error).message}`);
    }
  };

  // Convert key-value format to JSON
  const convertKeyValueToJson = () => {
    try {
      if (!jsonInput.trim()) {
        setJsonFormatError(translations.enterTextToConvert);
        return;
      }

      // Split by semicolons to get individual groups
      const groups = jsonInput.split(';').filter(group => group.trim());
      
      if (groups.length === 0) {
        setJsonFormatError(translations.convertError + '没有找到有效的数据组');
        return;
      }

      const jsonArray: any[] = [];

      for (const group of groups) {
        const trimmedGroup = group.trim();
        if (!trimmedGroup) continue;

        // Split by commas to get key-value pairs
        const pairs = trimmedGroup.split(',').filter(pair => pair.trim());
        const obj: any = {};

        for (const pair of pairs) {
          const trimmedPair = pair.trim();
          if (!trimmedPair) continue;

          // Split by equals sign to get key and value
          const equalIndex = trimmedPair.indexOf('=');
          if (equalIndex === -1) {
            setJsonFormatError(translations.convertError + `无效的键值对格式: ${trimmedPair}`);
            return;
          }

          const key = trimmedPair.substring(0, equalIndex).trim();
          const value = trimmedPair.substring(equalIndex + 1).trim();

          if (!key) {
            setJsonFormatError(translations.convertError + `空的键名: ${trimmedPair}`);
            return;
          }

          // Try to convert value to appropriate type
          let convertedValue: any = value;
          
          // Check if it's a number
          if (/^-?\d+$/.test(value)) {
            convertedValue = parseInt(value, 10);
          } else if (/^-?\d*\.\d+$/.test(value)) {
            convertedValue = parseFloat(value);
          } else if (value.toLowerCase() === 'true') {
            convertedValue = true;
          } else if (value.toLowerCase() === 'false') {
            convertedValue = false;
          } else if (value.toLowerCase() === 'null') {
            convertedValue = null;
          }

          obj[key] = convertedValue;
        }

        jsonArray.push(obj);
      }

      // Format the converted JSON
      const formattedJson = JSON.stringify(jsonArray, null, 2);
      
      // Update content in the input field
      setJsonInput(formattedJson);
      setJsonFormatError(translations.processing);
      
      // 复制到剪贴板
      navigator.clipboard.writeText(formattedJson)
        .then(() => {
          console.log('键值对格式转换成功并已复制到剪贴板');
          // 剪贴板操作成功，但不显示消息，因为我们要关闭弹窗
        })
        .catch(err => {
          console.log('剪贴板复制失败，但转换已完成:', err);
        })
        .finally(() => {
          // 无论剪贴板操作成功与否，都发送转换后的JSON到内容脚本并打开抽屉
          // 先通过background.js发送消息（这样可以处理跨域问题）
          chrome.runtime.sendMessage(
            { 
              action: 'showJsonFromPopup',
              jsonString: formattedJson,
              version: version
            },
            (response) => {
              if (chrome.runtime.lastError) {
                console.log('Error sending message through background:', chrome.runtime.lastError);
                
                // 尝试直接发送到当前标签页
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                  if (tabs[0]?.id) {
                    chrome.tabs.sendMessage(
                      tabs[0].id,
                      { 
                        action: 'showJsonFromPopup',
                        jsonString: formattedJson,
                        version: version
                      },
                      (tabResponse) => {
                        if (chrome.runtime.lastError) {
                          console.log('Error sending JSON directly to tab:', chrome.runtime.lastError);
                          // 所有尝试都失败，打开新标签页显示JSON
                          openJsonInNewTab(formattedJson);
                        } else {
                          console.log('Message sent successfully to tab:', tabResponse);
                          // 关闭弹出窗口
                          window.close();
                        }
                      }
                    );
                  } else {
                    // 如果没有活动标签页，打开新标签页显示JSON
                    openJsonInNewTab(formattedJson);
                  }
                });
              } else {
                console.log('Message sent successfully through background:', response);
                // 关闭弹出窗口
                window.close();
              }
            }
          );
        });
    } catch (error) {
      setJsonFormatError(`${translations.convertError}${(error as Error).message}`);
    }
  };

  return (
    <div className="popup">
      <div className="header">
        <h1>{translations.appName}</h1>
        <div className="version">{translations.version}{version}</div>
      </div>
      
      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'json-input' ? 'active' : ''}`}
          onClick={() => setActiveTab('json-input')}
        >
          {translations.jsonFormat}
        </button>
        <button 
          className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          {translations.settingsTab}
        </button>
      </div>
      
      <div className="content">
        {activeTab === 'settings' ? (
          <>
            <div className="section">
              <h2>{translations.settingsHeading}</h2>
              <div className="settings-compact">
                <label className="language-select-label">
                  {translations.hoverDetection}:
                  <select 
                    className="language-select"
                    value={jsonHoverEnabled ? 'enabled' : 'disabled'}
                    onChange={handleHoverDetectionChange}
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
                    onChange={handleLanguageChange}
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
                    onChange={handleDisplayModeChange}
                  >
                    <option value="drawer">{translations.jsonDisplayModeDrawer}</option>
                    <option value="window">{translations.jsonDisplayModeWindow}</option>
                  </select>
                </label>

                <div className="settings-actions">
                  <button className="button" onClick={openShortcutsPage} aria-label="Open Chrome shortcuts settings">
                    {translations.configureShortcuts}
                  </button>
                </div>
              </div>
            </div>

          </>
        ) : (
          <div className="json-input-section">
            <div className="json-input-container">
              <textarea
                className="json-textarea"
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
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
                <button className="json-button format" onClick={formatJsonInput}>
                  {translations.formatAndView}
                </button>
                <button className="json-button convert" onClick={convertJsonDates}>
                  {translations.formatAndConvert}
                </button>
                <button className="json-button clear" onClick={clearJsonInput}>
                  {translations.clear}
                </button>
              </div>
              <div className="action-row">
                <button className="json-button minify" onClick={minifyJson}>
                  {translations.minifyJson}
                </button>
                <button className="json-button escape" onClick={escapeJsonString}>
                  {translations.escapeString}
                </button>
                <button className="json-button unescape" onClick={unescapeJsonString}>
                  {translations.unescapeString}
                </button>
              </div>
              <div className="action-row">
                <button className="json-button convert-kv" onClick={convertKeyValueToJson}>
                  {translations.convertKeyValue}
                </button>
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
        )}
      </div>
      
      <div className="footer">
        <div>{translations.appName}</div>
        <div className="github-link">
          <a 
            href="https://github.com/linxinyuelan-beep/chrome_json_viewer" 
            target="_blank" 
            rel="noopener noreferrer"
            title="View source code on GitHub"
          >
            GitHub
          </a>
        </div>
      </div>
    </div>
  );
};

const container = document.getElementById('app');
ReactDOM.render(<App />, container);