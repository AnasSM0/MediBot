/**
 * Voice Output Demo Page
 * 
 * Standalone demo to test and showcase the voice output feature.
 * Access at: /voice-output-demo
 */

"use client";

import { useState } from "react";
import { useVoiceOutput } from "@/hooks/useVoiceOutput";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { isSpeechSynthesisSupported } from "@/lib/speechSynthesis";
import { Volume2, Pause, Play, Square } from "lucide-react";

export default function VoiceOutputDemoPage() {
  const [text, setText] = useState(
    "Hello! I'm MediBot, your medical assistant. How can I help you today? Please describe your symptoms, and I'll provide guidance and suggestions."
  );
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState(0);

  const {
    isSpeaking,
    isPaused,
    isSupported,
    voices,
    selectedVoice,
    speak,
    pause,
    resume,
    cancel,
    setVoice,
    setRate,
    setPitch,
    setVolume,
  } = useVoiceOutput();

  const [rate, setRateState] = useState(1);
  const [pitch, setPitchState] = useState(1);
  const [volume, setVolumeState] = useState(1);

  const handleSpeak = () => {
    if (text.trim()) {
      speak(text);
    }
  };

  const handleVoiceChange = (index: number) => {
    setSelectedVoiceIndex(index);
    setVoice(voices[index]);
  };

  const handleRateChange = (value: number) => {
    setRateState(value);
    setRate(value);
  };

  const handlePitchChange = (value: number) => {
    setPitchState(value);
    setPitch(value);
  };

  const handleVolumeChange = (value: number) => {
    setVolumeState(value);
    setVolume(value);
  };

  const sampleTexts = [
    "Hello! I'm MediBot, your medical assistant. How can I help you today?",
    "Based on your symptoms, I recommend getting plenty of rest and staying hydrated.",
    "If your symptoms persist or worsen, please consult with a healthcare professional.",
    "Remember, I'm here to provide guidance, but I'm not a substitute for professional medical advice.",
  ];

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-foreground">Voice Output Demo</h1>
          <p className="mt-2 text-muted-foreground">
            Test the browser-native Speech Synthesis API integration
          </p>
        </div>

        {/* Browser Support Status */}
        <Card className="bg-[#1E1E1E]/90 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Browser Support</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {isSupported
                  ? "✅ Your browser supports Speech Synthesis API"
                  : "❌ Your browser does not support Speech Synthesis API"}
              </p>
            </div>
            <div
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                isSupported
                  ? "bg-green-500/20 text-green-400"
                  : "bg-red-500/20 text-red-400"
              }`}
            >
              {isSupported ? "Supported" : "Not Supported"}
            </div>
          </div>
        </Card>

        {/* Main Demo Area */}
        {isSupported ? (
          <>
            {/* Text Input */}
            <Card className="bg-[#1E1E1E]/90 p-6">
              <h2 className="text-xl font-semibold text-foreground">Text to Speak</h2>
              <Separator className="my-4 border-border/70" />

              <div className="space-y-4">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Enter text to speak..."
                  className="w-full rounded-lg border border-border/70 bg-[#222222]/90 px-4 py-3 text-foreground outline-none focus:border-primary"
                  rows={6}
                />

                {/* Quick Sample Texts */}
                <div className="flex flex-wrap gap-2">
                  {sampleTexts.map((sample, index) => (
                    <Button
                      key={index}
                      onClick={() => setText(sample)}
                      variant="outline"
                      size="sm"
                    >
                      Sample {index + 1}
                    </Button>
                  ))}
                </div>

                {/* Playback Controls */}
                <div className="flex gap-2">
                  <Button onClick={handleSpeak} disabled={!text.trim() || isSpeaking}>
                    <Volume2 className="mr-2 h-4 w-4" />
                    Speak
                  </Button>

                  {isSpeaking && (
                    <>
                      <Button onClick={isPaused ? resume : pause} variant="outline">
                        {isPaused ? (
                          <>
                            <Play className="mr-2 h-4 w-4" />
                            Resume
                          </>
                        ) : (
                          <>
                            <Pause className="mr-2 h-4 w-4" />
                            Pause
                          </>
                        )}
                      </Button>

                      <Button onClick={cancel} variant="outline">
                        <Square className="mr-2 h-4 w-4" />
                        Stop
                      </Button>
                    </>
                  )}
                </div>

                {/* Status */}
                {isSpeaking && (
                  <div className="flex items-center gap-2 rounded-lg bg-green-500/10 px-4 py-2 text-sm text-green-400">
                    <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <span>{isPaused ? "Paused" : "Speaking..."}</span>
                  </div>
                )}
              </div>
            </Card>

            {/* Voice Selection */}
            {voices.length > 0 && (
              <Card className="bg-[#1E1E1E]/90 p-6">
                <h2 className="text-xl font-semibold text-foreground">Voice Selection</h2>
                <Separator className="my-4 border-border/70" />

                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-foreground">
                      Selected Voice: {selectedVoice?.name || "Default"}
                    </label>
                    <select
                      value={selectedVoiceIndex}
                      onChange={(e) => handleVoiceChange(Number(e.target.value))}
                      className="mt-2 w-full rounded-lg border border-border/70 bg-[#222222]/90 px-4 py-2 text-foreground outline-none focus:border-primary"
                    >
                      {voices.map((voice, index) => (
                        <option key={index} value={index}>
                          {voice.name} ({voice.lang})
                          {voice.default && " - Default"}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-4 text-sm text-muted-foreground">
                    <div>
                      <strong>Language:</strong> {selectedVoice?.lang || "N/A"}
                    </div>
                    <div>
                      <strong>Local:</strong> {selectedVoice?.localService ? "Yes" : "No"}
                    </div>
                    <div>
                      <strong>Available Voices:</strong> {voices.length}
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Voice Settings */}
            <Card className="bg-[#1E1E1E]/90 p-6">
              <h2 className="text-xl font-semibold text-foreground">Voice Settings</h2>
              <Separator className="my-4 border-border/70" />

              <div className="space-y-6">
                {/* Rate */}
                <div>
                  <label className="text-sm font-medium text-foreground">
                    Rate: {rate.toFixed(1)}x
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="2"
                    step="0.1"
                    value={rate}
                    onChange={(e) => handleRateChange(Number(e.target.value))}
                    className="mt-2 w-full"
                  />
                  <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                    <span>Slower</span>
                    <span>Normal</span>
                    <span>Faster</span>
                  </div>
                </div>

                {/* Pitch */}
                <div>
                  <label className="text-sm font-medium text-foreground">
                    Pitch: {pitch.toFixed(1)}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={pitch}
                    onChange={(e) => handlePitchChange(Number(e.target.value))}
                    className="mt-2 w-full"
                  />
                  <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                    <span>Lower</span>
                    <span>Normal</span>
                    <span>Higher</span>
                  </div>
                </div>

                {/* Volume */}
                <div>
                  <label className="text-sm font-medium text-foreground">
                    Volume: {Math.round(volume * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={volume}
                    onChange={(e) => handleVolumeChange(Number(e.target.value))}
                    className="mt-2 w-full"
                  />
                  <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                    <span>Quiet</span>
                    <span>Normal</span>
                    <span>Loud</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Instructions */}
            <Card className="bg-[#1E1E1E]/90 p-6">
              <h2 className="text-xl font-semibold text-foreground">How to Use</h2>
              <Separator className="my-4 border-border/70" />
              <ol className="space-y-3 text-sm text-muted-foreground">
                <li className="flex gap-3">
                  <span className="font-semibold text-primary">1.</span>
                  <span>Enter or select text to speak</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-primary">2.</span>
                  <span>Choose a voice from the dropdown (optional)</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-primary">3.</span>
                  <span>Adjust rate, pitch, and volume (optional)</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-primary">4.</span>
                  <span>Click "Speak" to hear the text</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-primary">5.</span>
                  <span>Use pause/resume or stop to control playback</span>
                </li>
              </ol>
            </Card>
          </>
        ) : (
          <Card className="bg-[#1E1E1E]/90 p-6">
            <h2 className="text-xl font-semibold text-foreground">Browser Not Supported</h2>
            <Separator className="my-4 border-border/70" />
            <p className="text-sm text-muted-foreground">
              Your browser doesn't support the Speech Synthesis API. All modern browsers support this feature.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
