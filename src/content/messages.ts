import { MESSAGE_ACTIONS } from '../config/messageActions';
import { STORAGE_KEYS } from '../config/storageKeys';
import { getCurrentLanguage, getTranslations } from '../utils/i18n';
import { isValidNestedJson } from '../utils/nestedJsonHandler';
import { showNotification } from './notification';

export interface ContentMessageHandlerOptions {
  getHoverDetectionEnabled: () => boolean;
  setHoverDetectionEnabled: (enabled: boolean) => void;
  getAutoDetectionTemporarilyEnabled: () => boolean;
  getAutoDetectionTemporarilyDisabled: () => boolean;
  setAutoDetectionTemporarilyEnabled: (enabled: boolean) => void;
  setAutoDetectionTemporarilyDisabled: (disabled: boolean) => void;
  enableHoverDetectionFeature: () => void;
  showJsonInDrawer: (jsonString: string) => Promise<void>;
}

// 监听来自背景脚本的消息
export function registerContentMessageHandler(options: ContentMessageHandlerOptions): void {
  chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    const lang = await getCurrentLanguage();
    const i18n = getTranslations(lang);

    if (request.action === MESSAGE_ACTIONS.FORMAT_SELECTED_JSON && request.selectedText) {
      // 尝试格式化选中的 JSON
      if (isValidNestedJson(request.selectedText)) {
        options.showJsonInDrawer(request.selectedText)
          .then(() => {
            sendResponse({ success: true });
          })
          .catch((error) => {
            console.error('Error showing JSON in drawer:', error);
            sendResponse({ success: false, error: (error as Error).message });
          });
      } else {
        showNotification(i18n.invalidJsonFormat, 'error');
        sendResponse({ success: false, error: 'Invalid JSON format' });
      }
      return true; // 支持异步响应

    } else if (request.action === MESSAGE_ACTIONS.SET_HOVER_DETECTION) {
      // 设置悬停检测状态
      options.setHoverDetectionEnabled(request.enabled);
      const enableHoverDetection = options.getHoverDetectionEnabled();

      // 显示状态变化通知
      showNotification(
        `${i18n.hoverDetection}: ${enableHoverDetection ? i18n.statusEnabled : i18n.statusDisabled}`,
        enableHoverDetection ? 'success' : 'info'
      );

      // 如果启用悬停检测，刷新页面以应用更改
      if (enableHoverDetection) {
        location.reload();
      }

      sendResponse({ enabled: enableHoverDetection });
      return true; // 支持异步响应

    } else if (request.action === MESSAGE_ACTIONS.TOGGLE_HOVER_DETECTION) {
      // 保持兼容性，但现在也会保存到存储
      options.setHoverDetectionEnabled(!options.getHoverDetectionEnabled());
      const enableHoverDetection = options.getHoverDetectionEnabled();

      // 保存到存储
      chrome.storage.local.set({ [STORAGE_KEYS.HOVER_DETECTION_ENABLED]: enableHoverDetection });

      // 显示状态变化通知
      showNotification(
        `${i18n.hoverDetection}: ${enableHoverDetection ? i18n.statusEnabled : i18n.statusDisabled}`,
        enableHoverDetection ? 'success' : 'info'
      );

      // 刷新页面以应用更改（如果启用悬停检测）
      if (enableHoverDetection) {
        location.reload();
      }

      // 发送响应
      sendResponse({ enabled: enableHoverDetection });
      return true; // 支持异步响应

    } else if (request.action === MESSAGE_ACTIONS.GET_HOVER_DETECTION_STATE) {
      // 返回当前悬停检测状态
      sendResponse({ enabled: options.getHoverDetectionEnabled() });
      return true; // 支持异步响应

    } else if (request.action === MESSAGE_ACTIONS.SHOW_JSON_FROM_POPUP) {
      // 处理来自弹出窗口的JSON格式化请求
      console.log('Received showJsonFromPopup message with JSON length:', request.jsonString?.length);
      if (request.jsonString) {
        options.showJsonInDrawer(request.jsonString)
          .then(() => {
            console.log('JSON drawer should be displayed now');
            sendResponse({ success: true });
          })
          .catch((error) => {
            console.error('Error showing JSON in drawer:', error);
            sendResponse({ success: false, error: (error as Error).message });
          });
      } else {
        console.error('No JSON string provided in popup request');
        sendResponse({ success: false, error: 'No JSON string provided' });
      }
      return true; // 支持异步响应

    } else if (request.action === MESSAGE_ACTIONS.SHOW_JSON_IN_DRAWER) {
      // 处理来自background script的在抽屉中显示JSON的请求
      console.log('Received showJsonInDrawer message with JSON length:', request.jsonString?.length);
      if (request.jsonString) {
        options.showJsonInDrawer(request.jsonString)
          .then(() => {
            console.log('JSON drawer displayed successfully');
            sendResponse({ success: true });
          })
          .catch((error) => {
            console.error('Error showing JSON in drawer:', error);
            sendResponse({ success: false, error: (error as Error).message });
          });
      } else {
        console.error('No JSON string provided in showJsonInDrawer request');
        sendResponse({ success: false, error: 'No JSON string provided' });
      }
      return true; // 支持异步响应

    } else if (request.action === MESSAGE_ACTIONS.TOGGLE_AUTO_DETECTION_TEMPORARILY) {
      // 智能切换自动检测状态（临时开启或关闭，直到页面刷新）
      // 如果当前悬停检测已启用，则临时关闭；如果已禁用，则临时开启
      if (options.getHoverDetectionEnabled() && !options.getAutoDetectionTemporarilyEnabled()) {
        // 当前是开启状态（且不是临时启用的），临时关闭
        options.setAutoDetectionTemporarilyDisabled(true);
        options.setAutoDetectionTemporarilyEnabled(false);

        showNotification(
          `${i18n.autoDetectionDisabled}. ${i18n.autoDetectionWillResumeOnRefresh}`,
          'info'
        );
      } else {
        // 当前是关闭状态或临时启用状态，临时开启
        options.setAutoDetectionTemporarilyDisabled(false);
        options.setAutoDetectionTemporarilyEnabled(true);

        // 直接启用悬停检测功能，不需要刷新页面
        options.enableHoverDetectionFeature();

        showNotification(
          `${i18n.autoDetectionEnabled}. ${i18n.autoDetectionWillResumeOnRefresh}`,
          'success'
        );
      }

      sendResponse({ success: true, temporarilyDisabled: options.getAutoDetectionTemporarilyDisabled() });
      return true; // 支持异步响应
    }

    // 对于不识别的action，返回false表示不需要异步响应
    return false;
  });
}
