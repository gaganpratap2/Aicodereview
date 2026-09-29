"use client";

import { useEffect } from "react";

/**
 * Last-resort boundary. It replaces the root layout, so it has to render its
 * own <html> and <body> and cannot rely on the app providers.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main
          style={{
            display: "flex",
            minHeight: "100vh",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1rem",
            padding: "2rem",
            fontFamily: "system-ui, sans-serif",
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: "1.5rem", margin: 0 }}>
            Something went wrong
          </h1>
          <p style={{ margin: 0, opacity: 0.7 }}>
            The application failed to render. Reloading usually fixes it.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              cursor: "pointer",
              border: "1px solid currentColor",
              borderRadius: "0.5rem",
              background: "transparent",
              color: "inherit",
              padding: "0.5rem 1rem",
              font: "inherit",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
