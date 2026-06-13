// Language configuration for the JSON Formatter & Viewer Extension
import { STORAGE_KEYS } from '../config/storageKeys';

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
  defaultViewerMode: string;
  viewerModeTreeView: string;
  viewerModeEditor: string;
  themeMode: string;
  themeModeSystem: string;
  themeModeLight: string;
  themeModeDark: string;

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

  // Site filter (blacklist/whitelist)
  siteFilterTab: string;
  siteFilterHeading: string;
  filterMode: string;
  filterModeDisabled: string;
  filterModeBlacklist: string;
  filterModeWhitelist: string;
  filterModeDisabledDesc: string;
  filterModeBlacklistDesc: string;
  filterModeWhitelistDesc: string;
  siteList: string;
  addSite: string;
  addCurrentSite: string;
  enterSitePattern: string;
  sitePatternPlaceholder: string;
  sitePatternHelp: string;
  currentSite: string;
  remove: string;
  noSitesAdded: string;
  refreshPageToApply: string;

  // JSON viewer / drawer
  loading: string;
  sizeLabel: string;
  backToPreviousJson: string;
  forwardToNextJson: string;
  copyPathToClipboard: string;
  collapseAll: string;
  expandAll: string;
  switchBetweenTreeAndEditor: string;
  switchToEditor: string;
  switchToTree: string;
  sortJsonKeysAlphabetically: string;
  unsortKeys: string;
  sortKeys: string;
  copied: string;
  copyJson: string;
  openJsonInNewWindow: string;
  newWindow: string;
  compareWithAnotherJson: string;
  compare: string;
  viewHistory: string;
  history: string;
  recentJson: string;
  viewAll: string;
  noHistoryFound: string;
  jsonHistory: string;
  closeHistory: string;
  loadingHistory: string;
  areYouSure: string;
  yesClearAll: string;
  cancel: string;
  clearHistory: string;
  deleteFromHistory: string;
  jsonViewerTitle: string;
  noJsonDataProvided: string;
  failedToCopyJsonToClipboard: string;
  failedToCopyPath: string;
  errorGettingPath: string;
  unknownError: string;

  // JSON compare page
  jsonCompareTitle: string;
  sourceJsonLabel: string;
  targetJsonLabel: string;
  swapLeftRight: string;
  smartMerge: string;
  exportDiffReport: string;
  exportPatch: string;
  leftJsonLabelPlaceholder: string;
  rightJsonLabelPlaceholder: string;
  charsUnit: string;
  linesUnit: string;
  format: string;
  sortKeysLong: string;
  removeEmpty: string;
  convertDates: string;
  pasteLeftJsonHere: string;
  pasteRightJsonHere: string;
  differences: string;
  prevDiff: string;
  nextDiff: string;
  showOnlyDiffs: string;
  showSidebar: string;
  addedLabel: string;
  deletedLabel: string;
  modifiedLabel: string;
  jsonParseError: string;
  mergedJsonTitle: string;
  mergedJsonResult: string;
  copyToClipboard: string;
  deletedValueLabel: string;
  addedValueLabel: string;
  beforeValueLabel: string;
  afterValueLabel: string;
  compareViewMode: string;
  compareEditMode: string;
  switchToViewMode: string;
  switchToEditMode: string;
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
    defaultViewerMode: 'Default Viewer Mode',
    viewerModeTreeView: 'Tree View',
    viewerModeEditor: 'Editor',
    themeMode: 'Theme',
    themeModeSystem: 'Follow System',
    themeModeLight: 'Light',
    themeModeDark: 'Dark',

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

    // Site filter (blacklist/whitelist)
    siteFilterTab: 'Site Filter',
    siteFilterHeading: 'Site Filter Settings',
    filterMode: 'Filter Mode',
    filterModeDisabled: 'Disabled',
    filterModeBlacklist: 'Blacklist',
    filterModeWhitelist: 'Whitelist',
    filterModeDisabledDesc: 'Extension is enabled on all websites',
    filterModeBlacklistDesc: 'Extension is disabled on listed websites',
    filterModeWhitelistDesc: 'Extension is enabled only on listed websites',
    siteList: 'Site List',
    addSite: 'Add Site',
    addCurrentSite: 'Add Current Site',
    enterSitePattern: 'Enter site pattern',
    sitePatternPlaceholder: 'e.g., example.com or *.example.com',
    sitePatternHelp: 'Supports wildcards (*). Examples: example.com, *.example.com, *example*',
    currentSite: 'Current Site',
    remove: 'Remove',
    noSitesAdded: 'No sites added yet',
    refreshPageToApply: 'Note: Refresh the page to apply filter changes',

    // JSON viewer / drawer
    loading: 'Loading...',
    sizeLabel: 'Size',
    backToPreviousJson: 'Back to previous JSON',
    forwardToNextJson: 'Forward to next JSON',
    copyPathToClipboard: 'Copy path to clipboard',
    collapseAll: 'Collapse',
    expandAll: 'Expand',
    switchBetweenTreeAndEditor: 'Switch between Tree View and Editor View',
    switchToEditor: 'Switch',
    switchToTree: 'Switch',
    sortJsonKeysAlphabetically: 'Sort JSON keys alphabetically',
    unsortKeys: 'Unsort',
    sortKeys: 'Sort',
    copied: 'Copied',
    copyJson: 'Copy',
    openJsonInNewWindow: 'Open JSON in new window',
    newWindow: 'NewWin',
    compareWithAnotherJson: 'Compare with another JSON',
    compare: 'Compare',
    viewHistory: 'View history',
    history: 'History',
    recentJson: 'Recent JSON',
    viewAll: 'View All',
    noHistoryFound: 'No history found',
    jsonHistory: 'JSON History',
    closeHistory: 'Close history',
    loadingHistory: 'Loading history...',
    areYouSure: 'Are you sure?',
    yesClearAll: 'Yes, clear all',
    cancel: 'Cancel',
    clearHistory: 'Clear History',
    deleteFromHistory: 'Delete from history',
    jsonViewerTitle: 'JSON Viewer',
    noJsonDataProvided: 'No JSON data provided',
    failedToCopyJsonToClipboard: 'Failed to copy JSON to clipboard',
    failedToCopyPath: 'Failed to copy path',
    errorGettingPath: 'Error getting path',
    unknownError: 'Unknown error',

    // JSON compare page
    jsonCompareTitle: 'JSON Compare',
    sourceJsonLabel: 'Source JSON',
    targetJsonLabel: 'Target JSON',
    swapLeftRight: 'Swap Left and Right',
    smartMerge: 'Smart Merge',
    exportDiffReport: 'Export Diff Report',
    exportPatch: 'Export Patch',
    leftJsonLabelPlaceholder: 'Left JSON Label',
    rightJsonLabelPlaceholder: 'Right JSON Label',
    charsUnit: 'chars',
    linesUnit: 'lines',
    format: 'Format',
    sortKeysLong: 'Sort Keys',
    removeEmpty: 'Remove Empty',
    convertDates: 'Convert Dates',
    pasteLeftJsonHere: 'Paste left JSON here...',
    pasteRightJsonHere: 'Paste right JSON here...',
    differences: 'Differences',
    prevDiff: 'Prev Diff',
    nextDiff: 'Next Diff',
    showOnlyDiffs: 'Show Only Diffs',
    showSidebar: 'Show Sidebar',
    addedLabel: 'Added',
    deletedLabel: 'Deleted',
    modifiedLabel: 'Modified',
    jsonParseError: 'JSON parse error',
    mergedJsonTitle: 'Merged JSON',
    mergedJsonResult: 'Merged JSON Result',
    copyToClipboard: 'Copy to Clipboard',
    deletedValueLabel: 'Deleted',
    addedValueLabel: 'Added',
    beforeValueLabel: 'Before',
    afterValueLabel: 'After',
    compareViewMode: 'View',
    compareEditMode: 'Edit',
    switchToViewMode: 'Switch to View Mode',
    switchToEditMode: 'Switch to Edit Mode',
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
    minifyJson: '压缩',
    escapeString: '转义字符串',
    unescapeString: '反转义字符串',
    convertKeyValue: '转换键值对',
    jsonInputHelp1: '将JSON文本粘贴在上方，然后点击"格式化并查看"以显示格式化后的JSON',
    jsonInputHelp2: '点击"格式化并转换"可将特殊日期格式 /Date(timestamp)/ 转换为可读日期并显示',
    jsonInputHelp3: '点击\"压缩\"可将JSON压缩为单行，\"转义字符串\"和\"反转义字符串\"用于处理特殊字符',
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
    defaultViewerMode: '默认查看器模式',
    viewerModeTreeView: '树形视图',
    viewerModeEditor: '编辑器视图',
    themeMode: '主题',
    themeModeSystem: '跟随系统',
    themeModeLight: '浅色',
    themeModeDark: '深色',

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

    // Site filter (blacklist/whitelist)
    siteFilterTab: '网站过滤',
    siteFilterHeading: '网站过滤设置',
    filterMode: '过滤模式',
    filterModeDisabled: '已禁用',
    filterModeBlacklist: '黑名单模式',
    filterModeWhitelist: '白名单模式',
    filterModeDisabledDesc: '插件在所有网站上启用',
    filterModeBlacklistDesc: '插件在列表中的网站上禁用',
    filterModeWhitelistDesc: '插件仅在列表中的网站上启用',
    siteList: '网站列表',
    addSite: '添加网站',
    addCurrentSite: '添加当前网站',
    enterSitePattern: '输入网站模式',
    sitePatternPlaceholder: '例如：example.com 或 *.example.com',
    sitePatternHelp: '支持通配符 (*)。示例：example.com、*.example.com、*example*',
    currentSite: '当前网站',
    remove: '移除',
    noSitesAdded: '还没有添加任何网站',
    refreshPageToApply: '注意：需要刷新页面才能应用过滤设置的更改',

    // JSON viewer / drawer
    loading: '加载中...',
    sizeLabel: '大小',
    backToPreviousJson: '返回上一个 JSON',
    forwardToNextJson: '前进到下一个 JSON',
    copyPathToClipboard: '复制路径到剪贴板',
    collapseAll: '折叠',
    expandAll: '展开',
    switchBetweenTreeAndEditor: '在树形视图和编辑器视图之间切换',
    switchToEditor: '切换',
    switchToTree: '切换',
    sortJsonKeysAlphabetically: '按字母顺序排序 JSON 键',
    unsortKeys: '排序',
    sortKeys: '排序',
    copied: '已复制',
    copyJson: '复制',
    openJsonInNewWindow: '在新窗口中打开 JSON',
    newWindow: '新窗口',
    compareWithAnotherJson: '与另一个 JSON 对比',
    compare: '对比',
    viewHistory: '查看历史',
    history: '历史',
    recentJson: '最近 JSON',
    viewAll: '查看全部',
    noHistoryFound: '暂无历史记录',
    jsonHistory: 'JSON 历史',
    closeHistory: '关闭历史',
    loadingHistory: '正在加载历史...',
    areYouSure: '确定吗？',
    yesClearAll: '是的，清空全部',
    cancel: '取消',
    clearHistory: '清空历史',
    deleteFromHistory: '从历史中删除',
    jsonViewerTitle: 'JSON 查看器',
    noJsonDataProvided: '未提供 JSON 数据',
    failedToCopyJsonToClipboard: '复制 JSON 到剪贴板失败',
    failedToCopyPath: '复制路径失败',
    errorGettingPath: '获取路径失败',
    unknownError: '未知错误',

    // JSON compare page
    jsonCompareTitle: 'JSON 对比',
    sourceJsonLabel: '源 JSON',
    targetJsonLabel: '目标 JSON',
    swapLeftRight: '交换左右',
    smartMerge: '智能合并',
    exportDiffReport: '导出差异报告',
    exportPatch: '导出补丁',
    leftJsonLabelPlaceholder: '左侧 JSON 标签',
    rightJsonLabelPlaceholder: '右侧 JSON 标签',
    charsUnit: '字符',
    linesUnit: '行',
    format: '格式化',
    sortKeysLong: '排序键',
    removeEmpty: '移除空值',
    convertDates: '转换日期',
    pasteLeftJsonHere: '在此粘贴左侧 JSON...',
    pasteRightJsonHere: '在此粘贴右侧 JSON...',
    differences: '差异',
    prevDiff: '上一个差异',
    nextDiff: '下一个差异',
    showOnlyDiffs: '仅显示差异',
    showSidebar: '显示侧栏',
    addedLabel: '新增',
    deletedLabel: '删除',
    modifiedLabel: '修改',
    jsonParseError: 'JSON 解析错误',
    mergedJsonTitle: '合并后的 JSON',
    mergedJsonResult: '合并结果',
    copyToClipboard: '复制到剪贴板',
    deletedValueLabel: '删除',
    addedValueLabel: '新增',
    beforeValueLabel: '变更前',
    afterValueLabel: '变更后',
    compareViewMode: '查看',
    compareEditMode: '编辑',
    switchToViewMode: '切换到查看模式',
    switchToEditMode: '切换到编辑模式',
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

// Treat Simplified Chinese locales as zh, fallback all others to en.
export function detectLanguageByLocale(locale?: string): LanguageCode {
  const normalizedLocale = (locale || '').toLowerCase();
  const isSimplifiedChinese =
    normalizedLocale === 'zh-cn' ||
    normalizedLocale === 'zh-sg' ||
    normalizedLocale.startsWith('zh-hans');

  return isSimplifiedChinese ? 'zh' : 'en';
}

// Function to get stored language or default
export async function getCurrentLanguage(): Promise<LanguageCode> {
  return new Promise((resolve) => {
    chrome.storage.local.get(STORAGE_KEYS.LANGUAGE, (result) => {
      const storedLanguage = result[STORAGE_KEYS.LANGUAGE] as LanguageCode | undefined;
      if (storedLanguage) {
        resolve(storedLanguage);
        return;
      }

      const detectedLanguage = detectLanguageByLocale(navigator.language) || DEFAULT_LANGUAGE;
      chrome.storage.local.set({ [STORAGE_KEYS.LANGUAGE]: detectedLanguage }, () => {
        resolve(detectedLanguage);
      });
    });
  });
}

// Function to save selected language
export async function saveLanguage(lang: LanguageCode): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEYS.LANGUAGE]: lang }, () => {
      resolve();
    });
  });
}
