import type { Order } from "./types";

/**
 * The employee's own orders. Statuses use the simple, customer-facing lifecycle:
 * Placed → Confirmed → Delivered (a locked, past-cutoff order shows as "Locked
 * for changes"). Dates are anchored around late June 2026 (demo "today" is Sun Jun 28).
 */
export const orders: Order[] = [
  {
    // Multi-meal order — three meals on the same day.
    id: "ORD-2891",
    date: "2026-06-29",
    type: "individual",
    days: [
      {
        date: "2026-06-29",
        deliveryWindow: "12:00 PM – 12:30 PM",
        items: [
          { itemId: "paneer-bowl", name: "Paneer Tikka Bowl", qty: 1, addOns: ["Medium"], price: 14.5 },
          { itemId: "teriyaki-salmon-bowl", name: "Teriyaki Salmon Bowl", qty: 1, addOns: [], price: 17.0 },
          { itemId: "bibimbap", name: "Veggie Bibimbap", qty: 1, addOns: ["Crispy tofu"], price: 14.0 },
        ],
      },
    ],
    address: "HQ · Floor 3 Kitchen",
    subtotal: 45.5,
    subsidy: 15.0,
    employeePaid: 30.5,
    payment: "pay_later",
    status: "confirmed",
    locked: false,
    placedAt: "2026-06-27 4:12 PM",
  },
  {
    id: "ORD-2893",
    date: "2026-06-28",
    type: "individual",
    days: [
      {
        date: "2026-06-28",
        deliveryWindow: "12:00 PM – 12:30 PM",
        items: [
          {
            itemId: "margherita-flatbread",
            name: "Margherita Flatbread",
            qty: 1,
            addOns: [],
            price: 15.0,
          },
        ],
      },
    ],
    address: "HQ · Floor 3 Kitchen",
    subtotal: 15.0,
    subsidy: 15.0,
    employeePaid: 0,
    payment: "covered",
    // Past its change cutoff — surfaces to the customer as "Locked for changes".
    status: "confirmed",
    locked: true,
    placedAt: "2026-06-27 8:30 AM",
  },
  {
    id: "ORD-2890",
    date: "2026-06-30",
    type: "individual",
    days: [
      {
        date: "2026-06-30",
        deliveryWindow: "12:00 PM – 12:30 PM",
        items: [
          {
            itemId: "chicken-shawarma",
            name: "Chicken Shawarma Wrap",
            qty: 1,
            addOns: ["Medium", "Sumac fries"],
            price: 18.0,
          },
        ],
      },
    ],
    address: "HQ · Floor 3 Kitchen",
    subtotal: 18.0,
    subsidy: 15.0,
    employeePaid: 3.0,
    payment: "pay_later",
    status: "draft",
    locked: false,
    placedAt: "2026-06-28 9:40 AM",
    // Drafted by Auto-Order 24h before the cutoff — awaiting the employee's review.
    source: "auto",
    reviewBy: "Today, 4:00 PM",
  },
  {
    // Auto-Order draft the employee left untouched — it auto-confirmed at cutoff.
    id: "ORD-2895",
    date: "2026-07-01",
    type: "individual",
    days: [
      {
        date: "2026-07-01",
        deliveryWindow: "12:00 PM – 12:30 PM",
        items: [
          { itemId: "quinoa-salad", name: "Quinoa Harvest Salad", qty: 1, addOns: ["Crispy tofu"], price: 16.5 },
        ],
      },
    ],
    address: "HQ · Floor 3 Kitchen",
    subtotal: 16.5,
    subsidy: 15.0,
    employeePaid: 1.5,
    payment: "pay_later",
    status: "confirmed",
    locked: false,
    placedAt: "2026-06-30 4:00 PM (auto)",
    source: "auto",
  },
  {
    id: "ORD-2885",
    date: "2026-07-02",
    type: "individual",
    days: [
      {
        date: "2026-07-02",
        deliveryWindow: "11:30 AM – 12:00 PM",
        items: [
          { itemId: "bbq-brisket-bowl", name: "BBQ Brisket Bowl", qty: 1, addOns: ["House BBQ"], price: 16.5 },
        ],
      },
    ],
    address: "HQ · Floor 3 Kitchen",
    subtotal: 16.5,
    subsidy: 15.0,
    employeePaid: 1.5,
    payment: "pay_later",
    status: "confirmed",
    locked: false,
    placedAt: "2026-06-28 2:05 PM",
  },
  {
    // Multi-meal order — two meals on the same day.
    id: "ORD-2882",
    date: "2026-07-01",
    type: "individual",
    days: [
      {
        date: "2026-07-01",
        deliveryWindow: "12:30 PM – 1:00 PM",
        items: [
          { itemId: "quinoa-salad", name: "Quinoa Harvest Salad", qty: 1, addOns: ["Crispy tofu"], price: 16.5 },
          { itemId: "cobb-salad", name: "Chicken Cobb Salad", qty: 1, addOns: [], price: 15.0 },
        ],
      },
    ],
    address: "HQ · Floor 3 Kitchen",
    subtotal: 31.5,
    subsidy: 15.0,
    employeePaid: 16.5,
    payment: "pay_later",
    status: "confirmed",
    locked: false,
    placedAt: "2026-06-28 5:48 PM",
  },
  {
    id: "ORD-2876",
    date: "2026-07-03",
    type: "individual",
    days: [
      {
        date: "2026-07-03",
        deliveryWindow: "12:00 PM – 12:30 PM",
        items: [
          { itemId: "jackfruit-tacos", name: "Jackfruit Tacos", qty: 1, addOns: ["Salsa verde"], price: 13.0 },
        ],
      },
    ],
    address: "HQ · Floor 3 Kitchen",
    subtotal: 13.0,
    subsidy: 13.0,
    employeePaid: 0,
    payment: "covered",
    status: "draft",
    locked: false,
    placedAt: "2026-06-28 10:22 AM",
  },
  {
    id: "ORD-2899",
    date: "2026-07-06",
    type: "individual",
    days: [
      {
        date: "2026-07-06",
        deliveryWindow: "12:00 PM – 12:30 PM",
        items: [
          { itemId: "buddha-bowl", name: "Green Buddha Bowl", qty: 1, addOns: ["Chicken"], price: 15.5 },
        ],
      },
    ],
    address: "HQ · Floor 3 Kitchen",
    subtotal: 15.5,
    subsidy: 15.0,
    employeePaid: 0.5,
    payment: "pay_later",
    status: "confirmed",
    locked: false,
    placedAt: "2026-07-04 11:10 AM",
  },
  {
    id: "ORD-2870",
    date: "2026-06-19",
    type: "individual",
    days: [
      {
        date: "2026-06-19",
        deliveryWindow: "12:00 PM – 12:30 PM",
        items: [
          { itemId: "pad-thai", name: "Veggie Pad Thai", qty: 1, addOns: ["Shrimp"], price: 17.0 },
        ],
      },
    ],
    address: "HQ · Floor 3 Kitchen",
    subtotal: 17.0,
    subsidy: 15.0,
    employeePaid: 0,
    payment: "covered",
    status: "cancelled",
    locked: true,
    placedAt: "2026-06-18 3:15 PM",
  },
  {
    // Cancelled multi-meal order.
    id: "ORD-2864",
    date: "2026-06-12",
    type: "individual",
    days: [
      {
        date: "2026-06-12",
        deliveryWindow: "11:30 AM – 12:00 PM",
        items: [
          { itemId: "margherita-flatbread", name: "Margherita Flatbread", qty: 1, addOns: [], price: 15.0 },
          { itemId: "caprese-sandwich", name: "Caprese Sandwich", qty: 1, addOns: [], price: 13.5 },
        ],
      },
    ],
    address: "HQ · Floor 3 Kitchen",
    subtotal: 28.5,
    subsidy: 15.0,
    employeePaid: 0,
    payment: "covered",
    status: "cancelled",
    locked: true,
    placedAt: "2026-06-11 9:02 AM",
  },
  {
    // Delivered — single meal, fully covered.
    id: "ORD-2855",
    date: "2026-06-23",
    type: "individual",
    days: [
      {
        date: "2026-06-23",
        deliveryWindow: "12:00 PM – 12:30 PM",
        items: [
          { itemId: "beef-pho", name: "Beef Pho", qty: 1, addOns: [], price: 14.5 },
        ],
      },
    ],
    address: "HQ · Floor 3 Kitchen",
    subtotal: 14.5,
    subsidy: 14.5,
    employeePaid: 0,
    payment: "covered",
    status: "delivered",
    locked: true,
    placedAt: "2026-06-22 3:40 PM",
    invoiceId: "INV-2855",
  },
  {
    // Delivered — employee paid a small top-up.
    id: "ORD-2852",
    date: "2026-06-22",
    type: "individual",
    days: [
      {
        date: "2026-06-22",
        deliveryWindow: "11:30 AM – 12:00 PM",
        items: [
          { itemId: "teriyaki-salmon-bowl", name: "Teriyaki Salmon Bowl", qty: 1, addOns: [], price: 17.0 },
        ],
      },
    ],
    address: "HQ · Floor 3 Kitchen",
    subtotal: 17.0,
    subsidy: 15.0,
    employeePaid: 2.0,
    payment: "pay_later",
    status: "delivered",
    locked: true,
    placedAt: "2026-06-21 4:05 PM",
    invoiceId: "INV-2852",
  },
  {
    // Delivered multi-meal order.
    id: "ORD-2848",
    date: "2026-06-18",
    type: "individual",
    days: [
      {
        date: "2026-06-18",
        deliveryWindow: "12:00 PM – 12:30 PM",
        items: [
          { itemId: "mezze-box", name: "Mediterranean Mezze Box", qty: 1, addOns: [], price: 13.0 },
          { itemId: "greek-yogurt-parfait", name: "Greek Yogurt Parfait", qty: 1, addOns: [], price: 6.0 },
        ],
      },
    ],
    address: "HQ · Floor 3 Kitchen",
    subtotal: 19.0,
    subsidy: 15.0,
    employeePaid: 4.0,
    payment: "pay_later",
    status: "delivered",
    locked: true,
    placedAt: "2026-06-17 9:15 AM",
    invoiceId: "INV-2848",
  },
  {
    // Delivered — fully covered.
    id: "ORD-2844",
    date: "2026-06-17",
    type: "individual",
    days: [
      {
        date: "2026-06-17",
        deliveryWindow: "12:30 PM – 1:00 PM",
        items: [
          { itemId: "cobb-salad", name: "Chicken Cobb Salad", qty: 1, addOns: [], price: 15.0 },
        ],
      },
    ],
    address: "HQ · Floor 3 Kitchen",
    subtotal: 15.0,
    subsidy: 15.0,
    employeePaid: 0,
    payment: "covered",
    status: "delivered",
    locked: true,
    placedAt: "2026-06-16 2:20 PM",
    invoiceId: "INV-2844",
  },
  {
    // Delivered Auto-Order from last week — shows auto-order history with an invoice.
    id: "ORD-2858",
    date: "2026-06-24",
    type: "individual",
    days: [
      {
        date: "2026-06-24",
        deliveryWindow: "12:00 PM – 12:30 PM",
        items: [
          { itemId: "jackfruit-tacos", name: "Jackfruit Tacos", qty: 1, addOns: ["Salsa verde"], price: 13.0 },
        ],
      },
    ],
    address: "HQ · Floor 3 Kitchen",
    subtotal: 13.0,
    subsidy: 13.0,
    employeePaid: 0,
    payment: "covered",
    status: "delivered",
    locked: true,
    placedAt: "2026-06-23 4:00 PM (auto)",
    invoiceId: "INV-2858",
    source: "auto",
  },
];

export function getOrder(id: string) {
  return orders.find((o) => o.id === id);
}

/**
 * Match a customer-typed order number against a real order. Deliberately
 * lenient: someone reading a number off a delivery label may type "2891",
 * "ORD-2891", "ord 2891" or "#2891" — we compare on digits alone so any of
 * those resolve. Returns `undefined` when nothing matches, which the public
 * feedback flow treats as "unverified" rather than an error.
 */
export function findOrder(input: string): Order | undefined {
  const digits = input.replace(/\D/g, "");
  if (!digits) return undefined;
  return orders.find((o) => o.id.replace(/\D/g, "") === digits);
}

export const upcomingOrders = orders.filter(
  (o) => o.status === "draft" || o.status === "confirmed",
);
export const pastOrders = orders.filter(
  (o) => o.status === "delivered" || o.status === "cancelled",
);
