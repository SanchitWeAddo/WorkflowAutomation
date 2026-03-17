import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { ArrowLeft, Clock, User, MessageSquare, Play, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import clsx from 'clsx';

const getToken = () => useAuthStore.getState().token;
const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });

const PRIORITY_COLORS = { URGENT: 'bg-red-100 text-red-700', HIGH: 'bg-orange-100 text-orange-700', NORMAL: 'bg-blue-100 text-blue-700', LOW: 'bg-gray-100 text-gray-700' };
const STATUS_COLORS = {
  ASSIGNED: 'bg-purple-100 text-purple-700', IN_PROGRESS: 'bg-blue-100 text-blue-700',
  REVIEW: 'bg-amber-100 text-amber-700', COMPLETED: 'bg-green-100 text-green-700',
  DELIVERED: 'bg-emerald-100 text-emerald-700', REOPENED: 'bg-red-100 text-red-700',
};

export default function DevTaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchTask = () => {
    fetch(`/api/v1/tasks/${id}`, { headers: authHeaders() })
      .then(r => r.json())
      .then(setTask)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTask(); }, [id]);

  const handleStatusUpdate = async (newStatus) => {
    setSubmitting(true);
    try {
      await fetch(`/api/v1/tasks/${id}/status`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ status: newStatus }),
      });
      fetchTask();
    } catch {}
    setSubmitting(false);
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setSubmitting(true);
    try {
      await fetch(`/api/v1/tasks/${id}/comments`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ content: comment }),
      });
      setComment('');
      fetchTask();
    } catch {}
    setSubmitting(false);
  };

  if (loading) return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" /></div>;
  if (!task) return <div className="py-20 text-center text-gray-400">Task not found</div>;

  const statusActions = {
    ASSIGNED: { label: 'Start Work', next: 'IN_PROGRESS', icon: Play, color: 'bg-brand text-white hover:bg-brand-dark' },
    IN_PROGRESS: { label: 'Submit for Review', next: 'REVIEW', icon: Send, color: 'bg-amber-500 text-white hover:bg-amber-600' },
    REOPENED: { label: 'Start Work', next: 'IN_PROGRESS', icon: Play, color: 'bg-brand text-white hover:bg-brand-dark' },
  };

  const action = statusActions[task.status];

  return (
    <div className="mx-auto max-w-4xl">
      <button onClick={() => navigate('/dev/tasks')} className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft size={16} /> Back to Tasks
      </button>

      {/* Header */}
      <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm text-brand">{task.ticketNumber}</span>
          <span className={clsx('rounded-full px-2.5 py-0.5 text-xs font-medium', PRIORITY_COLORS[task.priority])}>{task.priority}</span>
          <span className={clsx('rounded-full px-2.5 py-0.5 text-xs font-medium', STATUS_COLORS[task.status] || 'bg-gray-100 text-gray-700')}>{task.status?.replace(/_/g, ' ')}</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900">{task.title}</h1>
        {task.description && <p className="mt-2 text-sm text-gray-600">{task.description}</p>}

        <div className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div>
            <p className="text-xs text-gray-500">Created</p>
            <p className="font-medium">{format(new Date(task.createdAt), 'MMM d, yyyy')}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">SLA Deadline</p>
            <p className={clsx('font-medium', task.slaBreached ? 'text-red-600' : 'text-gray-900')}>
              {task.slaDeadline ? format(new Date(task.slaDeadline), 'MMM d, HH:mm') : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Project</p>
            <p className="font-medium">{task.project?.name || 'N/A'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Lead</p>
            <p className="font-medium">{task.lead?.name || 'Unassigned'}</p>
          </div>
        </div>

        {/* Client Dependent flag */}
        {task.metadata?.clientDependent && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <AlertCircle size={16} className="text-amber-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">Client Dependent</p>
              <p className="text-xs text-amber-600">This ticket has a client dependency. Tech Lead will review the client dependency status.</p>
            </div>
          </div>
        )}

        {action && (
          <div className="mt-4 border-t pt-4">
            <button onClick={() => handleStatusUpdate(action.next)} disabled={submitting}
              className={clsx('flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60', action.color)}>
              <action.icon size={16} /> {action.label}
            </button>
          </div>
        )}
      </div>

      {/* Timeline & Comments */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Activity</h2>

        <div className="mb-6 space-y-4">
          {[...(task.events || [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map((event) => (
            <div key={event.id} className="flex gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-500">
                {event.actor?.name?.charAt(0) || 'S'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{event.actor?.name || 'System'}</span>
                  <span className="text-xs text-gray-400">
                    {format(new Date(event.createdAt), 'MMM d, yyyy h:mm a')}
                    {' · '}
                    {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  {event.eventType === 'comment' ? event.note : (
                    <>
                      <span className="capitalize">{event.eventType?.replace(/_/g, ' ')}</span>
                      {event.fromStatus && event.toStatus && (
                        <span className="text-gray-400"> · {event.fromStatus} → {event.toStatus}</span>
                      )}
                    </>
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleComment} className="flex gap-2">
          <input value={comment} onChange={e => setComment(e.target.value)} placeholder="Add a comment..."
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20" />
          <button type="submit" disabled={submitting || !comment.trim()}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-60">
            <MessageSquare size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
