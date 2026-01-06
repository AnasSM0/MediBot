/**
 * Voice Output Hook
 * 
 * React hook for managing text-to-speech with browser-native SpeechSynthesis API.
 * Provides a clean interface for components to use voice output.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  SpeechSynthesisManager,
  isSpeechSynthesisSupported,
  waitForVoices,
  getDefaultVoice,
  type SpeechSynthesisConfig,
} from "@/lib/speechSynthesis";

export type UseVoiceOutputOptions = {
  autoPlay?: boolean;
  rate?: number;
  pitch?: number;
  volume?: number;
  lang?: string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
};

export type UseVoiceOutputReturn = {
  isSpeaking: boolean;
  isPaused: boolean;
  isSupported: boolean;
  voices: SpeechSynthesisVoice[];
  selectedVoice: SpeechSynthesisVoice | null;
  error: string | null;
  speak: (text: string) => void;
  pause: () => void;
  resume: () => void;
  cancel: () => void;
  setVoice: (voice: SpeechSynthesisVoice | null) => void;
  setRate: (rate: number) => void;
  setPitch: (pitch: number) => void;
  setVolume: (volume: number) => void;
};

/**
 * Hook for managing voice output with Speech Synthesis API
 * 
 * @example
 * ```tsx
 * const { isSpeaking, speak, cancel, voices, setVoice } = useVoiceOutput({
 *   rate: 1.0,
 *   onEnd: () => console.log("Speech finished"),
 * });
 * 
 * // Speak text
 * speak("Hello, how can I help you?");
 * 
 * // Cancel speech
 * cancel();
 * ```
 */
export function useVoiceOutput(options: UseVoiceOutputOptions = {}): UseVoiceOutputReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    setIsSupported(isSpeechSynthesisSupported());
  }, []);

  const managerRef = useRef<SpeechSynthesisManager | null>(null);
  const configRef = useRef<SpeechSynthesisConfig>({
    rate: options.rate ?? 1,
    pitch: options.pitch ?? 1,
    volume: options.volume ?? 1,
    lang: options.lang ?? "en-US",
  });

  // Load voices on mount
  useEffect(() => {
    if (!isSupported) return;

    const loadVoices = async () => {
      const loadedVoices = await waitForVoices();
      setVoices(loadedVoices);

      // Set default voice
      const defaultVoice = getDefaultVoice(options.lang);
      setSelectedVoice(defaultVoice);
      configRef.current.voice = defaultVoice;
    };

    void loadVoices();
  }, [isSupported, options.lang]);

  // Initialize manager on mount
  useEffect(() => {
    if (!isSupported) return;

    managerRef.current = new SpeechSynthesisManager(configRef.current);

    return () => {
      managerRef.current?.destroy();
      managerRef.current = null;
    };
  }, [isSupported]);

  /**
   * Speak the given text
   */
  const speak = useCallback(
    (text: string) => {
      if (!isSupported) {
        const errorMsg = "Speech synthesis is not supported in this browser.";
        setError(errorMsg);
        options.onError?.(errorMsg);
        return;
      }

      if (!managerRef.current) {
        const errorMsg = "Speech synthesis manager not initialized";
        setError(errorMsg);
        options.onError?.(errorMsg);
        return;
      }

      // Reset error
      setError(null);

      // Update config with current voice
      managerRef.current.updateConfig(configRef.current);

      const success = managerRef.current.speak(text, {
        onStart: () => {
          setIsSpeaking(true);
          setIsPaused(false);
          options.onStart?.();
        },
        onEnd: () => {
          setIsSpeaking(false);
          setIsPaused(false);
          options.onEnd?.();
        },
        onPause: () => {
          setIsPaused(true);
        },
        onResume: () => {
          setIsPaused(false);
        },
        onError: (errorMsg) => {
          setError(errorMsg);
          setIsSpeaking(false);
          setIsPaused(false);
          options.onError?.(errorMsg);
        },
      });

      if (!success) {
        setIsSpeaking(false);
      }
    },
    [isSupported, options]
  );

  /**
   * Pause the current speech
   */
  const pause = useCallback(() => {
    managerRef.current?.pause();
    setIsPaused(true);
  }, []);

  /**
   * Resume paused speech
   */
  const resume = useCallback(() => {
    managerRef.current?.resume();
    setIsPaused(false);
  }, []);

  /**
   * Cancel the current speech
   */
  const cancel = useCallback(() => {
    managerRef.current?.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
  }, []);

  /**
   * Set the voice to use
   */
  const setVoice = useCallback((voice: SpeechSynthesisVoice | null) => {
    setSelectedVoice(voice);
    configRef.current.voice = voice;
  }, []);

  /**
   * Set the speech rate
   */
  const setRate = useCallback((rate: number) => {
    configRef.current.rate = Math.max(0.1, Math.min(10, rate));
  }, []);

  /**
   * Set the speech pitch
   */
  const setPitch = useCallback((pitch: number) => {
    configRef.current.pitch = Math.max(0, Math.min(2, pitch));
  }, []);

  /**
   * Set the speech volume
   */
  const setVolume = useCallback((volume: number) => {
    configRef.current.volume = Math.max(0, Math.min(1, volume));
  }, []);

  return {
    isSpeaking,
    isPaused,
    isSupported,
    voices,
    selectedVoice,
    error,
    speak,
    pause,
    resume,
    cancel,
    setVoice,
    setRate,
    setPitch,
    setVolume,
  };
}
