/**
 * Web Speech API Service
 * 
 * Production-ready speech recognition handler using browser-native Web Speech API.
 * Supports Chrome, Edge, and Safari with graceful degradation.
 * 
 * Features:
 * - Push-to-talk with auto-stop on silence
 * - Live transcription streaming
 * - Error handling and recovery
 * - Browser compatibility detection
 */

export type SpeechRecognitionConfig = {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
};

export type SpeechCallbacks = {
  onTranscript?: (transcript: string, isFinal: boolean) => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
  onStart?: () => void;
};

/**
 * Check if Web Speech API is supported in the current browser
 */
export function isSpeechRecognitionSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    ("webkitSpeechRecognition" in window || "SpeechRecognition" in window)
  );
}

function getSpeechRecognition(): typeof SpeechRecognition | null {
  if (typeof window === "undefined") return null;
  
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

/**
 * Speech Recognition Manager
 * 
 * Handles the lifecycle of speech recognition with proper cleanup and error handling.
 */
export class SpeechRecognitionManager {
  private recognition: SpeechRecognition | null = null;
  private isListening = false;
  private silenceTimer: NodeJS.Timeout | null = null;
  private callbacks: SpeechCallbacks = {};
  private config: SpeechRecognitionConfig;

  constructor(config: SpeechRecognitionConfig = {}) {
    this.config = {
      language: config.language || "en-US",
      continuous: config.continuous ?? true,
      interimResults: config.interimResults ?? true,
      maxAlternatives: config.maxAlternatives || 1,
    };
  }

  /**
   * Initialize the speech recognition instance
   */
  private initialize(): boolean {
    const SpeechRecognitionConstructor = getSpeechRecognition();
    
    if (!SpeechRecognitionConstructor) {
      this.callbacks.onError?.("Speech recognition is not supported in this browser");
      return false;
    }

    try {
      this.recognition = new SpeechRecognitionConstructor();
      this.recognition.lang = this.config.language!;
      this.recognition.continuous = this.config.continuous!;
      this.recognition.interimResults = this.config.interimResults!;
      this.recognition.maxAlternatives = this.config.maxAlternatives!;

      this.setupEventHandlers();
      return true;
    } catch (error) {
      this.callbacks.onError?.(`Failed to initialize speech recognition: ${error}`);
      return false;
    }
  }

  /**
   * Setup event handlers for speech recognition
   */
  private setupEventHandlers(): void {
    if (!this.recognition) return;

    this.recognition.onstart = () => {
      this.isListening = true;
      this.callbacks.onStart?.();
    };

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      this.resetSilenceTimer();

      const result = event.results[event.resultIndex];
      const transcript = result[0].transcript;
      const isFinal = result.isFinal;

      this.callbacks.onTranscript?.(transcript, isFinal);
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Speech recognition error:", event.error);
      
      // Handle specific errors
      switch (event.error) {
        case "no-speech":
          this.callbacks.onError?.("No speech detected. Please try again.");
          break;
        case "audio-capture":
          this.callbacks.onError?.("Microphone access denied or unavailable.");
          break;
        case "not-allowed":
          this.callbacks.onError?.("Microphone permission denied. Please enable it in your browser settings.");
          break;
        case "network":
          this.callbacks.onError?.("Network error occurred. Please check your connection.");
          break;
        default:
          this.callbacks.onError?.(`Speech recognition error: ${event.error}`);
      }

      this.stop();
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.clearSilenceTimer();
      this.callbacks.onEnd?.();
    };
  }

  /**
   * Start listening for speech input
   */
  start(callbacks: SpeechCallbacks): boolean {
    this.callbacks = callbacks;

    if (this.isListening) {
      console.warn("Speech recognition is already active");
      return false;
    }

    if (!this.recognition) {
      if (!this.initialize()) {
        return false;
      }
    }

    try {
      this.recognition?.start();
      this.resetSilenceTimer();
      return true;
    } catch (error) {
      console.error("Failed to start speech recognition:", error);
      this.callbacks.onError?.("Failed to start speech recognition. Please try again.");
      return false;
    }
  }

  /**
   * Stop listening and cleanup
   */
  stop(): void {
    if (!this.isListening || !this.recognition) return;

    try {
      this.recognition.stop();
      this.clearSilenceTimer();
    } catch (error) {
      console.error("Error stopping speech recognition:", error);
    }
  }

  /**
   * Reset the silence detection timer
   * Auto-stops recognition after 3 seconds of silence
   */
  private resetSilenceTimer(): void {
    this.clearSilenceTimer();
    
    this.silenceTimer = setTimeout(() => {
      if (this.isListening) {
        this.stop();
      }
    }, 3000); // 3 seconds of silence
  }

  /**
   * Clear the silence detection timer
   */
  private clearSilenceTimer(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  /**
   * Check if currently listening
   */
  getIsListening(): boolean {
    return this.isListening;
  }

  /**
   * Cleanup and destroy the recognition instance
   */
  destroy(): void {
    this.stop();
    this.recognition = null;
    this.callbacks = {};
  }
}
