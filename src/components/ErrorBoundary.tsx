import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "./ui/button.tsx";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Use a shorter fallback that fits inside an existing page shell (e.g. nested under a nav layout) instead of taking the full viewport. */
  compact?: boolean;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  declare props: ErrorBoundaryProps;
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Unhandled UI error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className={`flex items-center justify-center bg-background p-6 ${this.props.compact ? "min-h-[50vh]" : "min-h-screen"}`}>
          <div className="max-w-md w-full text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-destructive" />
            </div>
            <h1 className="text-xl font-black tracking-tight text-foreground">Something went wrong</h1>
            <p className="text-sm text-muted-foreground">
              This part of InnerVerse hit an unexpected error. Reloading usually fixes it; your data is safe.
            </p>
            <Button onClick={() => window.location.reload()} className="gap-2">
              <RefreshCw className="w-4 h-4" /> Reload
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
