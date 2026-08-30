import { createContext, useCallback, useContext, useRef, useState, ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

/*
 * Replaces the 24 alert() calls the app used for all user feedback.
 *
 * alert() blocks the page, cannot show two things at once, looks like a
 * browser error rather than part of the app, and — the reason this mattered
 * most — encouraged messages like "Failed to create group. Please try again."
 * that threw away the actual cause. Two real bugs this session were slower to
 * find because the underlying Postgres error had been swallowed by one of
 * those dialogs.
 *
 * So `error` takes the original error alongside the human-readable line: the
 * user gets the sentence, the console keeps the detail.
 */

type ToastVariant = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  variant: ToastVariant;
  message: string;
  detail?: string;
}

interface ToastApi {
  success: (message: string) => void;
  info: (message: string) => void;
  /** `cause` is logged and, when it carries a message, shown beneath the line. */
  error: (message: string, cause?: unknown) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const VISIBLE_MS = 5000;
const ERROR_VISIBLE_MS = 9000; // errors need longer to read

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const push = useCallback((variant: ToastVariant, message: string, detail?: string) => {
    const id = ++nextId.current;
    setToasts(prev => [...prev, { id, variant, message, detail }]);
    window.setTimeout(
      () => setToasts(prev => prev.filter(t => t.id !== id)),
      variant === 'error' ? ERROR_VISIBLE_MS : VISIBLE_MS
    );
  }, []);

  const api: ToastApi = {
    success: useCallback((message: string) => push('success', message), [push]),
    info: useCallback((message: string) => push('info', message), [push]),
    error: useCallback((message: string, cause?: unknown) => {
      // Keep the real cause reachable even though the user sees a sentence.
      if (cause !== undefined) console.error(message, cause);

      const detail =
        cause instanceof Error
          ? cause.message
          : typeof cause === 'object' && cause !== null && 'message' in cause
            ? String((cause as { message: unknown }).message)
            : undefined;

      push('error', message, detail);
    }, [push]),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastHost toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
};

const STYLES: Record<ToastVariant, { wrap: string; icon: typeof Info }> = {
  success: { wrap: 'bg-white border-green-200 text-gray-800', icon: CheckCircle2 },
  error:   { wrap: 'bg-white border-red-200 text-gray-800',   icon: AlertTriangle },
  info:    { wrap: 'bg-white border-blue-200 text-gray-800',  icon: Info },
};

const ICON_COLOR: Record<ToastVariant, string> = {
  success: 'text-green-600',
  error: 'text-red-600',
  info: 'text-blue-600',
};

const ToastHost = ({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) => (
  <div
    className="fixed z-50 bottom-4 right-4 left-4 sm:left-auto sm:w-96 flex flex-col gap-2 pointer-events-none"
    aria-live="polite"
    aria-atomic="false"
  >
    {toasts.map(toast => {
      const style = STYLES[toast.variant];
      const Icon = style.icon;
      return (
        <div
          key={toast.id}
          role={toast.variant === 'error' ? 'alert' : 'status'}
          className={`pointer-events-auto flex items-start gap-3 rounded-xl border shadow-lg px-4 py-3 ${style.wrap}`}
        >
          <Icon size={18} className={`flex-shrink-0 mt-0.5 ${ICON_COLOR[toast.variant]}`} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{toast.message}</p>
            {toast.detail && (
              <p className="text-xs text-gray-500 mt-1 break-words">{toast.detail}</p>
            )}
          </div>
          <button
            onClick={() => onDismiss(toast.id)}
            aria-label="Dismiss"
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      );
    })}
  </div>
);

export const useToast = (): ToastApi => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside <ToastProvider>');
  return context;
};
