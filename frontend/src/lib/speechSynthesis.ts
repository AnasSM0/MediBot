/**
 * Speech Synthesis Service
 * 
 * Production-ready text-to-speech handler using browser-native SpeechSynthesis API.
 * Supports all modern browsers with graceful degradation.
 * 
 * Features:
 * - Text-to-speech with voice selection
 * - Pause, resume, and cancel controls
 * - Speech queue management
 * - Interrupt on new messages
 * - Event callbacks for speech lifecycle
 */

export type SpeechSynthesisConfig = {
  voice?: SpeechSynthesisVoice | null;
  rate?: number; // 0.1 to 10 (default: 1)
  pitch?: number; // 0 to 2 (default: 1)
  volume?: number; // 0 to 1 (default: 1)
  lang?: string;
};

export type SpeechCallbacks = {
  onStart?: () => void;
  onEnd?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onError?: (error: string) => void;
  onBoundary?: (charIndex: number) => void;
};

/**
 * Check if Speech Synthesis API is supported in the current browser
 */
export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/**
 * Get available voices from the browser
 * Note: Voices may load asynchronously, so this should be called after voices are loaded
 */
export function getAvailableVoices(): SpeechSynthesisVoice[] {
  if (!isSpeechSynthesisSupported()) return [];
  return window.speechSynthesis.getVoices();
}

/**
 * Get the default voice for a specific language
 */
export function getDefaultVoice(lang: string = "en-US"): SpeechSynthesisVoice | null {
  const voices = getAvailableVoices();
  
  // Try to find a voice that matches the language
  const matchingVoice = voices.find((voice) => voice.lang === lang);
  if (matchingVoice) return matchingVoice;
  
  // Try to find a voice that starts with the language code
  const langCode = lang.split("-")[0];
  const partialMatch = voices.find((voice) => voice.lang.startsWith(langCode));
  if (partialMatch) return partialMatch;
  
  // Return the default voice
  return voices.find((voice) => voice.default) || voices[0] || null;
}

/**
 * Speech Synthesis Manager
 * 
 * Handles the lifecycle of text-to-speech with proper queue management and interruption.
 */
export class SpeechSynthesisManager {
  private synthesis: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private config: SpeechSynthesisConfig = {
    rate: 1,
    pitch: 1,
    volume: 1,
    lang: "en-US",
    voice: null,
  };
  private callbacks: SpeechCallbacks = {};
  private isSpeaking = false;

  constructor(config: SpeechSynthesisConfig = {}) {
    if (!isSpeechSynthesisSupported()) {
      console.warn("Speech Synthesis is not supported in this browser");
      return;
    }

    this.synthesis = window.speechSynthesis;
    this.config = {
      rate: config.rate ?? 1,
      pitch: config.pitch ?? 1,
      volume: config.volume ?? 1,
      lang: config.lang ?? "en-US",
      voice: config.voice ?? null,
    };
  }

  /**
   * Speak the given text
   */
  speak(text: string, callbacks?: SpeechCallbacks): boolean {
    if (!this.synthesis) {
      callbacks?.onError?.("Speech synthesis is not supported");
      return false;
    }

    // Cancel any ongoing speech
    this.cancel();

    // Store callbacks
    this.callbacks = callbacks || {};

    try {
      // Create utterance
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Apply configuration
      utterance.rate = this.config.rate!;
      utterance.pitch = this.config.pitch!;
      utterance.volume = this.config.volume!;
      utterance.lang = this.config.lang!;
      
      if (this.config.voice) {
        utterance.voice = this.config.voice;
      }

      // Setup event handlers
      this.setupUtteranceHandlers(utterance);

      // Store current utterance
      this.currentUtterance = utterance;

      // Speak
      this.synthesis.speak(utterance);
      this.isSpeaking = true;

      return true;
    } catch (error) {
      console.error("Failed to speak:", error);
      this.callbacks.onError?.(`Failed to speak: ${error}`);
      return false;
    }
  }

  /**
   * Setup event handlers for the utterance
   */
  private setupUtteranceHandlers(utterance: SpeechSynthesisUtterance): void {
    utterance.onstart = () => {
      this.isSpeaking = true;
      this.callbacks.onStart?.();
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      this.currentUtterance = null;
      this.callbacks.onEnd?.();
    };

    utterance.onerror = (event) => {
      console.error("Speech synthesis error:", event.error);
      this.isSpeaking = false;
      this.currentUtterance = null;
      
      // Handle specific errors
      let errorMessage = "Speech synthesis error";
      switch (event.error) {
        case "canceled":
          errorMessage = "Speech was canceled";
          break;
        case "interrupted":
          errorMessage = "Speech was interrupted";
          break;
        case "audio-busy":
          errorMessage = "Audio device is busy";
          break;
        case "audio-hardware":
          errorMessage = "Audio hardware error";
          break;
        case "network":
          errorMessage = "Network error occurred";
          break;
        case "synthesis-unavailable":
          errorMessage = "Speech synthesis unavailable";
          break;
        case "synthesis-failed":
          errorMessage = "Speech synthesis failed";
          break;
        case "language-unavailable":
          errorMessage = "Language not available";
          break;
        case "voice-unavailable":
          errorMessage = "Voice not available";
          break;
        default:
          errorMessage = `Speech error: ${event.error}`;
      }
      
      this.callbacks.onError?.(errorMessage);
    };

    utterance.onpause = () => {
      this.callbacks.onPause?.();
    };

    utterance.onresume = () => {
      this.callbacks.onResume?.();
    };

    utterance.onboundary = (event) => {
      this.callbacks.onBoundary?.(event.charIndex);
    };
  }

  /**
   * Pause the current speech
   */
  pause(): void {
    if (!this.synthesis || !this.isSpeaking) return;
    
    try {
      this.synthesis.pause();
    } catch (error) {
      console.error("Failed to pause speech:", error);
    }
  }

  /**
   * Resume paused speech
   */
  resume(): void {
    if (!this.synthesis) return;
    
    try {
      this.synthesis.resume();
    } catch (error) {
      console.error("Failed to resume speech:", error);
    }
  }

  /**
   * Cancel the current speech
   */
  cancel(): void {
    if (!this.synthesis) return;
    
    try {
      this.synthesis.cancel();
      this.isSpeaking = false;
      this.currentUtterance = null;
    } catch (error) {
      console.error("Failed to cancel speech:", error);
    }
  }

  /**
   * Check if currently speaking
   */
  getIsSpeaking(): boolean {
    return this.isSpeaking && this.synthesis?.speaking === true;
  }

  /**
   * Check if speech is paused
   */
  getIsPaused(): boolean {
    return this.synthesis?.paused === true;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<SpeechSynthesisConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): SpeechSynthesisConfig {
    return { ...this.config };
  }

  /**
   * Cleanup and destroy the manager
   */
  destroy(): void {
    this.cancel();
    this.synthesis = null;
    this.currentUtterance = null;
    this.callbacks = {};
  }
}

/**
 * Wait for voices to be loaded
 * Some browsers load voices asynchronously
 */
export function waitForVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (!isSpeechSynthesisSupported()) {
      resolve([]);
      return;
    }

    const voices = window.speechSynthesis.getVoices();
    
    // If voices are already loaded, return them
    if (voices.length > 0) {
      resolve(voices);
      return;
    }

    // Wait for voiceschanged event
    const handleVoicesChanged = () => {
      const loadedVoices = window.speechSynthesis.getVoices();
      if (loadedVoices.length > 0) {
        window.speechSynthesis.removeEventListener("voiceschanged", handleVoicesChanged);
        resolve(loadedVoices);
      }
    };

    window.speechSynthesis.addEventListener("voiceschanged", handleVoicesChanged);

    // Timeout after 3 seconds
    setTimeout(() => {
      window.speechSynthesis.removeEventListener("voiceschanged", handleVoicesChanged);
      resolve(window.speechSynthesis.getVoices());
    }, 3000);
  });
}
