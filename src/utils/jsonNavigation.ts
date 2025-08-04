/**
 * JSON Navigation History management
 * Handles navigation between previously viewed JSON data (like browser history)
 */

// 导航历史记录类型
export interface NavigationHistoryState {
  currentIndex: number; // 当前位置索引
  history: string[]; // JSON字符串历史记录
}

// 默认空状态
const defaultState: NavigationHistoryState = {
  currentIndex: -1,
  history: []
};

// 全局导航状态
let navigationState: NavigationHistoryState = { ...defaultState };

/**
 * 添加一个新的JSON到导航历史
 * @param jsonString JSON字符串
 */
export function addToNavigationHistory(jsonString: string): void {
  // 如果与当前查看的相同，不重复添加
  if (navigationState.currentIndex >= 0 && 
      navigationState.history[navigationState.currentIndex] === jsonString) {
    return;
  }
  
  // 如果用户已经后退，然后查看了新的JSON，需要删除前进历史
  if (navigationState.currentIndex >= 0 && 
      navigationState.currentIndex < navigationState.history.length - 1) {
    navigationState.history = navigationState.history.slice(0, navigationState.currentIndex + 1);
  }
  
  // 添加到历史
  navigationState.history.push(jsonString);
  navigationState.currentIndex = navigationState.history.length - 1;
  
  // 限制历史大小，防止过度消耗内存
  if (navigationState.history.length > 50) {
    const excessItems = navigationState.history.length - 50;
    navigationState.history = navigationState.history.slice(excessItems);
    navigationState.currentIndex -= excessItems;
  }
  
  // 更新按钮状态
  updateNavigationButtonsState();
  
}

/**
 * 导航到上一个JSON (后退)
 * @returns 上一个JSON字符串或null
 */
export function navigateBack(): string | null {
  if (navigationState.currentIndex <= 0) {
    return null;
  }
  
  navigationState.currentIndex--;
  const jsonString = navigationState.history[navigationState.currentIndex];
  
  // 更新按钮状态
  updateNavigationButtonsState();
  
  console.log(`Navigated back to position ${navigationState.currentIndex + 1}/${navigationState.history.length}`);
  return jsonString;
}

/**
 * 导航到下一个JSON (前进)
 * @returns 下一个JSON字符串或null
 */
export function navigateForward(): string | null {
  if (navigationState.currentIndex >= navigationState.history.length - 1) {
    return null;
  }
  
  navigationState.currentIndex++;
  const jsonString = navigationState.history[navigationState.currentIndex];
  
  // 更新按钮状态
  updateNavigationButtonsState();
  
  console.log(`Navigated forward to position ${navigationState.currentIndex + 1}/${navigationState.history.length}`);
  return jsonString;
}

/**
 * 获取当前导航状态
 */
export function getNavigationState(): NavigationHistoryState {
  return { ...navigationState };
}

/**
 * 重置导航历史
 */
export function resetNavigationHistory(): void {
  navigationState = { ...defaultState };
  updateNavigationButtonsState();
}

/**
 * 检查是否可以后退
 */
export function canNavigateBack(): boolean {
  return navigationState.currentIndex > 0;
}

/**
 * 检查是否可以前进
 */
export function canNavigateForward(): boolean {
  return navigationState.currentIndex < navigationState.history.length - 1;
}

/**
 * 更新导航按钮状态（禁用/启用）
 * 通过添加自定义事件通知JsonViewer组件
 */
function updateNavigationButtonsState(): void {
  // 创建自定义事件
  const event = new CustomEvent('json-navigation-updated', {
    detail: {
      canGoBack: canNavigateBack(),
      canGoForward: canNavigateForward(),
      position: navigationState.currentIndex + 1,
      total: navigationState.history.length
    }
  });
  
  // 触发事件
  document.dispatchEvent(event);
}
