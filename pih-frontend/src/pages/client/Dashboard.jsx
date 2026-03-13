import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { FileText, Clock, CheckCircle, PlusCircle, ArrowRight, Loader2 } from 'lucide-react';
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
  SUBMITTED: 'bg-gray-100 text-gray-700',
  ASSIGNED: 'bg-indigo-100 text-indigo-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  REVIEW: 'bg-yellow-100 text-yellow-700',
  CLIENT_REVIEW: 'bg-purple-100 text-purple-700',
  COMPLETED: 'bg-green-100 text-green-700',
  DELIVERED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

export default function ClientDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['client-tasks'],
    queryFn: async () => {
      const res = await fetch('/api/v1/tasks?createdById=me', { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to fetch tasks');
      return res.json();
    },
  });

  const tasks = data?.data ?? data?.tasks ?? [];
  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'SUBMITTED').length,
    inProgress: tasks.filter(t => ['ASSIGNED', 'IN_PROGRESS', 'REVIEW', 'CLIENT_REVIEW'].includes(t.status)).length,
    completed: tasks.filter(t => ['COMPLETED', 'DELIVERED'].includes(t.status)).length,
  };
  const recentTasks = [...tasks].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);

  const statCards = [
    { label: 'Total Requests', value: stats.total, icon: FileText, color: 'text-[#0f766e]', bg: 'bg-teal-50' },
    { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'In Progress', value: stats.inProgress, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Completed', value: stats.completed, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
          <p className="text-gray-500 mt-1">Here's an overview of your service requests.</p>
        </div>
        <Link
          to="/client/requests/new"
          className="inline-flex items-center gap-2 rounded-lg bg-[#0f766e] px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-[#134e4a] transition-colors"
        >
          <PlusCircle className="h-4 w-4" />
          New Request
        </Link>
      </div>

      {/* Stats */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#0f766e]" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load dashboard data. Please try again.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

          {/* Recent Requests */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Recent Requests</h2>
              <Link
                to="/client/requests"
                className="inline-flex items-center gap-1 text-sm font-medium text-[#0f766e] hover:text-[#134e4a]"
              >
                View all <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            {recentTasks.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <FileText className="mx-auto h-10 w-10 text-gray-300" />
                <p className="mt-3 text-sm text-gray-500">No requests yet.</p>
                <Link
                  to="/client/requests/new"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-[#0f766e] hover:text-[#134e4a]"
                >
                  <PlusCircle className="h-4 w-4" /> Create your first request
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {recentTasks.map((task) => (
                  <li key={task.id}>
                    <Link
                      to={`/client/requests/${task.id}`}
                      className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono text-gray-400">{task.ticketNumber ?? `#${task.id?.slice(0, 8)}`}</span>
                          <span className="truncate text-sm font-medium text-gray-900">{task.title}</span>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          {task.createdAt && formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                      <div className="ml-4 flex items-center gap-2">
                        <span className={clsx('inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium', PRIORITY_COLORS[task.priority] ?? 'bg-gray-100 text-gray-600')}>
                          {task.priority}
                        </span>
                        <span className={clsx('inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium', STATUS_COLORS[task.status] ?? 'bg-gray-100 text-gray-600')}>
                          {task.status?.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
