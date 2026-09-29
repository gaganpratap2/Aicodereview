import { getApiBaseUrl, ApiError, type ChatMessage } from "@/lib/api";

export type StreamChatHandlers = {
  onUserMessage?: (message: ChatMessage) => void;
  onToken?: (token: string) => void;
  onAssistantMessage?: (message: ChatMessage) => void;
  onDone?: () => void;
  onError?: (error: Error) => void;
  signal?: AbortSignal;
};

export async function streamChatMessage(
  sessionId: string,
  content: string,
  handlers: StreamChatHandlers = {}
): Promise<void> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/chat/sessions/${sessionId}/messages`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
      signal: handlers.signal,
    }
  );

  if (!res.ok) {
    let message = res.statusText;
    try {
      const data = await res.json();
      message = data.message ?? data.error ?? message;
    } catch {
      // ignore
    }
    throw new ApiError(res.status, message);
  }

  if (!res.body) {
    throw new Error("No response body for SSE stream");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let sawDone = false;

  const handlePart = (part: string) => {
    if (!part.trim()) return;

    const lines = part.split("\n");
    let event = "message";
    const dataLines: string[] = [];

    for (const line of lines) {
      if (line.startsWith("event:")) {
        event = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        dataLines.push(line.slice(5).trimStart());
      }
    }

    const data = dataLines.join("\n");
    if (!data) return;

    try {
      if (event === "token") {
        handlers.onToken?.(JSON.parse(data) as string);
      } else if (event === "user_message") {
        handlers.onUserMessage?.(JSON.parse(data) as ChatMessage);
      } else if (event === "assistant_message") {
        handlers.onAssistantMessage?.(JSON.parse(data) as ChatMessage);
      } else if (event === "done") {
        sawDone = true;
        handlers.onDone?.();
      }
    } catch (err) {
      handlers.onError?.(
        err instanceof Error ? err : new Error("Failed to parse SSE event")
      );
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        handlePart(part);
      }
    }

    // The stream may end without a trailing blank line, which would otherwise
    // leave the final event sitting in the buffer.
    buffer += decoder.decode();
    if (buffer.trim()) {
      handlePart(buffer);
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }

  // The backend always sends an explicit `done`; only fall back when it did not.
  if (!sawDone) {
    handlers.onDone?.();
  }
}