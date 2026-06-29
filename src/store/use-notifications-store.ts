import { create } from "zustand";
import { notifications as seed } from "@/data/notifications";
import type { AppNotification } from "@/data/types";

/**
 * Notification feed state, shared between the Notifications page (the list) and
 * the Topbar (unread count + "Mark all read"), so the header can drive the feed.
 */
interface NotificationsState {
  items: AppNotification[];
  markRead: (id: string) => void;
  markAll: () => void;
}

export const useNotificationsStore = create<NotificationsState>((set) => ({
  items: seed,
  markRead: (id) =>
    set((s) => ({ items: s.items.map((n) => (n.id === id ? { ...n, read: true } : n)) })),
  markAll: () => set((s) => ({ items: s.items.map((n) => ({ ...n, read: true })) })),
}));
