import { STORAGE_KEYS } from '../config/storageKeys';
import { DRAWER_UI } from '../config/uiConstants';

const DRAWER_SELECTOR = '.json-drawer';
const DRAWER_CONTENT_SELECTOR = '.json-drawer-content';

let resizeBoundDrawer: HTMLElement | null = null;
let cleanupOutsideClick: (() => void) | null = null;

export function getOrCreateJsonDrawer(): HTMLElement {
  const existingDrawer = document.querySelector(DRAWER_SELECTOR) as HTMLElement | null;
  if (existingDrawer) {
    bindDrawerResize(existingDrawer);
    return existingDrawer;
  }

  const drawer = document.createElement('div');
  drawer.className = 'json-drawer';
  drawer.innerHTML = `
    <div class="json-drawer-resize-handle" title="拖动调整宽度"></div>
    <div class="json-drawer-content"></div>
  `;

  bindDrawerResize(drawer);
  restoreDrawerWidth(drawer);

  return drawer;
}

export function ensureJsonDrawerMounted(drawer: HTMLElement): void {
  if (!document.body.contains(drawer)) {
    document.body.appendChild(drawer);
  }
}

export function getJsonDrawerContent(drawer: HTMLElement): HTMLElement | null {
  return drawer.querySelector(DRAWER_CONTENT_SELECTOR) as HTMLElement | null;
}

export function openJsonDrawer(drawer: HTMLElement): void {
  drawer.classList.add('open');
}

export function closeJsonDrawer(drawer: HTMLElement): void {
  drawer.classList.remove('open');
}

export function setJsonDrawerOutsideClickHandler(
  drawer: HTMLElement,
  onOutsideClick: (event: MouseEvent) => void
): void {
  removeJsonDrawerOutsideClickHandler();

  const clickOutsideHandler = (event: MouseEvent) => {
    if (!drawer.classList.contains('open')) {
      return;
    }

    const target = event.target as Node;
    if (drawer.contains(target)) {
      return;
    }

    onOutsideClick(event);
  };

  document.addEventListener('click', clickOutsideHandler);
  cleanupOutsideClick = () => {
    document.removeEventListener('click', clickOutsideHandler);
  };
}

export function removeJsonDrawerOutsideClickHandler(): void {
  if (cleanupOutsideClick) {
    cleanupOutsideClick();
    cleanupOutsideClick = null;
  }
}

function bindDrawerResize(drawer: HTMLElement): void {
  if (resizeBoundDrawer === drawer) {
    return;
  }

  const resizeHandle = drawer.querySelector('.json-drawer-resize-handle') as HTMLElement | null;
  if (!resizeHandle) {
    return;
  }

  let isResizing = false;
  let startX = 0;
  let startWidth = 0;

  const handleMouseDown = (e: MouseEvent) => {
    isResizing = true;
    startX = e.clientX;
    startWidth = drawer.offsetWidth;

    drawer.classList.add('resizing');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    e.preventDefault();
    e.stopPropagation();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing) {
      return;
    }

    const deltaX = startX - e.clientX;
    const newWidth = startWidth + deltaX;
    const maxWidth = Math.min(
      window.innerWidth * DRAWER_UI.MAX_VIEWPORT_RATIO,
      DRAWER_UI.MAX_WIDTH_PX
    );
    const constrainedWidth = Math.max(
      DRAWER_UI.MIN_WIDTH_PX,
      Math.min(maxWidth, newWidth)
    );

    drawer.style.width = `${constrainedWidth}px`;
    e.preventDefault();
  };

  const handleMouseUp = (e: MouseEvent) => {
    if (!isResizing) {
      return;
    }

    isResizing = false;
    drawer.classList.remove('resizing');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';

    try {
      localStorage.setItem(STORAGE_KEYS.DRAWER_WIDTH, drawer.offsetWidth.toString());
    } catch (error) {
      console.warn('Unable to save JSON drawer width:', error);
    }

    e.preventDefault();
  };

  resizeHandle.addEventListener('mousedown', handleMouseDown);
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
  resizeHandle.addEventListener('selectstart', (e) => e.preventDefault());
  resizeHandle.addEventListener('dragstart', (e) => e.preventDefault());

  resizeBoundDrawer = drawer;
}

function restoreDrawerWidth(drawer: HTMLElement): void {
  try {
    const savedWidth = localStorage.getItem(STORAGE_KEYS.DRAWER_WIDTH);
    if (!savedWidth) {
      return;
    }

    const width = parseInt(savedWidth, 10);
    if (
      width >= DRAWER_UI.MIN_WIDTH_PX &&
      width <= window.innerWidth * DRAWER_UI.MAX_VIEWPORT_RATIO
    ) {
      drawer.style.width = `${width}px`;
    }
  } catch (error) {
    console.warn('Unable to restore JSON drawer width:', error);
  }
}
