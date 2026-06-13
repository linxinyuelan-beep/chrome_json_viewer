import { useEffect, useState } from 'react';
import { ResolvedTheme, resolveThemeMode, DEFAULT_THEME_MODE, watchResolvedTheme } from './theme';

export function useResolvedTheme(): ResolvedTheme {
  const [theme, setTheme] = useState<ResolvedTheme>(() => resolveThemeMode(DEFAULT_THEME_MODE));

  useEffect(() => watchResolvedTheme((nextTheme) => {
    setTheme(nextTheme);
  }), []);

  return theme;
}
