import { useUiStore } from '../../store/uiStore';
import clsx from 'clsx';
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react';

const typeConfig = {
  success: {
    icon: CheckCircle,
    containerClass: 'bg-white border-green-200',
    iconClass: 'text-green-500',
  },
  error: {
    icon: AlertCircle,
    containerClass: 'bg-white border-red-200',
    iconClass: 'text-red-500',
  },
  warning: {
    icon: AlertTriangle,
    containerClass: 'bg-white border-amber-200',
    iconClass: 'text-amber-500',
  },
  info: {
    icon: Info,
    containerClass: 'bg-white border-blue-200',
    iconClass: 'text-blue-500',
  },
};

function ToastItem({ toast }) {
  const removeToast = useUiStore((s) => s.removeToast);
  const config = typeConfig[toast.type] || typeConfig.info;
  const Icon = config.icon;

  return (
    <div
      className={clsx(
        'flex items-start gap-3 w-80 p-4 rounded-lg border shadow-lg',
        'animate-[slideIn_0.2s_ease-out]',
        config.containerClass,
      )}
      role="alert"
    >
      <Icon size={20} className={clsx('flex-shrink-0 mt-0.5', config.iconClass)} />
      <div className="flex-1 min-w-0">
        {toast.title && (
          <p className="text-sm font-semibold text-gray-900">{toast.title}</p>
        )}
        {toast.message && (
          <p className="text-sm text-gray-600 mt-0.5">{toast.message}</p>
        )}
      </div>
      <button
        onClick={() => removeToast(toast.id)}
        className="flex-shrink-0 p-0.5 text-gray-400 hover:text-gray-600 rounded transition-colors"
        aria-label="Dismiss"
      >
        <X size={16} />
      </button>
    </div>
  );
}

export default function ToastContainer() {
  const toasts = useUiStore((s) => s.toasts);

  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col-reverse gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
