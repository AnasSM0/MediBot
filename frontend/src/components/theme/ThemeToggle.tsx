/**
 * Theme Toggle Component
 * 
 * UI component for switching between Light/Dark/Auto themes.
 */

"use client";

import { Sun, Moon, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

export type ThemeToggleProps = {
  className?: string;
  showLabel?: boolean;
};

/**
 * Theme Toggle Component
 * 
 * Dropdown menu for selecting theme (Light/Dark/Auto).
 * 
 * @example
 * ```tsx
 * <ThemeToggle />
 * <ThemeToggle showLabel />
 * ```
 */
export function ThemeToggle({ className, showLabel = false }: ThemeToggleProps) {
  const { theme, effectiveTheme, systemTheme, setTheme } = useTheme();

  const getIcon = () => {
    if (effectiveTheme === 'dark') {
      return <Moon className="h-5 w-5" />;
    }
    return <Sun className="h-5 w-5" />;
  };

  const getLabel = () => {
    if (theme === 'auto') {
      return `Auto (${systemTheme === 'dark' ? 'Dark' : 'Light'})`;
    }
    return theme === 'dark' ? 'Dark' : 'Light';
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={showLabel ? "default" : "icon"}
          className={cn("transition-colors", className)}
          title="Change theme"
        >
          {getIcon()}
          {showLabel && <span className="ml-2">{getLabel()}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem
          onClick={() => setTheme('light')}
          className={cn(
            "cursor-pointer",
            theme === 'light' && "bg-accent"
          )}
        >
          <Sun className="mr-2 h-4 w-4" />
          <span>Light</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem
          onClick={() => setTheme('dark')}
          className={cn(
            "cursor-pointer",
            theme === 'dark' && "bg-accent"
          )}
        >
          <Moon className="mr-2 h-4 w-4" />
          <span>Dark</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem
          onClick={() => setTheme('auto')}
          className={cn(
            "cursor-pointer",
            theme === 'auto' && "bg-accent"
          )}
        >
          <Monitor className="mr-2 h-4 w-4" />
          <div className="flex flex-col">
            <span>Auto</span>
            <span className="text-xs text-muted-foreground">
              Follows system ({systemTheme === 'dark' ? 'Dark' : 'Light'})
            </span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Simple Theme Toggle Button
 * 
 * Single button that toggles between light and dark.
 */
export function SimpleThemeToggle({ className }: { className?: string }) {
  const { effectiveTheme, toggle } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      className={cn("transition-colors", className)}
      title={`Switch to ${effectiveTheme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {effectiveTheme === 'dark' ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </Button>
  );
}
