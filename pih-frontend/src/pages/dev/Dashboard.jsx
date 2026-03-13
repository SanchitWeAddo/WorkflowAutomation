import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ListTodo, Clock, CheckCircle, Play, ArrowRight, Loader2, Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';

import { useAuthStore } from '../../store/authStore';
const getToken = () => useAuthStore.getState().token;
const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });

const PRIORITY_COLORS = {
  URGENT: 'bg-red-100 text-red-700',
  HIGH: 'bg-orange-100 text-orange-700',
  NORMAL: 'bg-blue-100 text-blue-700',
  LOW: 'bg-gray-100 text-gray-600',
};

const STATUS_COLORS = {
  ASSIGNED: 'bg-indigo-100 text-indigo-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  REVIEW: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-green-100 text-green-700',
  DELIVERED: 'bg-emerald-100 text-emerald-700',
};

export default function DevDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['dev-tasks'],
    queryFn: async () => {
      const res = await fetch('/api/v1/tasks?assigneeId=me&limit=20', { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to fetch tasks');
      return res.json();
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ taskId, status }) => {
      const res = await fetch(`/api/v1/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Status update failed');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dev-tasks'] }),
  });

  const tasks = data?.data ?? data?.tasks ?? [];
  const activeTasks = tasks.filter(t => ['ASSIGNED', 'IN_PROGRESS'].includes(t.status));
  const inReview = tasks.filter(t => t.status === 'REVIEW');
  const completedThisWeek = tasks.filter(t => {
    if (!['COMPLETED', 'DELIVERED'].includes(t.status)) return false;
    const d = new Date(t.updatedAt ?? t.completedAt);
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return d >= weekAgo;
  });

  const statCards = [
    { label: 'Active Tasks', value: activeTasks.length, icon: ListTodo, color: 'text-[#0f766e]', bg: 'bg-teal-50' },
    { label: 'In Review', value: inReview.length, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Completed This Week', value: completedThisWeek.length, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-[#0f766e]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>
        <p className="text-gray-500 mt-1">Your task overview and quick actions.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {statCards.map((card) => (
          <div key={card.label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">{card.label}</span>
              <div className={clsx('rounded-lg p-2', card.bg)}>
                <card.icon className={clsx('h-5 w-5', card.color)} />
              </div>
            </div>
            <p className="mt-3 text-3xl font-bold text-gray-900">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Active Tasks */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">My Current Tasks</h2>
          <button
            onClick={() => navigate('/dev/tasks')}
            className="inline-flex items-center gap-1 text-sm font-medium text-[#0f766e] hover:text-[#134e4a]"
          >
            View all <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {activeTasks.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <CheckCircle className="mx-auto h-10 w-10 text-green-300" />
            <p className="mt-3 text-sm font-medium text-gray-700">All caught up!</p>
            <p className="mt-1 text-sm text-gray-500">No active tasks assigned to you.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {activeTasks.map((task) => (
              <li key={task.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="min-w-0 flex-1 cursor-pointer" onClick={() => navigate(`/dev/tasks/${task.id}`)}>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-gray-400">{task.ticketNumber ?? `#${task.id?.slice(0, 8)}`}</span>
                    <span className={clsx('rounded-full px-2 py-0.5 text-[11px] font-medium', PRIORITY_COLORS[task.priority])}>
                      {task.priority}
                    </span>
                    <span className={clsx('rounded-full px-2 py-0.5 text-[11px] font-medium', STATUS_COLORS[task.status])}>
                      {task.status?.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-sm font-medium text-gray-900">{task.title}</p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {task.createdAt && formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
                  </p>
                </div>
                <div className="ml-4 flex items-center gap-2">
                  {task.status === 'ASSIGNED' && (
                    <button
                      onClick={() => statusMutation.mutate({ taskId: task.id, status: 'IN_PROGRESS' })}
                      disabled={statusMutation.isPending}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#0f766e] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#134e4a] transition-colors disabled:opacity-50"
                    >
                      <Play className="h-3.5 w-3.5" /> Start Work
                    </button>
                  )}
                  {task.status === 'IN_PROGRESS' && (
                    <button
                      onClick={() => statusMutation.mutate({ taskId: task.id, status: 'REVIEW' })}
                      disabled={statusMutation.isPending}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600 transition-colors disabled:opacity-50"
                    >
                      <Send className="h-3.5 w-3.5" /> Submit for Review
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
