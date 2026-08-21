"use client";

import { useEffect } from "react";
import { ErrorView } from "@/components/error-view";

// biome-ignore lint/suspicious/noShadowRestrictedNames: Next.js requires Error component name
export default function Error({
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
    <div className="flex min-h-[50vh] items-center justify-center">
      <ErrorView
        digest={error.digest}
        message={error.message}
        onReset={reset}
        title="Something went wrong"
      />
    </div>
  );
}
