import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Clock, User, FolderOpen, Calendar, AlertTriangle,
  CheckCircle, XCircle, Send, Loader2, MessageSquare,
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
  CLIENT_REVIEW: 'bg-purple-100 text-purple-700',
  COMPLETED: 'bg-green-100 text-green-700',
  DELIVERED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-red-100 text-red-700',
};


export default function RequestDetail() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState('');
  const [feedback, setFeedback] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['client-request', id],
    queryFn: async () => {
      const res = await fetch(`/api/v1/tasks/${id}`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to fetch request');
      return res.json();
    },
  });

  const task = data?.data ?? data;

  const commentMutation = useMutation({
    mutationFn: async (content) => {
      const res = await fetch(`/api/v1/tasks/${id}/comments`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error('Failed to add comment');
      return res.json();
    },
    onSuccess: () => {
      setComment('');
      queryClient.invalidateQueries({ queryKey: ['client-request', id] });
    },
  });

  const feedbackMutation = useMutation({
    mutationFn: async (content) => {
      const res = await fetch(`/api/v1/tasks/${id}/comments`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ content, isInternal: false }),
      });
      if (!res.ok) throw new Error('Failed to submit feedback');
      return res.json();
    },
    onSuccess: () => {
      setFeedback('');
      setShowFeedback(false);
      queryClient.invalidateQueries({ queryKey: ['client-request', id] });
    },
  });

  const acceptMutation = useMutation({
    mutationFn: async (accept) => {
      const res = await fetch(`/api/v1/tasks/${id}/accept`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ accepted: accept }),
      });
      if (!res.ok) throw new Error('Action failed');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['client-request', id] }),
  });

  const handleComment = (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    commentMutation.mutate(comment.trim());
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-[#0f766e]" />
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center">
        <AlertTriangle className="mx-auto h-10 w-10 text-red-400" />
        <p className="mt-3 text-sm text-gray-700">Could not load this request.</p>
        <Link to="/client/requests" className="mt-3 inline-flex items-center gap-1 text-sm text-[#0f766e]">
          <ArrowLeft className="h-4 w-4" /> Back to requests
        </Link>
      </div>
    );
  }

  const allEvents = task.events ?? [];
  const comments = allEvents.filter(e => e.eventType === 'comment').map(e => ({
    id: e.id,
    content: e.note,
    author: e.actor,
    authorName: e.actor?.name,
    createdAt: e.createdAt,
  }));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Back */}
      <Link to="/client/requests" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" /> Back to requests
      </Link>

      {/* Header */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-mono text-gray-400">{task.ticketNumber ?? `#${task.id?.slice(0, 8)}`}</p>
            <h1 className="mt-1 text-xl font-bold text-gray-900">{task.title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className={clsx('rounded-full px-3 py-1 text-xs font-medium', PRIORITY_COLORS[task.priority])}>
              {task.priority}
            </span>
            <span className={clsx('rounded-full px-3 py-1 text-xs font-medium', STATUS_COLORS[task.status])}>
              {task.status?.replace(/_/g, ' ')}
            </span>
          </div>
        </div>

        {task.description && (
          <p className="mt-4 text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{task.description}</p>
        )}

        {/* Info Grid */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Calendar className="h-4 w-4 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-400">Created</p>
              <p className="font-medium text-gray-700">{task.createdAt ? format(new Date(task.createdAt), 'MMM d, yyyy') : '-'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Clock className="h-4 w-4 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-400">SLA Deadline</p>
              <p className="font-medium text-gray-700">{task.slaDeadline ? format(new Date(task.slaDeadline), 'MMM d, yyyy') : '-'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <User className="h-4 w-4 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-400">Assignee</p>
              <p className="font-medium text-gray-700">{task.assignee?.name ?? task.assigneeName ?? 'Unassigned'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <FolderOpen className="h-4 w-4 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-400">Project</p>
              <p className="font-medium text-gray-700">{task.project?.name ?? task.category ?? '-'}</p>
            </div>
          </div>
        </div>

        {/* Client Review Actions */}
        {task.status === 'CLIENT_REVIEW' && (
          <div className="mt-6 flex items-center gap-3 rounded-lg border border-purple-200 bg-purple-50 p-4">
            <p className="flex-1 text-sm font-medium text-purple-800">This request is ready for your review.</p>
            <button
              onClick={() => acceptMutation.mutate(true)}
              disabled={acceptMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <CheckCircle className="h-4 w-4" /> Accept
            </button>
            <button
              onClick={() => acceptMutation.mutate(false)}
              disabled={acceptMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              <XCircle className="h-4 w-4" /> Reject
            </button>
          </div>
        )}

        {/* Client Feedback / Change Request */}
        {!['DELIVERED', 'CANCELLED'].includes(task.status) && (
          <div className="mt-6">
            {!showFeedback ? (
              <button
                onClick={() => setShowFeedback(true)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0f766e] hover:text-[#134e4a] transition-colors"
              >
                <MessageSquare className="h-4 w-4" /> Submit Change Request / Feedback
              </button>
            ) : (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
                <p className="text-sm font-medium text-gray-700">Change Request / Feedback</p>
                <textarea
                  rows={3}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Describe the changes you'd like or provide feedback..."
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm shadow-sm outline-none focus:ring-2 focus:ring-[#0f766e]/20 focus:border-[#0f766e] resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => feedback.trim() && feedbackMutation.mutate(feedback.trim())}
                    disabled={!feedback.trim() || feedbackMutation.isPending}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#0f766e] px-4 py-2 text-sm font-medium text-white hover:bg-[#134e4a] transition-colors disabled:opacity-50"
                  >
                    {feedbackMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Submit Feedback
                  </button>
                  <button
                    onClick={() => { setShowFeedback(false); setFeedback(''); }}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Comments */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm flex flex-col">
          <div className="border-b border-gray-100 px-5 py-4 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900">Comments</h2>
            <span className="ml-auto rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{comments.length}</span>
          </div>

          <div className="flex-1 overflow-y-auto max-h-80 divide-y divide-gray-50">
            {comments.length === 0 ? (
              <div className="px-5 py-8 text-center text-xs text-gray-400">No comments yet. Start the conversation.</div>
            ) : (
              comments.map((c, i) => (
                <div key={c.id ?? i} className="px-5 py-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">{c.author?.name ?? c.authorName ?? 'Unknown'}</span>
                    <span className="text-[11px] text-gray-400">
                      {c.createdAt && formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600 whitespace-pre-wrap">{c.content}</p>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleComment} className="border-t border-gray-100 p-4 flex gap-2">
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Write a comment..."
              className="flex-1 rounded-lg border border-gray-300 px-3.5 py-2 text-sm outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/20"
            />
            <button
              type="submit"
              disabled={!comment.trim() || commentMutation.isPending}
              className="rounded-lg bg-[#0f766e] px-4 py-2 text-sm font-medium text-white hover:bg-[#134e4a] transition-colors disabled:opacity-50"
            >
              {commentMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
