"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangleIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surfaces the failure in devtools; wire this up to your reporter to get
    // these in production.
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-svh flex-1 flex-col items-center justify-center p-8">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <AlertTriangleIcon aria-hidden />
          </EmptyMedia>
          <EmptyTitle className="font-heading text-2xl">
            Something went wrong
          </EmptyTitle>
          <EmptyDescription>
            An unexpected error interrupted this view. You can retry, or head
            back to your repositories.
          </EmptyDescription>
        </EmptyHeader>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button onClick={reset}>Try again</Button>
          <Button variant="outline" render={<Link href="/dashboard" />}>
            Go to dashboard
          </Button>
        </div>
        {error.digest && (
          <p className="text-xs text-muted-foreground">
            Reference: {error.digest}
          </p>
        )}
      </Empty>
    </main>
  );
}
