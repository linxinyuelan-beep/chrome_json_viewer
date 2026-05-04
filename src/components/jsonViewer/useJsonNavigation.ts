import { useCallback, useEffect, useState } from 'react';
import {
  addToNavigationHistory,
  canNavigateBack,
  canNavigateForward,
  navigateBack,
  navigateForward,
} from '../../utils/jsonNavigation';

export function useJsonNavigation(onOpenJson?: (jsonString: string) => void) {
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);

  const refreshNavigationState = useCallback(() => {
    setCanGoBack(canNavigateBack());
    setCanGoForward(canNavigateForward());
  }, []);

  const trackJson = useCallback((jsonString: string) => {
    addToNavigationHistory(jsonString);
    refreshNavigationState();
  }, [refreshNavigationState]);

  const handleNavigateBack = useCallback(() => {
    const previousJson = navigateBack();
    if (previousJson && onOpenJson) {
      onOpenJson(previousJson);
    }
  }, [onOpenJson]);

  const handleNavigateForward = useCallback(() => {
    const nextJson = navigateForward();
    if (nextJson && onOpenJson) {
      onOpenJson(nextJson);
    }
  }, [onOpenJson]);

  useEffect(() => {
    const handleNavigationUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail) {
        setCanGoBack(customEvent.detail.canGoBack);
        setCanGoForward(customEvent.detail.canGoForward);
      }
    };

    document.addEventListener('json-navigation-updated', handleNavigationUpdate);
    return () => {
      document.removeEventListener('json-navigation-updated', handleNavigationUpdate);
    };
  }, []);

  return {
    canGoBack,
    canGoForward,
    trackJson,
    handleNavigateBack,
    handleNavigateForward,
  };
}
