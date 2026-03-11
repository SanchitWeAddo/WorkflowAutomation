import { useMemo } from 'react';
import clsx from 'clsx';
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { formatDistanceToNow, isPast, differenceInHours } from 'date-fns';

const statusConfig = {
  on_track: {
    icon: Clock,
    color: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-200',
    label: 'On Track',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    label: 'At Risk',
  },
  breached: {
    icon: AlertTriangle,
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
    label: 'Breached',
  },
};

export default function SLAIndicator({
  status,
  deadline,
  compact = false,
  className,
}) {
  const config = statusConfig[status] || statusConfig.on_track;
  const Icon = config.icon;

  const timeDisplay = useMemo(() => {
    if (!deadline) return null;
    const deadlineDate = new Date(deadline);
    if (isPast(deadlineDate)) {
      const hours = Math.abs(differenceInHours(new Date(), deadlineDate));
      if (hours < 1) return 'Just breached';
      return `${hours}h overdue`;
    }
    return formatDistanceToNow(deadlineDate, { addSuffix: false }) + ' left';
  }, [deadline]);

  if (compact) {
    return (
      <span
        className={clsx(
          'inline-flex items-center gap-1 text-xs font-medium',
          config.color,
          className,
        )}
        title={`SLA: ${config.label}${timeDisplay ? ` - ${timeDisplay}` : ''}`}
      >
        <Icon size={12} />
        {timeDisplay || config.label}
      </span>
    );
  }

  return (
    <div
      className={clsx(
        'flex items-center gap-3 px-3 py-2 rounded-lg border',
        config.bg,
        config.border,
        className,
      )}
    >
      <div
        className={clsx(
          'w-8 h-8 rounded-full flex items-center justify-center',
          status === 'breached' ? 'bg-red-100' : status === 'warning' ? 'bg-amber-100' : 'bg-green-100',
        )}
      >
        {status === 'breached' ? (
          <AlertTriangle size={16} className={config.color} />
        ) : status === 'on_track' ? (
          <CheckCircle size={16} className={config.color} />
        ) : (
          <Icon size={16} className={config.color} />
        )}
      </div>
      <div>
        <p className={clsx('text-sm font-semibold', config.color)}>
          {config.label}
        </p>
        {timeDisplay && (
          <p className="text-xs text-gray-500">{timeDisplay}</p>
        )}
      </div>
    </div>
  );
}
