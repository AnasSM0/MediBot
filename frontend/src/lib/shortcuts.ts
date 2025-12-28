/**
 * Keyboard Shortcuts Service
 * 
 * Production-ready keyboard shortcuts manager with:
 * - Configurable hotkeys
 * - Conflict detection
 * - Accessibility support
 * - Platform-aware (Ctrl/Cmd)
 */

export type ShortcutKey = {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
};

export type ShortcutAction = 
  | 'send-message'
  | 'new-line'
  | 'clear-chat'
  | 'stop-voice'
  | 'start-voice-input'
  | 'toggle-voice-output'
  | 'new-session'
  | 'focus-input'
  | 'open-settings'
  | 'export-history';

export type Shortcut = {
  id: string;
  action: ShortcutAction;
  keys: ShortcutKey;
  description: string;
  category: 'chat' | 'voice' | 'navigation' | 'history';
  enabled: boolean;
};

export type ShortcutHandler = (event: KeyboardEvent) => void | Promise<void>;

/**
 * Default keyboard shortcuts
 */
export const DEFAULT_SHORTCUTS: Shortcut[] = [
  // Chat shortcuts
  {
    id: 'send-message',
    action: 'send-message',
    keys: { key: 'Enter' },
    description: 'Send message',
    category: 'chat',
    enabled: true,
  },
  {
    id: 'new-line',
    action: 'new-line',
    keys: { key: 'Enter', shift: true },
    description: 'New line in message',
    category: 'chat',
    enabled: true,
  },
  {
    id: 'clear-chat',
    action: 'clear-chat',
    keys: { key: 'k', ctrl: true },
    description: 'Clear current chat',
    category: 'chat',
    enabled: true,
  },
  {
    id: 'focus-input',
    action: 'focus-input',
    keys: { key: '/', ctrl: false },
    description: 'Focus message input',
    category: 'chat',
    enabled: true,
  },

  // Voice shortcuts
  {
    id: 'stop-voice',
    action: 'stop-voice',
    keys: { key: 'Escape' },
    description: 'Stop voice input/output',
    category: 'voice',
    enabled: true,
  },
  {
    id: 'start-voice-input',
    action: 'start-voice-input',
    keys: { key: 'v', ctrl: true },
    description: 'Start voice input',
    category: 'voice',
    enabled: true,
  },
  {
    id: 'toggle-voice-output',
    action: 'toggle-voice-output',
    keys: { key: 'm', ctrl: true },
    description: 'Toggle voice output',
    category: 'voice',
    enabled: true,
  },

  // Navigation shortcuts
  {
    id: 'new-session',
    action: 'new-session',
    keys: { key: 'n', ctrl: true },
    description: 'New chat session',
    category: 'navigation',
    enabled: true,
  },
  {
    id: 'open-settings',
    action: 'open-settings',
    keys: { key: ',', ctrl: true },
    description: 'Open settings',
    category: 'navigation',
    enabled: true,
  },

  // History shortcuts
  {
    id: 'export-history',
    action: 'export-history',
    keys: { key: 'e', ctrl: true, shift: true },
    description: 'Export chat history',
    category: 'history',
    enabled: true,
  },
];

/**
 * Check if keyboard event matches shortcut keys
 */
export function matchesShortcut(event: KeyboardEvent, keys: ShortcutKey): boolean {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  
  // Normalize key
  const eventKey = event.key.toLowerCase();
  const shortcutKey = keys.key.toLowerCase();
  
  if (eventKey !== shortcutKey) {
    return false;
  }

  // Check modifiers
  const ctrlKey = isMac ? event.metaKey : event.ctrlKey;
  const metaKey = isMac ? event.ctrlKey : event.metaKey;

  if (keys.ctrl && !ctrlKey) return false;
  if (!keys.ctrl && ctrlKey) return false;

  if (keys.shift && !event.shiftKey) return false;
  if (!keys.shift && event.shiftKey && shortcutKey !== 'enter') return false; // Allow Shift+Enter

  if (keys.alt && !event.altKey) return false;
  if (!keys.alt && event.altKey) return false;

  if (keys.meta && !metaKey) return false;
  if (!keys.meta && metaKey) return false;

  return true;
}

/**
 * Format shortcut keys for display
 */
export function formatShortcutKeys(keys: ShortcutKey): string {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const parts: string[] = [];

  if (keys.ctrl) {
    parts.push(isMac ? '⌘' : 'Ctrl');
  }

  if (keys.shift) {
    parts.push(isMac ? '⇧' : 'Shift');
  }

  if (keys.alt) {
    parts.push(isMac ? '⌥' : 'Alt');
  }

  if (keys.meta) {
    parts.push(isMac ? 'Ctrl' : 'Win');
  }

  // Format key name
  let keyName = keys.key;
  if (keyName === 'Enter') keyName = '↵';
  else if (keyName === 'Escape') keyName = 'Esc';
  else if (keyName === ' ') keyName = 'Space';
  else keyName = keyName.toUpperCase();

  parts.push(keyName);

  return parts.join(isMac ? '' : '+');
}

/**
 * Keyboard Shortcuts Manager
 */
export class ShortcutsManager {
  private shortcuts: Map<string, Shortcut> = new Map();
  private handlers: Map<ShortcutAction, ShortcutHandler> = new Map();
  private enabled = true;

  constructor(shortcuts: Shortcut[] = DEFAULT_SHORTCUTS) {
    shortcuts.forEach((shortcut) => {
      this.shortcuts.set(shortcut.id, shortcut);
    });
  }

  /**
   * Register a handler for a shortcut action
   */
  registerHandler(action: ShortcutAction, handler: ShortcutHandler): void {
    this.handlers.set(action, handler);
  }

  /**
   * Unregister a handler
   */
  unregisterHandler(action: ShortcutAction): void {
    this.handlers.delete(action);
  }

  /**
   * Handle keyboard event
   */
  async handleKeyboardEvent(event: KeyboardEvent): Promise<boolean> {
    if (!this.enabled) return false;

    // Don't handle shortcuts when typing in input elements (except for specific shortcuts)
    const target = event.target as HTMLElement;
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

    // Find matching shortcut
    for (const shortcut of this.shortcuts.values()) {
      if (!shortcut.enabled) continue;

      if (matchesShortcut(event, shortcut.keys)) {
        // Allow certain shortcuts in input fields
        const allowedInInput = ['send-message', 'new-line', 'stop-voice', 'start-voice-input'];
        
        if (isInput && !allowedInInput.includes(shortcut.action)) {
          continue;
        }

        // Execute handler
        const handler = this.handlers.get(shortcut.action);
        if (handler) {
          event.preventDefault();
          event.stopPropagation();
          await handler(event);
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Get all shortcuts
   */
  getShortcuts(): Shortcut[] {
    return Array.from(this.shortcuts.values());
  }

  /**
   * Get shortcuts by category
   */
  getShortcutsByCategory(category: Shortcut['category']): Shortcut[] {
    return this.getShortcuts().filter((s) => s.category === category);
  }

  /**
   * Update shortcut
   */
  updateShortcut(id: string, updates: Partial<Shortcut>): void {
    const shortcut = this.shortcuts.get(id);
    if (shortcut) {
      this.shortcuts.set(id, { ...shortcut, ...updates });
    }
  }

  /**
   * Enable/disable shortcut
   */
  toggleShortcut(id: string, enabled?: boolean): void {
    const shortcut = this.shortcuts.get(id);
    if (shortcut) {
      shortcut.enabled = enabled ?? !shortcut.enabled;
      this.shortcuts.set(id, shortcut);
    }
  }

  /**
   * Enable/disable all shortcuts
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check for conflicts
   */
  hasConflict(keys: ShortcutKey, excludeId?: string): boolean {
    for (const shortcut of this.shortcuts.values()) {
      if (excludeId && shortcut.id === excludeId) continue;
      if (!shortcut.enabled) continue;

      if (this.keysEqual(keys, shortcut.keys)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if two shortcut keys are equal
   */
  private keysEqual(a: ShortcutKey, b: ShortcutKey): boolean {
    return (
      a.key.toLowerCase() === b.key.toLowerCase() &&
      !!a.ctrl === !!b.ctrl &&
      !!a.shift === !!b.shift &&
      !!a.alt === !!b.alt &&
      !!a.meta === !!b.meta
    );
  }

  /**
   * Reset to defaults
   */
  resetToDefaults(): void {
    this.shortcuts.clear();
    DEFAULT_SHORTCUTS.forEach((shortcut) => {
      this.shortcuts.set(shortcut.id, { ...shortcut });
    });
  }

  /**
   * Export shortcuts configuration
   */
  exportConfig(): string {
    return JSON.stringify(Array.from(this.shortcuts.values()), null, 2);
  }

  /**
   * Import shortcuts configuration
   */
  importConfig(json: string): void {
    try {
      const shortcuts = JSON.parse(json) as Shortcut[];
      this.shortcuts.clear();
      shortcuts.forEach((shortcut) => {
        this.shortcuts.set(shortcut.id, shortcut);
      });
    } catch (error) {
      console.error('Failed to import shortcuts config:', error);
      throw new Error('Invalid shortcuts configuration');
    }
  }
}

/**
 * Save shortcuts to localStorage
 */
export function saveShortcutsToStorage(shortcuts: Shortcut[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem('medibot-shortcuts', JSON.stringify(shortcuts));
  } catch (error) {
    console.error('Failed to save shortcuts:', error);
  }
}

/**
 * Load shortcuts from localStorage
 */
export function loadShortcutsFromStorage(): Shortcut[] | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem('medibot-shortcuts');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load shortcuts:', error);
  }
  
  return null;
}
