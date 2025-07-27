// Integration helper for the content script with React JSON viewer
import ReactDOM from 'react-dom';
import React from 'react';
import JsonViewerComponent from '../components/JsonViewer';

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
    // Ensure we have a clean container
    if (container.childNodes.length > 0) {
      console.warn('Container is not empty before mounting React component');
    }
    
    // Create a unique key for this render to force re-rendering
    const renderKey = Date.now().toString();
    
    // Render with key prop for better React reconciliation
    ReactDOM.render(
      React.createElement(JsonViewerComponent, { 
        jsonData, 
        version, 
        key: renderKey 
      }),
      container
    );
    
    console.log('React component mounted with key:', renderKey);
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

// Function to create a drawer element with React mounting point
export function createJsonDrawerWithReactMount(): HTMLElement {
  const drawer = document.createElement('div');
  drawer.className = 'json-drawer';
  drawer.innerHTML = `
    <div class="json-drawer-header">
      <div class="json-drawer-title">JSON Viewer</div>
      <button class="json-drawer-close">&times;</button>
    </div>
    <div class="json-drawer-content"></div>
  `;

  // Apply base styles
  drawer.style.backgroundColor = '#f8f9fa';
  drawer.style.color = '#333333';
  drawer.style.boxShadow = '-5px 0 15px rgba(0, 0, 0, 0.1)';
  drawer.style.padding = '0';

  // Style header
  const headerElement = drawer.querySelector('.json-drawer-header');
  if (headerElement) {
    (headerElement as HTMLElement).style.display = 'flex';
    (headerElement as HTMLElement).style.justifyContent = 'space-between';
    (headerElement as HTMLElement).style.alignItems = 'center';
    (headerElement as HTMLElement).style.padding = '8px 12px';
    (headerElement as HTMLElement).style.borderBottom = '1px solid #e0e0e0';
    (headerElement as HTMLElement).style.color = '#333333';
    (headerElement as HTMLElement).style.margin = '0';
  }

  // Style title
  const titleElement = drawer.querySelector('.json-drawer-title');
  if (titleElement) {
    (titleElement as HTMLElement).style.fontWeight = 'bold';
    (titleElement as HTMLElement).style.fontSize = '14px';
    (titleElement as HTMLElement).style.color = '#2e7db5';
  }

  // Style close button
  const closeBtn = drawer.querySelector('.json-drawer-close');
  if (closeBtn) {
    (closeBtn as HTMLElement).style.color = '#666';
    (closeBtn as HTMLElement).style.fontSize = '18px';
    (closeBtn as HTMLElement).style.background = 'none';
    (closeBtn as HTMLElement).style.border = 'none';
    (closeBtn as HTMLElement).style.cursor = 'pointer';
    (closeBtn as HTMLElement).style.padding = '0 5px';

    // Close button click event
    closeBtn.addEventListener('click', () => {
      // Unmount React component before closing drawer
      const drawerContent = drawer.querySelector('.json-drawer-content');
      if (drawerContent) {
        try {
          ReactDOM.unmountComponentAtNode(drawerContent);
        } catch (e) {
          console.error('Error unmounting React component:', e);
        }
      }
      drawer.classList.remove('open');
    });
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
    console.log('Click outside drawer, closing');
    const drawerContent = drawer.querySelector('.json-drawer-content');
    if (drawerContent) {
      try {
        ReactDOM.unmountComponentAtNode(drawerContent);
      } catch (e) {
        console.error('Error unmounting React component:', e);
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
    // Parse JSON data
    const jsonData = JSON.parse(jsonString);
    
    // Get or create drawer
    const drawer = document.querySelector('.json-drawer') as HTMLElement || createJsonDrawerWithReactMount();
    if (!document.body.contains(drawer)) {
      document.body.appendChild(drawer);
    }

    // Get drawer content container
    const drawerContent = drawer.querySelector('.json-drawer-content');
    if (!drawerContent) return;

    // Unmount any existing React component
    try {
      ReactDOM.unmountComponentAtNode(drawerContent);
    } catch (e) {
      console.log('No React component to unmount');
    }

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
      console.log('Click outside drawer, closing');
      const drawerContent = drawer.querySelector('.json-drawer-content');
      if (drawerContent) {
        try {
          ReactDOM.unmountComponentAtNode(drawerContent);
        } catch (e) {
          console.error('Error unmounting React component:', e);
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
    
    console.log('JSON viewer mounted successfully', { 
      jsonSize: jsonString.length,
      drawerOpenedAt: drawer.dataset.openedAt
    });
  } catch (e) {
    console.error('Error showing JSON in drawer:', e);
  }
}
