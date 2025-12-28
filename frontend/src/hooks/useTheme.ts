/**
 * Theme Hook
 * 
 * React hook for managing theme with Light/Dark/Auto modes.
 */

import { useEffect, useState, useCallback } from "react";
import {
  getThemeManager,
  getSystemTheme,
  type Theme,
} from "@/lib/theme";

export type UseThemeReturn = {
  theme: Theme;
  effectiveTheme: 'light' | 'dark';
  systemTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  toggle: () => void;
};

/**
 * Hook for managing application theme
 * 
 * @example
 * ```tsx
 * const { theme, effectiveTheme, setTheme, toggle } = useTheme();
 * 
 * // Set theme
 * setTheme('dark');
 * setTheme('light');
 * setTheme('auto');
 * 
 * // Toggle theme
 * toggle();
 * 
 * // Check current theme
 * console.log(theme); // 'light' | 'dark' | 'auto'
 * console.log(effectiveTheme); // 'light' | 'dark'
 * ```
 */
export function useTheme(): UseThemeReturn {
  const [theme, setThemeState] = useState<Theme>(() => {
    const manager = getThemeManager();
    return manager.getTheme();
  });

  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>(() => {
    const manager = getThemeManager();
    return manager.getEffectiveTheme();
  });

  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(() => {
    return getSystemTheme();
  });

  // Subscribe to theme changes
  useEffect(() => {
    const manager = getThemeManager();
    
    const unsubscribe = manager.subscribe((newTheme) => {
      setThemeState(newTheme);
      setEffectiveTheme(manager.getEffectiveTheme());
    });

    return unsubscribe;
  }, []);

  // Watch system theme changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handler = (e: MediaQueryListEvent) => {
      const newSystemTheme = e.matches ? 'dark' : 'light';
      setSystemTheme(newSystemTheme);
      
      // Update effective theme if in auto mode
      if (theme === 'auto') {
        setEffectiveTheme(newSystemTheme);
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }

    // Fallback for older browsers
    mediaQuery.addListener(handler);
    return () => mediaQuery.removeListener(handler);
  }, [theme]);

  /**
   * Set theme
   */
  const setTheme = useCallback((newTheme: Theme) => {
    const manager = getThemeManager();
    manager.setTheme(newTheme);
  }, []);

  /**
   * Toggle between light and dark
   */
  const toggle = useCallback(() => {
    const manager = getThemeManager();
    manager.toggle();
  }, []);

  return {
    theme,
    effectiveTheme,
    systemTheme,
    setTheme,
    toggle,
  };
}
