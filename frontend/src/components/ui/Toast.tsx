import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useConversionStore } from '../../store/conversionStore';

const ICONS = {
  success: <CheckCircle2 size={18} />,
  error: <AlertCircle size={18} />,
  info: <Info size={18} />,
  warning: <AlertTriangle size={18} />,
};

export function ToastContainer() {
  const { toasts, removeToast } = useConversionStore();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" role="log" aria-live="polite" aria-label="Notifications">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.type}`} role="alert">
          <span className={`toast-icon text-${toast.type === 'success' ? 'success' : toast.type === 'error' ? 'error' : toast.type === 'warning' ? 'warning' : 'primary'}`}>
            {ICONS[toast.type]}
          </span>
          <p className="toast-message text-sm">{toast.message}</p>
          <button
            className="btn btn-ghost btn-icon btn-sm"
            onClick={() => removeToast(toast.id)}
            aria-label="Dismiss notification"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
