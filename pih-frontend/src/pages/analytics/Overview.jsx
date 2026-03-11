import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Clock, AlertTriangle, CheckCircle, Users } from 'lucide-react';
import clsx from 'clsx';

const getToken = () => {
  try { return JSON.parse(localStorage.getItem('pih-auth'))?.state?.token; } catch { return null; }
};
const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });

export default function AnalyticsOverview() {
  const [overview, setOverview] = useState(null);
  const [delivery, setDelivery] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/v1/dashboard/overview', { headers: authHeaders() }).then(r => r.json()),
      fetch('/api/v1/dashboard/delivery', { headers: authHeaders() }).then(r => r.json()),
    ]).then(([o, d]) => {
      setOverview(o);
      setDelivery(d);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" /></div>;

  const stats = [
    { label: 'Total Tasks', value: overview?.totalTasks || 0, icon: BarChart3, color: 'bg-blue-100 text-blue-600' },
    { label: 'In Progress', value: overview?.byStatus?.IN_PROGRESS || 0, icon: Clock, color: 'bg-yellow-100 text-yellow-600' },
    { label: 'Completed', value: overview?.byStatus?.COMPLETED || 0, icon: CheckCircle, color: 'bg-green-100 text-green-600' },
    { label: 'SLA Breached', value: overview?.slaBreached || 0, icon: AlertTriangle, color: 'bg-red-100 text-red-600' },
    { label: 'On-time Rate', value: `${delivery?.onTimeRate || 0}%`, icon: TrendingUp, color: 'bg-emerald-100 text-emerald-600' },
    { label: 'Avg Completion', value: `${delivery?.avgCompletionHours || 0}h`, icon: Clock, color: 'bg-purple-100 text-purple-600' },
  ];

  const statusData = overview?.byStatus || {};
  const maxCount = Math.max(...Object.values(statusData).map(Number), 1);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Analytics Overview</h1>
        <p className="text-sm text-gray-500">Key metrics and performance indicators</p>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl bg-white p-4 shadow-sm">
            <div className={clsx('mb-3 inline-flex rounded-lg p-2', s.color)}>
              <s.icon size={18} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Tasks by Status</h2>
          <div className="space-y-3">
            {Object.entries(statusData).map(([status, count]) => (
              <div key={status} className="flex items-center gap-3">
                <span className="w-28 text-xs font-medium text-gray-600">{status.replace(/_/g, ' ')}</span>
                <div className="flex-1 rounded-full bg-gray-100">
                  <div
                    className="h-6 rounded-full bg-brand transition-all"
                    style={{ width: `${(count / maxCount) * 100}%` }}
                  />
                </div>
                <span className="w-8 text-right text-sm font-semibold text-gray-700">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Priority Distribution</h2>
          <div className="space-y-3">
            {Object.entries(overview?.byPriority || {}).map(([priority, count]) => {
              const colors = { URGENT: 'bg-red-500', HIGH: 'bg-orange-500', NORMAL: 'bg-blue-500', LOW: 'bg-gray-400' };
              return (
                <div key={priority} className="flex items-center gap-3">
                  <span className="w-20 text-xs font-medium text-gray-600">{priority}</span>
                  <div className="flex-1 rounded-full bg-gray-100">
                    <div
                      className={clsx('h-6 rounded-full transition-all', colors[priority] || 'bg-brand')}
                      style={{ width: `${(count / (overview?.totalTasks || 1)) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-sm font-semibold text-gray-700">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
