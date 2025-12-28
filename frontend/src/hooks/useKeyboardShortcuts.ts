/**
 * Keyboard Shortcuts Hook
 * 
 * React hook for managing keyboard shortcuts in components.
 */

import { useEffect, useRef, useCallback, useState } from "react";
import {
  ShortcutsManager,
  DEFAULT_SHORTCUTS,
  loadShortcutsFromStorage,
  saveShortcutsToStorage,
  type Shortcut,
  type ShortcutAction,
  type ShortcutHandler,
} from "@/lib/shortcuts";

export type UseKeyboardShortcutsOptions = {
  enabled?: boolean;
  onShortcut?: (action: ShortcutAction) => void;
};

export type UseKeyboardShortcutsReturn = {
  shortcuts: Shortcut[];
  registerHandler: (action: ShortcutAction, handler: ShortcutHandler) => void;
  unregisterHandler: (action: ShortcutAction) => void;
  toggleShortcut: (id: string, enabled?: boolean) => void;
  updateShortcut: (id: string, updates: Partial<Shortcut>) => void;
  resetToDefaults: () => void;
  setEnabled: (enabled: boolean) => void;
  isEnabled: boolean;
};

/**
 * Hook for managing keyboard shortcuts
 * 
 * @example
 * ```tsx
 * const { registerHandler, shortcuts } = useKeyboardShortcuts({
 *   enabled: true,
 * });
 * 
 * useEffect(() => {
 *   registerHandler('send-message', () => {
 *     console.log('Send message!');
 *   });
 * }, [registerHandler]);
 * ```
 */
export function useKeyboardShortcuts(
  options: UseKeyboardShortcutsOptions = {}
): UseKeyboardShortcutsReturn {
  const { enabled = true, onShortcut } = options;

  const managerRef = useRef<ShortcutsManager | null>(null);
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
  const [isEnabled, setIsEnabled] = useState(enabled);

  // Initialize manager
  useEffect(() => {
    const savedShortcuts = loadShortcutsFromStorage();
    const initialShortcuts = savedShortcuts || DEFAULT_SHORTCUTS;
    
    managerRef.current = new ShortcutsManager(initialShortcuts);
    managerRef.current.setEnabled(enabled);
    setShortcuts(managerRef.current.getShortcuts());
  }, [enabled]);

  // Handle keyboard events
  useEffect(() => {
    if (!managerRef.current) return;

    const handleKeyDown = async (event: KeyboardEvent) => {
      if (!managerRef.current) return;
      
      const handled = await managerRef.current.handleKeyboardEvent(event);
      
      if (handled && onShortcut) {
        // Find which action was triggered
        for (const shortcut of managerRef.current.getShortcuts()) {
          if (shortcut.enabled) {
            onShortcut(shortcut.action);
            break;
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onShortcut]);

  /**
   * Register a handler for a shortcut action
   */
  const registerHandler = useCallback((action: ShortcutAction, handler: ShortcutHandler) => {
    managerRef.current?.registerHandler(action, handler);
  }, []);

  /**
   * Unregister a handler
   */
  const unregisterHandler = useCallback((action: ShortcutAction) => {
    managerRef.current?.unregisterHandler(action);
  }, []);

  /**
   * Toggle shortcut enabled state
   */
  const toggleShortcut = useCallback((id: string, enabled?: boolean) => {
    managerRef.current?.toggleShortcut(id, enabled);
    if (managerRef.current) {
      const updated = managerRef.current.getShortcuts();
      setShortcuts(updated);
      saveShortcutsToStorage(updated);
    }
  }, []);

  /**
   * Update shortcut configuration
   */
  const updateShortcut = useCallback((id: string, updates: Partial<Shortcut>) => {
    managerRef.current?.updateShortcut(id, updates);
    if (managerRef.current) {
      const updated = managerRef.current.getShortcuts();
      setShortcuts(updated);
      saveShortcutsToStorage(updated);
    }
  }, []);

  /**
   * Reset to default shortcuts
   */
  const resetToDefaults = useCallback(() => {
    managerRef.current?.resetToDefaults();
    if (managerRef.current) {
      const updated = managerRef.current.getShortcuts();
      setShortcuts(updated);
      saveShortcutsToStorage(updated);
    }
  }, []);

  /**
   * Enable/disable all shortcuts
   */
  const setEnabledCallback = useCallback((enabled: boolean) => {
    managerRef.current?.setEnabled(enabled);
    setIsEnabled(enabled);
  }, []);

  return {
    shortcuts,
    registerHandler,
    unregisterHandler,
    toggleShortcut,
    updateShortcut,
    resetToDefaults,
    setEnabled: setEnabledCallback,
    isEnabled,
  };
}
