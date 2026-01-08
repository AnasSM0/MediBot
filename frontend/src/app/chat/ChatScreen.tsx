"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { Loader2, Activity } from "lucide-react";

import { ChatInput } from "@/components/chat/ChatInput";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { Sidebar } from "@/components/chat/Sidebar";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { VoiceOutputControls } from "@/components/chat/VoiceOutputControls";
import { toast } from "@/components/ui/use-toast";
import { fetchHistory, fetchSession, streamChat, deleteSession } from "@/lib/api";
import { useVoiceOutput } from "@/hooks/useVoiceOutput";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { RAGInspector } from "@/components/chat/RAGInspector";

type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  severity?: "mild" | "moderate" | "severe";
  createdAt: string;
  isStreaming?: boolean;
};

type ChatSummary = {
  id: string;
  title: string | null;
  created_at: string;
};

const formatTimestamp = (dateIso?: string) => {
  if (!dateIso) return undefined;
  return format(new Date(dateIso), "MMM d, h:mm aaa");
};

export function ChatScreen({ initialSessionId }: { initialSessionId: string | null }) {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Core State
  const [activeSessionId, setActiveSessionId] = useState<string | null>(initialSessionId);
  const [history, setHistory] = useState<ChatSummary[]>([]);
  
  // Message reconciliation state
  const [serverMessages, setServerMessages] = useState<Message[]>([]);
  const [pendingUserMsg, setPendingUserMsg] = useState<Message | null>(null);
  const [streamingMsg, setStreamingMsg] = useState<Message | null>(null);
  
  const [isStreaming, setIsStreaming] = useState(false);
  const [voiceOutputEnabled, setVoiceOutputEnabled] = useState(false);
  const [mode, setMode] = useState<"normal" | "doctor" | "deep_research">("normal");
  const [ragDebugInfo, setRagDebugInfo] = useState<any>(null);
  
  // Refs
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Derived State: Merged Messages (Deduplication Logic)
  const messages = useMemo(() => {
     let merged = [...serverMessages];

     // 1. Merge Pending User Message
     // Heuristic: If server messages already contain a user msg with same content/time, ignore pending.
     if (pendingUserMsg) {
         const isDuplicate = merged.some(m => 
             m.role === 'user' && 
             m.content === pendingUserMsg.content && 
             Math.abs(new Date(m.createdAt).getTime() - new Date(pendingUserMsg.createdAt).getTime()) < 10000
         );
         if (!isDuplicate) {
             merged.push(pendingUserMsg);
         }
     }

     // 2. Merge Streaming Assistant Message
     // Strict ID matching: If streaming ID matches a server ID, replace server msg (streaming is newer).
     // Otherwise append.
     if (streamingMsg) {
         const index = merged.findIndex(m => m.id === streamingMsg.id);
         if (index !== -1) {
             merged[index] = streamingMsg;
         } else {
             merged.push(streamingMsg);
         }
     }

     return merged.sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [serverMessages, pendingUserMsg, streamingMsg]);

  // Hooks
  const { speak, cancel: cancelSpeech, isSpeaking } = useVoiceOutput({
    onError: (error) => console.error("Voice output error:", error),
  });
  const { registerHandler } = useKeyboardShortcuts({ enabled: true });

  const accessToken = session?.accessToken;
  const allowAnon = process.env.NEXT_PUBLIC_ALLOW_ANON === "true";
  const isAuthenticated = status === "authenticated" || allowAnon;

  // Load History
  const loadHistory = useCallback(async () => {
      if (!accessToken && !allowAnon) return;
      try {
        const sessions = await fetchHistory(accessToken);
        setHistory(sessions);
      } catch (error) {
        console.error("Failed to load history", error);
      }
  }, [accessToken, allowAnon]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  // New Chat Handler
  useEffect(() => {
    if (searchParams.get("new") === "true") {
      handleNewChat();
      router.replace("/chat");
    }
  }, [searchParams, router]);

  // Load Session Logic
  useEffect(() => {
    if ((!accessToken && !allowAnon) || !activeSessionId) return;

    const loadSession = async () => {
      try {
        const data = await fetchSession(accessToken, activeSessionId);
        const loaded: Message[] = data.messages.map((m) => ({
            id: m.id,
            role: m.role as any,
            content: m.content,
            severity: (m.structured?.severity as any) ?? undefined,
            createdAt: m.created_at,
        }));
        
        setServerMessages(loaded);
        if (data.mode) setMode(data.mode as any);
        
        // Cleanup pending if we successfully synced
        // But only if we are not currently streaming (to avoid race where sync happens before stream done)
        // Actually, logic is: if sync happens, pendingUserMsg might be in loaded.
        // We rely on useMemo to dedupe.
        
      } catch (error) {
        console.error(error);
        toast({ title: "Error", description: "Could not load chat.", variant: "destructive" });
      }
    };
    void loadSession();
  }, [accessToken, activeSessionId, allowAnon]); // Refetch on ID change

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, streamingMsg?.content]);

  // Handlers
  const handleNewChat = () => {
    setActiveSessionId(null);
    setServerMessages([]);
    setPendingUserMsg(null);
    setStreamingMsg(null);
    setMode("normal");
    setRagDebugInfo(null);
  };

  const handleSelectSession = (id: string) => {
    if (id !== activeSessionId) {
        // Reset transient states
        setPendingUserMsg(null);
        setStreamingMsg(null);
        setIsStreaming(false);
        setActiveSessionId(id);
    }
  };

  const handleDeleteSession = async (id: string) => {
    if (!confirm("Are you sure you want to delete this chat?")) return;
    
    try {
        await deleteSession(accessToken, id);
        setHistory(prev => prev.filter(s => s.id !== id));
        toast({ title: "Deleted", description: "Chat deleted permanently." });
        if (activeSessionId === id) {
            handleNewChat();
        }
    } catch (e) {
        toast({ title: "Error", description: "Failed to delete.", variant: "destructive" });
    }
  };

  const handleSend = async (content: string, image?: File) => {
    if (!isAuthenticated) return;

    // 1. Setup Transient State
    const userMsg: Message = {
        id: crypto.randomUUID(), // Local only
        role: "user",
        content: image ? `[Image Uploaded] ${content}` : content,
        createdAt: new Date().toISOString(),
    };
    setPendingUserMsg(userMsg);

    const placeholderId = crypto.randomUUID();
    setStreamingMsg({
        id: placeholderId,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
        isStreaming: true
    });
    
    setIsStreaming(true);
    setRagDebugInfo(null);
    if (isSpeaking) cancelSpeech();

    // 2. Stream
    await streamChat({
      token: accessToken,
      message: content,
      image,
      sessionId: activeSessionId ?? undefined,
      mode,
      onStart: (payload) => {
          // 3. ID Reconciliation
          // We got the real ID from DB. Update streaming msg.
          setStreamingMsg(prev => prev ? { ...prev, id: payload.messageId } : null);
          
          if (!activeSessionId) {
              setActiveSessionId(payload.sessionId);
              // Optimistically add to history list (will be refreshed fully later)
               setHistory(prev => [{
                   id: payload.sessionId,
                   title: (content.slice(0, 30) || "New Chat") + "...",
                   created_at: new Date().toISOString()
               }, ...prev]);
          }
      },
      onChunk: (chunk) => {
          setStreamingMsg(prev => prev ? { ...prev, content: prev.content + chunk } : null);
      },
      onDone: async (payload) => {
          // 4. Finalize
          // Don't modify streamingMsg here yet, wait for sync? 
          // Actually, we should trigger a sync from server.
          // But to be responsive, we can "commit" our streaming message to serverMessages local cache?
          // No, safer to just refetch session.
          
          setIsStreaming(false);
          const finalContent = streamingMsg?.content || ""; // capture for speech
          
          // Clear transient states SOON, but after fetch replaces them?
          // If we clear `streamingMsg` immediately, it disappears until `fetch` returns (flicker).
          // So we should KEEP it until `fetch` returns.
          // The merging logic handles preference (Streaming > Server).
          // Once fetch returns, Server has the message.
          // But Server message won't be "isStreaming". 
          // So streamingMsg (with isStreaming=true) would still override Server message?
          // Yes. So we must clear `streamingMsg` AFTER fetch confirms it's there.
          // OR, we manually update `streamingMsg` to `isStreaming=false` and move it to `serverMessages`?
          
          // Let's manually commit to serverMessages to ensure smoothness
          // Then fetchSession will serve as the "consistency check" later.
          
          setServerMessages(prev => {
             // Append pending user + assistant
             const newServer = [...prev];
             if (pendingUserMsg && !newServer.some(m => m.content === pendingUserMsg.content)) { // heuristic check again
                 newServer.push(pendingUserMsg);
             }
             // Assistant
             const realId = payload.messageId; // or streamingMsg.id
             /* We don't have the final content here from payload (chunked), 
                so we use the streamingMsg content state. */
             
             // We can't easily access the functional state inside setServerMessages closure.
             return newServer; 
             // This is getting complex.
             // Simpler: Just rely on fetchSession.
             // To prevent flicker, we leave streamingMsg/pendingUserMsg active?
             // But if we setIsStreaming(false), does that matter?
             // Not really.
          });
          
          if (payload.severity && voiceOutputEnabled) speak(finalContent); 

          await Promise.all([
             fetchSession(accessToken, payload.sessionId).then(data => {
                 const loaded = data.messages.map((m: any) => ({
                    id: m.id,
                    role: m.role,
                    content: m.content,
                    severity: m.structured?.severity,
                    createdAt: m.created_at,
                }));
                setServerMessages(loaded);
                // Now safe to clear transients
                setPendingUserMsg(null);
                setStreamingMsg(null);
             }),
             loadHistory()
          ]);
      },
      onError: (err) => {
        setIsStreaming(false);
        toast({ title: "Error", description: "Message failed.", variant: "destructive" });
        // Clean up partials?
        setStreamingMsg(null);
      },
      onDebug: setRagDebugInfo
    });
  };

  // Keyboard Shortcuts
  useEffect(() => {
    registerHandler('clear-chat', handleNewChat);
    registerHandler('stop-voice', cancelSpeech);
    registerHandler('toggle-voice-output', () => {
        setVoiceOutputEnabled(v => !v);
        toast({ title: "Voice toggled", description: !voiceOutputEnabled ? "On" : "Off" });
    });
    registerHandler('focus-input', () => inputRef.current?.focus());
  }, [registerHandler, cancelSpeech, voiceOutputEnabled]);

  const formattedHistory = useMemo(() => history.map(s => ({
       id: s.id, 
       title: s.title, 
       createdAt: formatTimestamp(s.created_at) ?? ""
  })), [history]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#212121] text-gray-100 font-sans">
      <Sidebar
        sessions={formattedHistory}
        activeId={activeSessionId ?? undefined}
        onSelect={handleSelectSession}
        onNew={handleNewChat}
        onDelete={handleDeleteSession}
        isAuthenticated={isAuthenticated}
      />

      <div className="flex flex-1 flex-col relative h-full">
        <header className="sticky top-0 z-10 flex w-full items-center justify-end p-3 text-sm text-gray-400 bg-[#212121]/80 backdrop-blur-sm">
             <div className="flex items-center gap-4">
                 <VoiceOutputControls enabled={voiceOutputEnabled} onToggle={setVoiceOutputEnabled} />
             </div>
        </header>

        <div className="flex-1 overflow-y-auto w-full">
            <div className="flex min-h-full flex-col items-center pb-32 pt-10">
                <div className="w-full max-w-3xl px-4 flex-1 flex flex-col gap-6">
                    <RAGInspector data={ragDebugInfo} />
                    
                    {messages.length === 0 ? (
                       <div className="flex flex-1 flex-col items-center justify-center opacity-80 mt-[20vh]">
                           <div className="bg-white/10 p-3 rounded-full mb-4">
                               <Activity className="h-6 w-6 text-white" />
                           </div>
                           <p className="text-gray-500">Ready to help.</p>
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
                          onRegenerate={() => handleSend(message.content)} 
                          onExport={() => {}} 
                        />
                      ))
                    )}
                    
                    {isStreaming && !streamingMsg && (
                      <div className="w-full pl-4 max-w-3xl">
                        <TypingIndicator />
                      </div>
                    )}
                    <div ref={bottomRef} className="h-4" />
                </div>
            </div>
        </div>

        <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-[#212121] via-[#212121] to-transparent pt-10 pb-6 px-4">
             <div className="mx-auto w-full max-w-3xl">
                 <div className="relative">
                     <ChatInput 
                        ref={inputRef}
                        onSend={handleSend} 
                        disabled={!isAuthenticated || isStreaming} 
                        mode={mode}
                        onModeChange={setMode}
                     />
                 </div>
             </div>
        </div>
      </div>
    </div>
  );
}
