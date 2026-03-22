import React, { Component, ErrorInfo, ReactNode } from "react";
import * as LucideIcons from "lucide-react";
const {
  AlertTriangle,
} = LucideIcons as any;

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * A robust Error Boundary wrapper for components that might crash.
 * Prevents the entire app from going blank if a single component fails.
 */
export class SafeComponent extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(
      `[SafeComponent] Error in ${this.props.componentName || "Component"}:`,
      error,
      errorInfo,
    );
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default minimal fallback
      return (
        <div className="p-4 border border-red-500/30 bg-red-950/20 rounded m-2 flex items-center gap-2 text-red-400 text-xs font-mono">
          <AlertTriangle size={16} />
          <span>
            {this.props.componentName || "Component"} Error:{" "}
            {this.state.error?.message || "Unknown error"}
          </span>
        </div>
      );
    }

    return this.props.children;
  }
}
