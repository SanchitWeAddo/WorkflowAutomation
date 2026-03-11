import clsx from 'clsx';

const priorityConfig = {
  URGENT: { bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-500' },
  HIGH: { bg: 'bg-orange-100', text: 'text-orange-800', dot: 'bg-orange-500' },
  NORMAL: { bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-500' },
  LOW: { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
};

const statusConfig = {
  OPEN: { bg: 'bg-slate-100', text: 'text-slate-700' },
  IN_PROGRESS: { bg: 'bg-blue-100', text: 'text-blue-800' },
  IN_REVIEW: { bg: 'bg-purple-100', text: 'text-purple-800' },
  BLOCKED: { bg: 'bg-red-100', text: 'text-red-800' },
  COMPLETED: { bg: 'bg-green-100', text: 'text-green-800' },
  CLOSED: { bg: 'bg-gray-100', text: 'text-gray-600' },
  PENDING: { bg: 'bg-amber-100', text: 'text-amber-800' },
  HANDOFF: { bg: 'bg-indigo-100', text: 'text-indigo-800' },
};

const slaConfig = {
  on_track: { bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500' },
  warning: { bg: 'bg-amber-100', text: 'text-amber-800', dot: 'bg-amber-500' },
  breached: { bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-500' },
};

function formatLabel(value) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function PriorityBadge({ priority, className }) {
  const config = priorityConfig[priority] || priorityConfig.NORMAL;
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold',
        config.bg,
        config.text,
        className,
      )}
    >
      <span className={clsx('w-1.5 h-1.5 rounded-full', config.dot)} />
      {priority}
    </span>
  );
}

export function StatusBadge({ status, className }) {
  const config = statusConfig[status] || statusConfig.OPEN;
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        config.bg,
        config.text,
        className,
      )}
    >
      {formatLabel(status)}
    </span>
  );
}

export function SLABadge({ status, className }) {
  const config = slaConfig[status] || slaConfig.on_track;
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold',
        config.bg,
        config.text,
        className,
      )}
    >
      <span className={clsx('w-1.5 h-1.5 rounded-full', config.dot)} />
      {formatLabel(status)}
    </span>
  );
}

export default function Badge({ children, variant = 'default', className }) {
  const variants = {
    default: 'bg-gray-100 text-gray-700',
    primary: 'bg-brand-light/10 text-brand-dark',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-amber-100 text-amber-800',
    danger: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
