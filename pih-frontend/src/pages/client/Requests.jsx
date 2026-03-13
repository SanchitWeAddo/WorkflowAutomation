import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Filter, FileText, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';

import { useAuthStore } from '../../store/authStore';
const getToken = () => useAuthStore.getState().token;
const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });

const PRIORITY_COLORS = {
  URGENT: 'bg-red-100 text-red-700 ring-red-600/10',
  HIGH: 'bg-orange-100 text-orange-700 ring-orange-600/10',
  NORMAL: 'bg-blue-100 text-blue-700 ring-blue-600/10',
  LOW: 'bg-gray-100 text-gray-600 ring-gray-500/10',
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

const SLA_COLORS = {
  ON_TRACK: 'text-green-600',
  AT_RISK: 'text-yellow-600',
  BREACHED: 'text-red-600',
};

const PAGE_SIZE = 10;

export default function Requests() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [priorityFilter, setPriorityFilter] = useState(searchParams.get('priority') ?? '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') ?? '');
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);

  const { data, isLoading, error } = useQuery({
    queryKey: ['client-requests', search, priorityFilter, statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams({ createdById: 'me', page: String(page), limit: String(PAGE_SIZE) });
      if (search.trim()) params.set('search', search.trim());
      if (priorityFilter) params.set('priority', priorityFilter);
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/v1/tasks?${params}`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to fetch requests');
      return res.json();
    },
  });

  const tasks = data?.data ?? data?.tasks ?? [];
  const total = data?.total ?? data?.meta?.total ?? tasks.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Requests</h1>
          <p className="text-gray-500 mt-1">Track and manage all your service requests.</p>
        </div>
        <button
          onClick={() => navigate('/client/requests/new')}
          className="inline-flex items-center gap-2 rounded-lg bg-[#0f766e] px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-[#134e4a] transition-colors"
        >
          New Request
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <form onSubmit={handleSearch} className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search requests..."
            className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/20"
          />
        </form>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400 hidden sm:block" />
          <select
            value={priorityFilter}
            onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
            className="rounded-lg border border-gray-300 py-2.5 px-3 text-sm outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/20"
          >
            <option value="">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="NORMAL">Normal</option>
            <option value="LOW">Low</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded-lg border border-gray-300 py-2.5 px-3 text-sm outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/20"
          >
            <option value="">All Statuses</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="REVIEW">Review</option>
            <option value="CLIENT_REVIEW">Client Review</option>
            <option value="COMPLETED">Completed</option>
            <option value="DELIVERED">Delivered</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-[#0f766e]" />
          </div>
        ) : error ? (
          <div className="p-6 text-center text-sm text-red-600">Failed to load requests. Please try again.</div>
        ) : tasks.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <FileText className="mx-auto h-10 w-10 text-gray-300" />
            <p className="mt-3 text-sm font-medium text-gray-900">No requests found</p>
            <p className="mt-1 text-sm text-gray-500">
              {search || priorityFilter || statusFilter ? 'Try adjusting your filters.' : 'Create your first request to get started.'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Ticket #</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Title</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Priority</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Status</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Created</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">SLA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {tasks.map((task) => (
                    <tr
                      key={task.id}
                      onClick={() => navigate(`/client/requests/${task.id}`)}
                      className="cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <td className="whitespace-nowrap px-6 py-4 font-mono text-xs text-gray-500">
                        {task.ticketNumber ?? `#${task.id?.slice(0, 8)}`}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-gray-900 line-clamp-1">{task.title}</span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className={clsx('inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset', PRIORITY_COLORS[task.priority])}>
                          {task.priority}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className={clsx('inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium', STATUS_COLORS[task.status])}>
                          {task.status?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-gray-500">
                        {task.createdAt ? format(new Date(task.createdAt), 'MMM d, yyyy') : '-'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className={clsx('text-xs font-medium', SLA_COLORS[task.slaStatus] ?? 'text-gray-500')}>
                          {task.slaStatus?.replace(/_/g, ' ') ?? '-'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3">
              <p className="text-sm text-gray-500">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="px-3 text-sm text-gray-700">Page {page} of {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
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
