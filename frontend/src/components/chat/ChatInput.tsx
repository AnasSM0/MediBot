"use client";

import { FormEvent, KeyboardEvent, useRef, useState } from "react";
import { SendHorizonal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ChatInputProps = {
  placeholder?: string;
  disabled?: boolean;
  onSend: (message: string) => Promise<void> | void;
};

export function ChatInput({ placeholder = "Describe your symptoms...", disabled, onSend }: ChatInputProps) {
  const [value, setValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || isSending) return;

    try {
      setIsSending(true);
      await onSend(trimmed);
      setValue("");
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

  return (
    <form
      onSubmit={handleSubmit}
      className="relative flex items-center gap-3 rounded-full border border-border/70 bg-[#222222]/90 px-4 py-2 shadow-subtle"
    >
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
      <Button type="submit" size="icon" variant="default" disabled={!value.trim() || disabled || isSending}>
        <SendHorizonal className="h-4 w-4" />
      </Button>
    </form>
  );
}

