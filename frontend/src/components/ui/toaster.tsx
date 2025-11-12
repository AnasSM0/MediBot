"use client";

import * as ToastPrimitive from "@radix-ui/react-toast";
import { AlertCircle, CheckCircle2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { useToast } from "./use-toast";

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <ToastPrimitive.Provider swipeDirection="right">
      {toasts.map((toast) => {
        const Icon = toast.variant === "destructive" ? AlertCircle : CheckCircle2;
        return (
          <ToastPrimitive.Root
            key={toast.id}
            onOpenChange={(open) => {
              if (!open) dismiss(toast.id);
            }}
            className={cn(
              "pointer-events-auto mb-3 flex w-[320px] items-start gap-3 rounded-2xl border border-border/60 bg-[#1F1F1F]/95 p-4 shadow-subtle backdrop-blur-sm",
            )}
          >
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full",
                toast.variant === "destructive" ? "bg-red-500/20 text-red-300" : "bg-primary/20 text-primary",
              )}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              {toast.title && <p className="text-sm font-medium leading-none text-foreground">{toast.title}</p>}
              {toast.description && <p className="text-sm text-muted-foreground">{toast.description}</p>}
            </div>
          </ToastPrimitive.Root>
        );
      })}
      <ToastPrimitive.Viewport className="fixed bottom-6 right-6 z-[999] flex flex-col-reverse" />
    </ToastPrimitive.Provider>
  );
}

