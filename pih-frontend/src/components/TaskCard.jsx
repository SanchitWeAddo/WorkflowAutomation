import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { Calendar, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Card from './ui/Card';
import { PriorityBadge, StatusBadge } from './ui/Badge';
import Avatar from './ui/Avatar';
import SLAIndicator from './SLAIndicator';

export default function TaskCard({ task, className, onClick }) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick(task);
    } else {
      navigate(`/tasks/${task.id}`);
    }
  };

  return (
    <Card
      className={clsx(
        'hover:shadow-md hover:border-gray-300 transition-all duration-200 cursor-pointer',
        className,
      )}
      onClick={handleClick}
    >
      <Card.Body className="space-y-3">
        {/* Top row: ticket number + priority */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-medium text-gray-500">
            {task.ticketNumber}
          </span>
          <PriorityBadge priority={task.priority} />
        </div>

        {/* Title */}
        <h4 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">
          {task.title}
        </h4>

        {/* Status + SLA */}
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={task.status} />
          {task.slaStatus && (
            <SLAIndicator
              status={task.slaStatus}
              deadline={task.slaDeadline}
              compact
            />
          )}
        </div>

        {/* Bottom row: assignee + meta */}
        <div className="flex items-center justify-between pt-1 border-t border-gray-50">
          <div className="flex items-center gap-2">
            {task.assignee ? (
              <>
                <Avatar
                  src={task.assignee.avatar}
                  name={task.assignee.name}
                  size="xs"
                />
                <span className="text-xs text-gray-600 truncate max-w-[100px]">
                  {task.assignee.name}
                </span>
              </>
            ) : (
              <span className="text-xs text-gray-400 italic">Unassigned</span>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-gray-400">
            {task.commentCount > 0 && (
              <span className="flex items-center gap-1">
                <MessageSquare size={12} />
                {task.commentCount}
              </span>
            )}
            {task.createdAt && (
              <span className="flex items-center gap-1">
                <Calendar size={12} />
                {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
              </span>
            )}
          </div>
        </div>
      </Card.Body>
    </Card>
  );
}
