import React, { useState, useEffect } from 'react';
import { Clock, TrendingUp, Target, Zap } from 'lucide-react';
import clsx from 'clsx';

import { useAuthStore } from '../../store/authStore';
const getToken = () => useAuthStore.getState().token;
const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });

export default function AnalyticsDelivery() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/dashboard/delivery', { headers: authHeaders() })
      .then(r => r.json())
      .then(setMetrics)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" /></div>;

  const stats = [
    { label: 'Avg Completion Time', value: `${metrics?.avgCompletionHours || 0}h`, icon: Clock, color: 'text-blue-600 bg-blue-100' },
    { label: 'On-time Delivery', value: `${metrics?.onTimeRate || 0}%`, icon: Target, color: 'text-green-600 bg-green-100' },
    { label: 'Throughput / Week', value: metrics?.weeklyThroughput || 0, icon: Zap, color: 'text-purple-600 bg-purple-100' },
    { label: 'Total Delivered', value: metrics?.totalDelivered || 0, icon: TrendingUp, color: 'text-emerald-600 bg-emerald-100' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Delivery Analytics</h1>
        <p className="text-sm text-gray-500">Track delivery performance and throughput</p>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl bg-white p-5 shadow-sm">
            <div className={clsx('mb-3 inline-flex rounded-lg p-2', s.color)}>
              <s.icon size={20} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-sm text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Completion Time by Priority</h2>
          <div className="space-y-4">
            {(metrics?.byPriority || []).map((item) => {
              const colors = { URGENT: 'bg-red-500', HIGH: 'bg-orange-500', NORMAL: 'bg-blue-500', LOW: 'bg-gray-400' };
              const maxHours = Math.max(...(metrics?.byPriority || []).map(i => i.avgHours || 0), 1);
              return (
                <div key={item.priority}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium text-gray-700">{item.priority}</span>
                    <span className="text-gray-500">{item.avgHours}h avg</span>
                  </div>
                  <div className="h-3 rounded-full bg-gray-100">
                    <div className={clsx('h-3 rounded-full', colors[item.priority])}
                      style={{ width: `${(item.avgHours / maxHours) * 100}%` }} />
                  </div>
                </div>
              );
            })}
            {(!metrics?.byPriority || metrics.byPriority.length === 0) && (
              <p className="text-sm text-gray-400">No delivery data available yet</p>
            )}
          </div>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">SLA Compliance</h2>
          <div className="flex items-center justify-center py-8">
            <div className="relative h-40 w-40">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="16" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                <circle cx="18" cy="18" r="16" fill="none" stroke="#0f766e" strokeWidth="3"
                  strokeDasharray={`${(metrics?.onTimeRate || 0)} 100`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-gray-900">{metrics?.onTimeRate || 0}%</span>
                <span className="text-xs text-gray-500">On Time</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
