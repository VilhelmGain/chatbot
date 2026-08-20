"use client";

import { useEffect } from "react";
import { ErrorView } from "@/components/error-view";

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
      <body className="antialiased">
        <div className="flex min-h-screen items-center justify-center">
          <ErrorView
            digest={error.digest}
            message={error.message}
            onReset={reset}
            title="Application error"
          />
        </div>
      </body>
    </html>
  );
}
