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
  // User messages get a subtle background, Assistant messages blend in
  const containerClass = isAssistant ? "bg-transparent px-4 py-8" : "bg-[#2F2F2F] rounded-3xl px-5 py-3 ml-auto max-w-[85%]";
  const alignClass = isAssistant ? "w-full" : "w-fit";

  return (
    <div className={cn("group flex w-full text-base", alignClass, isAssistant ? "justify-center" : "justify-end")}>
      <div className={cn("relative flex w-full max-w-3xl flex-col gap-2 md:gap-3", containerClass)}>
        <div className="flex items-center gap-2">
           <div className="font-semibold text-sm text-foreground/80">
             {isAssistant ? "MediBot" : "You"}
           </div>
           {severity && isAssistant && (
             <span className={cn(
               "text-[10px] uppercase font-bold px-1.5 py-0.5 rounded",
               severity === "severe" ? "bg-red-500/20 text-red-500" :
               severity === "moderate" ? "bg-yellow-500/20 text-yellow-500" :
               "bg-green-500/20 text-green-500"
             )}>
               {severity}
             </span>
           )}
        </div>

        <div className={cn("prose prose-invert max-w-none text-base leading-relaxed tracking-normal text-gray-100", isStreaming && "animate-pulse")}>
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ 
              hr: () => <div className="my-6 border-t border-white/10" />,
              p: ({children}) => <p className="mb-4 last:mb-0">{children}</p>,
              ul: ({children}) => <ul className="list-disc pl-4 mb-4 space-y-1">{children}</ul>,
              ol: ({children}) => <ol className="list-decimal pl-4 mb-4 space-y-1">{children}</ol>,
              h1: ({children}) => <h1 className="text-2xl font-bold mb-4 mt-6">{children}</h1>,
              h2: ({children}) => <h2 className="text-xl font-bold mb-3 mt-5">{children}</h2>,
              h3: ({children}) => <h3 className="text-lg font-bold mb-2 mt-4">{children}</h3>,
            }}>
            {content}
          </ReactMarkdown>
        </div>

        {isAssistant && !isStreaming && (
          <div className="mt-2 flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              onClick={() => onRegenerate?.(id)}
              title="Regenerate"
            >
              <RefreshCcw className="h-3 w-3" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              onClick={() => onExport?.(id)}
              title="Copy"
            >
              <ClipboardList className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

