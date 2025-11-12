import { CalendarClock, LogIn, Plus, Stethoscope } from "lucide-react";
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
  isAuthenticated: boolean;
};

export function Sidebar({ sessions, activeId, onSelect, onNew, isAuthenticated }: SidebarProps) {
  return (
    <aside className="hidden w-72 shrink-0 border-r border-border/70 bg-[#161616]/90 backdrop-blur md:flex md:flex-col">
      <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary">
            <Stethoscope className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">Your Sessions</p>
            <p className="text-xs text-muted-foreground">Review past medical chats</p>
          </div>
        </div>
        <Button variant="outline" size="icon" onClick={onNew} className="h-9 w-9">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        {!isAuthenticated ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-sm text-muted-foreground">
            <LogIn className="h-6 w-6 text-primary" />
            <p>Sign in to sync and revisit your medical conversations.</p>
            <Button asChild size="sm">
              <Link href="/signin">Sign in</Link>
            </Button>
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
            <CalendarClock className="h-6 w-6 text-primary" />
            <p>No conversations yet. Start a new chat!</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {sessions.map((session) => (
              <li key={session.id}>
                <button
                  type="button"
                  onClick={() => onSelect(session.id)}
                  className={cn(
                    "w-full rounded-2xl border border-transparent px-4 py-3 text-left transition",
                    "hover:border-primary/40 hover:bg-primary/5",
                    activeId === session.id ? "border-primary/40 bg-primary/10" : "bg-[#1F1F1F]/80",
                  )}
                >
                  <p className="line-clamp-2 text-sm font-medium text-foreground">
                    {session.title || "Untitled consultation"}
                  </p>
                  <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">{session.createdAt}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </ScrollArea>
    </aside>
  );
}

