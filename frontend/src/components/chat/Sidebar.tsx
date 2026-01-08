import { CalendarClock, LogIn, Plus, Stethoscope, Trash2 } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export type ChatSummary = {
  id: string;
  title?: string | null;
  createdAt: string;
};

type SidebarProps = {
  sessions: ChatSummary[];
  activeId?: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => Promise<void>;
  isAuthenticated: boolean;
};

export function Sidebar({ sessions, activeId, onSelect, onNew, onDelete, isAuthenticated }: SidebarProps) {
  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this chat? This action cannot be undone.")) {
      await onDelete(id);
    }
  };

  return (
    <aside className="hidden w-[260px] shrink-0 flex-col bg-[#171717] md:flex">
      <div className="p-3">
        <Button 
            onClick={onNew} 
            variant="outline" 
            className="w-full justify-start gap-2 border-white/20 bg-transparent text-white hover:bg-white/10"
        >
          <Plus className="h-4 w-4" />
          <span className="text-sm">New chat</span>
        </Button>
      </div>

      <ScrollArea className="flex-1 px-3">
        {!isAuthenticated ? (
            <div className="mt-10 px-2 text-center text-sm text-muted-foreground">
                <p className="mb-4">Sign in to save your history.</p>
                <Button asChild size="sm" variant="outline" className="w-full">
                    <Link href="/signin">Sign in</Link>
                </Button>
            </div>
        ) : sessions.length === 0 ? (
          <div className="mt-10 text-center text-xs text-muted-foreground">
            <p>No history yet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 pb-4">
               {/* Grouping by date could be added here later */}
               <div className="text-xs font-medium text-muted-foreground/50 px-2 py-2">History</div>
               {sessions.map((session) => (
                  <div key={session.id} className="group relative">
                    <button
                        onClick={() => onSelect(session.id)}
                        className={cn(
                        "flex w-full items-center rounded-lg px-2 py-2 text-sm transition-colors text-left",
                        activeId === session.id ? "bg-[#212121] text-white" : "text-gray-400 hover:bg-[#212121] hover:text-white"
                        )}
                    >
                        <span className="truncate pr-8">{session.title || "New Chat"}</span>
                    </button>
                    {activeId === session.id && (
                        <button
                            onClick={(e) => handleDelete(e, session.id)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 opacity-0 hover:text-red-400 group-hover:opacity-100"
                            title="Delete chat"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    )}
                  </div>
               ))}
          </div>
        )}
      </ScrollArea>
      
      {/* User profile area could go here */}
      <div className="border-t border-white/10 p-3">
         <div className="flex items-center gap-3 rounded-lg px-2 py-3 text-sm text-gray-100 hover:bg-[#212121] transition cursor-pointer">
             <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-green-600/20">
                 <Stethoscope className="h-5 w-5 text-green-500" />
             </div>
             <div className="font-medium">MediBot</div>
         </div>
      </div>
    </aside>
  );
}

