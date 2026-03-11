import clsx from 'clsx';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import Card from './ui/Card';

export default function StatsCard({
  icon: Icon,
  label,
  value,
  trend,
  trendLabel,
  className,
}) {
  const trendDirection =
    trend > 0 ? 'up' : trend < 0 ? 'down' : 'neutral';

  const trendConfig = {
    up: {
      icon: TrendingUp,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    down: {
      icon: TrendingDown,
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
    neutral: {
      icon: Minus,
      color: 'text-gray-500',
      bg: 'bg-gray-50',
    },
  };

  const trendInfo = trendConfig[trendDirection];
  const TrendIcon = trendInfo.icon;

  return (
    <Card className={clsx('hover:shadow-md transition-shadow', className)}>
      <Card.Body className="flex items-start gap-4">
        {Icon && (
          <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-brand-light/10 flex items-center justify-center">
            <Icon size={20} className="text-brand" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-500 truncate">{label}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 tracking-tight">
            {value}
          </p>
          {trend != null && (
            <div className="flex items-center gap-1.5 mt-2">
              <span
                className={clsx(
                  'inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded',
                  trendInfo.bg,
                  trendInfo.color,
                )}
              >
                <TrendIcon size={12} />
                {Math.abs(trend)}%
              </span>
              {trendLabel && (
                <span className="text-xs text-gray-400">{trendLabel}</span>
              )}
            </div>
          )}
        </div>
      </Card.Body>
    </Card>
  );
}
