import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard, Users, AlertTriangle, CheckCircle, Clock,
  ArrowRight, UserPlus, ListTodo, Loader2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';

const getToken = () => {
  try { return JSON.parse(localStorage.getItem('pih-auth'))?.state?.token; } catch { return null; }
};
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
};

export default function LeadDashboard() {
  const { data: overview, isLoading: loadingOverview } = useQuery({
    queryKey: ['lead-overview'],
    queryFn: async () => {
      const res = await fetch('/api/v1/dashboard/overview', { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to fetch overview');
      return res.json();
    },
  });

  const { data: workload, isLoading: loadingWorkload } = useQuery({
    queryKey: ['lead-workload'],
    queryFn: async () => {
      const res = await fetch('/api/v1/dashboard/workload', { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to fetch workload');
      return res.json();
    },
  });

  const stats = overview?.data ?? overview ?? {};
  const workloadData = workload?.data ?? workload?.members ?? [];
  const recentTasks = stats.recentTasks ?? [];
  const isLoading = loadingOverview || loadingWorkload;

  const statCards = [
    { label: 'Total Tasks', value: stats.totalTasks ?? 0, icon: LayoutDashboard, color: 'text-[#0f766e]', bg: 'bg-teal-50' },
    { label: 'Unassigned', value: stats.unassigned ?? 0, icon: UserPlus, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'In Progress', value: stats.inProgress ?? 0, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'SLA At Risk', value: stats.slaAtRisk ?? 0, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Completed This Week', value: stats.completedThisWeek ?? 0, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Dashboard</h1>
          <p className="text-gray-500 mt-1">Manage tasks and monitor team performance.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {statCards.map((card) => (
          <div key={card.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500">{card.label}</span>
              <div className={clsx('rounded-lg p-1.5', card.bg)}>
                <card.icon className={clsx('h-4 w-4', card.color)} />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Team Workload */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-400" /> Team Workload
            </h2>
            <Link to="/lead/team" className="text-xs font-medium text-[#0f766e] hover:text-[#134e4a]">View Team</Link>
          </div>
          {workloadData.length === 0 ? (
            <div className="px-6 py-8 text-center text-xs text-gray-400">No workload data available.</div>
          ) : (
            <div className="p-6 space-y-4">
              {workloadData.slice(0, 6).map((member, i) => {
                const capacity = member.capacity ?? 10;
                const active = member.activeTasks ?? member.taskCount ?? 0;
                const pct = Math.min(100, Math.round((active / capacity) * 100));
                return (
                  <div key={member.id ?? i}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="font-medium text-gray-700">{member.name ?? `Member ${i + 1}`}</span>
                      <span className="text-xs text-gray-500">{active}/{capacity} tasks</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={clsx(
                          'h-full rounded-full transition-all',
                          pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-[#14b8a6]'
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Tasks */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <h2 className="text-sm font-semibold text-gray-900">Recent Tasks</h2>
            <Link to="/lead/tasks" className="inline-flex items-center gap-1 text-xs font-medium text-[#0f766e] hover:text-[#134e4a]">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {recentTasks.length === 0 ? (
            <div className="px-6 py-8 text-center text-xs text-gray-400">No recent tasks.</div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {recentTasks.slice(0, 6).map((task) => (
                <li key={task.id}>
                  <Link to={`/lead/tasks/${task.id}`} className="flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">{task.title}</p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {task.assignee?.name ?? 'Unassigned'} &middot; {task.createdAt && formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="ml-3 flex items-center gap-2">
                      <span className={clsx('rounded-full px-2 py-0.5 text-[11px] font-medium', PRIORITY_COLORS[task.priority])}>
                        {task.priority}
                      </span>
                      <span className={clsx('rounded-full px-2 py-0.5 text-[11px] font-medium', STATUS_COLORS[task.status])}>
                        {task.status?.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          to="/lead/tasks?status=SUBMITTED"
          className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:border-[#14b8a6] hover:shadow-md transition-all"
        >
          <div className="rounded-lg bg-teal-50 p-3">
            <UserPlus className="h-5 w-5 text-[#0f766e]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Assign Tasks</p>
            <p className="text-xs text-gray-500">Review and assign unassigned tasks</p>
          </div>
        </Link>
        <Link
          to="/lead/tasks"
          className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:border-[#14b8a6] hover:shadow-md transition-all"
        >
          <div className="rounded-lg bg-blue-50 p-3">
            <ListTodo className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">View All Tasks</p>
            <p className="text-xs text-gray-500">Manage and track all team tasks</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
