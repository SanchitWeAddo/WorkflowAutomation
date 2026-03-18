import { useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Calendar, Clock, User, FolderOpen, AlertTriangle, Send,
  Loader2, MessageSquare, UserPlus, ArrowRightLeft, Upload, Eye, EyeOff,
  Play, CheckCircle, RotateCcw, Truck,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
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
  QA_REVIEW: 'bg-cyan-100 text-cyan-700',
  QA_FAILED: 'bg-red-100 text-red-700',
  CLIENT_REVIEW: 'bg-purple-100 text-purple-700',
  COMPLETED: 'bg-green-100 text-green-700',
  DELIVERED: 'bg-emerald-100 text-emerald-700',
  REOPENED: 'bg-orange-100 text-orange-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

const STATUS_TRANSITIONS = {
  ACKNOWLEDGED: [{ status: 'ASSIGNED', label: 'Assign', icon: UserPlus, color: 'bg-indigo-600 hover:bg-indigo-700' }],
  ASSIGNED: [{ status: 'IN_PROGRESS', label: 'Start Work', icon: Play, color: 'bg-blue-600 hover:bg-blue-700' }],
  IN_PROGRESS: [
    { status: 'REVIEW', label: 'Send to Review', icon: Eye, color: 'bg-yellow-600 hover:bg-yellow-700' },
  ],
  REVIEW: [
    { status: 'COMPLETED', label: 'Approve', icon: CheckCircle, color: 'bg-green-600 hover:bg-green-700' },
    { status: 'QA_REVIEW', label: 'Send to QA', icon: Eye, color: 'bg-cyan-600 hover:bg-cyan-700' },
    { status: 'IN_PROGRESS', label: 'Return to Dev', icon: RotateCcw, color: 'bg-blue-600 hover:bg-blue-700' },
  ],
  QA_REVIEW: [
    { status: 'COMPLETED', label: 'QA Approved', icon: CheckCircle, color: 'bg-green-600 hover:bg-green-700' },
    { status: 'QA_FAILED', label: 'QA Failed', icon: RotateCcw, color: 'bg-red-600 hover:bg-red-700' },
  ],
  QA_FAILED: [
    { status: 'IN_PROGRESS', label: 'Return to Dev', icon: RotateCcw, color: 'bg-blue-600 hover:bg-blue-700' },
    { status: 'ASSIGNED', label: 'Reassign', icon: UserPlus, color: 'bg-indigo-600 hover:bg-indigo-700' },
  ],
  COMPLETED: [{ status: 'CLIENT_REVIEW', label: 'Send to Client', icon: Truck, color: 'bg-purple-600 hover:bg-purple-700' }],
  REOPENED: [{ status: 'ASSIGNED', label: 'Reassign', icon: UserPlus, color: 'bg-indigo-600 hover:bg-indigo-700' }],
};

export default function LeadTaskDetail() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [comment, setComment] = useState('');
  const [commentVisibility, setCommentVisibility] = useState('all');
  const [assigneeId, setAssigneeId] = useState('');
  const [handoffLeadId, setHandoffLeadId] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['lead-task', id],
    queryFn: async () => {
      const res = await fetch(`/api/v1/tasks/${id}`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to fetch task');
      return res.json();
    },
  });

  const { data: usersData } = useQuery({
    queryKey: ['lead-users'],
    queryFn: async () => {
      const res = await fetch('/api/v1/users', { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const task = data?.data ?? data;
  const users = usersData?.data ?? usersData?.users ?? [];
  const allEvents = task?.events ?? task?.timeline ?? [];
  const comments = allEvents.filter(e => e.eventType === 'comment').map(e => ({
    id: e.id,
    content: e.note,
    author: e.actor,
    authorName: e.actor?.name,
    internal: e.payload?.isInternal,
    createdAt: e.createdAt,
  }));
  const timeline = allEvents.filter(e => e.eventType !== 'comment');

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['lead-task', id] });

  const assignMutation = useMutation({
    mutationFn: async (userId) => {
      const res = await fetch(`/api/v1/tasks/${id}/assign`, {
        method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ assigneeId: userId }),
      });
      if (!res.ok) throw new Error('Assign failed');
      return res.json();
    },
    onSuccess: () => { invalidate(); setAssigneeId(''); },
  });

  const statusMutation = useMutation({
    mutationFn: async (status) => {
      const res = await fetch(`/api/v1/tasks/${id}/status`, {
        method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Status change failed');
      return res.json();
    },
    onSuccess: invalidate,
  });

  const handoffMutation = useMutation({
    mutationFn: async (leadId) => {
      const res = await fetch(`/api/v1/tasks/${id}/handoff`, {
        method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ newLeadId: leadId }),
      });
      if (!res.ok) throw new Error('Handoff failed');
      return res.json();
    },
    onSuccess: () => { invalidate(); setHandoffLeadId(''); },
  });

  const commentMutation = useMutation({
    mutationFn: async ({ content, internal }) => {
      const res = await fetch(`/api/v1/tasks/${id}/comments`, {
        method: 'POST', headers: authHeaders(), body: JSON.stringify({ content, isInternal: internal }),
      });
      if (!res.ok) throw new Error('Comment failed');
      return res.json();
    },
    onSuccess: () => { setComment(''); setCommentVisibility('all'); invalidate(); },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`/api/v1/tasks/${id}/attachments`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      return res.json();
    },
    onSuccess: invalidate,
  });

  if (isLoading) return <div className="flex items-center justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-[#0f766e]" /></div>;
  if (error || !task) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center">
        <AlertTriangle className="mx-auto h-10 w-10 text-red-400" />
        <p className="mt-3 text-sm text-gray-700">Could not load this task.</p>
        <Link to="/lead/tasks" className="mt-3 inline-flex items-center gap-1 text-sm text-[#0f766e]"><ArrowLeft className="h-4 w-4" /> Back</Link>
      </div>
    );
  }

  const transitions = STATUS_TRANSITIONS[task.status] ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link to="/lead/tasks" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" /> Back to tasks
      </Link>

      {/* Header */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-mono text-gray-400">{task.ticketNumber ?? `#${task.id?.slice(0, 8)}`}</p>
            <h1 className="mt-1 text-xl font-bold text-gray-900">{task.title}</h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={clsx('rounded-full px-3 py-1 text-xs font-medium', PRIORITY_COLORS[task.priority])}>{task.priority}</span>
            <span className={clsx('rounded-full px-3 py-1 text-xs font-medium', STATUS_COLORS[task.status])}>{task.status?.replace(/_/g, ' ')}</span>
          </div>
        </div>
        {task.description && <p className="mt-4 text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{task.description}</p>}

        {/* Info */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="flex items-center gap-2 text-sm"><Calendar className="h-4 w-4 text-gray-400" /><div><p className="text-xs text-gray-400">Created</p><p className="font-medium text-gray-700">{task.createdAt ? format(new Date(task.createdAt), 'MMM d, yyyy') : '-'}</p></div></div>
          <div className="flex items-center gap-2 text-sm"><Clock className="h-4 w-4 text-gray-400" /><div><p className="text-xs text-gray-400">SLA Deadline</p><p className="font-medium text-gray-700">{task.slaDeadline ? format(new Date(task.slaDeadline), 'MMM d, yyyy') : '-'}</p></div></div>
          <div className="flex items-center gap-2 text-sm"><User className="h-4 w-4 text-gray-400" /><div><p className="text-xs text-gray-400">Assignee</p><p className="font-medium text-gray-700">{task.assignee?.name ?? 'Unassigned'}</p></div></div>
          <div className="flex items-center gap-2 text-sm"><FolderOpen className="h-4 w-4 text-gray-400" /><div><p className="text-xs text-gray-400">Project</p><p className="font-medium text-gray-700">{task.project?.name ?? task.category ?? '-'}</p></div></div>
        </div>

        {/* Internal Dates (TL only) */}
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-400">Start Date</p>
              <p className="font-medium text-gray-700">{task.startDate ? format(new Date(task.startDate), 'MMM d, yyyy') : 'Not set'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-400">Due Date</p>
              <p className="font-medium text-gray-700">{task.dueDate ? format(new Date(task.dueDate), 'MMM d, yyyy') : 'Not set'}</p>
            </div>
          </div>
          {task.estimatedHours != null && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-400">Est. Hours</p>
                <p className="font-medium text-gray-700">{task.estimatedHours}h</p>
              </div>
            </div>
          )}
          {task.isClientDependent && (
            <div className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <div>
                <p className="text-xs text-gray-400">Status</p>
                <p className="font-medium text-amber-600">Client Dependent</p>
              </div>
            </div>
          )}
        </div>

        {/* Multiple Assignees */}
        {(task.taskAssignees ?? []).length > 0 && (
          <div className="mt-4">
            <p className="text-xs text-gray-400 mb-1.5">Team</p>
            <div className="flex flex-wrap gap-2">
              {task.taskAssignees.map((ta) => (
                <span key={ta.id} className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
                  <User className="h-3 w-3" /> {ta.user?.name}
                  {ta.user?.skills?.length > 0 && (
                    <span className="text-indigo-400">({ta.user.skills.slice(0, 2).join(', ')})</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Status Actions */}
        {transitions.length > 0 && (
          <div className="mt-6 flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-gray-500 mr-1">Actions:</span>
            {transitions.map((t) => (
              <button
                key={t.status}
                onClick={() => statusMutation.mutate(t.status)}
                disabled={statusMutation.isPending}
                className={clsx('inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-medium text-white transition-colors disabled:opacity-50', t.color)}
              >
                <t.icon className="h-3.5 w-3.5" /> {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Sidebar: Assign, Handoff, Upload */}
        <div className="space-y-4">
          {/* Assign */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-3">
              <UserPlus className="h-4 w-4 text-gray-400" /> Assign / Reassign
            </h3>
            <div className="flex gap-2">
              <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#0f766e]">
                <option value="">Select user...</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              <button
                onClick={() => assigneeId && assignMutation.mutate(assigneeId)}
                disabled={!assigneeId || assignMutation.isPending}
                className="rounded-lg bg-[#0f766e] px-3 py-2 text-sm font-medium text-white hover:bg-[#134e4a] disabled:opacity-50"
              >
                {assignMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Assign'}
              </button>
            </div>
          </div>

          {/* Handoff */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-3">
              <ArrowRightLeft className="h-4 w-4 text-gray-400" /> Handoff to Lead
            </h3>
            <div className="flex gap-2">
              <select value={handoffLeadId} onChange={(e) => setHandoffLeadId(e.target.value)}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#0f766e]">
                <option value="">Select lead...</option>
                {users.filter(u => u.role === 'LEAD' || u.role === 'TEAM_LEAD').map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              <button
                onClick={() => handoffLeadId && handoffMutation.mutate(handoffLeadId)}
                disabled={!handoffLeadId || handoffMutation.isPending}
                className="rounded-lg bg-gray-700 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {handoffMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Transfer'}
              </button>
            </div>
          </div>

          {/* Attachments */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-3">
              <Upload className="h-4 w-4 text-gray-400" /> Attachments
            </h3>
            {(task.attachments ?? []).length > 0 && (
              <ul className="mb-3 space-y-1">
                {task.attachments.map((a, i) => (
                  <li key={i} className="text-xs text-[#0f766e] truncate">{a.filename ?? a.name}</li>
                ))}
              </ul>
            )}
            <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => e.target.files?.[0] && uploadMutation.mutate(e.target.files[0])} />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadMutation.isPending}
              className="w-full rounded-lg border-2 border-dashed border-gray-300 py-3 text-xs font-medium text-gray-500 hover:border-[#14b8a6] hover:text-[#0f766e] transition-colors"
            >
              {uploadMutation.isPending ? 'Uploading...' : 'Click to upload file'}
            </button>
          </div>

          {/* Timeline */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-5 py-3"><h3 className="text-sm font-semibold text-gray-900">Timeline</h3></div>
            {timeline.length === 0 ? (
              <div className="px-5 py-6 text-center text-xs text-gray-400">No events.</div>
            ) : (
              <ul className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
                {timeline.map((e, i) => (
                  <li key={i} className="px-5 py-2.5 text-xs">
                    <p className="text-gray-700">
                      {e.note || (
                        <>
                          <span className="capitalize">{e.eventType?.replace(/_/g, ' ')}</span>
                          {e.fromStatus && e.toStatus && <span className="text-gray-400"> · {e.fromStatus} → {e.toStatus}</span>}
                        </>
                      )}
                    </p>
                    <p className="mt-0.5 text-gray-400">
                      {e.actor?.name && <span>{e.actor.name} · </span>}
                      {e.createdAt && formatDistanceToNow(new Date(e.createdAt), { addSuffix: true })}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Comments */}
        <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white shadow-sm flex flex-col">
          <div className="border-b border-gray-100 px-5 py-4 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900">Comments</h2>
            <span className="ml-auto rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{comments.length}</span>
          </div>

          <div className="flex-1 overflow-y-auto max-h-96 divide-y divide-gray-50">
            {comments.length === 0 ? (
              <div className="px-5 py-12 text-center text-xs text-gray-400">No comments yet.</div>
            ) : (
              comments.map((c, i) => (
                <div key={c.id ?? i} className={clsx('px-5 py-4', c.internal && 'bg-amber-50/50')}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{c.author?.name ?? c.authorName ?? 'Unknown'}</span>
                      {c.internal && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">Internal</span>
                      )}
                    </div>
                    <span className="text-[11px] text-gray-400">{c.createdAt && formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}</span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600 whitespace-pre-wrap">{c.content}</p>
                </div>
              ))
            )}
          </div>

          <form onSubmit={(e) => { e.preventDefault(); if (comment.trim()) commentMutation.mutate({ content: comment.trim(), internal: commentVisibility === 'internal' }); }}
            className="border-t border-gray-100 p-4 space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={commentVisibility === 'internal' ? 'Write an internal note...' : 'Write a comment...'}
                className="flex-1 rounded-lg border border-gray-300 px-3.5 py-2 text-sm outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/20"
              />
              <button type="submit" disabled={!comment.trim() || commentMutation.isPending}
                className="rounded-lg bg-[#0f766e] px-4 py-2 text-sm font-medium text-white hover:bg-[#134e4a] disabled:opacity-50">
                {commentMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">Visibility:</span>
              {[
                { value: 'all', label: 'Visible to all', icon: Eye, color: 'text-gray-500' },
                { value: 'internal', label: 'Internal (team only)', icon: EyeOff, color: 'text-amber-600' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setCommentVisibility(opt.value)}
                  className={clsx('inline-flex items-center gap-1 text-xs font-medium transition-colors',
                    commentVisibility === opt.value ? opt.color : 'text-gray-300 hover:text-gray-500')}
                >
                  <opt.icon className="h-3.5 w-3.5" /> {opt.label}
                </button>
              ))}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
