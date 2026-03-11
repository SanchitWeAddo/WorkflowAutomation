import { useMemo } from 'react';
import useAuthStore from '../store/authStore';

const ROLE_PERMISSIONS = {
  TEAM_LEAD: {
    navItems: [
      'dashboard',
      'tasks',
      'allocation',
      'team-load',
      'analytics',
    ],
    canAssignTasks: true,
    canViewTeam: true,
    canManageAllocation: true,
  },
  DEVELOPER: {
    navItems: ['dashboard', 'my-tasks', 'time-log'],
    canAssignTasks: false,
    canViewTeam: false,
    canManageAllocation: false,
  },
  CLIENT: {
    navItems: ['dashboard', 'my-requests', 'new-request'],
    canAssignTasks: false,
    canViewTeam: false,
    canManageAllocation: false,
  },
  ADMIN: {
    navItems: [
      'dashboard',
      'organizations',
      'users',
      'projects',
      'integrations',
      'email-templates',
      'system-logs',
    ],
    canAssignTasks: true,
    canViewTeam: true,
    canManageAllocation: true,
  },
};

const COMMON_NAV = ['delivery-analytics', 'delay-intelligence', 'resource-analytics'];

export default function usePermissions() {
  const user = useAuthStore((s) => s.user);

  return useMemo(() => {
    const role = user?.role || 'DEVELOPER';
    const perms = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.DEVELOPER;

    return {
      role,
      navItems: [...perms.navItems, ...COMMON_NAV],
      canAssignTasks: perms.canAssignTasks,
      canViewTeam: perms.canViewTeam,
      canManageAllocation: perms.canManageAllocation,
      hasPermission: (perm) => !!perms[perm],
    };
  }, [user]);
}
