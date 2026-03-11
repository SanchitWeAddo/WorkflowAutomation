import React, { useState, useEffect } from 'react';
import { Building2, Plus, Users, FolderKanban } from 'lucide-react';

const getToken = () => {
  try { return JSON.parse(localStorage.getItem('pih-auth'))?.state?.token; } catch { return null; }
};
const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });

export default function AdminOrganizations() {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Organizations don't have a dedicated endpoint yet, show the current org
    fetch('/api/v1/auth/me', { headers: authHeaders() })
      .then(r => r.json())
      .then(data => {
        if (data.org) setOrgs([data.org]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" /></div>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Organizations</h1>
          <p className="text-sm text-gray-500">Manage organizations and settings</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {orgs.map((org) => (
          <div key={org.id} className="rounded-xl bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-brand">
                <Building2 size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{org.name}</h3>
                <p className="text-sm text-gray-500">@{org.slug}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-gray-50 p-3 text-center">
                <p className="text-lg font-bold text-gray-900">{org._count?.users || '-'}</p>
                <p className="text-xs text-gray-500">Users</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3 text-center">
                <p className="text-lg font-bold text-gray-900">{org._count?.projects || '-'}</p>
                <p className="text-xs text-gray-500">Projects</p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
              <span>Plan: {org.planTier || 'Foundation'}</span>
              <span>Sector: {org.sector || 'N/A'}</span>
            </div>
          </div>
        ))}
        {orgs.length === 0 && (
          <div className="col-span-full rounded-xl bg-white p-12 text-center shadow-sm">
            <Building2 className="mx-auto mb-3 text-gray-300" size={40} />
            <p className="text-gray-400">No organizations found</p>
          </div>
        )}
      </div>
    </div>
  );
}
