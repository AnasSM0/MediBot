"use client";

import { ChatScreen } from "./ChatScreen";

export default function ChatClient({
  initialSessionId,
}: {
  initialSessionId: string | null;
}) {
  return <ChatScreen initialSessionId={initialSessionId} />;
}
