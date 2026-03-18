import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Send, Sparkles, Loader2, ArrowLeft, Upload, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';

import { useAuthStore } from '../../store/authStore';
const getToken = () => useAuthStore.getState().token;
const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });

const PRIORITIES = [
  { value: 'NORMAL', label: 'Normal' },
  { value: 'LOW', label: 'Low' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
];

export default function NewRequest() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [form, setForm] = useState({ title: '', description: '', priority: 'NORMAL', category: '' });
  const [errors, setErrors] = useState({});
  const [useAi, setUseAi] = useState(false);
  const [aiParsing, setAiParsing] = useState(false);
  const [attachments, setAttachments] = useState([]);

  const set = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = 'Title is required';
    if (!form.description.trim()) e.description = 'Description is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    setAttachments(prev => [...prev, ...files]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const parseWithAi = async () => {
    if (!form.description.trim()) {
      setErrors({ description: 'Enter a description first so AI can parse it.' });
      return;
    }
    setAiParsing(true);
    try {
      const res = await fetch('/api/v1/tasks/parse', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ description: form.description }),
      });
      if (!res.ok) throw new Error('AI parse failed');
      const parsed = await res.json();
      const d = parsed.data ?? parsed;
      setForm(prev => ({
        ...prev,
        title: d.title || prev.title,
        priority: d.priority || prev.priority,
        category: d.category || prev.category,
        description: d.description || prev.description,
      }));
    } catch {
      // silently fail, user can fill manually
    } finally {
      setAiParsing(false);
    }
  };

  const submitMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await fetch('/api/v1/tasks', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? 'Failed to create request');
      }
      const task = await res.json();

      // Upload attachments if any
      for (const file of attachments) {
        const formData = new FormData();
        formData.append('file', file);
        await fetch(`/api/v1/tasks/${task.id}/attachments`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${getToken()}` },
          body: formData,
        });
      }

      return task;
    },
    onSuccess: () => navigate('/client/requests'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      priority: form.priority,
    };
    if (form.category.trim()) payload.category = form.category.trim();
    submitMutation.mutate(payload);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <Link to="/client" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">New Service Request</h1>
        <p className="mt-1 text-gray-500">Describe what you need and we'll get it done.</p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="space-y-5 p-6">
          {/* AI Toggle */}
          <div className="flex items-center justify-between rounded-lg border border-teal-100 bg-teal-50/50 p-4">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-[#0f766e]" />
              <div>
                <p className="text-sm font-medium text-gray-900">AI-Assisted Filling</p>
                <p className="text-xs text-gray-500">Write a description and let AI auto-fill the rest</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setUseAi(prev => !prev)}
              className={clsx(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                useAi ? 'bg-[#0f766e]' : 'bg-gray-200'
              )}
            >
              <span
                className={clsx(
                  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                  useAi ? 'translate-x-6' : 'translate-x-1'
                )}
              />
            </button>
          </div>

          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1.5">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="Brief summary of your request"
              className={clsx(
                'w-full rounded-lg border px-3.5 py-2.5 text-sm shadow-sm outline-none transition-colors focus:ring-2 focus:ring-[#0f766e]/20 focus:border-[#0f766e]',
                errors.title ? 'border-red-300 bg-red-50' : 'border-gray-300'
              )}
            />
            {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title}</p>}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1.5">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              rows={5}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Describe your request in detail..."
              className={clsx(
                'w-full rounded-lg border px-3.5 py-2.5 text-sm shadow-sm outline-none transition-colors focus:ring-2 focus:ring-[#0f766e]/20 focus:border-[#0f766e] resize-none',
                errors.description ? 'border-red-300 bg-red-50' : 'border-gray-300'
              )}
            />
            {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description}</p>}
            {useAi && (
              <button
                type="button"
                onClick={parseWithAi}
                disabled={aiParsing}
                className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-teal-50 px-3 py-1.5 text-xs font-medium text-[#0f766e] hover:bg-teal-100 transition-colors disabled:opacity-50"
              >
                {aiParsing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                {aiParsing ? 'Parsing...' : 'Auto-fill with AI'}
              </button>
            )}
          </div>

          {/* Priority & Category */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1.5">Priority</label>
              <select
                id="priority"
                value={form.priority}
                onChange={(e) => set('priority', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm shadow-sm outline-none focus:ring-2 focus:ring-[#0f766e]/20 focus:border-[#0f766e]"
              >
                {PRIORITIES.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
              <input
                id="category"
                type="text"
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
                placeholder="e.g. Website, API, Design"
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm shadow-sm outline-none focus:ring-2 focus:ring-[#0f766e]/20 focus:border-[#0f766e]"
              />
            </div>
          </div>

          {/* Attachments */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <Upload className="inline h-4 w-4 mr-1" />
              Attachments
            </label>
            {attachments.length > 0 && (
              <ul className="mb-2 space-y-1">
                {attachments.map((file, i) => (
                  <li key={i} className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-1.5 text-sm">
                    <span className="truncate text-gray-700">{file.name}</span>
                    <button type="button" onClick={() => removeAttachment(i)} className="ml-2 text-gray-400 hover:text-red-500">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full rounded-lg border-2 border-dashed border-gray-300 py-3 text-xs font-medium text-gray-500 hover:border-[#14b8a6] hover:text-[#0f766e] transition-colors"
            >
              Click to attach files
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-100 bg-gray-50/50 px-6 py-4 rounded-b-xl">
          <Link
            to="/client"
            className="rounded-lg px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitMutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0f766e] px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-[#134e4a] transition-colors disabled:opacity-50"
          >
            {submitMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Submit Request
          </button>
        </div>

        {submitMutation.isError && (
          <div className="mx-6 mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {submitMutation.error?.message ?? 'Something went wrong. Please try again.'}
          </div>
        )}
      </form>
    </div>
  );
}
