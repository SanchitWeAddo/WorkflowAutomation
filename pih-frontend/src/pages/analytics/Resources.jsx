import React, { useState, useEffect } from 'react';
import { Users, Activity, Briefcase, Search } from 'lucide-react';
import clsx from 'clsx';

import { useAuthStore } from '../../store/authStore';
const getToken = () => useAuthStore.getState().token;
const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });

export default function AnalyticsResources() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/dashboard/resources', { headers: authHeaders() })
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [skillFilter, setSkillFilter] = useState('');

  if (loading) return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" /></div>;

  const members = data?.members || [];
  const allSkills = [...new Set(members.flatMap(m => m.skills || []))].sort();

  const filteredMembers = members.filter(m => {
    const matchesSearch = !searchQuery || m.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSkill = !skillFilter || (m.skills || []).includes(skillFilter);
    return matchesSearch && matchesSkill;
  });

  const avgUtilization = members.length > 0
    ? Math.round(members.reduce((sum, m) => sum + (m.utilization || 0), 0) / members.length)
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
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Team Utilization</h2>
          <div className="flex gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search members..."
                className="rounded-lg border border-gray-300 py-1.5 pl-9 pr-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <select
              value={skillFilter}
              onChange={e => setSkillFilter(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-brand focus:outline-none"
            >
              <option value="">All Skills</option>
              {allSkills.map(skill => (
                <option key={skill} value={skill}>{skill}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="space-y-4">
          {filteredMembers.map((member) => {
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
          {filteredMembers.length === 0 && (
            <p className="py-8 text-center text-gray-400">No team members match your filters</p>
          )}
        </div>
      </div>
    </div>
  );
}
