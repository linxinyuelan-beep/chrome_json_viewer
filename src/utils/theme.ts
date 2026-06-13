import { STORAGE_KEYS } from '../config/storageKeys';

export type ThemeMode = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export const DEFAULT_THEME_MODE: ThemeMode = 'system';

const DARK_QUERY = '(prefers-color-scheme: dark)';

interface ApplyThemeOptions {
  colorScheme?: boolean;
}

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'system' || value === 'light' || value === 'dark';
}

export function resolveThemeMode(mode: ThemeMode): ResolvedTheme {
  if (mode === 'light' || mode === 'dark') {
    return mode;
  }

  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'light';
  }

  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
}

export function applyTheme(
  theme: ResolvedTheme,
  root: HTMLElement = document.documentElement,
  options: ApplyThemeOptions = {}
): void {
  const { colorScheme = true } = options;

  root.dataset.theme = theme;
  if (colorScheme) {
    root.style.colorScheme = theme;
  }
}

export async function getStoredThemeMode(): Promise<ThemeMode> {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) {
    return DEFAULT_THEME_MODE;
  }

  return new Promise((resolve) => {
    chrome.storage.local.get(STORAGE_KEYS.THEME_MODE, (result) => {
      const storedMode = result[STORAGE_KEYS.THEME_MODE];
      resolve(isThemeMode(storedMode) ? storedMode : DEFAULT_THEME_MODE);
    });
  });
}

export async function saveThemeMode(mode: ThemeMode): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) {
    return;
  }

  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEYS.THEME_MODE]: mode }, () => resolve());
  });
}

export function watchResolvedTheme(onChange: (theme: ResolvedTheme, mode: ThemeMode) => void): () => void {
  let disposed = false;
  let currentMode: ThemeMode = DEFAULT_THEME_MODE;
  const mediaQuery = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(DARK_QUERY)
    : null;

  const update = async (nextMode?: ThemeMode) => {
    const mode = nextMode || await getStoredThemeMode();
    if (disposed) {
      return;
    }

    currentMode = mode;
    onChange(resolveThemeMode(mode), mode);
  };

  const handleStorageChange = (
    changes: { [key: string]: chrome.storage.StorageChange },
    areaName: string
  ) => {
    if (areaName !== 'local' || !changes[STORAGE_KEYS.THEME_MODE]) {
      return;
    }

    const nextMode = changes[STORAGE_KEYS.THEME_MODE].newValue;
    update(isThemeMode(nextMode) ? nextMode : DEFAULT_THEME_MODE);
  };

  const handleSystemThemeChange = () => {
    if (currentMode === 'system') {
      update(currentMode);
    }
  };

  update();

  if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
    chrome.storage.onChanged.addListener(handleStorageChange);
  }

  if (mediaQuery) {
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleSystemThemeChange);
    } else {
      mediaQuery.addListener(handleSystemThemeChange);
    }
  }

  return () => {
    disposed = true;

    if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    }

    if (mediaQuery) {
      if (typeof mediaQuery.removeEventListener === 'function') {
        mediaQuery.removeEventListener('change', handleSystemThemeChange);
      } else {
        mediaQuery.removeListener(handleSystemThemeChange);
      }
    }
  };
}

export function initTheme(root: HTMLElement = document.documentElement, options: ApplyThemeOptions = {}): () => void {
  return watchResolvedTheme((theme) => applyTheme(theme, root, options));
}
