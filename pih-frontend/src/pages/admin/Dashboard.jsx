import React, { useState, useEffect } from 'react';
import { Building2, Users, FolderKanban, ListTodo, AlertTriangle, TrendingUp } from 'lucide-react';
import clsx from 'clsx';

import { useAuthStore } from '../../store/authStore';
const getToken = () => useAuthStore.getState().token;
const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });

export default function AdminDashboard() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/dashboard/overview', { headers: authHeaders() })
      .then(r => r.json())
      .then(setOverview)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" /></div>;

  const stats = [
    { label: 'Total Tasks', value: overview?.totalTasks || 0, icon: ListTodo, color: 'bg-blue-100 text-blue-600' },
    { label: 'Active Users', value: overview?.activeUsers || 0, icon: Users, color: 'bg-green-100 text-green-600' },
    { label: 'Projects', value: overview?.totalProjects || 0, icon: FolderKanban, color: 'bg-purple-100 text-purple-600' },
    { label: 'SLA Breaches', value: overview?.slaBreached || 0, icon: AlertTriangle, color: 'bg-red-100 text-red-600' },
    { label: 'This Week', value: overview?.createdThisWeek || 0, icon: TrendingUp, color: 'bg-emerald-100 text-emerald-600' },
    { label: 'Organizations', value: overview?.totalOrgs || 1, icon: Building2, color: 'bg-amber-100 text-amber-600' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-sm text-gray-500">System overview and management</p>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl bg-white p-4 shadow-sm">
            <div className={clsx('mb-3 inline-flex rounded-lg p-2', s.color)}>
              <s.icon size={18} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Tasks by Status</h2>
          <div className="space-y-3">
            {Object.entries(overview?.byStatus || {}).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2.5">
                <span className="text-sm font-medium text-gray-700">{status.replace(/_/g, ' ')}</span>
                <span className="rounded-full bg-brand/10 px-3 py-0.5 text-sm font-semibold text-brand">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Manage Users', href: '/admin/users', icon: Users },
              { label: 'Manage Projects', href: '/admin/projects', icon: FolderKanban },
              { label: 'View Audit Log', href: '/admin/audit-log', icon: ListTodo },
              { label: 'Integrations', href: '/admin/integrations', icon: Building2 },
            ].map((action) => (
              <a key={action.label} href={action.href}
                className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:border-brand hover:text-brand">
                <action.icon size={16} />
                {action.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
