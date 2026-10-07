import { Component } from "react";

/** Catches render errors so one broken widget never blanks the whole app. */
class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("UI error:", error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="card max-w-md w-full text-center p-10 border-red-500/20">
          <h2 className="text-xl font-bold text-white font-display">This page hit a snag</h2>
          <p className="text-slate-400 text-sm mt-2">
            Don&apos;t worry — your data is safe. Reload the page, or head back to the dashboard.
          </p>
          <div className="flex gap-3 justify-center mt-6">
            <button
              onClick={() => window.location.reload()}
              className="btn-primary px-5 py-2.5 rounded-xl text-sm"
            >
              Reload
            </button>
            <a
              href="/dashboard"
              className="px-5 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-slate-200 hover:bg-white/10"
            >
              Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
