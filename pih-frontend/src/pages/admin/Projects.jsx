import React, { useState, useEffect } from 'react';
import { FolderKanban, Plus, Search } from 'lucide-react';
import clsx from 'clsx';

import { useAuthStore } from '../../store/authStore';
const getToken = () => useAuthStore.getState().token;
const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });

export default function AdminProjects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', clientId: '', status: 'active' });

  const fetchProjects = () => {
    setLoading(true);
    fetch('/api/v1/projects', { headers: authHeaders() })
      .then(r => r.json())
      .then(data => setProjects(data.projects || data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchProjects(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await fetch('/api/v1/projects', { method: 'POST', headers: authHeaders(), body: JSON.stringify(form) });
      setShowCreate(false);
      setForm({ name: '', description: '', clientId: '', status: 'active' });
      fetchProjects();
    } catch {}
  };

  const STATUS_COLORS = { active: 'bg-green-100 text-green-700', paused: 'bg-amber-100 text-amber-700', completed: 'bg-blue-100 text-blue-700', archived: 'bg-gray-100 text-gray-700' };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-sm text-gray-500">Manage projects and configurations</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark">
          <Plus size={16} /> New Project
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="mb-6 rounded-xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 font-semibold">Create Project</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <input placeholder="Project Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required
              className="rounded-lg border px-3 py-2 text-sm focus:border-brand focus:outline-none" />
            <input placeholder="Client ID (UUID)" value={form.clientId} onChange={e => setForm({ ...form, clientId: e.target.value })}
              className="rounded-lg border px-3 py-2 text-sm focus:border-brand focus:outline-none" />
            <textarea placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              className="rounded-lg border px-3 py-2 text-sm focus:border-brand focus:outline-none sm:col-span-2" rows={2} />
          </div>
          <div className="mt-4 flex gap-2">
            <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark">Create</button>
            <button type="button" onClick={() => setShowCreate(false)} className="rounded-lg border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          </div>
        </form>
      )}

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          <div className="col-span-full flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" /></div>
        ) : projects.length === 0 ? (
          <div className="col-span-full rounded-xl bg-white p-12 text-center shadow-sm">
            <FolderKanban className="mx-auto mb-3 text-gray-300" size={40} />
            <p className="text-gray-400">No projects yet. Create your first project.</p>
          </div>
        ) : projects.map((project) => (
          <div key={project.id} className="rounded-xl bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">{project.name}</h3>
              <span className={clsx('rounded-full px-2 py-0.5 text-xs font-medium', STATUS_COLORS[project.status] || STATUS_COLORS.active)}>
                {project.status}
              </span>
            </div>
            {project.description && <p className="mb-3 text-sm text-gray-500 line-clamp-2">{project.description}</p>}
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>{project._count?.tasks || 0} tasks</span>
              <span>{new Date(project.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
