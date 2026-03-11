import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';

/* ---------- Lazy-loaded layouts ---------- */
const DashboardLayout = lazy(() => import('./layouts/DashboardLayout'));
const ClientLayout = lazy(() => import('./layouts/ClientLayout'));
const AdminLayout = lazy(() => import('./layouts/AdminLayout'));

/* ---------- Lazy-loaded pages ---------- */
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));

// Client pages
const ClientDashboard = lazy(() => import('./pages/client/Dashboard'));
const ClientNewRequest = lazy(() => import('./pages/client/NewRequest'));
const ClientRequests = lazy(() => import('./pages/client/Requests'));
const ClientRequestDetail = lazy(() => import('./pages/client/RequestDetail'));

// Lead pages
const LeadDashboard = lazy(() => import('./pages/lead/Dashboard'));
const LeadTasks = lazy(() => import('./pages/lead/Tasks'));
const LeadTaskDetail = lazy(() => import('./pages/lead/TaskDetail'));
const LeadTeam = lazy(() => import('./pages/lead/Team'));

// Dev pages
const DevDashboard = lazy(() => import('./pages/dev/Dashboard'));
const DevTasks = lazy(() => import('./pages/dev/Tasks'));
const DevTaskDetail = lazy(() => import('./pages/dev/TaskDetail'));

// Analytics pages
const AnalyticsOverview = lazy(() => import('./pages/analytics/Overview'));
const AnalyticsDelivery = lazy(() => import('./pages/analytics/Delivery'));
const AnalyticsDelays = lazy(() => import('./pages/analytics/Delays'));
const AnalyticsResources = lazy(() => import('./pages/analytics/Resources'));

// Admin pages
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminUsers = lazy(() => import('./pages/admin/Users'));
const AdminOrgs = lazy(() => import('./pages/admin/Organizations'));
const AdminProjects = lazy(() => import('./pages/admin/Projects'));
const AdminIntegrations = lazy(() => import('./pages/admin/Integrations'));
const AdminAuditLog = lazy(() => import('./pages/admin/AuditLog'));

/* ---------- Loading fallback ---------- */
function LoadingFallback() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
    </div>
  );
}

/* ---------- Protected route ---------- */
function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

/* ---------- Role-based redirect ---------- */
function RoleRedirect() {
  const { user } = useAuthStore();

  const redirectMap = {
    CLIENT: '/client/dashboard',
    TEAM_LEAD: '/lead/dashboard',
    DEVELOPER: '/dev/dashboard',
    ADMIN: '/admin/dashboard',
    SUPER_ADMIN: '/admin/dashboard',
  };

  const target = redirectMap[user?.role] || '/login';
  return <Navigate to={target} replace />;
}

/* ---------- App ---------- */
export default function App() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Role-based redirect */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <RoleRedirect />
            </ProtectedRoute>
          }
        />

        {/* Client routes */}
        <Route
          path="/client/*"
          element={
            <ProtectedRoute allowedRoles={['CLIENT']}>
              <ClientLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<ClientDashboard />} />
          <Route path="new-request" element={<ClientNewRequest />} />
          <Route path="requests" element={<ClientRequests />} />
          <Route path="requests/:id" element={<ClientRequestDetail />} />
        </Route>

        {/* Lead routes */}
        <Route
          path="/lead/*"
          element={
            <ProtectedRoute allowedRoles={['TEAM_LEAD']}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<LeadDashboard />} />
          <Route path="tasks" element={<LeadTasks />} />
          <Route path="tasks/:id" element={<LeadTaskDetail />} />
          <Route path="team" element={<LeadTeam />} />
        </Route>

        {/* Dev routes */}
        <Route
          path="/dev/*"
          element={
            <ProtectedRoute allowedRoles={['DEVELOPER']}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<DevDashboard />} />
          <Route path="tasks" element={<DevTasks />} />
          <Route path="tasks/:id" element={<DevTaskDetail />} />
        </Route>

        {/* Analytics routes */}
        <Route
          path="/analytics/*"
          element={
            <ProtectedRoute allowedRoles={['TEAM_LEAD', 'ADMIN', 'SUPER_ADMIN']}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="overview" element={<AnalyticsOverview />} />
          <Route path="delivery" element={<AnalyticsDelivery />} />
          <Route path="delays" element={<AnalyticsDelays />} />
          <Route path="resources" element={<AnalyticsResources />} />
        </Route>

        {/* Admin routes */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="organizations" element={<AdminOrgs />} />
          <Route path="projects" element={<AdminProjects />} />
          <Route path="integrations" element={<AdminIntegrations />} />
          <Route path="audit-log" element={<AdminAuditLog />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
