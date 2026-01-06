

"use client";

import { useEffect, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useVoiceInput } from "@/hooks/useVoiceInput";

export type VoiceInputButtonProps = {
  onTranscript: (transcript: string) => void;
  disabled?: boolean;
  className?: string;
};

export function VoiceInputButton({ onTranscript, disabled, className }: VoiceInputButtonProps) {
  const [isMounted, setIsMounted] = useState(false);
  const {
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    resetTranscript,
  } = useVoiceInput({
    language: "en-US",
    onFinalTranscript: (finalText) => {
      if (finalText.trim()) {
        onTranscript(finalText);
        resetTranscript();
      }
    },
  });

  // Only enable on client-side
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Update parent component with live transcript
  useEffect(() => {
    const currentText = transcript || interimTranscript;
    if (currentText && isListening) {
      onTranscript(currentText);
    }
  }, [transcript, interimTranscript, isListening, onTranscript]);

  // Handle button click
  const handleClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Don't render content if not supported or not mounted
  // But always render the wrapper to prevent hydration errors
 if (!isMounted || !isSupported) {
  return null;
}


  return (
    <div className={cn("relative", className)}>
      <Button
        type="button"
        size="icon"
        variant={isListening ? "default" : "ghost"}
        className={cn(
          "relative transition-all duration-200",
          isListening && "bg-red-600 hover:bg-red-700 animate-pulse",
          !isListening && "text-muted-foreground hover:text-foreground",
          error && "text-destructive",
          className,
        )}
        onClick={handleClick}
        disabled={disabled}
        title={
          error
            ? error
            : isListening
              ? "Click to stop recording (or wait for auto-stop)"
              : "Click to start voice input"
        }
      >
        {isListening ? (
          <>
            <Mic className="h-5 w-5" />
            {/* Pulsing ring indicator */}
            <span className="absolute inset-0 rounded-md border-2 border-red-400 animate-ping opacity-75" />
          </>
        ) : (
          <MicOff className="h-5 w-5" />
        )}
      </Button>

      {/* Live transcription indicator */}
      {isListening && (interimTranscript || transcript) && (
        <div className="absolute bottom-full left-0 mb-2 max-w-xs rounded-lg bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg border border-border/50">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            <span className="font-medium">Listening...</span>
          </div>
          {(interimTranscript || transcript) && (
            <p className="mt-1 text-muted-foreground">
              {transcript}
              {interimTranscript && (
                <span className="italic opacity-70">{interimTranscript}</span>
              )}
            </p>
          )}
        </div>
      )}

      {/* Error tooltip */}
      {error && !isListening && (
        <div className="absolute bottom-full left-0 mb-2 max-w-xs rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive shadow-lg border border-destructive/50">
          {error}
        </div>
      )}
    </div>
  );
}
