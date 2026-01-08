"use client";

import { FormEvent, KeyboardEvent, useRef, useState, ChangeEvent, forwardRef, useImperativeHandle } from "react";
import { SendHorizonal, Paperclip, X, Activity, Stethoscope, FileText } from "lucide-react";

import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const VoiceInputButton = dynamic(
  () => import("@/components/chat/VoiceInputButton").then((mod) => mod.VoiceInputButton),
  { ssr: false }
);

type ChatInputProps = {
  placeholder?: string;
  disabled?: boolean;
  onSend: (message: string, image?: File) => Promise<void> | void;
  mode: "normal" | "doctor" | "deep_research";
  onModeChange: (mode: "normal" | "doctor" | "deep_research") => void;
};

export const ChatInput = forwardRef<HTMLTextAreaElement, ChatInputProps>(
  ({ placeholder = "Describe your symptoms...", disabled, onSend, mode, onModeChange }, ref) => {
    const [value, setValue] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    
    // Internal ref for local usage
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Expose internal ref to parent
    useImperativeHandle(ref, () => textareaRef.current as HTMLTextAreaElement);

    const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        if (file.size > 5 * 1024 * 1024) {
          alert("File size too large (max 5MB)");
          return;
        }
        setSelectedFile(file);
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      }
    };

    const clearFile = () => {
      setSelectedFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };

    const handleSubmit = async (event: FormEvent) => {
      event.preventDefault();
      const trimmed = value.trim();
      if ((!trimmed && !selectedFile) || isSending) return;

      try {
        setIsSending(true);
        await onSend(trimmed, selectedFile || undefined);
        setValue("");
        clearFile();
        textareaRef.current?.focus();
      } finally {
        setIsSending(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        void handleSubmit(event as unknown as FormEvent);
      }
    };

    const handleVoiceTranscript = (transcript: string) => {
      setValue(transcript);
      // Auto-focus textarea after voice input
      textareaRef.current?.focus();
    };

    const getModeIcon = () => {
      switch (mode) {
        case "doctor": return <Stethoscope className="h-5 w-5 text-blue-400" />;
        case "deep_research": return <FileText className="h-5 w-5 text-purple-400" />;
        default: return <Activity className="h-5 w-5 text-gray-400" />;
      }
    };

    return (
      <div className="relative flex w-full flex-col gap-2">
        {previewUrl && (
          <div className="relative mx-4 mb-2 w-fit">
            <img src={previewUrl} alt="Preview" className="h-20 w-20 rounded-lg object-cover border border-border/50" />
            <button
              onClick={clearFile}
              className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-white hover:bg-destructive/90"
              type="button"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
        <form
          onSubmit={handleSubmit}
          className="relative flex items-center gap-3 rounded-3xl border border-white/10 bg-[#2F2F2F] px-4 py-3 shadow-xl shadow-black/10 focus-within:border-white/20 focus-within:bg-[#2F2F2F] transition-all"
        >
           <DropdownMenu>
              <DropdownMenuTrigger asChild>
                  <Button type="button" size="icon" variant="ghost" className="text-muted-foreground hover:text-foreground shrink-0" disabled={disabled || isSending}>
                      {getModeIcon()}
                  </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[200px] bg-[#1f1f1f] border-white/10 text-gray-200 mb-2 p-1">
                  <DropdownMenuItem onClick={() => onModeChange("normal")} className="focus:bg-white/10 cursor-pointer">
                      <Activity className="mr-2 h-4 w-4 text-gray-400" /> 
                      <div className="flex flex-col">
                          <span>Normal</span>
                          <span className="text-xs text-muted-foreground">Fast, standard advice</span>
                      </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onModeChange("doctor")} className="focus:bg-white/10 cursor-pointer">
                      <Stethoscope className="mr-2 h-4 w-4 text-blue-400" /> 
                      <div className="flex flex-col">
                          <span>Doctor Mode</span>
                          <span className="text-xs text-muted-foreground">Clinical terminology</span>
                      </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onModeChange("deep_research")} className="focus:bg-white/10 cursor-pointer">
                      <FileText className="mr-2 h-4 w-4 text-purple-400" /> 
                      <div className="flex flex-col">
                          <span>Deep Research</span>
                          <span className="text-xs text-muted-foreground">Comprehensive analysis</span>
                      </div>
                  </DropdownMenuItem>
              </DropdownMenuContent>
          </DropdownMenu>
  
          <div className="h-6 w-px bg-white/10 mx-1" />
  
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="text-muted-foreground hover:text-foreground shrink-0"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isSending}
          >
            <Paperclip className="h-5 w-5" />
          </Button>
  
          <VoiceInputButton
            onTranscript={handleVoiceTranscript}
            disabled={disabled || isSending}
          />
  
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            rows={1}
            maxLength={1200}
            disabled={disabled || isSending}
            className={cn(
              "max-h-36 min-h-[24px] w-full resize-none bg-transparent py-2 text-sm text-foreground outline-none",
              "placeholder:text-muted-foreground",
            )}
          />
          <Button type="submit" size="icon" variant="default" disabled={(!value.trim() && !selectedFile) || disabled || isSending} className="shrink-0">
            <SendHorizonal className="h-4 w-4" />
          </Button>
        </form>
      </div>
    );
  }
);

ChatInput.displayName = "ChatInput";

