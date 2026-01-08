"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { Loader2, Activity, Stethoscope, FileText, AlertCircle } from "lucide-react";


import { ChatInput } from "@/components/chat/ChatInput";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { Sidebar } from "@/components/chat/Sidebar";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";


import { VoiceOutputControls } from "@/components/chat/VoiceOutputControls";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/use-toast";
import { fetchHistory, fetchSession, streamChat, deleteSession } from "@/lib/api";
import { useVoiceOutput } from "@/hooks/useVoiceOutput";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { cn } from "@/lib/utils";
import { RAGInspector } from "@/components/chat/RAGInspector";

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
  const [voiceOutputEnabled, setVoiceOutputEnabled] = useState(false);
  const [mode, setMode] = useState<"normal" | "doctor" | "deep_research">("normal");
  const [ragDebugInfo, setRagDebugInfo] = useState<any>(null);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Voice output hook
  const { speak, cancel: cancelSpeech, isSpeaking } = useVoiceOutput({
    onError: (error) => {
      console.error("Voice output error:", error);
    },
  });

  // Keyboard shortcuts hook
  const { registerHandler } = useKeyboardShortcuts({ enabled: true });

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
      setMode("normal"); // Reset mode for new chat
      setRagDebugInfo(null);
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
        // Set mode if present in session data
        if (sessionData.mode) {
           setMode(sessionData.mode as any);
        }
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

  const handleSend = async (content: string, image?: File) => {
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
      content: image ? `[Image Uploaded] ${content}` : content,
      createdAt: new Date().toISOString(),
    };
    const assistantMessageId = crypto.randomUUID();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      isStreaming: true,
    };

    // Cancel any ongoing speech when user sends a new message
    if (isSpeaking) {
      cancelSpeech();
    }
    
    setRagDebugInfo(null);
    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setIsStreaming(true);

    await streamChat({
      token: accessToken,
      message: content,
      image,
      sessionId: activeSessionId ?? undefined,
      mode: mode,
      onChunk: (chunk) => {
        setMessages((prev) =>
          prev.map((message) =>
            message.id === assistantMessageId ? { ...message, content: `${message.content}${chunk}` } : message,
          ),
        );
      },
      onDone: (payload) => {
        let finalContent = "";
        
        setMessages((prev) => {
          const updated = prev.map((message) =>
            message.id === assistantMessageId
              ? {
                  ...message,
                  content: message.content.trim(),
                  severity: payload.severity as Message["severity"],
                  isStreaming: false,
                  createdAt: new Date().toISOString(),
                }
              : message,
          );
          
          // Get the final content for voice output
          const finalMessage = updated.find((m) => m.id === assistantMessageId);
          if (finalMessage) {
            finalContent = finalMessage.content;
          }
          
          return updated;
        });
        
        setActiveSessionId(payload.sessionId);
        setIsStreaming(false);
        void refreshHistory();
        
        // Speak the response if voice output is enabled
        if (voiceOutputEnabled && finalContent) {
          speak(finalContent);
        }
        
        if (payload.requiresAttention) {
          toast({
            title: "Potentially urgent symptoms",
            description: "Please seek medical care if you experience severe or worsening symptoms.",
            variant: "destructive",
          });
        }
      },
      onDebug: (info) => {
          setRagDebugInfo(info);
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
    setMode("normal");
    setRagDebugInfo(null);
  };

  const handleDeleteSession = async (id: string) => {
    if (!accessToken) return;
    try {
        await deleteSession(accessToken, id);
        // Remove from list
        setHistory((prev) => prev.filter((s) => s.id !== id));
        toast({ title: "Deleted", description: "Conversation deleted." });
        
        // If we deleted the active chat, clear view
        if (activeSessionId === id) {
            handleNewChat();
        }
    } catch (error) {
        console.error(error);
        toast({
            title: "Error",
            description: "Failed to delete chat.",
            variant: "destructive",
        });
    }
  };

  // Keyboard shortcut handlers (unchanged)
  useEffect(() => {
    registerHandler('clear-chat', () => {
      if (messages.length > 0) {
        handleNewChat();
        toast({ title: "Chat cleared", description: "Started a new conversation." });
      }
    });

    registerHandler('stop-voice', () => {
      if (isSpeaking) {
        cancelSpeech();
        toast({ title: "Speech stopped", description: "Voice output has been stopped." });
      }
    });

    registerHandler('toggle-voice-output', () => {
      setVoiceOutputEnabled((prev) => !prev);
      toast({
        title: voiceOutputEnabled ? "Voice output disabled" : "Voice output enabled",
        description: voiceOutputEnabled 
          ? "Bot responses will no longer be spoken."
          : "Bot responses will now be spoken aloud.",
      });
    });

    registerHandler('new-session', () => {
      handleNewChat();
      toast({ title: "New session", description: "Started a new chat session." });
    });

    registerHandler('focus-input', () => {
      inputRef.current?.focus();
    });

    registerHandler('open-settings', () => {
      router.push('/settings');
    });
  }, [registerHandler, messages.length, isSpeaking, voiceOutputEnabled, cancelSpeech, router]);

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
    <div className="flex h-screen w-full overflow-hidden bg-[#212121] text-gray-100 font-sans">
      <Sidebar
        sessions={formattedHistory}
        onSelect={handleSelectSession}
        onNew={handleNewChat}
        onDelete={handleDeleteSession}
        activeId={activeSessionId ?? undefined}
        isAuthenticated={isAuthenticated}
      />

      <div className="flex flex-1 flex-col relative h-full">
        {/* Header / Top Bar */}
        <header className="sticky top-0 z-10 flex w-full items-center justify-end p-3 text-sm text-gray-400 bg-[#212121]/80 backdrop-blur-sm">
             <div className="flex items-center gap-4">
                 <VoiceOutputControls
                    enabled={voiceOutputEnabled}
                    onToggle={setVoiceOutputEnabled}
                 />
             </div>
        </header>

        {/* Main Scroll Area */}
        <div className="flex-1 overflow-y-auto w-full">
            <div className="flex min-h-full flex-col items-center pb-32 pt-10">
                <div className="w-full max-w-3xl px-4 flex-1 flex flex-col gap-6">
                    <RAGInspector data={ragDebugInfo} />
                    
                    {status === "loading" ? (
                      <div className="flex h-40 items-center justify-center text-muted-foreground">
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      </div>
                    ) : messages.length === 0 ? (
                       <div className="flex flex-1 flex-col items-center justify-center opacity-80 mt-[20vh]">
                           <div className="bg-white/10 p-3 rounded-full mb-4">
                               <Activity className="h-6 w-6 text-white" />
                           </div>
                           {/* Empty state is minimal/hidden mostly until user types, but we show a hint */}
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
                      <div className="w-full pl-4 max-w-3xl">
                        <TypingIndicator />
                      </div>
                    )}
                    <div ref={bottomRef} className="h-4" />
                </div>
            </div>
        </div>

        {/* Input Area */}
        <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-[#212121] via-[#212121] to-transparent pt-10 pb-6 px-4">
             <div className="mx-auto w-full max-w-3xl">
                 {messages.length === 0 && (
                     <div className="text-center text-2xl font-semibold text-white/90 mb-8 font-sans">
                         Describe your health concern
                     </div>
                 )}
                 <div className="relative">
                     <ChatInput 
                        onSend={handleSend} 
                        disabled={!isAuthenticated || isStreaming} 
                        mode={mode}
                        onModeChange={setMode}
                     />
                     <div className="mt-2 text-center text-xs text-white/30">
                        MediBot can make mistakes. Consider checking important information.
                     </div>
                 </div>
             </div>
        </div>
      </div>
    </div>
  );
}
