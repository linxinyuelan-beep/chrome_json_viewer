import { useCallback, useEffect, useState } from 'react';
import { JsonViewerMode } from './types';

interface UseJsonViewerModeOptions {
  storageKey: string;
  defaultMode?: JsonViewerMode;
  persistOnToggle?: boolean;
  waitForStorage?: boolean;
}

export function useJsonViewerMode({
  storageKey,
  defaultMode = 'default',
  persistOnToggle = false,
  waitForStorage = false,
}: UseJsonViewerModeOptions) {
  const [viewMode, setViewMode] = useState<JsonViewerMode | null>(waitForStorage ? null : defaultMode);

  useEffect(() => {
    chrome.storage.local.get([storageKey], (result) => {
      setViewMode((result[storageKey] as JsonViewerMode) || defaultMode);
    });
  }, [defaultMode, storageKey]);

  const toggleViewMode = useCallback(() => {
    setViewMode((currentMode) => {
      if (currentMode === null) {
        return currentMode;
      }

      const nextMode: JsonViewerMode = currentMode === 'default' ? 'editor' : 'default';
      if (persistOnToggle) {
        chrome.storage.local.set({ [storageKey]: nextMode });
      }
      return nextMode;
    });
  }, [persistOnToggle, storageKey]);

  return {
    viewMode,
    toggleViewMode,
  };
}

