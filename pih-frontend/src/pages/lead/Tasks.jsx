import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Filter, ChevronLeft, ChevronRight, Loader2, ListTodo } from 'lucide-react';
import { format } from 'date-fns';
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

const PAGE_SIZE = 15;

export default function LeadTasks() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') ?? '');
  const [priorityFilter, setPriorityFilter] = useState(searchParams.get('priority') ?? '');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(new Set());

  const { data, isLoading, error } = useQuery({
    queryKey: ['lead-tasks', search, statusFilter, priorityFilter, assigneeFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (search.trim()) params.set('search', search.trim());
      if (statusFilter) params.set('status', statusFilter);
      if (priorityFilter) params.set('priority', priorityFilter);
      if (assigneeFilter) params.set('assigneeId', assigneeFilter);
      const res = await fetch(`/api/v1/tasks?${params}`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to fetch tasks');
      return res.json();
    },
  });

  const { data: usersData } = useQuery({
    queryKey: ['lead-users'],
    queryFn: async () => {
      const res = await fetch('/api/v1/users', { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json();
    },
  });

  const tasks = data?.data ?? data?.tasks ?? [];
  const total = data?.total ?? data?.meta?.total ?? tasks.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const users = usersData?.data ?? usersData?.users ?? [];

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === tasks.length) setSelected(new Set());
    else setSelected(new Set(tasks.map(t => t.id)));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Task Management</h1>
        <p className="text-gray-500 mt-1">Manage, assign, and track all team tasks.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search tasks..."
            className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/20"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-gray-400 hidden sm:block" />
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded-lg border border-gray-300 py-2.5 px-3 text-sm outline-none focus:border-[#0f766e]">
            <option value="">All Statuses</option>
            {Object.keys(STATUS_COLORS).map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
          <select value={priorityFilter} onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
            className="rounded-lg border border-gray-300 py-2.5 px-3 text-sm outline-none focus:border-[#0f766e]">
            <option value="">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="NORMAL">Normal</option>
            <option value="LOW">Low</option>
          </select>
          <select value={assigneeFilter} onChange={(e) => { setAssigneeFilter(e.target.value); setPage(1); }}
            className="rounded-lg border border-gray-300 py-2.5 px-3 text-sm outline-none focus:border-[#0f766e]">
            <option value="">All Assignees</option>
            <option value="unassigned">Unassigned</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
      </div>

      {/* Bulk actions bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-[#14b8a6] bg-teal-50 px-4 py-3">
          <span className="text-sm font-medium text-[#0f766e]">{selected.size} selected</span>
          <button onClick={() => setSelected(new Set())} className="text-xs text-gray-500 hover:text-gray-700">Clear</button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-[#0f766e]" />
          </div>
        ) : error ? (
          <div className="p-6 text-center text-sm text-red-600">Failed to load tasks.</div>
        ) : tasks.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <ListTodo className="mx-auto h-10 w-10 text-gray-300" />
            <p className="mt-3 text-sm font-medium text-gray-900">No tasks found</p>
            <p className="mt-1 text-sm text-gray-500">Adjust filters or wait for new submissions.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="w-10 px-4 py-3">
                      <input type="checkbox" checked={selected.size === tasks.length && tasks.length > 0} onChange={toggleAll}
                        className="h-4 w-4 rounded border-gray-300 text-[#0f766e] focus:ring-[#0f766e]" />
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Ticket #</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Title</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Priority</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Assignee</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">SLA</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Created</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {tasks.map((task) => (
                    <tr
                      key={task.id}
                      onClick={() => navigate(`/lead/tasks/${task.id}`)}
                      className={clsx('cursor-pointer hover:bg-gray-50 transition-colors', selected.has(task.id) && 'bg-teal-50/50')}
                    >
                      <td className="w-10 px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={selected.has(task.id)} onChange={() => toggleSelect(task.id)}
                          className="h-4 w-4 rounded border-gray-300 text-[#0f766e] focus:ring-[#0f766e]" />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-500">{task.ticketNumber ?? `#${task.id?.slice(0, 8)}`}</td>
                      <td className="px-4 py-3"><span className="font-medium text-gray-900 line-clamp-1">{task.title}</span></td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className={clsx('rounded-full px-2.5 py-0.5 text-xs font-medium', PRIORITY_COLORS[task.priority])}>{task.priority}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className={clsx('rounded-full px-2.5 py-0.5 text-xs font-medium', STATUS_COLORS[task.status])}>{task.status?.replace(/_/g, ' ')}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-600">{task.assignee?.name ?? task.assigneeName ?? <span className="text-amber-600 font-medium">Unassigned</span>}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className={clsx('text-xs font-medium',
                          task.slaStatus === 'BREACHED' ? 'text-red-600' : task.slaStatus === 'AT_RISK' ? 'text-yellow-600' : 'text-green-600'
                        )}>{task.slaStatus?.replace(/_/g, ' ') ?? '-'}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">{task.createdAt ? format(new Date(task.createdAt), 'MMM d') : '-'}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">{task.updatedAt ? format(new Date(task.updatedAt), 'MMM d') : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3">
              <p className="text-sm text-gray-500">Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}</p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                  className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-40">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="px-3 text-sm text-gray-700">Page {page} of {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                  className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-40">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
