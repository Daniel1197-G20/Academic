import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 6);
    const newToast = {
      id,
      type: toast.type || 'info', // 'success' | 'error' | 'info'
      title: toast.title,
      message: toast.message,
      duration: toast.duration || 4000
    };

    setToasts((prev) => [...prev, newToast]);

    if (newToast.duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, newToast.duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      {/* Floating toast container */}
      <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => {
          const icons = {
            success: <CheckCircle2 className="w-4 h-4 text-academic shrink-0" />,
            error: <AlertCircle className="w-4 h-4 text-danger shrink-0" />,
            info: <Info className="w-4 h-4 text-navy-400 shrink-0" />
          };

          return (
            <div
              key={toast.id}
              className="pointer-events-auto bg-white border border-border rounded-btn p-3.5 shadow-tactile-raised flex items-start gap-3 animate-fade-in"
            >
              {icons[toast.type]}
              <div className="flex-1 min-w-0">
                {toast.title && <p className="text-xs font-semibold text-ink">{toast.title}</p>}
                <p className="text-xs text-muted leading-snug">{toast.message}</p>
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="text-muted hover:text-ink p-0.5"
                aria-label="Dismiss toast"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
