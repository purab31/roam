import React from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

/**
 * Toast component & container for notifications.
 * Implements accessible notification pill/cards with 16px radius.
 */
export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
    >
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }) {
  const icons = {
    success: <CheckCircle2 className="w-4 h-4 text-success shrink-0" />,
    error: <AlertCircle className="w-4 h-4 text-danger shrink-0" />,
    warning: <AlertTriangle className="w-4 h-4 text-warning shrink-0" />,
    info: <Info className="w-4 h-4 text-muted shrink-0" />,
  };

  return (
    <div
      role="status"
      className="pointer-events-auto flex items-start gap-3 p-4 rounded-[16px] bg-surface text-text border border-border shadow-card animate-fade-in transition-all"
    >
      <div className="mt-0.5">{icons[toast.type] || icons.info}</div>

      <div className="flex-1">
        {toast.title && (
          <h4 className="text-[12px] font-semibold text-text leading-tight mb-0.5">
            {toast.title}
          </h4>
        )}
        <p className="text-[12px] text-muted leading-normal">{toast.message}</p>
      </div>

      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="text-muted hover:text-text cursor-pointer p-1 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default ToastContainer;
