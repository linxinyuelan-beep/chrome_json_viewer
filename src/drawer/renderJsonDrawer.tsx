// Integration helper for the content script with React JSON viewer
import ReactDOM from 'react-dom';
import React from 'react';
import JsonViewerComponent from '../components/JsonViewer';
import { parseJsonSafely } from '../utils/jsonParser';
import {
  closeJsonDrawer,
  ensureJsonDrawerMounted,
  getJsonDrawerContent,
  getOrCreateJsonDrawer,
  openJsonDrawer,
  setJsonDrawerOutsideClickHandler,
} from './drawerHost';

const reactRoots = new Map<HTMLElement, any>();

function isJsonViewerElement(element: Element): boolean {
  if (!element) return false;

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

  if (element.hasAttribute('data-key-name') ||
    element.hasAttribute('data-object-name') ||
    element.hasAttribute('data-type')) {
    return true;
  }

  return false;
}

export function mountJsonViewer(
  jsonData: any,
  container: HTMLElement,
  version: string,
  onClose: () => void,
  onOpenJson: (jsonString: string) => void
): void {
  try {
    if (reactRoots.has(container)) {
      const existingRoot = reactRoots.get(container);
      if (existingRoot && existingRoot.unmount) {
        existingRoot.unmount();
      }
      reactRoots.delete(container);
    }

    if (container.childNodes.length > 0) {
      console.warn('Container is not empty before mounting React component');
      container.innerHTML = '';
    }

    const renderKey = Date.now().toString();

    if ('createRoot' in ReactDOM) {
      const root = (ReactDOM as any).createRoot(container);
      reactRoots.set(container, root);

      root.render(
        React.createElement(JsonViewerComponent, {
          jsonData,
          version,
          onClose,
          onOpenJson,
          key: renderKey
        })
      );
    } else {
      ReactDOM.render(
        React.createElement(JsonViewerComponent, {
          jsonData,
          version,
          onClose,
          onOpenJson,
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

function unmountReactComponent(container: HTMLElement): void {
  try {
    if (reactRoots.has(container)) {
      const root = reactRoots.get(container);
      if (root && root.unmount) {
        root.unmount();
        reactRoots.delete(container);
        return;
      }
    }

    if ('unmountComponentAtNode' in ReactDOM) {
      ReactDOM.unmountComponentAtNode(container);
    }
  } catch (e) {
    console.warn('Error during React component unmount:', e);
  } finally {
    container.innerHTML = '';
  }
}

export function showJsonInDrawerWithReact(jsonString: string, version: string): void {
  if (!jsonString) return;

  try {
    const jsonData = parseJsonSafely(jsonString);

    const drawer = getOrCreateJsonDrawer();
    ensureJsonDrawerMounted(drawer);

    const drawerContent = getJsonDrawerContent(drawer);
    if (!drawerContent) return;

    drawerContent.innerHTML = '';
    const reactRoot = document.createElement('div');
    reactRoot.className = 'json-viewer-react-root';
    reactRoot.addEventListener('click', (event) => {
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

    const onOpenJson = (nextJsonString: string) => {
      showJsonInDrawerWithReact(nextJsonString, version);
    };

    mountJsonViewer(jsonData, reactRoot, version, onClose, onOpenJson);
    openJsonDrawer(drawer);

    drawer.dataset.openedAt = Date.now().toString();

    setJsonDrawerOutsideClickHandler(drawer, (event: MouseEvent) => {
      const target = event.target as Element;

      if (isJsonViewerElement(target)) {
        return;
      }

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

