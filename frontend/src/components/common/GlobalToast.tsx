import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

interface ToastData {
  id: number;
  type: 'success' | 'warning' | 'info';
  message: string;
}

export const GlobalToast: React.FC = () => {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  useEffect(() => {
    const handleNotify = (event: Event) => {
      const customEvent = event as CustomEvent<{ type: 'success' | 'warning' | 'info'; message: string }>;
      if (!customEvent.detail || !customEvent.detail.message) return;

      const newToast: ToastData = {
        id: Date.now() + Math.random(),
        type: customEvent.detail.type || 'info',
        message: customEvent.detail.message,
      };

      setToasts((prev) => [...prev, newToast]);

      // Auto dismiss after 3.5 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
      }, 3500);
    };

    window.addEventListener('compare-notify', handleNotify);
    return () => {
      window.removeEventListener('compare-notify', handleNotify);
    };
  }, []);

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 sm:right-6 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        let bgStyle = 'bg-sky-50 border-sky-600 text-sky-950';
        let Icon = Info;
        let iconColor = 'text-sky-600';

        if (toast.type === 'success') {
          bgStyle = 'bg-emerald-50 border-emerald-600 text-emerald-950';
          Icon = CheckCircle2;
          iconColor = 'text-emerald-600';
        } else if (toast.type === 'warning') {
          bgStyle = 'bg-amber-50 border-amber-600 text-amber-950';
          Icon = AlertTriangle;
          iconColor = 'text-amber-700';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border-2 shadow-brutal transition-all animate-bounce-in ${bgStyle}`}
          >
            <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${iconColor}`} />
            <div className="flex-1 text-xs font-black leading-relaxed">
              {toast.message}
            </div>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="p-1 rounded-lg hover:bg-black/10 text-stone-700 transition-colors cursor-pointer shrink-0"
              title="Đóng thông báo"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
