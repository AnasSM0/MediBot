export type ChatStreamHandlers = {
  token?: string;
  message: string;
  image?: File;
  sessionId?: string;
  onChunk: (chunk: string) => void;
  onDone: (payload: { sessionId: string; messageId: string; severity: string; requiresAttention: boolean }) => void;
  onError: (error: Error) => void;
};

type FetchOptions = RequestInit & { token?: string };

const decoder = new TextDecoder("utf-8");

export const getBackendUrl = () => process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

export async function apiFetch<TResponse>(path: string, options: FetchOptions = {}) {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  const response = await fetch(`${getBackendUrl()}${path}`, {
    ...options,
    headers,
    next: options.next,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || response.statusText);
  }

  return (await response.json()) as TResponse;
}

export async function streamChat({
  token,
  message,
  image,
  sessionId,
  onChunk,
  onDone,
  onError,
}: ChatStreamHandlers) {
  try {
    const headers = new Headers();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    let body: BodyInit;
    let url = `${getBackendUrl()}/chat`;

    if (image) {
      url = `${getBackendUrl()}/chat/image`;
      const formData = new FormData();
      formData.append("file", image);
      if (message) formData.append("message", message);
      if (sessionId) formData.append("session_id", sessionId);
      body = formData;
      // Content-Type is automatically set for FormData
    } else {
      headers.set("Content-Type", "application/json");
      body = JSON.stringify({ message, session_id: sessionId });
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body,
    });

    if (!response.ok || !response.body) {
      throw new Error("Unable to contact MediBot. Please try again.");
    }

    const reader = response.body.getReader();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const events = buffer.split("\n\n");
      buffer = events.pop() ?? "";

      for (const rawEvent of events) {
        if (!rawEvent.startsWith("data:")) continue;
        const dataString = rawEvent.replace(/^data:\s*/, "");
        if (!dataString || dataString === "[DONE]") continue;
        const payload = JSON.parse(dataString) as
          | { type: "chunk"; content: string }
          | {
              type: "done";
              session_id: string;
              message_id: string;
              severity: string;
              requires_attention: boolean;
            };

        if (payload.type === "chunk") {
          onChunk(payload.content);
        } else if (payload.type === "done") {
          onDone({
            sessionId: payload.session_id,
            messageId: payload.message_id,
            severity: payload.severity,
            requiresAttention: payload.requires_attention,
          });
        }
      }
    }
  } catch (error) {
    onError(error instanceof Error ? error : new Error("Unknown error"));
  }
}

export async function fetchHistory(token?: string) {
  return apiFetch<{ id: string; title: string | null; created_at: string }[]>("/history", { token });
}

export async function fetchSession(token: string | undefined, sessionId: string) {
  return apiFetch<{
    id: string;
    title: string | null;
    created_at: string;
    updated_at: string;
    messages: { id: string; role: string; content: string; structured?: Record<string, unknown>; created_at: string }[];
  }>(`/history/${sessionId}`, { token });
}

