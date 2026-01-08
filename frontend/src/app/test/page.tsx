import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ChatScreen } from "@/app/chat/ChatScreen";

export default async function TestPage() {
  const session = await auth();
  const allowAnon = process.env.NEXT_PUBLIC_ALLOW_ANON === "true";
  
  // Allow access if authenticated OR anonymous mode is enabled
  if (!session && !allowAnon) {
    redirect("/signin");
  }

  return <ChatScreen initialSessionId={null} />;
}
