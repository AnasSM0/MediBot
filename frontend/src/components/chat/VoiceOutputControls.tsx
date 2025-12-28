/**
 * Voice Output Controls Component
 * 
 * UI component for controlling text-to-speech output.
 * Features toggle on/off, voice selection, and playback controls.
 */

"use client";

import { useEffect, useState } from "react";
import { Volume2, VolumeX, Pause, Play, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useVoiceOutput } from "@/hooks/useVoiceOutput";

export type VoiceOutputControlsProps = {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  className?: string;
};

/**
 * Voice Output Controls Component
 * 
 * Provides UI controls for text-to-speech functionality:
 * - Toggle voice output on/off
 * - Select voice from available options
 * - Pause/resume current speech
 * - Visual feedback for speaking state
 * 
 * @example
 * ```tsx
 * const [voiceEnabled, setVoiceEnabled] = useState(false);
 * 
 * <VoiceOutputControls 
 *   enabled={voiceEnabled}
 *   onToggle={setVoiceEnabled}
 * />
 * ```
 */
export function VoiceOutputControls({ enabled, onToggle, className }: VoiceOutputControlsProps) {
  const {
    isSpeaking,
    isPaused,
    isSupported,
    voices,
    selectedVoice,
    pause,
    resume,
    cancel,
    setVoice,
  } = useVoiceOutput();

  const [isOpen, setIsOpen] = useState(false);

  // Don't render if not supported
  if (!isSupported) {
    return null;
  }

  const handleToggle = () => {
    const newState = !enabled;
    onToggle(newState);
    
    // Cancel any ongoing speech when disabling
    if (!newState && isSpeaking) {
      cancel();
    }
  };

  const handleVoiceSelect = (voice: SpeechSynthesisVoice) => {
    setVoice(voice);
    setIsOpen(false);
  };

  const handlePauseResume = () => {
    if (isPaused) {
      resume();
    } else {
      pause();
    }
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Toggle Button */}
      <Button
        type="button"
        size="icon"
        variant={enabled ? "default" : "ghost"}
        className={cn(
          "relative transition-all duration-200",
          enabled && "bg-primary hover:bg-primary/90",
          !enabled && "text-muted-foreground hover:text-foreground"
        )}
        onClick={handleToggle}
        title={enabled ? "Disable voice output" : "Enable voice output"}
      >
        {enabled ? (
          <Volume2 className="h-5 w-5" />
        ) : (
          <VolumeX className="h-5 w-5" />
        )}
        
        {/* Speaking indicator */}
        {enabled && isSpeaking && !isPaused && (
          <span className="absolute -right-1 -top-1 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
          </span>
        )}
      </Button>

      {/* Pause/Resume Button (only when speaking) */}
      {enabled && isSpeaking && (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="text-muted-foreground hover:text-foreground"
          onClick={handlePauseResume}
          title={isPaused ? "Resume speech" : "Pause speech"}
        >
          {isPaused ? (
            <Play className="h-4 w-4" />
          ) : (
            <Pause className="h-4 w-4" />
          )}
        </Button>
      )}

      {/* Voice Selection Dropdown */}
      {enabled && voices.length > 0 && (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="text-muted-foreground hover:text-foreground"
              title="Voice settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Select Voice</DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            {/* Group voices by language */}
            {(() => {
              const groupedVoices = voices.reduce((acc, voice) => {
                const lang = voice.lang.split("-")[0];
                if (!acc[lang]) acc[lang] = [];
                acc[lang].push(voice);
                return acc;
              }, {} as Record<string, SpeechSynthesisVoice[]>);

              return Object.entries(groupedVoices).map(([lang, langVoices]) => (
                <div key={lang}>
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    {lang.toUpperCase()}
                  </DropdownMenuLabel>
                  {langVoices.map((voice) => (
                    <DropdownMenuItem
                      key={voice.name}
                      onClick={() => handleVoiceSelect(voice)}
                      className={cn(
                        "cursor-pointer",
                        selectedVoice?.name === voice.name && "bg-accent"
                      )}
                    >
                      <div className="flex flex-col">
                        <span className="text-sm">{voice.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {voice.lang}
                          {voice.default && " (Default)"}
                        </span>
                      </div>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                </div>
              ));
            })()}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Status tooltip when speaking */}
      {enabled && isSpeaking && (
        <div className="absolute bottom-full right-0 mb-2 rounded-lg bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg border border-border/50">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="font-medium">
              {isPaused ? "Paused" : "Speaking..."}
            </span>
          </div>
          {selectedVoice && (
            <p className="mt-1 text-muted-foreground">
              {selectedVoice.name}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
