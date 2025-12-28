# Voice Output - Quick Start Guide

## 🚀 Quick Integration

### 1. Use the Hook Directly

```typescript
import { useVoiceOutput } from "@/hooks/useVoiceOutput";

function MyComponent() {
  const { speak, cancel, isSpeaking } = useVoiceOutput({
    rate: 1.0,
    onEnd: () => console.log("Speech finished"),
  });

  return (
    <button onClick={() => speak("Hello, world!")}>
      {isSpeaking ? "Speaking..." : "Speak"}
    </button>
  );
}
```

### 2. Use the Controls Component

```typescript
import { VoiceOutputControls } from "@/components/chat/VoiceOutputControls";
import { useVoiceOutput } from "@/hooks/useVoiceOutput";

function MyComponent() {
  const [enabled, setEnabled] = useState(false);
  const { speak } = useVoiceOutput();

  useEffect(() => {
    if (enabled) {
      speak("Voice output is now enabled!");
    }
  }, [enabled]);

  return (
    <VoiceOutputControls 
      enabled={enabled}
      onToggle={setEnabled}
    />
  );
}
```

### 3. Auto-Speak Bot Responses

```typescript
import { useVoiceOutput } from "@/hooks/useVoiceOutput";

function ChatComponent() {
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const { speak, cancel, isSpeaking } = useVoiceOutput();

  const handleBotResponse = (response: string) => {
    // Cancel any ongoing speech
    if (isSpeaking) {
      cancel();
    }
    
    // Speak new response if enabled
    if (voiceEnabled) {
      speak(response);
    }
  };

  return (
    <div>
      <VoiceOutputControls enabled={voiceEnabled} onToggle={setVoiceEnabled} />
      {/* Your chat UI */}
    </div>
  );
}
```

---

## 📁 File Structure

```
frontend/src/
├── lib/
│   └── speechSynthesis.ts          # Core speech synthesis service
├── hooks/
│   └── useVoiceOutput.ts           # React hook
├── components/
│   ├── chat/
│   │   └── VoiceOutputControls.tsx # UI controls component
│   └── ui/
│       └── dropdown-menu.tsx       # Dropdown for voice selection
└── app/
    ├── chat/
    │   └── ChatScreen.tsx          # Integrated example
    └── voice-output-demo/
        └── page.tsx                # Demo page
```

---

## 🎯 Key Features

- ✅ **Zero Dependencies** - Uses browser-native API
- ✅ **Voice Selection** - Choose from available system voices
- ✅ **Playback Controls** - Pause, resume, cancel
- ✅ **Auto-Interrupt** - Stops on new messages
- ✅ **TypeScript** - Full type safety
- ✅ **Error Handling** - Graceful degradation

---

## 🔧 Configuration Options

### Voice Selection

```typescript
const { voices, selectedVoice, setVoice } = useVoiceOutput();

// Get all available voices
console.log(voices);

// Set a specific voice
setVoice(voices[0]);
```

### Speech Settings

```typescript
const { setRate, setPitch, setVolume } = useVoiceOutput();

setRate(1.2);    // 20% faster
setPitch(1.1);   // 10% higher pitch
setVolume(0.8);  // 80% volume
```

### Callbacks

```typescript
useVoiceOutput({
  onStart: () => console.log("Started speaking"),
  onEnd: () => console.log("Finished speaking"),
  onError: (error) => console.error("Error:", error),
})
```

---

## 🧪 Testing

### Demo Page
Visit `/voice-output-demo` to test the feature interactively.

### Browser Console
```javascript
// Check support
console.log(isSpeechSynthesisSupported());

// Get available voices
const voices = await waitForVoices();
console.log(voices);

// Manual test
const manager = new SpeechSynthesisManager();
manager.speak("Hello, world!");
```

---

## 🐛 Common Issues

| Issue | Solution |
|-------|----------|
| No voices available | Wait for voices to load (async), then refresh |
| Speech not working | Check if enabled, verify browser support |
| Robotic voice | Try different voices, adjust rate/pitch |
| Speech cuts off | Browser limitation, handled automatically |

---

## 📚 API Reference

### `useVoiceOutput(options?)`

**Options:**
- `autoPlay?: boolean` - Auto-play on mount
- `rate?: number` - Speech rate (0.1-10, default: 1)
- `pitch?: number` - Speech pitch (0-2, default: 1)
- `volume?: number` - Speech volume (0-1, default: 1)
- `lang?: string` - Language code (default: "en-US")
- `onStart?: () => void` - Called when speech starts
- `onEnd?: () => void` - Called when speech ends
- `onError?: (error: string) => void` - Called on error

**Returns:**
- `isSpeaking: boolean` - Currently speaking
- `isPaused: boolean` - Currently paused
- `isSupported: boolean` - Browser support status
- `voices: SpeechSynthesisVoice[]` - Available voices
- `selectedVoice: SpeechSynthesisVoice | null` - Current voice
- `error: string | null` - Error message
- `speak: (text: string) => void` - Speak text
- `pause: () => void` - Pause speech
- `resume: () => void` - Resume speech
- `cancel: () => void` - Cancel speech
- `setVoice: (voice) => void` - Set voice
- `setRate: (rate) => void` - Set rate
- `setPitch: (pitch) => void` - Set pitch
- `setVolume: (volume) => void` - Set volume

---

## 💡 Examples

### Basic Usage
```typescript
const { speak } = useVoiceOutput();
speak("Hello, world!");
```

### With Voice Selection
```typescript
const { voices, setVoice, speak } = useVoiceOutput();

// Use first available voice
if (voices.length > 0) {
  setVoice(voices[0]);
}

speak("Testing voice output");
```

### With Playback Controls
```typescript
const { speak, pause, resume, cancel, isSpeaking, isPaused } = useVoiceOutput();

speak("This is a long message that can be paused");

// Later...
if (isSpeaking && !isPaused) {
  pause();
}

// Resume
if (isPaused) {
  resume();
}

// Stop completely
cancel();
```

### Auto-Speak on Data Change
```typescript
const { speak } = useVoiceOutput();
const [botResponse, setBotResponse] = useState("");

useEffect(() => {
  if (botResponse) {
    speak(botResponse);
  }
}, [botResponse, speak]);
```

---

## 📖 Resources

- **[Full Documentation](VOICE_OUTPUT_COMPLETE.md)** - Complete guide
- **[Architecture](VOICE_OUTPUT_ARCHITECTURE.md)** - System design
- **[MDN Docs](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis)** - Web Speech API
- **[Browser Support](https://caniuse.com/speech-synthesis)** - Compatibility

---

**Need help?** Check the [full documentation](VOICE_OUTPUT_COMPLETE.md) or visit the demo page at `/voice-output-demo`.
