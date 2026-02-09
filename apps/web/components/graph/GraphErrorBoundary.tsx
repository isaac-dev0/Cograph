"use client";

import { Component, type ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GraphErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface GraphErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: string | null;
}

export class GraphErrorBoundary extends Component<
  GraphErrorBoundaryProps,
  GraphErrorBoundaryState
> {
  constructor(props: GraphErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<GraphErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    console.error("Graph visualization error:", error, errorInfo);
    this.setState({
      errorInfo: errorInfo.componentStack,
    });
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center w-full h-full bg-background">
          <div className="flex flex-col items-center gap-4 max-w-md text-center animate-fade-in px-4">
            <div className="flex size-12 items-center justify-center rounded-lg border border-destructive/20 bg-destructive/10">
              <AlertCircle className="size-5 text-destructive" />
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Graph Visualization Error</h3>
              <p className="text-xs text-muted-foreground">
                {this.state.error?.message ||
                  "An unexpected error occurred while rendering the graph."}
              </p>
            </div>

            {process.env.NODE_ENV === "development" && this.state.errorInfo && (
              <details className="w-full text-left">
                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                  View error details
                </summary>
                <pre className="mt-2 text-[10px] text-muted-foreground bg-muted/50 rounded-md p-3 overflow-auto max-h-40 border">
                  {this.state.errorInfo}
                </pre>
              </details>
            )}

            <Button
              onClick={this.handleRetry}
              size="sm"
              variant="outline"
              className="gap-2"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry Rendering
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
