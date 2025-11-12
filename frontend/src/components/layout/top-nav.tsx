"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import { ReactNode } from "react";
import { Stethoscope } from "lucide-react";

import { Button } from "@/components/ui/button";

export function TopNav(): ReactNode {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();

  const handleNewChat = () => {
    if (pathname !== "/chat") {
      router.push("/chat?new=true");
    } else {
      router.replace("/chat?new=true");
    }
  };

  return (
    <header className="border-b border-border/70 bg-[#181818]/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/chat" className="flex items-center gap-3 text-foreground transition hover:opacity-90">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-primary">
            <Stethoscope className="h-6 w-6" />
          </span>
          <div>
            <p className="text-xl font-semibold tracking-tight">MediBot</p>
            <p className="text-xs text-muted-foreground">AI Medical Assistant</p>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleNewChat} className="hidden sm:flex">
            New Chat
          </Button>
          {status === "loading" ? (
            <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
          ) : session ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground max-sm:hidden">
                Welcome back, <span className="text-foreground">{session.user?.name ?? "friend"}</span>
              </span>
              <Button variant="ghost" onClick={() => signOut()} size="sm">
                Sign out
              </Button>
            </div>
          ) : (
            <Button onClick={() => signIn()} size="sm">
              Sign in
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

