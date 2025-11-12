export function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-muted/60">
        <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-primary" />
        <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 animate-pulse-dot rounded-full bg-primary/70 [animation-delay:0.2s]" />
        <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 animate-pulse-dot rounded-full bg-primary/50 [animation-delay:0.4s]" />
      </span>
      <span>The assistant is thinking…</span>
    </div>
  );
}

