import { useCallback, useEffect, useState } from 'react';

interface HistoryDropdownItem {
  id: string;
  preview: string;
  timestamp: number;
}

export function useJsonHistoryDropdown(
  onOpenFullHistory: () => void,
  onOpenJson?: (jsonString: string) => void
) {
  const [historyItems, setHistoryItems] = useState<HistoryDropdownItem[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const loadHistoryForDropdown = useCallback(async () => {
    try {
      const { getHistory } = await import('../../utils/jsonHistory');
      const items = await getHistory();
      setHistoryItems(items.map(item => ({
        id: item.id,
        preview: item.preview,
        timestamp: item.timestamp,
      })));
    } catch (e) {
      console.error('Error loading history for dropdown:', e);
    }
  }, []);

  const toggleDropdown = useCallback(async () => {
    if (!isDropdownOpen) {
      await loadHistoryForDropdown();
    }
    setIsDropdownOpen(!isDropdownOpen);
  }, [isDropdownOpen, loadHistoryForDropdown]);

  const viewAllHistory = useCallback(() => {
    setIsDropdownOpen(false);
    onOpenFullHistory();
  }, [onOpenFullHistory]);

  const handleSelectFromDropdown = useCallback(async (id: string) => {
    try {
      setIsDropdownOpen(false);
      const { getHistoryItem } = await import('../../utils/jsonHistory');
      const item = await getHistoryItem(id);

      if (item && item.jsonData) {
        if (onOpenJson) {
          onOpenJson(item.jsonData);
        } else {
          console.error('onOpenJson callback not available');
        }
      }
    } catch (e) {
      console.error('Error selecting from dropdown:', e);
    }
  }, [onOpenJson]);

  useEffect(() => {
    if (!isDropdownOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      const dropdown = document.querySelector('.json-viewer-dropdown-container');
      if (dropdown && !dropdown.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isDropdownOpen]);

  return {
    historyItems,
    isDropdownOpen,
    toggleDropdown,
    viewAllHistory,
    handleSelectFromDropdown,
  };
}
