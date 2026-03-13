import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';
import { notifications as notificationsApi } from '../lib/api';
import {
  LayoutDashboard, ListTodo, Users, BarChart3, Clock, AlertTriangle,
  PieChart, Menu, X, LogOut, Bell, ChevronDown, User,
} from 'lucide-react';
import clsx from 'clsx';

const NAV_ITEMS = {
  TEAM_LEAD: [
    { to: '/lead/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/lead/tasks', icon: ListTodo, label: 'Tasks' },
    { to: '/lead/team', icon: Users, label: 'Team' },
    { to: '/analytics/overview', icon: BarChart3, label: 'Analytics' },
    { to: '/analytics/delivery', icon: Clock, label: 'Delivery' },
    { to: '/analytics/delays', icon: AlertTriangle, label: 'Delays' },
    { to: '/analytics/resources', icon: PieChart, label: 'Resources' },
  ],
  DEVELOPER: [
    { to: '/dev/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/dev/tasks', icon: ListTodo, label: 'My Tasks' },
  ],
  ADMIN: [
    { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/analytics/overview', icon: BarChart3, label: 'Analytics' },
  ],
  SUPER_ADMIN: [
    { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/analytics/overview', icon: BarChart3, label: 'Analytics' },
  ],
};

export default function DashboardLayout() {
  const { user, logout } = useAuthStore();
  const { sidebarOpen, toggleSidebar } = useUiStore();
  const navigate = useNavigate();

  const navItems = NAV_ITEMS[user?.role] || NAV_ITEMS.DEVELOPER;
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    notificationsApi.unreadCount()
      .then((data) => setUnreadCount(data.count || 0))
      .catch(() => {});
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-brand-dark text-white transition-transform duration-200 lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-16 items-center justify-between px-4">
          <h1 className="text-lg font-bold tracking-tight">PIH</h1>
          <button onClick={toggleSidebar} className="lg:hidden">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-white/15 text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                )
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-light text-xs font-bold">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium">{user?.name}</p>
              <p className="truncate text-xs text-white/60">{user?.role}</p>
            </div>
            <button onClick={handleLogout} className="text-white/60 hover:text-white">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b bg-white px-4 lg:px-6">
          <button onClick={toggleSidebar} className="lg:hidden">
            <Menu size={20} />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-4">
            <button className="relative text-gray-500 hover:text-gray-700">
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <User size={16} />
              <span className="hidden sm:inline">{user?.name}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
