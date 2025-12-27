/**
 * Voice Input Hook
 * 
 * React hook for managing voice input state and lifecycle.
 * Provides a clean interface for components to use speech recognition.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { SpeechRecognitionManager, isSpeechRecognitionSupported } from "@/lib/speech";

export type UseVoiceInputOptions = {
  language?: string;
  onTranscriptChange?: (transcript: string) => void;
  onFinalTranscript?: (transcript: string) => void;
  onError?: (error: string) => void;
};

export type UseVoiceInputReturn = {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
};

/**
 * Hook for managing voice input with Web Speech API
 * 
 * @example
 * ```tsx
 * const { isListening, transcript, startListening, stopListening } = useVoiceInput({
 *   onFinalTranscript: (text) => console.log("Final:", text),
 * });
 * ```
 */
export function useVoiceInput(options: UseVoiceInputOptions = {}): UseVoiceInputReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSupported] = useState(() => isSpeechRecognitionSupported());

  const managerRef = useRef<SpeechRecognitionManager | null>(null);
  const finalTranscriptRef = useRef("");

  // Initialize manager on mount
  useEffect(() => {
    if (!isSupported) return;

    managerRef.current = new SpeechRecognitionManager({
      language: options.language || "en-US",
      continuous: true,
      interimResults: true,
    });

    return () => {
      managerRef.current?.destroy();
      managerRef.current = null;
    };
  }, [isSupported, options.language]);

  /**
   * Start listening for voice input
   */
  const startListening = useCallback(() => {
    if (!isSupported) {
      const errorMsg = "Speech recognition is not supported in this browser. Please use Chrome or Edge.";
      setError(errorMsg);
      options.onError?.(errorMsg);
      return;
    }

    if (!managerRef.current) {
      const errorMsg = "Speech recognition manager not initialized";
      setError(errorMsg);
      options.onError?.(errorMsg);
      return;
    }

    // Reset state
    setError(null);
    setTranscript("");
    setInterimTranscript("");
    finalTranscriptRef.current = "";

    const success = managerRef.current.start({
      onStart: () => {
        setIsListening(true);
      },
      onTranscript: (text, isFinal) => {
        if (isFinal) {
          // Append to final transcript
          const newFinalTranscript = finalTranscriptRef.current + text + " ";
          finalTranscriptRef.current = newFinalTranscript;
          setTranscript(newFinalTranscript.trim());
          setInterimTranscript("");
          options.onTranscriptChange?.(newFinalTranscript.trim());
        } else {
          // Update interim transcript
          setInterimTranscript(text);
          const combined = (finalTranscriptRef.current + text).trim();
          options.onTranscriptChange?.(combined);
        }
      },
      onEnd: () => {
        setIsListening(false);
        setInterimTranscript("");
        
        // Call final transcript callback
        const final = finalTranscriptRef.current.trim();
        if (final) {
          options.onFinalTranscript?.(final);
        }
      },
      onError: (errorMsg) => {
        setError(errorMsg);
        setIsListening(false);
        options.onError?.(errorMsg);
      },
    });

    if (!success) {
      setIsListening(false);
    }
  }, [isSupported, options]);

  /**
   * Stop listening for voice input
   */
  const stopListening = useCallback(() => {
    managerRef.current?.stop();
  }, []);

  /**
   * Reset transcript to empty
   */
  const resetTranscript = useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
    finalTranscriptRef.current = "";
  }, []);

  return {
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    resetTranscript,
  };
}
