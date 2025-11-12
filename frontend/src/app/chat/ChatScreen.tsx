"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

import { ChatInput } from "@/components/chat/ChatInput";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { Sidebar } from "@/components/chat/Sidebar";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/use-toast";
import { fetchHistory, fetchSession, streamChat } from "@/lib/api";
import { cn } from "@/lib/utils";

type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  severity?: "mild" | "moderate" | "severe";
  createdAt?: string;
  isStreaming?: boolean;
};

type ChatScreenProps = {
  initialSessionId: string | null;
};

const formatTimestamp = (dateIso?: string) => {
  if (!dateIso) return undefined;
  return format(new Date(dateIso), "MMM d, h:mm aaa");
};

export function ChatScreen({ initialSessionId }: ChatScreenProps) {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [activeSessionId, setActiveSessionId] = useState<string | null>(initialSessionId);
  const [history, setHistory] = useState<{ id: string; title: string | null; created_at: string }[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const accessToken = session?.accessToken;
  // Use build-time public env to avoid SSR/CSR mismatch
  const allowAnon = process.env.NEXT_PUBLIC_ALLOW_ANON === "true";
  const isAuthenticated = status === "authenticated" || allowAnon;

  useEffect(() => {
    if (!allowAnon && !accessToken) return;

    const loadHistory = async () => {
      try {
        const sessions = await fetchHistory(accessToken);
        setHistory(sessions);
      } catch (error) {
        console.error(error);
        toast({
          title: "Unable to load history",
          description: "Please refresh the page or try again later.",
          variant: "destructive",
        });
      }
    };
    void loadHistory();
  }, [accessToken, allowAnon]);

  useEffect(() => {
    const newChat = searchParams.get("new");
    if (newChat === "true") {
      setActiveSessionId(null);
      setMessages([]);
      router.replace("/chat");
    }
  }, [router, searchParams]);

  useEffect(() => {
    if ((!accessToken && !allowAnon) || !activeSessionId) return;

    const loadSession = async () => {
      try {
        const sessionData = await fetchSession(accessToken, activeSessionId);
        setMessages(
          sessionData.messages.map((message) => ({
            id: message.id,
            role: message.role as Message["role"],
            content: message.content,
            severity: (message.structured?.severity as Message["severity"]) ?? undefined,
            createdAt: message.created_at,
          })),
        );
      } catch (error) {
        console.error(error);
        toast({
          title: "Could not load chat",
          description: "We had trouble opening this conversation.",
          variant: "destructive",
        });
      }
    };

    void loadSession();
  }, [accessToken, activeSessionId, allowAnon]);

  useEffect(() => {
    if (!bottomRef.current) return;
    bottomRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  const handleSend = async (content: string) => {
    if (!accessToken && !allowAnon) {
      toast({
        title: "Please sign in",
        description: "You need to sign in before chatting with MediBot.",
        variant: "destructive",
      });
      return;
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };
    const assistantMessageId = crypto.randomUUID();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setIsStreaming(true);

    await streamChat({
      token: accessToken,
      message: content,
      sessionId: activeSessionId ?? undefined,
      onChunk: (chunk) => {
        setMessages((prev) =>
          prev.map((message) =>
            message.id === assistantMessageId ? { ...message, content: `${message.content}${chunk}` } : message,
          ),
        );
      },
      onDone: (payload) => {
        setMessages((prev) =>
          prev.map((message) =>
            message.id === assistantMessageId
              ? {
                  ...message,
                  content: message.content.trim(),
                  severity: payload.severity as Message["severity"],
                  isStreaming: false,
                  createdAt: new Date().toISOString(),
                }
              : message,
          ),
        );
        setActiveSessionId(payload.sessionId);
        setIsStreaming(false);
        void refreshHistory();
        if (payload.requiresAttention) {
          toast({
            title: "Potentially urgent symptoms",
            description: "Please seek medical care if you experience severe or worsening symptoms.",
            variant: "destructive",
          });
        }
      },
      onError: (error) => {
        console.error(error);
        setIsStreaming(false);
        setMessages((prev) => prev.filter((message) => message.id !== assistantMessageId));
        toast({
          title: "Something went wrong",
          description: "We couldn’t complete that request. Please try again.",
          variant: "destructive",
        });
      },
    });
  };

  const refreshHistory = async () => {
    if (!accessToken) return;
    try {
      const sessions = await fetchHistory(accessToken);
      setHistory(sessions);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSelectSession = (id: string) => {
    setActiveSessionId(id);
  };

  const handleNewChat = () => {
    setActiveSessionId(null);
    setMessages([]);
  };

  const handleRegenerate = (messageId: string) => {
    const index = messages.findIndex((message) => message.id === messageId);
    if (index <= 0) return;
    const userMessage = [...messages].slice(0, index).reverse().find((msg) => msg.role === "user");
    if (!userMessage) return;
    void handleSend(userMessage.content);
  };

  const handleExport = (_messageId?: string) => {
    const exportText = messages
      .map((message) => `${message.role === "assistant" ? "MediBot" : "You"}:\n${message.content}\n`)
      .join("\n");

    const blob = new Blob([exportText], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `medibot-chat-${new Date().toISOString()}.txt`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const formattedHistory = useMemo(
    () =>
      history.map((session) => ({
        id: session.id,
        title: session.title,
        createdAt: formatTimestamp(session.created_at) ?? "",
      })),
    [history],
  );

  return (
    <div className="flex h-full min-h-[calc(100vh-140px)] flex-1 overflow-hidden">
      <Sidebar
        sessions={formattedHistory}
        onSelect={handleSelectSession}
        onNew={handleNewChat}
        activeId={activeSessionId ?? undefined}
        isAuthenticated={isAuthenticated}
      />

      <div className="flex flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-6 sm:px-6">
          <Card className="bg-[#1E1E1E]/90 px-6 py-5">
            <h1 className="text-2xl font-semibold text-foreground">Describe how you’re feeling today</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Share your symptoms, recent changes, and any medications. MediBot will provide gentle guidance, home
              remedies, and over-the-counter options when appropriate.
            </p>
          </Card>

          <Separator className="border-border/70" />

          <div className="flex-1 space-y-5 overflow-y-auto pr-2">
            {status === "loading" ? (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Loading your session…
              </div>
            ) : messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-border/70 bg-[#202020]/70 p-10 text-center text-sm text-muted-foreground">
                <p>Start by telling MediBot what you’re experiencing. Mention onset, intensity, and any triggers.</p>
              </div>
            ) : (
              messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  id={message.id}
                  role={message.role}
                  content={message.content}
                  severity={message.severity}
                  timestamp={formatTimestamp(message.createdAt)}
                  isStreaming={message.isStreaming && isStreaming}
                  onRegenerate={handleRegenerate}
                  onExport={handleExport}
                />
              ))
            )}
            {isStreaming && (
              <div className="flex justify-start">
                <TypingIndicator />
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className={cn("sticky bottom-0 mt-auto bg-gradient-to-t from-background via-background/60 to-transparent py-4")}>
            <ChatInput onSend={handleSend} disabled={!isAuthenticated || isStreaming} />
          </div>
        </div>
      </div>
    </div>
  );
}

