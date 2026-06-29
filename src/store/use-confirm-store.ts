import { create } from "zustand";

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "warning" | "default";
}

interface ConfirmState {
  open: boolean;
  options: ConfirmOptions | null;
  resolve: ((value: boolean) => void) | null;
  /** Returns a promise that resolves true (confirmed) or false (cancelled). */
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  respond: (value: boolean) => void;
}

/**
 * Promise-based confirmation. Usage:
 *   const ok = await confirm({ title: "Deactivate Sarah Chen?", tone: "danger" });
 *   if (!ok) return;
 * Embodies the "fail-safe, not fail-confusing" design principle for any
 * irreversible action (deactivate, cancel orders, mark OOO).
 */
export const useConfirmStore = create<ConfirmState>((set, get) => ({
  open: false,
  options: null,
  resolve: null,
  confirm: (options) =>
    new Promise<boolean>((resolve) => {
      set({ open: true, options, resolve });
    }),
  respond: (value) => {
    get().resolve?.(value);
    set({ open: false, resolve: null });
  },
}));

/** Standalone helper so non-hook code can trigger a confirm. */
export function confirm(options: ConfirmOptions) {
  return useConfirmStore.getState().confirm(options);
}
