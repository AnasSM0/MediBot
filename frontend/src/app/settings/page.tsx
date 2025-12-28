/**
 * Settings Page
 * 
 * User settings including history management, privacy controls, and preferences.
 */

"use client";

import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { HistoryManagement } from "@/components/chat/HistoryManagement";
import { KeyboardShortcutsSettings } from "@/components/settings/KeyboardShortcutsSettings";
import { Settings as SettingsIcon, Database, Shield, Info, Keyboard } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/20">
            <SettingsIcon className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="mt-2 text-muted-foreground">
            Manage your preferences, privacy, and data
          </p>
        </div>

        {/* History Management */}
        <section>
          <div className="mb-4 flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">Local Storage</h2>
          </div>
          <HistoryManagement />
        </section>

        {/* Keyboard Shortcuts */}
        <section>
          <div className="mb-4 flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">Keyboard Shortcuts</h2>
          </div>
          <KeyboardShortcutsSettings />
        </section>

        {/* Privacy Information */}
        <section>
          <div className="mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">Privacy & Security</h2>
          </div>
          <Card className="bg-[#1E1E1E]/90 p-6">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-foreground">How we protect your data</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  MediBot is designed with privacy as a core principle. Your conversations and data
                  are handled with the utmost care and security.
                </p>
              </div>

              <Separator className="border-border/70" />

              <div className="space-y-3 text-sm">
                <div className="flex gap-3">
                  <span className="text-green-500">✓</span>
                  <div>
                    <p className="font-medium text-foreground">Local-First Storage</p>
                    <p className="text-muted-foreground">
                      All chat history is stored locally on your device using IndexedDB. Nothing is
                      sent to external servers unless you explicitly choose to sync.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="text-green-500">✓</span>
                  <div>
                    <p className="font-medium text-foreground">No Tracking</p>
                    <p className="text-muted-foreground">
                      We don't use analytics, tracking pixels, or third-party cookies. Your usage
                      patterns remain private.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="text-green-500">✓</span>
                  <div>
                    <p className="font-medium text-foreground">HTTPS Encryption</p>
                    <p className="text-muted-foreground">
                      All communication with our servers (when online) is encrypted using industry-standard
                      HTTPS/TLS protocols.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="text-green-500">✓</span>
                  <div>
                    <p className="font-medium text-foreground">Right to Erasure</p>
                    <p className="text-muted-foreground">
                      You can delete all your data instantly at any time using the "Clear All History"
                      button above. This is permanent and cannot be undone.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="text-green-500">✓</span>
                  <div>
                    <p className="font-medium text-foreground">Data Portability</p>
                    <p className="text-muted-foreground">
                      Export your entire chat history as JSON at any time. Your data belongs to you,
                      and you can take it with you.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* About */}
        <section>
          <div className="mb-4 flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">About MediBot</h2>
          </div>
          <Card className="bg-[#1E1E1E]/90 p-6">
            <div className="space-y-4 text-sm text-muted-foreground">
              <p>
                <strong className="text-foreground">Version:</strong> 1.0.0
              </p>
              <p>
                <strong className="text-foreground">Technology:</strong> Built with Next.js, React,
                TypeScript, and browser-native APIs (Web Speech API, IndexedDB, Service Workers)
              </p>
              <p>
                <strong className="text-foreground">License:</strong> Open source, free to use
              </p>
              <Separator className="border-border/70" />
              <p className="text-xs">
                <strong className="text-foreground">Medical Disclaimer:</strong> MediBot is an AI
                assistant designed to provide general health information and guidance. It is NOT a
                substitute for professional medical advice, diagnosis, or treatment. Always seek the
                advice of your physician or other qualified health provider with any questions you may
                have regarding a medical condition. Never disregard professional medical advice or
                delay in seeking it because of something you have read on MediBot.
              </p>
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}
