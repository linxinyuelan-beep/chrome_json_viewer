import { STORAGE_KEYS } from '../config/storageKeys';
import { getSiteFilterConfig, shouldEnableOnSite } from '../utils/siteFilter';

export interface ContentSettings {
  extensionEnabledOnCurrentSite: boolean;
  hoverDetectionEnabled: boolean;
}

// 初始化时加载设置
export async function loadContentSettings(extensionVersion: string): Promise<ContentSettings> {
  // 检查网站过滤设置
  const filterConfig = await getSiteFilterConfig();
  const currentUrl = window.location.href;
  const extensionEnabledOnCurrentSite = shouldEnableOnSite(currentUrl, filterConfig);

  // 如果在当前网站上禁用，直接返回，不加载其他设置
  if (!extensionEnabledOnCurrentSite) {
    console.log(`%c🚫 JSON Detector v${extensionVersion}: Disabled on this site`,
      'background: #f44336; color: white; padding: 2px 6px; border-radius: 2px;');
    return {
      extensionEnabledOnCurrentSite,
      hoverDetectionEnabled: true,
    };
  }

  // 加载悬停检测设置
  const result = await chrome.storage.local.get(STORAGE_KEYS.HOVER_DETECTION_ENABLED);
  const hoverDetectionEnabled = result[STORAGE_KEYS.HOVER_DETECTION_ENABLED] !== undefined
    ? result[STORAGE_KEYS.HOVER_DETECTION_ENABLED]
    : true;

  return {
    extensionEnabledOnCurrentSite,
    hoverDetectionEnabled,
  };
}
