"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

import { api, type ChatMessage } from "@/lib/api";
import { queryKeys } from "@/lib/querykey";
import { streamChatMessage } from "@/lib/streamchat";
import { toast } from "@/components/ui/use-toast";

export function useChatSessions(repositoryId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.chat.sessions(repositoryId),
    queryFn: () => api.listSessions(repositoryId),
    enabled: Boolean(repositoryId) && enabled,
  });
}

export function useChatMessages(sessionId: string | null) {
  return useQuery({
    queryKey: queryKeys.chat.messages(sessionId ?? ""),
    queryFn: () => api.getMessages(sessionId!),
    enabled: Boolean(sessionId),
  });
}

export function useCreateChatSession(repositoryId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (title?: string) => api.createSession(repositoryId, title),
    onSuccess: (session) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.chat.sessions(repositoryId),
      });
      queryClient.setQueryData(queryKeys.chat.messages(session.id), []);
    },
    onError: (error: Error) => {
      toast.add({
        title: "Could not create chat",
        description: error.message,
        type: "error",
      });
    },
  });
}

export function useStreamChat(sessionId: string | null) {
  const queryClient = useQueryClient();
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  // A ref, not state: two Enter presses in the same tick both read the
  // `streaming` state before React re-renders, so a state guard lets the
  // second send through and desyncs the stream.
  const streamingRef = useRef(false);

  const resetStreamState = useCallback(() => {
    streamingRef.current = false;
    setStreaming(false);
    setStreamText("");
  }, []);

  // Switching sessions must cancel the in-flight stream, otherwise the previous
  // answer keeps rendering (and its `finally` resets state) under the new one.
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      streamingRef.current = false;
    };
  }, [sessionId]);

  const send = useCallback(
    async (content: string) => {
      if (!sessionId || !content.trim() || streamingRef.current) return;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const optimisticId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const optimistic: ChatMessage = {
        id: optimisticId,
        role: "USER",
        content: content.trim(),
        citations: [],
        createdAt: new Date().toISOString(),
      };

      // Stop an in-flight refetch from clobbering the optimistic message.
      await queryClient.cancelQueries({
        queryKey: queryKeys.chat.messages(sessionId),
      });

      queryClient.setQueryData<ChatMessage[]>(
        queryKeys.chat.messages(sessionId),
        (prev) => [...(prev ?? []), optimistic]
      );

      streamingRef.current = true;
      setStreaming(true);
      setStreamText("");

      let sawError = false;

      try {
        await streamChatMessage(sessionId, content.trim(), {
          signal: controller.signal,
          onUserMessage: (message) => {
            queryClient.setQueryData<ChatMessage[]>(
              queryKeys.chat.messages(sessionId),
              (prev) => [
                ...(prev ?? []).filter((m) => m.id !== optimisticId),
                message,
              ]
            );
          },
          onToken: (token) => {
            setStreamText((prev) => prev + token);
          },
          onAssistantMessage: (message) => {
            queryClient.setQueryData<ChatMessage[]>(
              queryKeys.chat.messages(sessionId),
              (prev) => [...(prev ?? []), message]
            );
            setStreamText("");
          },
          onDone: () => {
            setStreamText("");
            // Reconcile with the server in case the final frame was lost.
            void queryClient.invalidateQueries({
              queryKey: queryKeys.chat.messages(sessionId),
            });
          },
          onError: () => {
            sawError = true;
          },
        });
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        sawError = true;
        toast.add({
          title: "Message failed",
          description: err instanceof Error ? err.message : "Unknown error",
          type: "error",
        });
        queryClient.setQueryData<ChatMessage[]>(
          queryKeys.chat.messages(sessionId),
          (prev) => (prev ?? []).filter((m) => m.id !== optimisticId)
        );
      } finally {
        if (sawError) {
          setStreamText("");
        }
        streamingRef.current = false;
        setStreaming(false);
      }
    },
    [sessionId, queryClient]
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    // Aborting returns early in `send`, so the partial answer has to be
    // cleared here or it is left on screen with no way to dismiss it.
    resetStreamState();
  }, [resetStreamState]);

  return { send, stop, streaming, streamText };
}