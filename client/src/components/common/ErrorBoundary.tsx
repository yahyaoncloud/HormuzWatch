import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
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
    console.error('[ErrorBoundary] Unhandled UI error caught:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] h-full p-6 bg-slate-950 text-slate-100 rounded-lg border border-red-900/50 shadow-2xl">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
            <h2 className="text-xl font-mono tracking-wider text-red-400 uppercase">
              {this.props.fallbackTitle || 'Tactical Radar Render Fault'}
            </h2>
          </div>
          <p className="text-sm font-mono text-slate-400 max-w-md text-center mb-6">
            {this.props.fallbackMessage ||
              'A critical rendering exception occurred in the geospatial vector or telemetry rendering pipeline.'}
          </p>
          {this.state.error && (
            <pre className="text-xs font-mono text-red-300 bg-red-950/40 p-3 rounded border border-red-900/30 max-w-lg overflow-x-auto mb-6">
              {this.state.error.message}
            </pre>
          )}
          <button
            onClick={this.handleReset}
            className="px-4 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-300 border border-red-500/40 rounded text-xs font-mono tracking-wider uppercase transition-colors"
          >
            Re-initialize Radar Stream
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
