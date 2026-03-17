import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Search, ChevronLeft, ChevronRight, Filter, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';

const getToken = () => useAuthStore.getState().token;
const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });

const PRIORITY_COLORS = { URGENT: 'bg-red-100 text-red-700', HIGH: 'bg-orange-100 text-orange-700', NORMAL: 'bg-blue-100 text-blue-700', LOW: 'bg-gray-100 text-gray-700' };
const STATUS_COLORS = {
  SUBMITTED: 'bg-gray-100 text-gray-700', ACKNOWLEDGED: 'bg-gray-100 text-gray-700',
  ASSIGNED: 'bg-purple-100 text-purple-700', IN_PROGRESS: 'bg-blue-100 text-blue-700',
  REVIEW: 'bg-amber-100 text-amber-700', COMPLETED: 'bg-green-100 text-green-700',
  CLIENT_REVIEW: 'bg-teal-100 text-teal-700', DELIVERED: 'bg-emerald-100 text-emerald-700',
  REOPENED: 'bg-red-100 text-red-700', CANCELLED: 'bg-gray-100 text-gray-500',
};

export default function DevTasks() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  const activeFilterCount = [statusFilter, priorityFilter].filter(Boolean).length;

  const fetchTasks = () => {
    setLoading(true);
    const params = new URLSearchParams({ assigneeId: user?.id, page, limit: 20 });
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);
    if (priorityFilter) params.set('priority', priorityFilter);
    fetch(`/api/v1/tasks?${params}`, { headers: authHeaders() })
      .then(r => r.json())
      .then(data => {
        setTasks(data.tasks || []);
        setPagination(data.pagination || { page: 1, totalPages: 1 });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTasks(); }, [page, statusFilter, priorityFilter, user?.id]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Tasks</h1>
        <p className="text-sm text-gray-500">All tasks assigned to you</p>
      </div>

      <div className="mb-4 space-y-3">
        <div className="flex flex-wrap gap-3">
          <form onSubmit={(e) => { e.preventDefault(); fetchTasks(); }} className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by title or ticket number..."
                className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20" />
            </div>
          </form>
          <button
            onClick={() => setShowFilters(f => !f)}
            className={clsx(
              'inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
              showFilters || activeFilterCount > 0
                ? 'border-brand bg-brand/5 text-brand'
                : 'border-gray-300 text-gray-700 hover:border-gray-400'
            )}
          >
            <Filter size={16} />
            Filters
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-bold text-white">{activeFilterCount}</span>
            )}
          </button>
          {activeFilterCount > 0 && (
            <button
              onClick={() => { setStatusFilter(''); setPriorityFilter(''); }}
              className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
            >
              <X size={14} /> Clear
            </button>
          )}
        </div>
        {showFilters && (
          <div className="flex flex-wrap gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand focus:outline-none">
              <option value="">All Statuses</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="REVIEW">Review</option>
              <option value="COMPLETED">Completed</option>
              <option value="REOPENED">Reopened</option>
            </select>
            <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand focus:outline-none">
              <option value="">All Priorities</option>
              <option value="URGENT">Urgent</option>
              <option value="HIGH">High</option>
              <option value="NORMAL">Normal</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Ticket</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Title</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Priority</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={5} className="py-12 text-center text-gray-400">Loading...</td></tr>
            ) : tasks.length === 0 ? (
              <tr><td colSpan={5} className="py-12 text-center text-gray-400">No tasks found</td></tr>
            ) : tasks.map((task) => (
              <tr key={task.id} className="cursor-pointer hover:bg-gray-50" onClick={() => navigate(`/dev/tasks/${task.id}`)}>
                <td className="px-4 py-3 font-mono text-xs text-brand">{task.ticketNumber}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{task.title}</td>
                <td className="px-4 py-3">
                  <span className={clsx('rounded-full px-2 py-0.5 text-xs font-medium', PRIORITY_COLORS[task.priority])}>{task.priority}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={clsx('rounded-full px-2 py-0.5 text-xs font-medium', STATUS_COLORS[task.status])}>{task.status?.replace(/_/g, ' ')}</span>
                </td>
                <td className="px-4 py-3 text-gray-500">{formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex items-center justify-between border-t px-4 py-3">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="flex items-center gap-1 text-sm text-gray-500 disabled:opacity-40">
            <ChevronLeft size={16} /> Prev
          </button>
          <span className="text-sm text-gray-500">Page {pagination.page} of {pagination.totalPages}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={page >= pagination.totalPages}
            className="flex items-center gap-1 text-sm text-gray-500 disabled:opacity-40">
            Next <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
