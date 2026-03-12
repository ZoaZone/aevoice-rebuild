import React from "react";

export class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary] Caught error:", error, info);
    if (this.props.onError) {
      this.props.onError(error, info);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 16 }}>
          <h2 className="text-xl font-bold text-red-600">Something went wrong.</h2>
          <p className="text-slate-600">Please refresh the page or try again later.</p>
        </div>
      );
    }
    return this.props.children;
  }
}