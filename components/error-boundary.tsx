"use client";

import { Component, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, info: { componentStack: string }) => void;
};

type State = { hasError: boolean; error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { error, hasError: true };
  }

  componentDidCatch(error: Error, info: { componentStack: string }): void {
    this.props.onError?.(error, info);
    if (process.env.NODE_ENV !== "production") {
      console.error(error, info.componentStack);
    }
  }

  handleReset = (): void => {
    this.setState({ error: null, hasError: false });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
          <h2 className="font-semibold text-lg">Something went wrong</h2>
          <p className="max-w-md text-muted-foreground text-sm">
            {this.state.error?.message ?? "An unexpected error occurred."}
          </p>
          <button
            className="rounded-md bg-primary px-4 py-2 text-primary-foreground text-sm"
            onClick={this.handleReset}
            type="button"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
