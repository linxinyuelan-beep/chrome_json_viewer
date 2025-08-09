// Integration helper for the content script with React JSON viewer
import ReactDOM from 'react-dom';
import React from 'react';
import JsonViewerComponent from '../components/JsonViewer';
import { parseJsonSafely } from './jsonParser';

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
export function mountJsonViewer(jsonData: any, container: HTMLElement, version: string): void {
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
          key: renderKey 
        })
      );
    } else {
      // Fallback to legacy ReactDOM.render for older React versions
      ReactDOM.render(
        React.createElement(JsonViewerComponent, { 
          jsonData, 
          version, 
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

// Function to create a drawer element with React mounting point
export function createJsonDrawerWithReactMount(): HTMLElement {
  const drawer = document.createElement('div');
  drawer.className = 'json-drawer';
  drawer.innerHTML = `
    <div class="json-drawer-resize-handle" title="拖动调整宽度"></div>
    <div class="json-drawer-header">
      <div class="json-drawer-title">JSON Viewer</div>
      <button class="json-drawer-close">&times;</button>
    </div>
    <div class="json-drawer-content"></div>
  `;

  // 不设置内联样式，完全使用CSS文件控制样式
  
  // Style close button - 只保留事件处理
  const closeBtn = drawer.querySelector('.json-drawer-close');
  if (closeBtn) {
    // Close button click event
    closeBtn.addEventListener('click', () => {
      // Unmount React component before closing drawer
      const drawerContent = drawer.querySelector('.json-drawer-content');
      if (drawerContent) {
        const reactRoot = drawerContent.querySelector('.json-viewer-react-root') as HTMLElement;
        if (reactRoot) {
          unmountReactComponent(reactRoot);
        }
      }
      drawer.classList.remove('open');
    });
  }

  // 添加拖动调整宽度功能
  const resizeHandle = drawer.querySelector('.json-drawer-resize-handle') as HTMLElement;
  if (resizeHandle) {
    let isResizing = false;
    let startX = 0;
    let startWidth = 0;

    const handleMouseDown = (e: MouseEvent) => {
      isResizing = true;
      startX = e.clientX;
      startWidth = drawer.offsetWidth;
      
      // 添加拖动状态样式
      drawer.classList.add('resizing');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      
      // 阻止默认行为和事件冒泡
      e.preventDefault();
      e.stopPropagation();

      console.log('开始拖动调整宽度', { startX, startWidth });
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const deltaX = startX - e.clientX; // 向左拖动为正值
      const newWidth = startWidth + deltaX;
      
      // 限制最小和最大宽度
      const minWidth = 300;
      const maxWidth = Math.min(window.innerWidth * 0.9, 1600); // 增加到90%和1600px
      const constrainedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      
      // 计算宽度百分比
      const widthPercentage = (constrainedWidth / window.innerWidth) * 100;
      
      // 应用新宽度
      drawer.style.width = `${constrainedWidth}px`;
      
      console.log('拖动中', { 
        deltaX, 
        newWidth, 
        constrainedWidth, 
        widthPercentage: widthPercentage.toFixed(1) + '%' 
      });
      
      // 阻止默认行为
      e.preventDefault();
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!isResizing) return;
      
      isResizing = false;
      
      // 移除拖动状态样式
      drawer.classList.remove('resizing');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      
      // 保存用户设置的宽度到localStorage
      const finalWidth = drawer.offsetWidth;
      try {
        localStorage.setItem('jsonDrawerWidth', finalWidth.toString());
        console.log('保存抽屉宽度设置', { finalWidth });
      } catch (error) {
        console.warn('无法保存抽屉宽度设置到localStorage:', error);
      }
      
      console.log('结束拖动调整宽度', { finalWidth });
      
      // 阻止默认行为
      e.preventDefault();
    };

    // 绑定拖动事件
    resizeHandle.addEventListener('mousedown', handleMouseDown);
    
    // 全局鼠标事件（在document上监听以确保在快速拖动时也能捕获）
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    // 防止选中文本
    resizeHandle.addEventListener('selectstart', (e) => e.preventDefault());
    resizeHandle.addEventListener('dragstart', (e) => e.preventDefault());
  }

  // 从localStorage恢复保存的宽度设置
  try {
    const savedWidth = localStorage.getItem('jsonDrawerWidth');
    if (savedWidth) {
      const width = parseInt(savedWidth, 10);
      if (width >= 300 && width <= window.innerWidth * 0.9) { // 更新到90%
        drawer.style.width = `${width}px`;
      }
    }
  } catch (error) {
    console.warn('无法从localStorage恢复抽屉宽度设置:', error);
  }

  // Click outside to close - with check to prevent closing when clicking inside the JSON tree
  document.addEventListener('click', (event: MouseEvent) => {
    // 抽屉必须是打开的
    if (!drawer.classList.contains('open')) {
      return;
    }
    
    // 获取点击目标
    const target = event.target as Element;
    
    // 忽略抽屉内部的点击
    if (drawer.contains(target)) {
      return;
    }
    
    // 忽略JSON高亮文本的点击
    if (target.classList && target.classList.contains('json-text-hover')) {
      return;
    }
    
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
    drawer.classList.remove('open');
  });

  return drawer;
}

// Show JSON in drawer with React component
export function showJsonInDrawerWithReact(jsonString: string, version: string): void {
  if (!jsonString) return;

  try {
    // 使用增强的 JSON 解析器处理大整数精度问题
    const jsonData = parseJsonSafely(jsonString);

    // Get or create drawer
    const drawer = document.querySelector('.json-drawer') as HTMLElement || createJsonDrawerWithReactMount();
    if (!document.body.contains(drawer)) {
      document.body.appendChild(drawer);
    }

    // Get drawer content container
    const drawerContent = drawer.querySelector('.json-drawer-content');
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
    
    // Mount React component in drawer
    mountJsonViewer(jsonData, reactRoot, version);
    
    // Open drawer
    drawer.classList.add('open');
    
    // 添加标记以帮助识别抽屉是由哪次显示创建的
    drawer.dataset.openedAt = Date.now().toString();
    
    // Add the function to the window object so it can be called from the JsonViewer component
    window.showJsonInDrawerWithReact = showJsonInDrawerWithReact;
    
    // 重新绑定点击外部关闭事件（首先移除所有已存在的事件监听器）
    const clickOutsideHandler = (event: MouseEvent) => {
      // 抽屉必须是打开的
      if (!drawer.classList.contains('open')) {
        return;
      }
      
      // 获取点击目标
      const target = event.target as Element;
      
      // 忽略抽屉内部的点击
      if (drawer.contains(target)) {
        return;
      }
      
      // 忽略JSON高亮文本的点击
      if (target.classList && target.classList.contains('json-text-hover')) {
        return;
      }
      
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
      drawer.classList.remove('open');
    };
    
    // 先移除现有的所有点击事件监听器
    const oldHandlerId = drawer.getAttribute('data-click-handler-id');
    if (oldHandlerId) {
      try {
        const oldHandler = (window as any)[`jsonDrawerClickHandler_${oldHandlerId}`];
        if (typeof oldHandler === 'function') {
          document.removeEventListener('click', oldHandler);
          delete (window as any)[`jsonDrawerClickHandler_${oldHandlerId}`];
        }
      } catch (e) {
        console.error('Error removing old click handler:', e);
      }
    }
    
    // 添加新的点击事件监听器
    document.addEventListener('click', clickOutsideHandler);
    
    // 存储事件监听器引用以便后续移除
    const handlerId = Date.now().toString();
    drawer.setAttribute('data-click-handler-id', handlerId);
    (window as any)[`jsonDrawerClickHandler_${handlerId}`] = clickOutsideHandler;
    
  } catch (e) {
    console.error('Error showing JSON in drawer:', e);
  }
}
