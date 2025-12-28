/**
 * Theme Service
 * 
 * Production-ready theme management with:
 * - Light / Dark / Auto modes
 * - System preference detection
 * - LocalStorage persistence
 * - Smooth transitions
 * - CSS variables only
 */

export type Theme = 'light' | 'dark' | 'auto';

const STORAGE_KEY = 'medibot-theme';
const THEME_ATTRIBUTE = 'data-theme';

/**
 * Get system theme preference
 */
export function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark';
  
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
}

/**
 * Get stored theme preference
 */
export function getStoredTheme(): Theme | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'auto') {
      return stored;
    }
  } catch (error) {
    console.error('Failed to get stored theme:', error);
  }
  
  return null;
}

/**
 * Save theme preference
 */
export function saveTheme(theme: Theme): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch (error) {
    console.error('Failed to save theme:', error);
  }
}

/**
 * Get effective theme (resolves 'auto' to actual theme)
 */
export function getEffectiveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'auto') {
    return getSystemTheme();
  }
  return theme;
}

/**
 * Apply theme to document
 */
export function applyTheme(theme: Theme): void {
  if (typeof window === 'undefined') return;
  
  const effectiveTheme = getEffectiveTheme(theme);
  const root = document.documentElement;
  
  // Set data attribute
  root.setAttribute(THEME_ATTRIBUTE, effectiveTheme);
  
  // Update meta theme-color for mobile browsers
  updateMetaThemeColor(effectiveTheme);
}

/**
 * Update meta theme-color tag
 */
function updateMetaThemeColor(theme: 'light' | 'dark'): void {
  if (typeof window === 'undefined') return;
  
  let metaThemeColor = document.querySelector('meta[name="theme-color"]');
  
  if (!metaThemeColor) {
    metaThemeColor = document.createElement('meta');
    metaThemeColor.setAttribute('name', 'theme-color');
    document.head.appendChild(metaThemeColor);
  }
  
  // Set color based on theme
  const color = theme === 'dark' ? '#0A0A0A' : '#FFFFFF';
  metaThemeColor.setAttribute('content', color);
}

/**
 * Initialize theme on page load
 */
export function initializeTheme(): Theme {
  const stored = getStoredTheme();
  const theme = stored || 'auto';
  
  applyTheme(theme);
  
  return theme;
}

/**
 * Listen for system theme changes
 */
export function watchSystemTheme(callback: (theme: 'light' | 'dark') => void): () => void {
  if (typeof window === 'undefined') return () => {};
  
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  
  const handler = (e: MediaQueryListEvent) => {
    const systemTheme = e.matches ? 'dark' : 'light';
    callback(systemTheme);
  };
  
  // Modern browsers
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }
  
  // Fallback for older browsers
  mediaQuery.addListener(handler);
  return () => mediaQuery.removeListener(handler);
}

/**
 * Theme Manager Class
 */
export class ThemeManager {
  private theme: Theme = 'auto';
  private listeners: Set<(theme: Theme) => void> = new Set();
  private systemThemeCleanup?: () => void;

  constructor() {
    this.theme = initializeTheme();
    this.watchSystemTheme();
  }

  /**
   * Get current theme
   */
  getTheme(): Theme {
    return this.theme;
  }

  /**
   * Get effective theme (resolves 'auto')
   */
  getEffectiveTheme(): 'light' | 'dark' {
    return getEffectiveTheme(this.theme);
  }

  /**
   * Set theme
   */
  setTheme(theme: Theme): void {
    this.theme = theme;
    applyTheme(theme);
    saveTheme(theme);
    this.notifyListeners();
  }

  /**
   * Toggle between light and dark
   */
  toggle(): void {
    const current = this.getEffectiveTheme();
    const next = current === 'dark' ? 'light' : 'dark';
    this.setTheme(next);
  }

  /**
   * Subscribe to theme changes
   */
  subscribe(listener: (theme: Theme) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.theme));
  }

  /**
   * Watch system theme changes
   */
  private watchSystemTheme(): void {
    this.systemThemeCleanup = watchSystemTheme((systemTheme) => {
      // Only apply if theme is set to 'auto'
      if (this.theme === 'auto') {
        applyTheme('auto');
        this.notifyListeners();
      }
    });
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.systemThemeCleanup?.();
    this.listeners.clear();
  }
}

/**
 * Global theme manager instance
 */
let globalThemeManager: ThemeManager | null = null;

/**
 * Get global theme manager
 */
export function getThemeManager(): ThemeManager {
  if (!globalThemeManager) {
    globalThemeManager = new ThemeManager();
  }
  return globalThemeManager;
}
