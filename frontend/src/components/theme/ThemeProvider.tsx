/**
 * Theme Provider Component
 * 
 * Initializes theme on app load and prevents flash of unstyled content.
 */

"use client";

import { useEffect } from "react";
import { initializeTheme } from "@/lib/theme";

export type ThemeProviderProps = {
  children: React.ReactNode;
};

/**
 * Theme Provider
 * 
 * Must be placed high in the component tree to initialize theme early.
 * Prevents flash of wrong theme on page load.
 * 
 * @example
 * ```tsx
 * <ThemeProvider>
 *   <App />
 * </ThemeProvider>
 * ```
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  useEffect(() => {
    // Initialize theme on mount
    initializeTheme();
  }, []);

  return <>{children}</>;
}

/**
 * Theme Script
 * 
 * Inline script to set theme before React hydrates.
 * This prevents flash of unstyled content (FOUC).
 * 
 * Place in <head> or at the start of <body>.
 */
export function ThemeScript() {
  const themeScript = `
    (function() {
      try {
        const stored = localStorage.getItem('medibot-theme');
        const theme = stored || 'auto';
        
        let effectiveTheme = theme;
        if (theme === 'auto') {
          effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        
        document.documentElement.setAttribute('data-theme', effectiveTheme);
        
        // Update meta theme-color
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        const color = effectiveTheme === 'dark' ? '#0A0A0A' : '#FFFFFF';
        if (metaThemeColor) {
          metaThemeColor.setAttribute('content', color);
        }
      } catch (e) {
        console.error('Failed to initialize theme:', e);
      }
    })();
  `;

  return (
    <script
      dangerouslySetInnerHTML={{ __html: themeScript }}
      suppressHydrationWarning
    />
  );
}
