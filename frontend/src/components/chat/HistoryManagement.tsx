/**
 * History Management Component
 * 
 * UI for managing local chat history with GDPR-compliant controls.
 */

"use client";

import { useState } from "react";
import { Download, Upload, Trash2, Database, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocalHistory } from "@/hooks/useLocalHistory";
import { toast } from "@/components/ui/use-toast";

export function HistoryManagement() {
  const {
    storageStats,
    isSupported,
    clearHistory,
    exportData,
    importData,
    refreshStats,
  } = useLocalHistory({ autoLoad: true });

  const [isClearing, setIsClearing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const jsonData = await exportData();
      
      // Create download link
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `medibot-history-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);

      toast({
        title: "History exported",
        description: "Your chat history has been downloaded as JSON.",
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: "Export failed",
        description: "Failed to export chat history. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        await importData(text);
        await refreshStats();

        toast({
          title: "History imported",
          description: "Your chat history has been successfully imported.",
        });
      } catch (error) {
        console.error('Import failed:', error);
        toast({
          title: "Import failed",
          description: "Failed to import chat history. Please check the file format.",
          variant: "destructive",
        });
      }
    };

    input.click();
  };

  const handleClearHistory = async () => {
    if (!showClearConfirm) {
      setShowClearConfirm(true);
      return;
    }

    try {
      setIsClearing(true);
      await clearHistory();
      await refreshStats();
      setShowClearConfirm(false);

      toast({
        title: "History cleared",
        description: "All chat history has been permanently deleted.",
      });
    } catch (error) {
      console.error('Clear failed:', error);
      toast({
        title: "Clear failed",
        description: "Failed to clear chat history. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsClearing(false);
    }
  };

  if (!isSupported) {
    return (
      <Card className="bg-[#1E1E1E]/90 p-6">
        <div className="text-center text-muted-foreground">
          <Database className="mx-auto mb-2 h-8 w-8 opacity-50" />
          <p className="text-sm">Local storage is not supported in this browser.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-[#1E1E1E]/90 p-6">
      <div className="space-y-4">
        {/* Header */}
        <div>
          <h2 className="text-lg font-semibold text-foreground">Chat History Management</h2>
          <p className="text-sm text-muted-foreground">
            Your chat history is stored locally on your device. No data is sent to servers.
          </p>
        </div>

        <Separator className="border-border/70" />

        {/* Storage Stats */}
        {storageStats && (
          <div className="grid grid-cols-3 gap-4 rounded-lg bg-[#222222]/50 p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{storageStats.sessions}</p>
              <p className="text-xs text-muted-foreground">Sessions</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{storageStats.messages}</p>
              <p className="text-xs text-muted-foreground">Messages</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{storageStats.estimatedSize}</p>
              <p className="text-xs text-muted-foreground">Storage Used</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={handleExport}
              variant="outline"
              disabled={isExporting || !storageStats?.sessions}
              className="w-full"
            >
              <Download className="mr-2 h-4 w-4" />
              {isExporting ? "Exporting..." : "Export History"}
            </Button>

            <Button
              onClick={handleImport}
              variant="outline"
              className="w-full"
            >
              <Upload className="mr-2 h-4 w-4" />
              Import History
            </Button>
          </div>

          {showClearConfirm ? (
            <div className="rounded-lg border-2 border-destructive bg-destructive/10 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 flex-shrink-0 text-destructive" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">
                    Are you absolutely sure?
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    This will permanently delete all your chat history. This action cannot be undone.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button
                      onClick={handleClearHistory}
                      variant="destructive"
                      size="sm"
                      disabled={isClearing}
                    >
                      {isClearing ? "Clearing..." : "Yes, delete everything"}
                    </Button>
                    <Button
                      onClick={() => setShowClearConfirm(false)}
                      variant="outline"
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <Button
              onClick={handleClearHistory}
              variant="outline"
              disabled={!storageStats?.sessions}
              className="w-full border-destructive/50 text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Clear All History
            </Button>
          )}
        </div>

        {/* GDPR Notice */}
        <div className="rounded-lg bg-blue-500/10 p-3 text-xs text-muted-foreground">
          <p className="font-semibold text-foreground">🔒 Privacy & GDPR Compliance</p>
          <ul className="mt-2 space-y-1">
            <li>✓ All data stored locally on your device</li>
            <li>✓ No server storage or transmission</li>
            <li>✓ Export your data anytime (data portability)</li>
            <li>✓ Delete all data instantly (right to erasure)</li>
            <li>✓ Full control over your information</li>
          </ul>
        </div>
      </div>
    </Card>
  );
}
