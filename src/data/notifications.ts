import type { AppNotification } from "./types";

/**
 * The employee's notification feed. Mirrors the notification matrix from the
 * interviews: confirmations, the daily "no order yet" reminder, the day-before
 * arrival alert, change confirmations, and weekly specials.
 */
export const notifications: AppNotification[] = [
  {
    id: "n-0",
    type: "reminder",
    title: "Your auto-order for Tuesday is ready",
    body: "Chicken Shawarma Wrap · Tue, Jun 30. Tap to review or change before the 4:00 PM cutoff, or we'll confirm it for you.",
    time: "Today, 4:00 PM",
    read: false,
  },
  {
    id: "n-1",
    type: "arrival",
    title: "Your lunch arrives tomorrow",
    body: "Paneer Tikka Bowl · Mon, Jun 29 · 12:00–12:30 PM at HQ Floor 3.",
    time: "Today, 8:00 AM",
    read: false,
  },
  {
    id: "n-2",
    type: "confirmation",
    title: "Order confirmed — ORD-2891",
    body: "Superfine Kitchen confirmed your order for Mon, Jun 29. Fully covered by Neptune Corp.",
    time: "Sat, 4:12 PM",
    read: false,
  },
  {
    id: "n-3",
    type: "reminder",
    title: "Heads up: no order for Wednesday yet",
    body: "The cutoff for Wed, Jul 1 is Tue 9:00 PM. Auto-Order is off, so we'll keep reminding you.",
    time: "Fri, 9:00 AM",
    read: true,
  },
  {
    id: "n-4",
    type: "change",
    title: "Order updated — ORD-2890",
    body: "Added Sumac fries to your Tue, Jun 30 order. You can keep editing until cutoff.",
    time: "Fri, 9:41 AM",
    read: true,
  },
  {
    id: "n-5",
    type: "special",
    title: "This week's specials",
    body: "Seasonal Quinoa Harvest Salad is back, plus a new Veggie Bibimbap. Tap to browse.",
    time: "Mon, 7:30 AM",
    read: true,
  },
  {
    id: "n-6",
    type: "confirmation",
    title: "Delivered — ORD-2885",
    body: "Your BBQ Brisket Bowl was delivered Wed, Jun 24. Enjoy! Tap to leave feedback.",
    time: "Wed, 12:05 PM",
    read: true,
  },
];

export const unreadCount = notifications.filter((n) => !n.read).length;
