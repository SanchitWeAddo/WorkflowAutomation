import { useQuery } from '@tanstack/react-query';
import { Users, Loader2, Briefcase, Zap } from 'lucide-react';
import clsx from 'clsx';

const getToken = () => {
  try { return JSON.parse(localStorage.getItem('pih-auth'))?.state?.token; } catch { return null; }
};
const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });

function getInitials(name) {
  if (!name) return '??';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

const AVATAR_COLORS = [
  'bg-teal-100 text-teal-700',
  'bg-blue-100 text-blue-700',
  'bg-purple-100 text-purple-700',
  'bg-amber-100 text-amber-700',
  'bg-pink-100 text-pink-700',
  'bg-indigo-100 text-indigo-700',
  'bg-emerald-100 text-emerald-700',
  'bg-rose-100 text-rose-700',
];

export default function Team() {
  const { data: usersData, isLoading: loadingUsers } = useQuery({
    queryKey: ['team-users'],
    queryFn: async () => {
      const res = await fetch('/api/v1/users', { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json();
    },
  });

  const { data: workloadData, isLoading: loadingWorkload } = useQuery({
    queryKey: ['team-workload'],
    queryFn: async () => {
      const res = await fetch('/api/v1/dashboard/workload', { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to fetch workload');
      return res.json();
    },
  });

  const users = usersData?.data ?? usersData?.users ?? [];
  const workloadMap = {};
  (workloadData?.data ?? workloadData?.members ?? []).forEach(m => {
    workloadMap[m.id ?? m.userId] = m;
  });

  const isLoading = loadingUsers || loadingWorkload;

  const members = users.map((u, i) => {
    const wl = workloadMap[u.id] ?? {};
    return {
      ...u,
      activeTasks: wl.activeTasks ?? wl.taskCount ?? 0,
      capacity: wl.capacity ?? u.maxCapacity ?? 10,
      colorIndex: i % AVATAR_COLORS.length,
    };
  });

  const totalCapacity = members.reduce((sum, m) => sum + m.capacity, 0);
  const totalActive = members.reduce((sum, m) => sum + m.activeTasks, 0);
  const overallPct = totalCapacity > 0 ? Math.round((totalActive / totalCapacity) * 100) : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-[#0f766e]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Team Overview</h1>
        <p className="text-gray-500 mt-1">Monitor team capacity and workload distribution.</p>
      </div>

      {/* Summary */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-teal-50 p-3">
              <Users className="h-6 w-6 text-[#0f766e]" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Team Capacity</p>
              <p className="text-2xl font-bold text-gray-900">{totalActive} / {totalCapacity} <span className="text-sm font-normal text-gray-500">tasks</span></p>
            </div>
          </div>
          <div className="w-full sm:w-64">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>Overall utilization</span>
              <span className="font-semibold">{overallPct}%</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className={clsx('h-full rounded-full transition-all',
                  overallPct >= 90 ? 'bg-red-500' : overallPct >= 70 ? 'bg-amber-500' : 'bg-[#14b8a6]'
                )}
                style={{ width: `${overallPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Members Grid */}
      {members.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-16 text-center shadow-sm">
          <Users className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">No team members found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((member) => {
            const pct = member.capacity > 0 ? Math.min(100, Math.round((member.activeTasks / member.capacity) * 100)) : 0;
            const skills = member.skills ?? [];
            return (
              <div key={member.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <div className={clsx('flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold', AVATAR_COLORS[member.colorIndex])}>
                    {getInitials(member.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 truncate">{member.name}</p>
                    <p className="text-xs text-gray-500">{member.role?.replace(/_/g, ' ') ?? 'Member'}</p>
                  </div>
                </div>

                {/* Task count & capacity */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                    <span className="flex items-center gap-1">
                      <Briefcase className="h-3.5 w-3.5" /> Active tasks
                    </span>
                    <span className="font-semibold text-gray-700">{member.activeTasks} / {member.capacity}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={clsx('h-full rounded-full transition-all',
                        pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-[#14b8a6]'
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Skills */}
                {skills.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {skills.map((skill, i) => (
                      <span key={i} className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                        <Zap className="h-3 w-3 text-amber-500" /> {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-xs text-gray-400">No skills listed</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
