import React, { useState, useEffect } from 'react';
import { Building2, Users, FolderKanban, ListTodo, AlertTriangle, TrendingUp, Plus, Lock, X, Loader2 } from 'lucide-react';
import clsx from 'clsx';

import { useAuthStore } from '../../store/authStore';
const getToken = () => useAuthStore.getState().token;
const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });

export default function AdminDashboard() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPrivateForm, setShowPrivateForm] = useState(false);
  const [privateTask, setPrivateTask] = useState({ title: '', description: '', priority: 'NORMAL', category: '' });
  const [creating, setCreating] = useState(false);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');

  useEffect(() => {
    fetch('/api/v1/dashboard/overview', { headers: authHeaders() })
      .then(r => r.json())
      .then(setOverview)
      .catch(() => {})
      .finally(() => setLoading(false));
    fetch('/api/v1/projects', { headers: authHeaders() })
      .then(r => r.json())
      .then(d => setProjects(d.projects || d.data || []))
      .catch(() => {});
  }, []);

  const handleCreatePrivateTask = async (e) => {
    e.preventDefault();
    if (!privateTask.title.trim()) return;
    setCreating(true);
    try {
      await fetch('/api/v1/tasks', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          ...privateTask,
          projectId: selectedProjectId || undefined,
          metadata: { isPrivate: true },
        }),
      });
      setPrivateTask({ title: '', description: '', priority: 'NORMAL', category: '' });
      setSelectedProjectId('');
      setShowPrivateForm(false);
      // Refresh overview
      const res = await fetch('/api/v1/dashboard/overview', { headers: authHeaders() });
      setOverview(await res.json());
    } catch {}
    setCreating(false);
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
          onClick={() => setShowPrivateForm(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
        >
          <Lock size={16} /> Create Private Task
        </button>
      </div>

      {/* Private Task Creation Modal */}
      {showPrivateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Lock size={18} className="text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">Create Private Task</h2>
              </div>
              <button onClick={() => setShowPrivateForm(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <p className="mb-4 text-xs text-gray-500">Private tasks are only visible to admins and assigned team leads.</p>
            <form onSubmit={handleCreatePrivateTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  value={privateTask.title}
                  onChange={e => setPrivateTask(p => ({ ...p, title: e.target.value }))}
                  placeholder="Task title..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={privateTask.description}
                  onChange={e => setPrivateTask(p => ({ ...p, description: e.target.value }))}
                  placeholder="Describe the task..."
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={privateTask.priority}
                    onChange={e => setPrivateTask(p => ({ ...p, priority: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand focus:outline-none"
                  >
                    <option value="URGENT">Urgent</option>
                    <option value="HIGH">High</option>
                    <option value="NORMAL">Normal</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={privateTask.category}
                    onChange={e => setPrivateTask(p => ({ ...p, category: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand focus:outline-none"
                  >
                    <option value="">Select...</option>
                    <option value="feature">Feature</option>
                    <option value="bug">Bug</option>
                    <option value="enhancement">Enhancement</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="infrastructure">Infrastructure</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
                <select
                  value={selectedProjectId}
                  onChange={e => setSelectedProjectId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand focus:outline-none"
                >
                  <option value="">Select project...</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowPrivateForm(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={creating || !privateTask.title.trim()}
                  className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50">
                  {creating ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
                  Create Private Task
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
