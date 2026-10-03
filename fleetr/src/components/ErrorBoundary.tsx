import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React error:', error, errorInfo);
  }

  private handleReset = () => {
    localStorage.removeItem('fleetr_user');
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center antialiased">
          <div className="max-w-md w-full bg-slate-950/90 border border-amber-500/30 rounded-2xl p-8 shadow-2xl space-y-6">
            <div className="w-14 h-14 bg-amber-500/20 border border-amber-500/40 rounded-2xl flex items-center justify-center mx-auto text-amber-400">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-bold font-display text-white tracking-tight">Something went wrong</h1>
              <p className="text-xs text-slate-400 leading-relaxed">
                An unexpected interface error occurred. You can refresh the session or reset local cache to continue.
              </p>
            </div>
            {this.state.error && (
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-left overflow-auto max-h-32">
                <code className="text-[11px] font-mono text-rose-400 break-words">
                  {this.state.error.message || String(this.state.error)}
                </code>
              </div>
            )}
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => window.location.reload()}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold font-mono uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Page</span>
              </button>
              <button
                onClick={this.handleReset}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition-all cursor-pointer"
              >
                Clear Cache & Sign Out
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
