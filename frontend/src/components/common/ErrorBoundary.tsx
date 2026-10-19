import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
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
    console.error('Uncaught React Error in Component Tree:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[500px] flex items-center justify-center p-6 bg-warm-bg">
          <div className="brutal-card bg-warm-surface p-8 max-w-lg w-full text-center space-y-5 border-2 border-red-500 shadow-brutal-md">
            <div className="w-16 h-16 rounded-2xl bg-red-100 border-2 border-red-300 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-extrabold text-warm-text">Đã xảy ra lỗi hiển thị</h2>
              <p className="text-sm text-warm-muted leading-relaxed">
                Hệ thống gặp sự cố khi dựng giao diện cho phần này. Chi tiết lỗi đã được ghi nhận trong console để gỡ lỗi.
              </p>
              {this.state.error?.message && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-mono text-red-700 text-left overflow-x-auto">
                  {this.state.error.message}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={this.handleReset}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-500 text-white font-extrabold text-sm border-2 border-warm-border shadow-brutal-sm hover:translate-x-0.5 hover:translate-y-0.5 flex items-center justify-center gap-2 transition-transform"
              >
                <RotateCcw className="w-4 h-4" />
                Thử lại trang
              </button>
              <Link
                to="/"
                onClick={() => this.setState({ hasError: false, error: null })}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-warm-subtle text-warm-text font-bold text-sm border border-warm-border hover:bg-warm-border/20 flex items-center justify-center gap-2 transition-colors"
              >
                <Home className="w-4 h-4" />
                Về trang chủ
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
