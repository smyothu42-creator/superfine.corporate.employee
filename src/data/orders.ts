import type { Order } from "./types";

/**
 * The employee's own orders. Statuses use the simple, customer-facing lifecycle
 * the interviews asked for: Draft → Confirmed → Out for Delivery → Delivered.
 * Dates are anchored around late June 2026 (the demo "today" is Sun Jun 28).
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
    status: "out_for_delivery",
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
];

export function getOrder(id: string) {
  return orders.find((o) => o.id === id);
}

export const upcomingOrders = orders.filter(
  (o) => o.status === "draft" || o.status === "confirmed" || o.status === "out_for_delivery",
);
export const pastOrders = orders.filter(
  (o) => o.status === "delivered" || o.status === "cancelled",
);
