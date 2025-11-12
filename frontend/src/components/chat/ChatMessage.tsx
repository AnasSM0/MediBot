"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ClipboardList, RefreshCcw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Role = "user" | "assistant" | "system";

export type ChatMessageProps = {
  id: string;
  role: Role;
  content: string;
  severity?: "mild" | "moderate" | "severe";
  timestamp?: string;
  isStreaming?: boolean;
  onRegenerate?: (messageId: string) => void;
  onExport?: (messageId: string) => void;
};

const severityCopy: Record<NonNullable<ChatMessageProps["severity"]>, string> = {
  mild: "Mild concern",
  moderate: "Monitor closely",
  severe: "Seek urgent care",
};

export function ChatMessage({
  id,
  role,
  content,
  severity,
  timestamp,
  isStreaming,
  onRegenerate,
  onExport,
}: ChatMessageProps) {
  const isAssistant = role === "assistant";
  const severityVariant = severity === "severe" ? "warning" : severity === "moderate" ? "outline" : "default";

  return (
    <div className={cn("flex w-full animate-fade-in", isAssistant ? "justify-start" : "justify-end")}>
      <Card
        className={cn(
          "relative max-w-2xl rounded-3xl px-6 py-4",
          isAssistant ? "rounded-3xl rounded-bl-md bg-[#242424]/90" : "bg-gradient-to-br from-primary/90 to-accent/80",
        )}
      >
        <div className="flex items-center justify-between gap-3 pb-3">
          <div className="flex items-center gap-2">
            <Badge variant={isAssistant ? "default" : "outline"}>{isAssistant ? "MediBot" : "You"}</Badge>
            {severity && isAssistant && <Badge variant={severityVariant}>{severityCopy[severity]}</Badge>}
          </div>
          {timestamp && <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{timestamp}</span>}
        </div>

        <div className={cn("prose prose-invert max-w-none text-sm", isStreaming && "opacity-90")}>
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ hr: () => <div className="my-4 border-t border-border" /> }}>
            {content}
          </ReactMarkdown>
        </div>

        {isAssistant && (
          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 gap-1 px-3"
              onClick={() => onRegenerate?.(id)}
              title="Regenerate response"
            >
              <RefreshCcw className="h-4 w-4" />
              Regenerate
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 gap-1 px-3"
              onClick={() => onExport?.(id)}
              title="Export chat to text"
            >
              <ClipboardList className="h-4 w-4" />
              Export
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}

