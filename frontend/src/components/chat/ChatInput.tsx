"use client";

import { FormEvent, KeyboardEvent, useRef, useState, ChangeEvent } from "react";
import { SendHorizonal, Paperclip, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { VoiceInputButton } from "@/components/chat/VoiceInputButton";
import { cn } from "@/lib/utils";

type ChatInputProps = {
  placeholder?: string;
  disabled?: boolean;
  onSend: (message: string, image?: File) => Promise<void> | void;
};

export function ChatInput({ placeholder = "Describe your symptoms...", disabled, onSend }: ChatInputProps) {
  const [value, setValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        className="relative flex items-center gap-3 rounded-full border border-border/70 bg-[#222222]/90 px-4 py-2 shadow-subtle"
      >
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
          className="text-muted-foreground hover:text-foreground"
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
            "max-h-36 min-h-[48px] w-full resize-none bg-transparent py-2 text-sm text-foreground outline-none",
            "placeholder:text-muted-foreground",
          )}
        />
        <Button type="submit" size="icon" variant="default" disabled={(!value.trim() && !selectedFile) || disabled || isSending}>
          <SendHorizonal className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}

