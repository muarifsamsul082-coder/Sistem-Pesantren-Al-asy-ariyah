import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    try {
      sessionStorage.setItem('pesantren_current_view', 'home');
      sessionStorage.setItem('pesantren_admin_active_tab', 'overview');
      localStorage.setItem('pesantren_admin_active_tab', 'overview');
    } catch (e) {}
    window.location.href = window.location.pathname;
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="w-full p-6 sm:p-8 my-6 bg-white rounded-2xl border border-slate-200 shadow-sm text-center max-w-xl mx-auto space-y-4 font-sans animate-fade-in">
          <div className="mx-auto w-12 h-12 bg-amber-50 text-amber-700 rounded-full flex items-center justify-center border border-amber-200">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900">
              {this.props.fallbackTitle || 'Menu Tidak Dapat Dimuat'}
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Terjadi kendala kecil saat memuat data pada menu ini. Seluruh data penting Anda tetap aman tersimpan di sistem.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={this.handleReset}
              className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Muat Ulang Halaman</span>
            </button>
            <button
              type="button"
              onClick={this.handleGoHome}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-slate-200"
            >
              <Home className="h-3.5 w-3.5" />
              <span>Kembali ke Beranda</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
