# Voice Input - Quick Start Guide

## 🚀 Quick Integration

### 1. Add to Any Component

```typescript
import { VoiceInputButton } from "@/components/chat/VoiceInputButton";

function MyComponent() {
  const [text, setText] = useState("");

  return (
    <div>
      <VoiceInputButton onTranscript={setText} />
      <input value={text} onChange={(e) => setText(e.target.value)} />
    </div>
  );
}
```

### 2. Use the Hook Directly

```typescript
import { useVoiceInput } from "@/hooks/useVoiceInput";

function MyComponent() {
  const { isListening, transcript, startListening, stopListening } = useVoiceInput({
    onFinalTranscript: (text) => console.log("Done:", text),
  });

  return (
    <button onClick={isListening ? stopListening : startListening}>
      {isListening ? "Stop" : "Start"}
    </button>
  );
}
```

## 📁 File Structure

```
frontend/src/
├── lib/
│   └── speech.ts                    # Core speech service
├── hooks/
│   └── useVoiceInput.ts            # React hook
├── components/chat/
│   ├── VoiceInputButton.tsx        # UI component
│   └── ChatInput.tsx               # Integrated example
└── types/
    └── speech.d.ts                 # TypeScript definitions
```

## 🎯 Key Features

- ✅ **Zero Dependencies** - Uses browser-native API
- ✅ **Auto-Stop** - Stops after 3 seconds of silence
- ✅ **Live Feedback** - Real-time transcription display
- ✅ **Error Handling** - Graceful degradation
- ✅ **TypeScript** - Full type safety

## 🔧 Configuration Options

### Language

```typescript
useVoiceInput({ language: "es-ES" }) // Spanish
useVoiceInput({ language: "fr-FR" }) // French
useVoiceInput({ language: "de-DE" }) // German
```

### Callbacks

```typescript
useVoiceInput({
  onTranscriptChange: (text) => console.log("Live:", text),
  onFinalTranscript: (text) => console.log("Final:", text),
  onError: (error) => console.error(error),
})
```

## 🧪 Testing

### Demo Page
Visit `/voice-demo` to test the feature interactively.

### Browser Console
```javascript
// Check support
console.log(isSpeechRecognitionSupported());

// Manual test
const manager = new SpeechRecognitionManager();
manager.start({
  onTranscript: (text) => console.log(text),
});
```

## 🐛 Common Issues

| Issue | Solution |
|-------|----------|
| Button not showing | Browser doesn't support Web Speech API |
| Permission denied | Allow microphone in browser settings |
| Inaccurate transcription | Speak clearly, reduce background noise |
| Auto-stop too fast | Adjust timeout in `speech.ts` |

## 📚 Resources

- [Full Documentation](../VOICE_INPUT_DOCUMENTATION.md)
- [Web Speech API Docs](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [Browser Compatibility](https://caniuse.com/speech-recognition)

## 💡 Examples

### Basic Usage
```typescript
<VoiceInputButton onTranscript={(text) => console.log(text)} />
```

### With Disabled State
```typescript
<VoiceInputButton 
  onTranscript={handleText} 
  disabled={isSending}
/>
```

### Custom Styling
```typescript
<VoiceInputButton 
  onTranscript={handleText}
  className="custom-class"
/>
```

---

**Need help?** Check the [full documentation](../VOICE_INPUT_DOCUMENTATION.md) or open an issue.
