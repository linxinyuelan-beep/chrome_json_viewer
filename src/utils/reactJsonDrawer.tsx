// Integration helper for the content script with React JSON viewer
import ReactDOM from 'react-dom';
import React from 'react';
import JsonViewerComponent from '../components/JsonViewer';
import { parseJsonSafely } from './jsonParser';
import {
  closeJsonDrawer,
  ensureJsonDrawerMounted,
  getJsonDrawerContent,
  getOrCreateJsonDrawer,
  openJsonDrawer,
  setJsonDrawerOutsideClickHandler,
} from '../drawer/drawerHost';

// Store React root references for proper cleanup
const reactRoots = new Map<HTMLElement, any>();

// 用于检查元素是否属于JSON查看器的函数
function isJsonViewerElement(element: Element): boolean {
  // 检查常见的react-json-view类名和属性
  if (!element) return false;

  // 检查元素本身的类名
  if (element.classList && (
    element.classList.contains('react-json-view') ||
    element.classList.contains('json-viewer-component') ||
    element.classList.contains('json-tree-container') ||
    element.classList.contains('object-key-val') ||
    element.classList.contains('icon-container') ||
    element.classList.contains('object-container') ||
    element.classList.contains('variable-row') ||
    element.classList.contains('object-key') ||
    element.classList.contains('clicked') ||
    element.classList.contains('copy-icon') ||
    element.classList.contains('expanded-icon') ||
    element.classList.contains('collapsed-icon')
  )) {
    return true;
  }

  // 检查父元素，向上最多检查5层
  let parent = element.parentElement;
  let depth = 0;
  while (parent && depth < 5) {
    if (parent.classList && (
      parent.classList.contains('react-json-view') ||
      parent.classList.contains('json-viewer-component') ||
      parent.classList.contains('json-tree-container') ||
      parent.classList.contains('object-key-val') ||
      parent.classList.contains('object-container')
    )) {
      return true;
    }
    parent = parent.parentElement;
    depth++;
  }

  // 检查元素的属性，react-json-view组件通常有一些特定的数据属性
  if (element.hasAttribute('data-key-name') ||
    element.hasAttribute('data-object-name') ||
    element.hasAttribute('data-type')) {
    return true;
  }

  return false;
}

// Function to create and mount the JSON viewer React component in the drawer
export function mountJsonViewer(jsonData: any, container: HTMLElement, version: string, onClose: () => void): void {
  try {
    // Clean up any existing React root
    if (reactRoots.has(container)) {
      const existingRoot = reactRoots.get(container);
      if (existingRoot && existingRoot.unmount) {
        existingRoot.unmount();
      }
      reactRoots.delete(container);
    }

    // Ensure we have a clean container
    if (container.childNodes.length > 0) {
      console.warn('Container is not empty before mounting React component');
      container.innerHTML = '';
    }

    // Create a unique key for this render to force re-rendering
    const renderKey = Date.now().toString();

    // Check if createRoot is available (React 18+)
    if ('createRoot' in ReactDOM) {
      // Use React 18+ createRoot API
      const root = (ReactDOM as any).createRoot(container);
      reactRoots.set(container, root);

      root.render(
        React.createElement(JsonViewerComponent, {
          jsonData,
          version,
          onClose,
          key: renderKey
        })
      );
    } else {
      // Fallback to legacy ReactDOM.render for older React versions
      ReactDOM.render(
        React.createElement(JsonViewerComponent, {
          jsonData,
          version,
          onClose,
          key: renderKey
        }),
        container
      );
    }

  } catch (e) {
    console.error('Error mounting JSON viewer:', e);
    container.innerHTML = `
      <div style="color: #d32f2f; background-color: #ffebee; padding: 10px; border-radius: 4px; 
        border-left: 4px solid #d32f2f; margin: 10px 0;">
        Error rendering JSON: ${(e as Error).message}
      </div>
    `;
  }
}

// Helper function to safely unmount React component
function unmountReactComponent(container: HTMLElement): void {
  try {
    // Check if we have a React 18+ root stored
    if (reactRoots.has(container)) {
      const root = reactRoots.get(container);
      if (root && root.unmount) {
        root.unmount();
        reactRoots.delete(container);
        return;
      }
    }

    // Fallback: try legacy unmount (will only work if component was mounted with legacy render)
    if ('unmountComponentAtNode' in ReactDOM) {
      ReactDOM.unmountComponentAtNode(container);
    }
  } catch (e) {
    console.warn('Error during React component unmount:', e);
  } finally {
    // Always clear the container to ensure clean state
    container.innerHTML = '';
  }
}

// Show JSON in drawer with React component
export function showJsonInDrawerWithReact(jsonString: string, version: string): void {
  if (!jsonString) return;

  try {
    // 使用增强的 JSON 解析器处理大整数精度问题
    const jsonData = parseJsonSafely(jsonString);

    // Get or create drawer
    const drawer = getOrCreateJsonDrawer();
    ensureJsonDrawerMounted(drawer);

    // Get drawer content container
    const drawerContent = getJsonDrawerContent(drawer);
    if (!drawerContent) return;

    // Clear previous content and create a fresh container for React
    drawerContent.innerHTML = '';
    const reactRoot = document.createElement('div');
    reactRoot.className = 'json-viewer-react-root';

    // 为React根元素添加事件拦截器，阻止点击事件冒泡
    reactRoot.addEventListener('click', (event) => {
      // 阻止事件冒泡到文档
      event.stopPropagation();
    });

    drawerContent.appendChild(reactRoot);

    const onClose = () => {
      const drawerContent = drawer.querySelector('.json-drawer-content');
      if (drawerContent) {
        const reactRoot = drawerContent.querySelector('.json-viewer-react-root') as HTMLElement;
        if (reactRoot) {
          unmountReactComponent(reactRoot);
        }
      }
      closeJsonDrawer(drawer);
    };

    // Mount React component in drawer
    mountJsonViewer(jsonData, reactRoot, version, onClose);

    // Open drawer
    openJsonDrawer(drawer);

    // 添加标记以帮助识别抽屉是由哪次显示创建的
    drawer.dataset.openedAt = Date.now().toString();

    // Add the function to the window object so it can be called from the JsonViewer component
    window.showJsonInDrawerWithReact = showJsonInDrawerWithReact;

    setJsonDrawerOutsideClickHandler(drawer, (event: MouseEvent) => {
      const target = event.target as Element;

      // 忽略react-json-view组件内部的点击（它们可能在Portal外渲染）
      if (isJsonViewerElement(target)) {
        return;
      }

      // 如果点击在抽屉外部，关闭抽屉
      const drawerContent = drawer.querySelector('.json-drawer-content');
      if (drawerContent) {
        const reactRoot = drawerContent.querySelector('.json-viewer-react-root') as HTMLElement;
        if (reactRoot) {
          unmountReactComponent(reactRoot);
        }
      }
      closeJsonDrawer(drawer);
    });

  } catch (e) {
    console.error('Error showing JSON in drawer:', e);
  }
}
