import React, { useState, useEffect } from 'react';
import { Building2, Users, FolderKanban, ListTodo, AlertTriangle, TrendingUp, Plus, Lock, X, Loader2 } from 'lucide-react';
import clsx from 'clsx';

import { useAuthStore } from '../../store/authStore';
const getToken = () => useAuthStore.getState().token;
const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });

export default function AdminDashboard() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPrivateTaskModal, setShowPrivateTaskModal] = useState(false);
  const [privateTaskForm, setPrivateTaskForm] = useState({ title: '', description: '', priority: 'NORMAL' });
  const [creatingTask, setCreatingTask] = useState(false);

  useEffect(() => {
    fetch('/api/v1/dashboard/overview', { headers: authHeaders() })
      .then(r => r.json())
      .then(setOverview)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleCreatePrivateTask = async (e) => {
    e.preventDefault();
    if (!privateTaskForm.title.trim()) return;
    setCreatingTask(true);
    try {
      const res = await fetch('/api/v1/tasks', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ ...privateTaskForm, isPrivate: true }),
      });
      if (!res.ok) throw new Error('Failed to create task');
      setShowPrivateTaskModal(false);
      setPrivateTaskForm({ title: '', description: '', priority: 'NORMAL' });
    } catch {}
    setCreatingTask(false);
  };

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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-500">System overview and management</p>
        </div>
        <button
          onClick={() => setShowPrivateTaskModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
        >
          <Lock size={14} /> Create Private Task
        </button>
      </div>

      {/* Private Task Modal */}
      {showPrivateTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Lock size={16} /> Create Private Task
              </h3>
              <button onClick={() => setShowPrivateTaskModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreatePrivateTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={privateTaskForm.title}
                  onChange={e => setPrivateTaskForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="Task title"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={privateTaskForm.description}
                  onChange={e => setPrivateTaskForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Task description..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={privateTaskForm.priority}
                  onChange={e => setPrivateTaskForm(p => ({ ...p, priority: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand focus:outline-none"
                >
                  <option value="LOW">Low</option>
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Lock size={10} /> This task will only be visible to admins and assigned users.
              </p>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowPrivateTaskModal(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">
                  Cancel
                </button>
                <button type="submit" disabled={creatingTask || !privateTaskForm.title.trim()}
                  className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50">
                  {creatingTask ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
