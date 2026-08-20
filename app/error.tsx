"use client";

// biome-ignore lint/suspicious/noShadowRestrictedNames: Next.js requires Error component name
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="font-semibold text-lg">Something went wrong</h2>
      <p className="max-w-md text-muted-foreground text-sm">
        {error.message || "An unexpected error occurred. Please try again."}
      </p>
      {error.digest ? (
        <p className="text-muted-foreground text-xs">
          Error ID: {error.digest}
        </p>
      ) : null}
      <button
        className="rounded-md bg-primary px-4 py-2 text-primary-foreground text-sm"
        onClick={reset}
        type="button"
      >
        Try again
      </button>
    </div>
  );
}
