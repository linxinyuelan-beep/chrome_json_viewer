// Language configuration for the JSON Formatter & Viewer Extension

// Define language codes
export type LanguageCode = 'en' | 'zh';

// Default language
export const DEFAULT_LANGUAGE: LanguageCode = 'en';

// Interface for translations
export interface Translations {
  // General UI
  appName: string;
  settings: string;
  version: string;

  // Tabs
  jsonFormat: string;
  settingsTab: string;

  // JSON Input section
  pasteJsonHere: string;
  formatAndView: string;
  formatAndConvert: string;
  clear: string;
  minifyJson: string;
  escapeString: string;
  unescapeString: string;
  convertKeyValue: string;
  jsonInputHelp1: string;
  jsonInputHelp2: string;
  jsonInputHelp3: string;
  jsonInputHelp4: string;

  // Settings section
  keyboardShortcuts: string;
  formatSelectedJson: string;
  toggleHoverDetection: string;
  configureShortcuts: string;
  howToUse: string;
  hoverOverJson: string;
  doubleClickJson: string;
  rightClickMenu: string;
  useKeyboardShortcuts: string;
  settingsHeading: string;
  hoverDetection: string;
  language: string;
  jsonDisplayMode: string;
  jsonDisplayModeDrawer: string;
  jsonDisplayModeWindow: string;

  // Messages
  enterJsonText: string;
  invalidJsonFormat: string;
  processing: string;
  jsonMinified: string;
  jsonMinifiedAndCopied: string;
  noJsonToConvert: string;
  textEscaped: string;
  textEscapedAndCopied: string;
  enterTextToEscape: string;
  escapeError: string;
  textUnescaped: string;
  textUnescapedAndCopied: string;
  enterTextToUnescape: string;
  unescapeError: string;
  keyValueConverted: string;
  keyValueConvertedAndCopied: string;
  enterTextToConvert: string;
  convertError: string;
  statusEnabled: string;
  statusDisabled: string;
  jsonExtracted: string;
  disableAutoDetection: string;
  enableAutoDetection: string;
  autoDetectionDisabled: string;
  autoDetectionEnabled: string;
  autoDetectionWillResumeOnRefresh: string;
}

// Language definitions
export const translations: Record<LanguageCode, Translations> = {
  en: {
    // General UI
    appName: 'JSON Formatter & Viewer',
    settings: 'Settings',
    version: 'v',

    // Tabs
    jsonFormat: 'JSON Format',
    settingsTab: 'Settings',

    // JSON Input section
    pasteJsonHere: 'Paste JSON text here...',
    formatAndView: 'Format & View',
    formatAndConvert: 'Format & Convert',
    clear: 'Clear',
    minifyJson: 'Minify JSON',
    escapeString: 'Escape String',
    unescapeString: 'Unescape String',
    convertKeyValue: 'Convert Key-Value',
    jsonInputHelp1: 'Paste JSON text above and click "Format & View" to display formatted JSON',
    jsonInputHelp2: 'Click "Format & Convert" to convert special date format /Date(timestamp)/ to readable dates',
    jsonInputHelp3: '"Minify JSON" compresses JSON to a single line, "Escape String" and "Unescape String" handle special characters',
    jsonInputHelp4: '"Convert Key-Value" converts semicolon-separated key-value format (key1=value1,key2=value2;key3=value3,key4=value4) to JSON array',

    // Settings section
    keyboardShortcuts: 'Keyboard Shortcuts',
    formatSelectedJson: 'Format selected JSON',
    toggleHoverDetection: 'Toggle hover detection',
    configureShortcuts: 'Configure Shortcuts',
    howToUse: 'How to Use',
    hoverOverJson: 'Hover over text that might contain JSON',
    doubleClickJson: 'Double click detected JSON to view formatted',
    rightClickMenu: 'Right click and select "Format JSON" menu item',
    useKeyboardShortcuts: 'Use keyboard shortcuts with selected JSON text',
    settingsHeading: 'Settings',
    hoverDetection: 'Hover Detection',
    language: 'Language',
    jsonDisplayMode: 'Display Mode',
    jsonDisplayModeDrawer: 'Drawer',
    jsonDisplayModeWindow: 'New Window',

    // Messages
    enterJsonText: 'Please enter JSON text',
    invalidJsonFormat: 'Invalid JSON format',
    processing: 'Processing...',
    jsonMinified: 'JSON minified',
    jsonMinifiedAndCopied: 'JSON minified and copied to clipboard',
    noJsonToConvert: 'No JSON to convert',
    textEscaped: 'Text escaped',
    textEscapedAndCopied: 'Text escaped and copied to clipboard',
    enterTextToEscape: 'Please enter text to escape',
    escapeError: 'Escape error: ',
    textUnescaped: 'Text unescaped',
    textUnescapedAndCopied: 'Text unescaped and copied to clipboard',
    enterTextToUnescape: 'Please enter text to unescape',
    unescapeError: 'Unescape error: ',
    keyValueConverted: 'Key-value format converted to JSON',
    keyValueConvertedAndCopied: 'Key-value format converted to JSON and copied to clipboard',
    enterTextToConvert: 'Please enter key-value text to convert',
    convertError: 'Convert error: ',
    statusEnabled: 'Enabled',
    statusDisabled: 'Disabled',
    jsonExtracted: 'JSON content extracted and formatted',
    disableAutoDetection: 'Disable Auto-Detection (Until Refresh)',
    enableAutoDetection: 'Enable Auto-Detection (Until Refresh)',
    autoDetectionDisabled: 'Auto-detection disabled',
    autoDetectionEnabled: 'Auto-detection enabled',
    autoDetectionWillResumeOnRefresh: 'Auto-detection will resume on page refresh',
  },
  zh: {
    // General UI
    appName: 'JSON 格式化与查看器',
    settings: '设置',
    version: 'v',

    // Tabs
    jsonFormat: 'JSON格式化',
    settingsTab: '设置',

    // JSON Input section
    pasteJsonHere: '在此粘贴JSON文本...',
    formatAndView: '格式化并查看',
    formatAndConvert: '格式化并转换',
    clear: '清空',
    minifyJson: 'JSON压缩',
    escapeString: '转义字符串',
    unescapeString: '反转义字符串',
    convertKeyValue: '转换键值对',
    jsonInputHelp1: '将JSON文本粘贴在上方，然后点击"格式化并查看"以显示格式化后的JSON',
    jsonInputHelp2: '点击"格式化并转换"可将特殊日期格式 /Date(timestamp)/ 转换为可读日期并显示',
    jsonInputHelp3: '点击\"JSON压缩\"可将JSON压缩为单行，\"转义字符串\"和\"反转义字符串\"用于处理特殊字符',
    jsonInputHelp4: '"转换键值对"可将分号分隔的键值对格式 (key1=value1,key2=value2;key3=value3,key4=value4) 转换为JSON数组',

    // Settings section
    keyboardShortcuts: '键盘快捷键',
    formatSelectedJson: '格式化选中的JSON',
    toggleHoverDetection: '切换悬停检测',
    configureShortcuts: '设置快捷键',
    howToUse: '使用方式',
    hoverOverJson: '将鼠标悬停在可能包含JSON的文本上',
    doubleClickJson: '双击检测到的JSON以查看格式化视图',
    rightClickMenu: '右键点击并选择\"格式化 JSON\"菜单项',
    useKeyboardShortcuts: '选择JSON文本后使用键盘快捷键',
    settingsHeading: '设置',
    hoverDetection: '悬停检测',
    language: '语言',
    jsonDisplayMode: 'JSON显示方式',
    jsonDisplayModeDrawer: '在抽屉中显示',
    jsonDisplayModeWindow: '在新弹出窗口中打开',

    // Messages
    enterJsonText: '请输入JSON文本',
    invalidJsonFormat: '无效的JSON格式',
    processing: '正在处理中...',
    jsonMinified: 'JSON已压缩',
    jsonMinifiedAndCopied: 'JSON已压缩并复制到剪贴板',
    noJsonToConvert: '没有JSON可转换',
    textEscaped: '文本已转义',
    textEscapedAndCopied: '文本已转义并复制到剪贴板',
    enterTextToEscape: '请输入需要转义的文本',
    escapeError: '转义出错：',
    textUnescaped: '文本已反转义',
    textUnescapedAndCopied: '文本已反转义并复制到剪贴板',
    enterTextToUnescape: '请输入需要反转义的文本',
    unescapeError: '反转义出错：',
    keyValueConverted: '键值对格式已转换为JSON',
    keyValueConvertedAndCopied: '键值对格式已转换为JSON并复制到剪贴板',
    enterTextToConvert: '请输入需要转换的键值对文本',
    convertError: '转换出错：',
    statusEnabled: '已启用',
    statusDisabled: '已禁用',
    jsonExtracted: 'JSON内容已提取并格式化',
    disableAutoDetection: '临时关闭自动检测（直到刷新页面）',
    enableAutoDetection: '临时开启自动检测（直到刷新页面）',
    autoDetectionDisabled: '自动检测已关闭',
    autoDetectionEnabled: '自动检测已开启',
    autoDetectionWillResumeOnRefresh: '刷新页面后将恢复自动检测',
  },
};

// Function to get translations
export function getTranslations(lang: LanguageCode): Translations {
  return translations[lang] || translations[DEFAULT_LANGUAGE];
}

// Language options for dropdown
export const languageOptions = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
];

// Function to get stored language or default
export async function getCurrentLanguage(): Promise<LanguageCode> {
  return new Promise((resolve) => {
    chrome.storage.local.get('language', (result) => {
      resolve((result.language as LanguageCode) || DEFAULT_LANGUAGE);
    });
  });
}

// Function to save selected language
export async function saveLanguage(lang: LanguageCode): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ language: lang }, () => {
      resolve();
    });
  });
}