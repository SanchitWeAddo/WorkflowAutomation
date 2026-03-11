import React, { useState, useEffect } from 'react';
import { ScrollText, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';

const getToken = () => {
  try { return JSON.parse(localStorage.getItem('pih-auth'))?.state?.token; } catch { return null; }
};
const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });

const EVENT_COLORS = {
  status_change: 'bg-blue-100 text-blue-600',
  assignment: 'bg-purple-100 text-purple-600',
  comment: 'bg-green-100 text-green-600',
  handoff: 'bg-amber-100 text-amber-600',
  attachment: 'bg-gray-100 text-gray-600',
  client_accepted: 'bg-emerald-100 text-emerald-600',
  client_rejected: 'bg-red-100 text-red-600',
};

export default function AdminAuditLog() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    // Fetch recent task events as audit log
    const params = new URLSearchParams({ page, limit: 50 });
    fetch(`/api/v1/tasks?page=${page}&limit=10`, { headers: authHeaders() })
      .then(r => r.json())
      .then(data => {
        // Flatten task events from all tasks
        const allEvents = (data.tasks || []).flatMap(task =>
          (task.events || []).map(e => ({ ...e, taskTicket: task.ticketNumber, taskTitle: task.title }))
        );
        setEvents(allEvents.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page]);

  const filtered = typeFilter ? events.filter(e => e.eventType === typeFilter) : events;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
        <p className="text-sm text-gray-500">Track all system activities and changes</p>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand focus:outline-none">
          <option value="">All Event Types</option>
          <option value="status_change">Status Changes</option>
          <option value="assignment">Assignments</option>
          <option value="comment">Comments</option>
          <option value="handoff">Handoffs</option>
          <option value="attachment">Attachments</option>
        </select>
      </div>

      <div className="rounded-xl bg-white shadow-sm">
        {loading ? (
          <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" /></div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center">
            <ScrollText className="mx-auto mb-3 text-gray-300" size={40} />
            <p className="text-gray-400">No audit events found</p>
          </div>
        ) : (
          <div className="divide-y">
            {filtered.map((event) => (
              <div key={event.id} className="flex items-start gap-4 px-6 py-4 hover:bg-gray-50">
                <div className={clsx('mt-0.5 rounded-lg p-1.5 text-xs', EVENT_COLORS[event.eventType] || 'bg-gray-100 text-gray-600')}>
                  <ScrollText size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{event.eventType?.replace(/_/g, ' ')}</span>
                    {event.taskTicket && (
                      <span className="font-mono text-xs text-brand">{event.taskTicket}</span>
                    )}
                  </div>
                  {event.note && <p className="mt-0.5 text-sm text-gray-600">{event.note}</p>}
                  {event.fromStatus && event.toStatus && (
                    <p className="mt-0.5 text-xs text-gray-400">
                      {event.fromStatus.replace(/_/g, ' ')} → {event.toStatus.replace(/_/g, ' ')}
                    </p>
                  )}
                  <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
                    <span>{event.actor?.name || 'System'}</span>
                    <span>·</span>
                    <span>{formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between border-t px-6 py-3">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-40">
            <ChevronLeft size={16} /> Previous
          </button>
          <span className="text-sm text-gray-500">Page {page}</span>
          <button onClick={() => setPage(p => p + 1)}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            Next <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
