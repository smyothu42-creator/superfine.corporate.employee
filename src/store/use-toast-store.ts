import { create } from "zustand";

export type ToastTone = "success" | "info" | "warning" | "danger";

export interface Toast {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
  /** ms before auto-dismiss; 0 keeps it until dismissed. */
  duration: number;
}

interface ToastState {
  toasts: Toast[];
  push: (toast: Omit<Toast, "id" | "duration"> & { duration?: number }) => number;
  dismiss: (id: number) => void;
}

let counter = 0;

/**
 * Lightweight toast queue. The Toaster component renders these in an aria-live
 * region so every action gives clear, non-blocking confirmation — directly
 * addressing the "I thought I ordered / did it save?" anxiety from the interviews.
 */
export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: ({ tone, title, description, duration = 4000 }) => {
    counter += 1;
    const id = counter;
    set((s) => ({ toasts: [...s.toasts, { id, tone, title, description, duration }] }));
    return id;
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Convenience helper for components: `toast.success("Saved")`. */
export const toast = {
  success: (title: string, description?: string) =>
    useToastStore.getState().push({ tone: "success", title, description }),
  info: (title: string, description?: string) =>
    useToastStore.getState().push({ tone: "info", title, description }),
  warning: (title: string, description?: string) =>
    useToastStore.getState().push({ tone: "warning", title, description }),
  danger: (title: string, description?: string) =>
    useToastStore.getState().push({ tone: "danger", title, description }),
};
