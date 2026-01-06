/**
 * Voice Input Demo Page
 * 
 * Standalone demo to test and showcase the voice input feature.
 * Access at: /voice-demo
 */

"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { isSpeechRecognitionSupported } from "@/lib/speech";

const VoiceInputButton = dynamic(
  () => import("@/components/chat/VoiceInputButton").then((mod) => mod.VoiceInputButton),
  { ssr: false }
);

export default function VoiceDemoPage() {
  const [transcript, setTranscript] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported(isSpeechRecognitionSupported());
  }, []);

  const handleTranscript = (text: string) => {
    setTranscript(text);
  };

  const handleSave = () => {
    if (transcript.trim()) {
      setHistory((prev) => [...prev, transcript]);
      setTranscript("");
    }
  };

  const handleClear = () => {
    setTranscript("");
  };

  const handleClearHistory = () => {
    setHistory([]);
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-foreground">Voice Input Demo</h1>
          <p className="mt-2 text-muted-foreground">
            Test the browser-native Web Speech API integration
          </p>
        </div>

        {/* Browser Support Status */}
        <Card className="bg-[#1E1E1E]/90 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Browser Support</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {isSupported
                  ? "✅ Your browser supports Web Speech API"
                  : "❌ Your browser does not support Web Speech API"}
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
            <Card className="bg-[#1E1E1E]/90 p-6">
              <h2 className="text-xl font-semibold text-foreground">Try It Out</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Click the microphone button and start speaking. The transcription will appear below.
              </p>

              <Separator className="my-4 border-border/70" />

              {/* Voice Input Area */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <VoiceInputButton onTranscript={handleTranscript} />
                  <div className="flex-1">
                    <textarea
                      value={transcript}
                      onChange={(e) => setTranscript(e.target.value)}
                      placeholder="Your transcription will appear here..."
                      className="w-full rounded-lg border border-border/70 bg-[#222222]/90 px-4 py-3 text-foreground outline-none focus:border-primary"
                      rows={4}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSave} disabled={!transcript.trim()}>
                    Save to History
                  </Button>
                  <Button onClick={handleClear} variant="outline" disabled={!transcript.trim()}>
                    Clear
                  </Button>
                </div>
              </div>
            </Card>

            {/* History */}
            {history.length > 0 && (
              <Card className="bg-[#1E1E1E]/90 p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-foreground">Transcription History</h2>
                  <Button onClick={handleClearHistory} variant="outline" size="sm">
                    Clear History
                  </Button>
                </div>

                <Separator className="my-4 border-border/70" />

                <div className="space-y-3">
                  {history.map((item, index) => (
                    <div
                      key={index}
                      className="rounded-lg border border-border/50 bg-[#222222]/50 p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <p className="flex-1 text-sm text-foreground">{item}</p>
                        <span className="text-xs text-muted-foreground">#{index + 1}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Instructions */}
            <Card className="bg-[#1E1E1E]/90 p-6">
              <h2 className="text-xl font-semibold text-foreground">How to Use</h2>
              <Separator className="my-4 border-border/70" />
              <ol className="space-y-3 text-sm text-muted-foreground">
                <li className="flex gap-3">
                  <span className="font-semibold text-primary">1.</span>
                  <span>Click the microphone button to start recording</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-primary">2.</span>
                  <span>Grant microphone permission when prompted (first time only)</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-primary">3.</span>
                  <span>Speak clearly - you'll see live transcription in the tooltip</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-primary">4.</span>
                  <span>Recording auto-stops after 3 seconds of silence</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-primary">5.</span>
                  <span>Or click the button again to stop manually</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-primary">6.</span>
                  <span>Edit the transcript if needed, then save to history</span>
                </li>
              </ol>
            </Card>

            {/* Technical Details */}
            <Card className="bg-[#1E1E1E]/90 p-6">
              <h2 className="text-xl font-semibold text-foreground">Technical Details</h2>
              <Separator className="my-4 border-border/70" />
              <div className="grid gap-4 text-sm md:grid-cols-2">
                <div>
                  <h3 className="font-semibold text-foreground">Features</h3>
                  <ul className="mt-2 space-y-1 text-muted-foreground">
                    <li>✅ Browser-native Web Speech API</li>
                    <li>✅ No external APIs or costs</li>
                    <li>✅ Real-time transcription</li>
                    <li>✅ Auto-stop on silence</li>
                    <li>✅ Error handling</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Browser Support</h3>
                  <ul className="mt-2 space-y-1 text-muted-foreground">
                    <li>✅ Chrome 25+</li>
                    <li>✅ Edge 79+</li>
                    <li>✅ Safari 14.1+</li>
                    <li>✅ Opera (Chromium)</li>
                    <li>❌ Firefox (not yet)</li>
                  </ul>
                </div>
              </div>
            </Card>
          </>
        ) : (
          <Card className="bg-[#1E1E1E]/90 p-6">
            <h2 className="text-xl font-semibold text-foreground">Browser Not Supported</h2>
            <Separator className="my-4 border-border/70" />
            <p className="text-sm text-muted-foreground">
              Your browser doesn't support the Web Speech API. Please try one of these browsers:
            </p>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>• Google Chrome (version 25 or later)</li>
              <li>• Microsoft Edge (version 79 or later)</li>
              <li>• Safari (version 14.1 or later)</li>
              <li>• Opera (Chromium-based versions)</li>
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}
