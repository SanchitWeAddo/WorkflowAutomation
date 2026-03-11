import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, ArrowRight } from 'lucide-react';
import clsx from 'clsx';
import { formatDistanceToNow } from 'date-fns';

const getToken = () => {
  try { return JSON.parse(localStorage.getItem('pih-auth'))?.state?.token; } catch { return null; }
};
const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });

export default function AnalyticsDelays() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/dashboard/delays', { headers: authHeaders() })
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" /></div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Delay Intelligence</h1>
        <p className="text-sm text-gray-500">SLA breaches and bottleneck analysis</p>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl bg-red-50 p-5 shadow-sm">
          <AlertTriangle className="mb-2 text-red-500" size={20} />
          <p className="text-2xl font-bold text-red-700">{data?.breachedCount || 0}</p>
          <p className="text-sm text-red-600">SLA Breached</p>
        </div>
        <div className="rounded-xl bg-amber-50 p-5 shadow-sm">
          <Clock className="mb-2 text-amber-500" size={20} />
          <p className="text-2xl font-bold text-amber-700">{data?.atRiskCount || 0}</p>
          <p className="text-sm text-amber-600">At Risk</p>
        </div>
        <div className="rounded-xl bg-blue-50 p-5 shadow-sm">
          <ArrowRight className="mb-2 text-blue-500" size={20} />
          <p className="text-2xl font-bold text-blue-700">{data?.avgDelayHours || 0}h</p>
          <p className="text-sm text-blue-600">Avg Delay</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-2xl font-bold text-gray-900">{data?.bottleneckStatus || 'N/A'}</p>
          <p className="text-sm text-gray-500">Top Bottleneck</p>
        </div>
      </div>

      {/* Bottleneck Analysis */}
      <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Status Bottleneck Analysis</h2>
        <div className="space-y-3">
          {(data?.bottlenecks || []).map((b) => (
            <div key={b.status} className="flex items-center gap-3">
              <span className="w-32 text-sm font-medium text-gray-600">{b.status.replace(/_/g, ' ')}</span>
              <div className="flex-1 rounded-full bg-gray-100">
                <div className={clsx('h-5 rounded-full', b.avgDwellHours > 48 ? 'bg-red-500' : b.avgDwellHours > 24 ? 'bg-amber-500' : 'bg-green-500')}
                  style={{ width: `${Math.min((b.avgDwellHours / (data?.maxDwell || 100)) * 100, 100)}%` }} />
              </div>
              <span className="w-16 text-right text-sm text-gray-600">{b.avgDwellHours}h avg</span>
              <span className="w-12 text-right text-xs text-gray-400">{b.count} tasks</span>
            </div>
          ))}
          {(!data?.bottlenecks || data.bottlenecks.length === 0) && (
            <p className="text-sm text-gray-400">No bottleneck data available</p>
          )}
        </div>
      </div>

      {/* Breached Tasks */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">SLA Breached Tasks</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-3 font-medium">Ticket</th>
                <th className="pb-3 font-medium">Title</th>
                <th className="pb-3 font-medium">Priority</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Breach Time</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(data?.breachedTasks || []).map((task) => {
                const priorityColors = { URGENT: 'bg-red-100 text-red-700', HIGH: 'bg-orange-100 text-orange-700', NORMAL: 'bg-blue-100 text-blue-700', LOW: 'bg-gray-100 text-gray-700' };
                return (
                  <tr key={task.id} className="hover:bg-gray-50">
                    <td className="py-3 font-mono text-xs text-brand">{task.ticketNumber}</td>
                    <td className="py-3 font-medium text-gray-900">{task.title}</td>
                    <td className="py-3">
                      <span className={clsx('rounded-full px-2 py-0.5 text-xs font-medium', priorityColors[task.priority])}>
                        {task.priority}
                      </span>
                    </td>
                    <td className="py-3 text-gray-600">{task.status?.replace(/_/g, ' ')}</td>
                    <td className="py-3 text-red-600">{task.slaDeadline ? formatDistanceToNow(new Date(task.slaDeadline), { addSuffix: true }) : '-'}</td>
                  </tr>
                );
              })}
              {(!data?.breachedTasks || data.breachedTasks.length === 0) && (
                <tr><td colSpan={5} className="py-8 text-center text-gray-400">No breached tasks</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
