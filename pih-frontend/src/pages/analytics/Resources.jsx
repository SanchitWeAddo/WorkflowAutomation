import React, { useState, useEffect } from 'react';
import { Users, Activity, Briefcase, Search, Filter, X } from 'lucide-react';
import clsx from 'clsx';

import { useAuthStore } from '../../store/authStore';
const getToken = () => useAuthStore.getState().token;
const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });

export default function AnalyticsResources() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [skillFilter, setSkillFilter] = useState('');

  useEffect(() => {
    fetch('/api/v1/dashboard/resources', { headers: authHeaders() })
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" /></div>;

  const allMembers = data?.members || [];

  // Collect all unique skills for the filter dropdown
  const allSkills = [...new Set(allMembers.flatMap(m => m.skills || []))].sort();

  // Apply search and skill filters
  const members = allMembers.filter(m => {
    const matchesSearch = !searchQuery || m.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSkill = !skillFilter || (m.skills || []).includes(skillFilter);
    return matchesSearch && matchesSkill;
  });

  const avgUtilization = allMembers.length > 0
    ? Math.round(allMembers.reduce((sum, m) => sum + (m.utilization || 0), 0) / allMembers.length)
    : 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Resource Analytics</h1>
        <p className="text-sm text-gray-500">Team capacity and utilization insights</p>
      </div>

      <div className="mb-8 grid grid-cols-3 gap-4">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <Users className="mb-2 text-brand" size={20} />
          <p className="text-2xl font-bold">{members.length}</p>
          <p className="text-sm text-gray-500">Team Members</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <Activity className="mb-2 text-brand" size={20} />
          <p className="text-2xl font-bold">{avgUtilization}%</p>
          <p className="text-sm text-gray-500">Avg Utilization</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <Briefcase className="mb-2 text-brand" size={20} />
          <p className="text-2xl font-bold">{members.filter(m => (m.utilization || 0) > 90).length}</p>
          <p className="text-sm text-gray-500">Overloaded</p>
        </div>
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold">Team Utilization</h2>
          <div className="flex flex-wrap gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name..."
                className="rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 w-48"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-gray-400" />
              <select
                value={skillFilter}
                onChange={(e) => setSkillFilter(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand focus:outline-none"
              >
                <option value="">All Skills</option>
                {allSkills.map((skill) => (
                  <option key={skill} value={skill}>{skill}</option>
                ))}
              </select>
            </div>
            {(searchQuery || skillFilter) && (
              <button
                onClick={() => { setSearchQuery(''); setSkillFilter(''); }}
                className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
              >
                <X size={14} /> Clear
              </button>
            )}
          </div>
        </div>
        {(searchQuery || skillFilter) && (
          <p className="mb-3 text-xs text-gray-500">
            Showing {members.length} of {allMembers.length} members
            {skillFilter && <span> with skill <span className="font-medium text-brand">{skillFilter}</span></span>}
          </p>
        )}
        <div className="space-y-4">
          {members.map((member) => {
            const util = member.utilization || 0;
            const barColor = util > 90 ? 'bg-red-500' : util > 70 ? 'bg-amber-500' : 'bg-brand';
            return (
              <div key={member.id} className="flex items-center gap-4">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-brand-light/20 text-sm font-bold text-brand">
                  {member.name?.charAt(0) || '?'}
                </div>
                <div className="w-32 min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">{member.name}</p>
                  <p className="text-xs text-gray-500">{member.activeTasks || 0}/{member.maxCapacity || 5} tasks</p>
                </div>
                <div className="flex-1 rounded-full bg-gray-100">
                  <div className={clsx('h-4 rounded-full transition-all', barColor)} style={{ width: `${Math.min(util, 100)}%` }} />
                </div>
                <span className={clsx('w-12 text-right text-sm font-semibold', util > 90 ? 'text-red-600' : util > 70 ? 'text-amber-600' : 'text-gray-700')}>
                  {util}%
                </span>
                <div className="hidden w-40 gap-1 sm:flex flex-wrap">
                  {(member.skills || []).slice(0, 3).map((skill) => (
                    <span key={skill} className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">{skill}</span>
                  ))}
                </div>
              </div>
            );
          })}
          {members.length === 0 && (
            <p className="py-8 text-center text-gray-400">No team data available</p>
          )}
        </div>
      </div>
    </div>
  );
}
