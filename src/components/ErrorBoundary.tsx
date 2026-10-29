import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in React render tree:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetCache = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (_) {}
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-screen bg-[#0A0A0C] text-zinc-100 flex flex-col items-center justify-center p-6 font-sans">
          <div className="max-w-xl w-full bg-[#121216] border border-red-500/30 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-red-600 via-rose-500 to-red-600" />
            
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Application Exception</h2>
                <p className="text-xs text-zinc-400">A runtime error occurred in the user interface component.</p>
              </div>
            </div>

            <div className="bg-[#08080A] border border-white/10 rounded-xl p-4 mb-6 text-xs font-mono text-red-300/90 overflow-x-auto max-h-48 scrollbar-thin">
              <p className="font-semibold text-red-400 mb-1">
                {this.state.error?.name || 'Error'}: {this.state.error?.message || 'An unexpected rendering error occurred.'}
              </p>
              {this.state.error?.stack && (
                <pre className="text-[10px] text-zinc-500 mt-2 whitespace-pre-wrap leading-relaxed">
                  {this.state.error.stack}
                </pre>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={this.handleReload}
                className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-500 text-white font-medium text-xs rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-red-600/20"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload Interface</span>
              </button>

              <button
                onClick={this.handleResetCache}
                className="py-2.5 px-4 bg-white/5 hover:bg-white/10 text-zinc-300 font-medium text-xs rounded-xl border border-white/10 transition-colors flex items-center gap-2"
                title="Clear local session cache and restart"
              >
                <Trash2 className="w-3.5 h-3.5 text-zinc-400" />
                <span>Clear Cache & Reset</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
