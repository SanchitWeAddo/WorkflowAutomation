import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - attach Bearer token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor - handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

// --- Auth ---
export const auth = {
  login: (credentials) => api.post('/auth/login', credentials).then((r) => r.data),
  register: (data) => api.post('/auth/register', data).then((r) => r.data),
  getProfile: () => api.get('/auth/profile').then((r) => r.data),
};

// --- Tasks ---
export const tasks = {
  list: (params) => api.get('/tasks', { params }).then((r) => r.data),
  get: (id) => api.get(`/tasks/${id}`).then((r) => r.data),
  create: (data) => api.post('/tasks', data).then((r) => r.data),
  updateStatus: (id, status) => api.patch(`/tasks/${id}/status`, { status }).then((r) => r.data),
  assign: (id, userId) => api.patch(`/tasks/${id}/assign`, { userId }).then((r) => r.data),
  handoff: (id, data) => api.post(`/tasks/${id}/handoff`, data).then((r) => r.data),
  accept: (id) => api.post(`/tasks/${id}/accept`).then((r) => r.data),
  comment: (id, data) => api.post(`/tasks/${id}/comments`, data).then((r) => r.data),
  parseFromText: (text) => api.post('/tasks/parse', { text }).then((r) => r.data),
  getAttachments: (id) => api.get(`/tasks/${id}/attachments`).then((r) => r.data),
};

// --- Projects ---
export const projects = {
  list: (params) => api.get('/projects', { params }).then((r) => r.data),
  get: (id) => api.get(`/projects/${id}`).then((r) => r.data),
  create: (data) => api.post('/projects', data).then((r) => r.data),
  update: (id, data) => api.patch(`/projects/${id}`, data).then((r) => r.data),
  getStats: (id) => api.get(`/projects/${id}/stats`).then((r) => r.data),
};

// --- Users ---
export const users = {
  list: (params) => api.get('/users', { params }).then((r) => r.data),
  get: (id) => api.get(`/users/${id}`).then((r) => r.data),
  update: (id, data) => api.patch(`/users/${id}`, data).then((r) => r.data),
  getStats: (id) => api.get(`/users/${id}/stats`).then((r) => r.data),
};

// --- Dashboard ---
export const dashboard = {
  overview: () => api.get('/dashboard/overview').then((r) => r.data),
  teamWorkload: () => api.get('/dashboard/workload').then((r) => r.data),
  deliveryMetrics: (params) => api.get('/dashboard/delivery', { params }).then((r) => r.data),
  delayAnalysis: (params) => api.get('/dashboard/delays', { params }).then((r) => r.data),
  resourceUtilization: () => api.get('/dashboard/resources').then((r) => r.data),
};

// --- Notifications ---
export const notifications = {
  list: (params) => api.get('/notifications', { params }).then((r) => r.data),
  unreadCount: () => api.get('/notifications/unread-count').then((r) => r.data),
  markRead: (id) => api.patch(`/notifications/${id}/read`).then((r) => r.data),
  markAllRead: () => api.patch('/notifications/read-all').then((r) => r.data),
};

export default api;
