# Voice Input UI States & Visual Guide

## 🎨 Visual States

### 1. Idle State (Not Recording)
```
┌─────────────────────────────────────────────────────────────┐
│  [📎]  [🎤]  [Type your message here...          ]  [➤]    │
│         ↑                                                    │
│    Gray microphone icon                                     │
│    Hover: Shows "Click to start voice input"                │
└─────────────────────────────────────────────────────────────┘
```

**Visual Characteristics:**
- Microphone icon: Gray/muted color
- Button variant: Ghost (transparent background)
- Hover state: Lighter gray
- Tooltip: "Click to start voice input"

---

### 2. Listening State (Recording Active)
```
┌─────────────────────────────────────────────────────────────┐
│  [📎]  [🔴]  [Type your message here...          ]  [➤]    │
│         ↑                                                    │
│    Red pulsing microphone                                   │
│    ┌──────────────────────────────────────┐                │
│    │ 🔴 Listening...                      │ ← Tooltip       │
│    │ "I need help with my headache"       │                 │
│    └──────────────────────────────────────┘                │
└─────────────────────────────────────────────────────────────┘
```

**Visual Characteristics:**
- Microphone icon: White on red background
- Button: Red background with pulsing animation
- Pulsing ring: Red border that expands/fades
- Tooltip: Shows "Listening..." with live transcription
- Animation: Continuous pulse effect

**Animation Details:**
```css
/* Pulsing button */
background: red-600
animation: pulse 2s infinite

/* Pulsing ring */
border: 2px solid red-400
animation: ping 1s infinite
opacity: 0.75
```

---

### 3. Transcribing State (User Speaking)
```
┌─────────────────────────────────────────────────────────────┐
│  [📎]  [🔴]  [I need help with my headache        ]  [➤]    │
│         ↑                                                    │
│    Red pulsing microphone                                   │
│    ┌──────────────────────────────────────┐                │
│    │ 🔴 Listening...                      │ ← Tooltip       │
│    │ "I need help with my headache"       │   (Live)        │
│    │ "and it's been going on for"         │   (Interim)     │
│    └──────────────────────────────────────┘                │
└─────────────────────────────────────────────────────────────┘
```

**Visual Characteristics:**
- Text input: Populated with transcript in real-time
- Tooltip: Shows both final and interim transcription
- Final text: Normal opacity
- Interim text: Italic, slightly transparent (70%)

---

### 4. Auto-Stopping State (Silence Detected)
```
┌─────────────────────────────────────────────────────────────┐
│  [📎]  [🎤]  [I need help with my headache        ]  [➤]    │
│         ↑                                                    │
│    Transitioning back to gray                               │
│    Tooltip fades out                                        │
│    Text remains in input field                              │
└─────────────────────────────────────────────────────────────┘
```

**Visual Characteristics:**
- Button: Transitions from red to gray
- Animation: Stops pulsing
- Tooltip: Fades out
- Text: Final transcript remains in input
- Focus: Auto-focuses on text input

---

### 5. Error State (Permission Denied)
```
┌─────────────────────────────────────────────────────────────┐
│  [📎]  [🎤]  [Type your message here...          ]  [➤]    │
│         ↑                                                    │
│    Red microphone icon                                      │
│    ┌──────────────────────────────────────┐                │
│    │ ⚠️ Microphone permission denied.     │ ← Error         │
│    │ Please enable it in browser settings │   Tooltip       │
│    └──────────────────────────────────────┘                │
└─────────────────────────────────────────────────────────────┘
```

**Visual Characteristics:**
- Microphone icon: Red color (destructive)
- Tooltip: Red background with error message
- Border: Red border on tooltip
- Icon: Warning icon (⚠️) in tooltip

---

### 6. Unsupported Browser (Fallback)
```
┌─────────────────────────────────────────────────────────────┐
│  [📎]  [Type your message here...                 ]  [➤]    │
│                                                              │
│    No microphone button (hidden)                            │
│    User can still type normally                             │
└─────────────────────────────────────────────────────────────┘
```

**Visual Characteristics:**
- Microphone button: Completely hidden (not rendered)
- Layout: Seamless, no gap where button would be
- Functionality: Text input works normally

---

## 🎬 Animation Sequences

### Starting Recording
```
1. User clicks microphone button
   ↓
2. Button background fades to red (200ms)
   ↓
3. Pulsing animation starts
   ↓
4. Tooltip appears with "Listening..." (fade in 150ms)
   ↓
5. Pulsing ring animation begins
```

### Receiving Transcription
```
1. User speaks
   ↓
2. Interim text appears in tooltip (italic, 70% opacity)
   ↓
3. Text input updates in real-time
   ↓
4. Final text appears in tooltip (normal, 100% opacity)
   ↓
5. Interim text clears
   ↓
6. Silence timer resets
```

### Stopping Recording
```
1. 3 seconds of silence detected (or manual stop)
   ↓
2. Pulsing animation stops
   ↓
3. Button background fades to gray (200ms)
   ↓
4. Tooltip fades out (150ms)
   ↓
5. Text input auto-focuses
   ↓
6. Final transcript remains in input
```

---

## 🎨 Color Palette

### Idle State
- Button background: `transparent`
- Icon color: `text-muted-foreground` (#6B7280)
- Hover background: `hover:bg-accent` (#F3F4F6)
- Hover icon: `hover:text-foreground` (#111827)

### Listening State
- Button background: `bg-red-600` (#DC2626)
- Hover background: `hover:bg-red-700` (#B91C1C)
- Icon color: `white` (#FFFFFF)
- Pulsing ring: `border-red-400` (#F87171)
- Tooltip background: `bg-popover` (#1F2937)
- Tooltip text: `text-popover-foreground` (#F9FAFB)
- Live indicator: `bg-red-500` (#EF4444)

### Error State
- Icon color: `text-destructive` (#DC2626)
- Tooltip background: `bg-destructive/10` (rgba(220, 38, 38, 0.1))
- Tooltip border: `border-destructive/50` (rgba(220, 38, 38, 0.5))
- Tooltip text: `text-destructive` (#DC2626)

---

## 📐 Dimensions & Spacing

### Button
- Size: `size="icon"` (40x40px)
- Icon size: `h-5 w-5` (20x20px)
- Border radius: `rounded-md` (6px)
- Padding: `p-2` (8px)

### Tooltip
- Max width: `max-w-xs` (320px)
- Padding: `px-3 py-2` (12px horizontal, 8px vertical)
- Border radius: `rounded-lg` (8px)
- Font size: `text-xs` (12px)
- Position: `bottom-full left-0 mb-2` (above button, 8px gap)

### Pulsing Ring
- Border width: `border-2` (2px)
- Border radius: `rounded-md` (6px)
- Position: `absolute inset-0` (covers button)
- Opacity: `opacity-75` (75%)

---

## 🎭 Interaction States

### Hover (Idle)
```css
.voice-button:hover {
  background: rgba(243, 244, 246, 0.1);
  color: #111827;
  transition: all 200ms ease;
}
```

### Active (Listening)
```css
.voice-button:active {
  background: #DC2626;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.8; }
}
```

### Disabled
```css
.voice-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}
```

---

## 📱 Responsive Behavior

### Desktop (≥ 768px)
- Button: Full size (40x40px)
- Tooltip: Positioned above button
- Text input: Full width
- Layout: Horizontal row

### Mobile (< 768px)
- Button: Same size (40x40px)
- Tooltip: Positioned above, may overflow
- Text input: Full width, wraps if needed
- Layout: Horizontal row (compact)

---

## ♿ Accessibility Features

### ARIA Labels
```html
<button
  aria-label="Voice input"
  aria-pressed={isListening}
  title="Click to start voice input"
>
```

### Keyboard Navigation
- **Tab**: Focus on button
- **Enter/Space**: Toggle recording
- **Escape**: Stop recording (when listening)

### Screen Reader Announcements
- "Voice input button"
- "Recording started" (when listening)
- "Recording stopped" (when stopped)
- Error messages read aloud

---

## 🎯 Visual Feedback Summary

| State | Button Color | Animation | Tooltip | Text Input |
|-------|-------------|-----------|---------|------------|
| Idle | Gray | None | Hover only | Empty |
| Listening | Red | Pulsing | Live transcription | Updating |
| Transcribing | Red | Pulsing | Final + Interim | Updating |
| Stopping | Gray | Fading out | Fading out | Final text |
| Error | Red | None | Error message | Empty |
| Unsupported | Hidden | N/A | N/A | Normal |

---

## 🎨 CSS Classes Used

```typescript
// Button classes
cn(
  "relative transition-all duration-200",
  isListening && "bg-red-600 hover:bg-red-700 animate-pulse",
  !isListening && "text-muted-foreground hover:text-foreground",
  error && "text-destructive",
  className,
)

// Tooltip classes (listening)
"absolute bottom-full left-0 mb-2 max-w-xs rounded-lg bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg border border-border/50"

// Tooltip classes (error)
"absolute bottom-full left-0 mb-2 max-w-xs rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive shadow-lg border border-destructive/50"

// Pulsing ring
"absolute inset-0 rounded-md border-2 border-red-400 animate-ping opacity-75"

// Live indicator
"h-2 w-2 rounded-full bg-red-500 animate-pulse"
```

---

**This visual guide helps designers and developers understand the complete UI/UX flow of the voice input feature.**
