import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

import { ChatScreen } from "./ChatScreen";

export default async function ChatPage() {
  const session = await auth();
  const allowAnon = process.env.NEXT_PUBLIC_ALLOW_ANON === "true";
  if (!session && !allowAnon) {
    redirect("/signin");
  }

  return <ChatScreen initialSessionId={null} />;
}

