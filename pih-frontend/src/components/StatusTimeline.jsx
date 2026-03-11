import clsx from 'clsx';
import { format } from 'date-fns';
import {
  Circle,
  CheckCircle2,
  ArrowRightLeft,
  MessageSquare,
  UserPlus,
  AlertTriangle,
  Play,
  Eye,
} from 'lucide-react';
import Avatar from './ui/Avatar';

const eventConfig = {
  created: { icon: Circle, color: 'text-gray-500', bg: 'bg-gray-100' },
  status_change: { icon: Play, color: 'text-blue-500', bg: 'bg-blue-100' },
  assigned: { icon: UserPlus, color: 'text-indigo-500', bg: 'bg-indigo-100' },
  handoff: { icon: ArrowRightLeft, color: 'text-purple-500', bg: 'bg-purple-100' },
  comment: { icon: MessageSquare, color: 'text-brand', bg: 'bg-brand-light/10' },
  completed: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-100' },
  review: { icon: Eye, color: 'text-amber-500', bg: 'bg-amber-100' },
  blocked: { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-100' },
};

export default function StatusTimeline({ events = [], className }) {
  if (!events.length) return null;

  return (
    <div className={clsx('relative', className)}>
      {events.map((event, idx) => {
        const config = eventConfig[event.type] || eventConfig.created;
        const Icon = config.icon;
        const isLast = idx === events.length - 1;

        return (
          <div key={event.id || idx} className="relative flex gap-4 pb-6 last:pb-0">
            {/* Vertical line */}
            {!isLast && (
              <div className="absolute left-[17px] top-9 bottom-0 w-px bg-gray-200" />
            )}

            {/* Icon */}
            <div
              className={clsx(
                'relative z-10 flex-shrink-0 w-[35px] h-[35px] rounded-full flex items-center justify-center',
                config.bg,
              )}
            >
              <Icon size={16} className={config.color} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pt-1">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    {event.description || formatEventDescription(event)}
                  </p>
                  {event.detail && (
                    <p className="mt-1 text-sm text-gray-500">{event.detail}</p>
                  )}
                </div>
                <time className="flex-shrink-0 text-xs text-gray-400 whitespace-nowrap">
                  {event.timestamp
                    ? format(new Date(event.timestamp), 'MMM d, h:mm a')
                    : ''}
                </time>
              </div>

              {/* Actor */}
              {event.actor && (
                <div className="flex items-center gap-2 mt-2">
                  <Avatar
                    src={event.actor.avatar}
                    name={event.actor.name}
                    size="xs"
                  />
                  <span className="text-xs text-gray-500">{event.actor.name}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatEventDescription(event) {
  switch (event.type) {
    case 'created':
      return 'Task created';
    case 'status_change':
      return `Status changed to ${event.toStatus?.replace(/_/g, ' ') || 'updated'}`;
    case 'assigned':
      return `Assigned to ${event.assignee?.name || 'a team member'}`;
    case 'handoff':
      return `Handed off to ${event.toUser?.name || 'another team member'}`;
    case 'comment':
      return 'Added a comment';
    case 'completed':
      return 'Task completed';
    case 'review':
      return 'Moved to review';
    case 'blocked':
      return 'Task blocked';
    default:
      return event.type?.replace(/_/g, ' ') || 'Event';
  }
}
