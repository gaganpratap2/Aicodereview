"use client";

import { use } from "react";

import {ChatView}  from "@/components/chat/chat-view";
import { RequireAuth } from "@/components/provider/require-auth";

export default function ChatPage({
  params,
}: {
  params: Promise<{ repoId: string }>;
}) {
  const { repoId } = use(params);

  return (
    <RequireAuth>
      {/* Keying on repoId remounts the view on navigation so per-repo local
          state (selected session, auto-create guard) can never leak across
          repositories. */}
      <ChatView key={repoId} repoId={repoId} />
    </RequireAuth>
  );
}
