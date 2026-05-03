import { DETECTION_UI } from '../config/uiConstants';
import {
  ensureJsonDrawerMounted,
  getOrCreateJsonDrawer,
} from '../drawer/drawerHost';

export interface ContentLifecycleOptions {
  getExtensionEnabledOnCurrentSite: () => boolean;
  getHoverDetectionEnabled: () => boolean;
  getAutoDetectionTemporarilyEnabled: () => boolean;
  enableHoverDetectionFeature: () => void;
}

// 初始化JSON格式化功能
function initializeJsonFormatter(options: ContentLifecycleOptions): void {
  // 如果插件在当前网站上被禁用，不初始化
  if (!options.getExtensionEnabledOnCurrentSite()) {
    return;
  }

  console.log('Initializing JSON formatter...');

  // 创建抽屉元素以便随时使用
  const drawer = getOrCreateJsonDrawer();
  ensureJsonDrawerMounted(drawer);
}

export function registerContentLifecycle(options: ContentLifecycleOptions): void {
  // 在DOMContentLoaded事件中初始化基本功能
  document.addEventListener('DOMContentLoaded', () => {
    initializeJsonFormatter(options);
  });

  window.addEventListener('load', () => {
    // 如果插件在当前网站上被禁用，不执行任何操作
    if (!options.getExtensionEnabledOnCurrentSite()) {
      return;
    }

    // 等待页面完全加载后再初始化JSON检测
    setTimeout(() => {
      // 添加悬停检测功能
      // 如果设置中启用了悬停检测，或者临时启用了检测，则启用
      if (options.getHoverDetectionEnabled() || options.getAutoDetectionTemporarilyEnabled()) {
        options.enableHoverDetectionFeature();
      }
    }, DETECTION_UI.LOAD_INIT_DELAY_MS);
  });
}
