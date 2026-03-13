import React, { useState, useEffect } from 'react';
import { Search, UserPlus, Edit, Shield } from 'lucide-react';
import clsx from 'clsx';

import { useAuthStore } from '../../store/authStore';
const getToken = () => useAuthStore.getState().token;
const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });

const ROLE_COLORS = {
  SUPER_ADMIN: 'bg-red-100 text-red-700',
  ADMIN: 'bg-purple-100 text-purple-700',
  TEAM_LEAD: 'bg-blue-100 text-blue-700',
  DEVELOPER: 'bg-green-100 text-green-700',
  CLIENT: 'bg-gray-100 text-gray-700',
};

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);

  const fetchUsers = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (roleFilter) params.set('role', roleFilter);
    fetch(`/api/v1/users?${params}`, { headers: authHeaders() })
      .then(r => r.json())
      .then(data => setUsers(data.users || data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, [roleFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchUsers();
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await fetch(`/api/v1/users/${userId}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ role: newRole }),
      });
      fetchUsers();
      setEditingUser(null);
    } catch {}
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500">Manage users and their roles</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <form onSubmit={handleSearch} className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..."
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20" />
          </div>
        </form>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand focus:outline-none">
          <option value="">All Roles</option>
          <option value="SUPER_ADMIN">Super Admin</option>
          <option value="ADMIN">Admin</option>
          <option value="TEAM_LEAD">Team Lead</option>
          <option value="DEVELOPER">Developer</option>
          <option value="CLIENT">Client</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">User</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Email</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Role</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Skills</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={6} className="py-12 text-center text-gray-400">Loading...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={6} className="py-12 text-center text-gray-400">No users found</td></tr>
            ) : users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/10 text-xs font-bold text-brand">
                      {user.name?.charAt(0)}
                    </div>
                    <span className="font-medium text-gray-900">{user.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">{user.email}</td>
                <td className="px-4 py-3">
                  {editingUser === user.id ? (
                    <select autoFocus defaultValue={user.role}
                      onChange={e => handleRoleChange(user.id, e.target.value)}
                      onBlur={() => setEditingUser(null)}
                      className="rounded border px-2 py-1 text-xs">
                      {Object.keys(ROLE_COLORS).map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  ) : (
                    <span className={clsx('rounded-full px-2 py-0.5 text-xs font-medium', ROLE_COLORS[user.role])}>
                      {user.role}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={clsx('rounded-full px-2 py-0.5 text-xs font-medium', user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {(user.skills || []).slice(0, 3).map(s => (
                      <span key={s} className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">{s}</span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => setEditingUser(user.id)} className="text-gray-400 hover:text-brand" title="Edit role">
                    <Shield size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
