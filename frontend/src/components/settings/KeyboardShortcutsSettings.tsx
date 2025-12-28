/**
 * Keyboard Shortcuts Settings Component
 * 
 * UI for viewing and configuring keyboard shortcuts.
 */

"use client";

import { useState } from "react";
import { Keyboard, RotateCcw, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { formatShortcutKeys, type Shortcut } from "@/lib/shortcuts";
import { toast } from "@/components/ui/use-toast";

export function KeyboardShortcutsSettings() {
  const { shortcuts, toggleShortcut, resetToDefaults } = useKeyboardShortcuts();
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const categories = {
    chat: 'Chat',
    voice: 'Voice',
    navigation: 'Navigation',
    history: 'History',
  };

  const handleToggle = (id: string, enabled: boolean) => {
    toggleShortcut(id, enabled);
    toast({
      title: enabled ? "Shortcut enabled" : "Shortcut disabled",
      description: `Keyboard shortcut has been ${enabled ? 'enabled' : 'disabled'}.`,
    });
  };

  const handleReset = () => {
    if (!showResetConfirm) {
      setShowResetConfirm(true);
      return;
    }

    resetToDefaults();
    setShowResetConfirm(false);
    toast({
      title: "Shortcuts reset",
      description: "All keyboard shortcuts have been reset to defaults.",
    });
  };

  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, Shortcut[]>);

  return (
    <Card className="bg-[#1E1E1E]/90 p-6">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Keyboard Shortcuts</h2>
            <p className="text-sm text-muted-foreground">
              Customize keyboard shortcuts for faster navigation and actions
            </p>
          </div>
          <Button
            onClick={handleReset}
            variant="outline"
            size="sm"
            className={showResetConfirm ? "border-destructive text-destructive" : ""}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            {showResetConfirm ? "Confirm Reset" : "Reset to Defaults"}
          </Button>
        </div>

        {showResetConfirm && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm">
            <p className="text-foreground">
              Are you sure you want to reset all shortcuts to defaults?
            </p>
            <div className="mt-2 flex gap-2">
              <Button onClick={handleReset} variant="destructive" size="sm">
                Yes, reset
              </Button>
              <Button onClick={() => setShowResetConfirm(false)} variant="outline" size="sm">
                Cancel
              </Button>
            </div>
          </div>
        )}

        <Separator className="border-border/70" />

        {/* Shortcuts by Category */}
        <div className="space-y-6">
          {Object.entries(categories).map(([categoryKey, categoryName]) => {
            const categoryShortcuts = groupedShortcuts[categoryKey] || [];
            if (categoryShortcuts.length === 0) return null;

            return (
              <div key={categoryKey}>
                <h3 className="mb-3 text-sm font-semibold text-foreground">{categoryName}</h3>
                <div className="space-y-2">
                  {categoryShortcuts.map((shortcut) => (
                    <div
                      key={shortcut.id}
                      className="flex items-center justify-between rounded-lg bg-[#222222]/50 p-3 transition-colors hover:bg-[#222222]/70"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">
                          {shortcut.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <kbd className="inline-flex items-center gap-1 rounded border border-border/70 bg-[#1A1A1A] px-2 py-1 font-mono text-xs text-foreground shadow-sm">
                          {formatShortcutKeys(shortcut.keys)}
                        </kbd>
                        <button
                          onClick={() => handleToggle(shortcut.id, !shortcut.enabled)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            shortcut.enabled ? 'bg-primary' : 'bg-muted'
                          }`}
                          role="switch"
                          aria-checked={shortcut.enabled}
                          aria-label={`Toggle ${shortcut.description}`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              shortcut.enabled ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Info */}
        <div className="rounded-lg bg-blue-500/10 p-3 text-xs text-muted-foreground">
          <div className="flex gap-2">
            <Info className="h-4 w-4 flex-shrink-0 text-blue-400" />
            <div>
              <p className="font-semibold text-foreground">Tips:</p>
              <ul className="mt-1 space-y-1">
                <li>• Shortcuts work globally across the application</li>
                <li>• Some shortcuts only work when focused on specific elements</li>
                <li>• On Mac, Ctrl is replaced with ⌘ (Command)</li>
                <li>• Disabled shortcuts won't trigger any actions</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

/**
 * Compact Shortcuts Help Component
 * 
 * Shows a quick reference of keyboard shortcuts
 */
export function ShortcutsHelp() {
  const { shortcuts } = useKeyboardShortcuts();
  const enabledShortcuts = shortcuts.filter((s) => s.enabled);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Keyboard className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Keyboard Shortcuts</h3>
      </div>
      <div className="grid gap-2 text-xs">
        {enabledShortcuts.slice(0, 6).map((shortcut) => (
          <div key={shortcut.id} className="flex items-center justify-between">
            <span className="text-muted-foreground">{shortcut.description}</span>
            <kbd className="rounded border border-border/50 bg-[#1A1A1A] px-1.5 py-0.5 font-mono text-foreground">
              {formatShortcutKeys(shortcut.keys)}
            </kbd>
          </div>
        ))}
      </div>
      {enabledShortcuts.length > 6 && (
        <p className="text-xs text-muted-foreground">
          +{enabledShortcuts.length - 6} more shortcuts available
        </p>
      )}
    </div>
  );
}
