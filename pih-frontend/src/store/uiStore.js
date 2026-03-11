import { create } from 'zustand';

let toastId = 0;

export const useUiStore = create((set) => ({
  sidebarOpen: true,
  activeModal: null,
  modalData: null,
  toasts: [],

  toggleSidebar: () =>
    set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  openModal: (name, data = null) =>
    set({ activeModal: name, modalData: data }),

  closeModal: () =>
    set({ activeModal: null, modalData: null }),

  addToast: (toast) => {
    const id = ++toastId;
    const newToast = { id, ...toast };
    set((state) => ({ toasts: [...state.toasts, newToast] }));

    if (toast.duration !== 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, toast.duration || 5000);
    }

    return id;
  },

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));
