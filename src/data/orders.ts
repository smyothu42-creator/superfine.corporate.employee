import type { Order, OrderDay, OrderItem } from "./types";
import { me } from "./me";
import { program } from "./program";
import { currentRecipeVersion } from "./recipe-versions";
import { startOfToday, fromISODate, toISODate, addDays } from "@/lib/dates";
import { isCutoffPassed } from "@/lib/cutoff";

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * Breaks a placed order into what the employee actually pays. Tax follows the
 * same rule as the cart and checkout — {@link program.taxRate} on the
 * *employee-paid portion only* (so a fully company-covered order is taxed $0).
 * Corporate viewers are taxed on their out-of-pocket share (`employeePaid`);
 * individuals, who get no subsidy, on the full `subtotal`.
 */
export function orderPayment(order: Order, corporate: boolean) {
  const share = corporate ? order.employeePaid : order.subtotal;
  const tax = round(share * program.taxRate);
  return { share, tax, total: round(share + tax) };
}

/**
 * The employee's own orders. Statuses use the simple, customer-facing lifecycle:
 * Placed → Confirmed → Delivered (a locked, past-cutoff order shows as "Locked
 * for changes"). Dates below are authored around the demo anchor (Sun Jun 28,
 * 2026) and then re-anchored to the real calendar at load — see `orders` below.
 */
/**
 * The seed rows as authored: no `lineId` or `recipeVersion`, because both are
 * assigned when the order is built rather than typed out 21 times by hand.
 */
type SeedItem = Omit<OrderItem, "lineId" | "recipeVersion">;
/**
 * `contactEmail` is optional here and defaulted below: every demo order belongs
 * to the one signed-in employee, so typing the same address 18 times would only
 * create 18 chances to typo it.
 */
type SeedOrder = Omit<Order, "days" | "contactEmail"> & {
  contactEmail?: string;
  days: (Omit<OrderDay, "items"> & { items: SeedItem[] })[];
};

const seedOrders: SeedOrder[] = [
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
            addOns: ["Chicken", "Ranch"],
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
          { itemId: "quinoa-salad", name: "Quinoa Harvest Salad", qty: 1, addOns: ["Tofu", "Caesar Dressing"], price: 16.5 },
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
    // Auto-Order draft awaiting review — still before cutoff, so it's editable now.
    id: "ORD-2901",
    date: "2026-07-06",
    type: "individual",
    days: [
      {
        date: "2026-07-06",
        deliveryWindow: "12:00 PM – 12:30 PM",
        items: [
          { itemId: "margherita-flatbread", name: "Margherita Flatbread", qty: 1, addOns: [], price: 15.0 },
        ],
      },
    ],
    address: "HQ · Floor 3 Kitchen",
    subtotal: 15.0,
    subsidy: 15.0,
    employeePaid: 0,
    payment: "covered",
    status: "draft",
    locked: false,
    placedAt: "2026-07-05 4:00 PM (auto)",
    source: "auto",
    reviewBy: "Today, 4:00 PM",
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
  {
    // Delivered — five meals on one day, the largest order in the seed. The
    // multi-meal delivered case is what item-level rating exists for: rate the
    // one that disappointed, leave the others alone. Five rather than three so
    // the seed also exercises the overflow states — the rating list's stack of
    // thumbnails caps at three circles and counts the rest as "+N".
    id: "ORD-2861",
    date: "2026-06-25",
    type: "individual",
    days: [
      {
        date: "2026-06-25",
        deliveryWindow: "12:00 PM – 12:30 PM",
        items: [
          { itemId: "bibimbap", name: "Veggie Bibimbap", qty: 1, addOns: ["Crispy tofu"], price: 14.0 },
          { itemId: "chicken-shawarma", name: "Chicken Shawarma Plate", qty: 1, addOns: [], price: 15.5 },
          { itemId: "beef-pho", name: "Beef Pho", qty: 1, addOns: [], price: 14.5 },
          { itemId: "teriyaki-salmon-bowl", name: "Teriyaki Salmon Bowl", qty: 1, addOns: [], price: 16.0 },
          { itemId: "margherita-flatbread", name: "Margherita Flatbread", qty: 1, addOns: [], price: 8.5 },
        ],
      },
    ],
    address: "HQ · Floor 3 Kitchen",
    subtotal: 68.5,
    subsidy: 15.0,
    employeePaid: 53.5,
    payment: "pay_later",
    status: "delivered",
    locked: true,
    placedAt: "2026-06-24 3:20 PM",
    invoiceId: "INV-2861",
  },
];

/** The demo anchor the seed dates were authored against (Sunday). */
const DEMO_ANCHOR = "2026-06-28";

/**
 * How far to slide every seed date so the whole set sits around *today's* real
 * calendar instead of late June 2026. Rounded to whole weeks so each delivery
 * keeps its original weekday — service days must stay Mon–Fri, holidays aside.
 * Recomputed from the real clock on every load, so the app is never "stuck" in
 * the demo's past.
 */
const SHIFT_DAYS = Math.round(
  (startOfToday().getTime() - fromISODate(DEMO_ANCHOR).getTime()) / 86_400_000 / 7,
) * 7;

const shiftISO = (iso: string) => toISODate(addDays(fromISODate(iso), SHIFT_DAYS));
/** "2026-06-27 4:12 PM" → shift the date token, keep the time text. */
const shiftPlacedAt = (placedAt: string) => {
  const [date, ...rest] = placedAt.split(" ");
  return [shiftISO(date), ...rest].join(" ");
};

/**
 * The orders as the app uses them: seed data re-anchored to the real date, with
 * `locked` recomputed from the live cutoff so editability tracks the real clock
 * (an order is locked exactly when its change cutoff has passed).
 */
/**
 * A line's stable id: the order, the day it was delivered on, the meal, and its
 * position within that day. Position is what separates two of the same meal on
 * one day with different add-ons — the pair a rating would otherwise have no way
 * to tell apart. Deterministic on purpose: the same seed always yields the same
 * ids, so a rating saved before a reload still points at its line after one.
 */
export function makeLineId(orderId: string, date: string, itemId: string, index: number) {
  return `${orderId}__${date}__${itemId}__${index}`;
}

export const orders: Order[] = seedOrders.map((o) => {
  const date = shiftISO(o.date);
  return {
    ...o,
    date,
    contactEmail: o.contactEmail ?? me.email,
    days: o.days.map((d) => {
      const dayDate = shiftISO(d.date);
      return {
        ...d,
        date: dayDate,
        // Ids and the recipe pin are assigned here, at the one place an order
        // comes into existence — see `OrderItem` for why a rating can't just
        // point at `itemId`.
        items: d.items.map((it, i) => ({
          ...it,
          lineId: makeLineId(o.id, dayDate, it.itemId, i),
          recipeVersion: currentRecipeVersion(it.itemId),
        })),
      };
    }),
    placedAt: shiftPlacedAt(o.placedAt),
    locked: isCutoffPassed(date, o.type),
  };
});

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

/** Why a signed-out lookup on `/rate` didn't produce a rateable order. */
export type OrderLookupResult =
  | { status: "ok"; order: Order }
  | { status: "not-found" }
  | { status: "undelivered"; order: Order }
  | { status: "cancelled"; order: Order };

/**
 * A rateable order built around a number and email that match nothing in the
 * seed — the demo's answer to "I typed my real order number and it says it
 * doesn't exist", which in a product with sixteen fake orders is what happens
 * to almost everyone who tries the lookup.
 *
 * It is a copy of the newest delivered order wearing the customer's own number
 * and address, with fresh line ids so ratings left against it are its own and
 * do not mark the order it was copied from as rated.
 */
function standInOrder(orderInput: string, email: string): Order {
  const source =
    orders.filter((o) => o.status === "delivered").sort((a, b) => b.date.localeCompare(a.date))[0] ??
    orders[0];

  // "ORD 219812", "#219812" and "219812" all name the same order to a customer
  // reading off a delivery label, so they all normalise to one id.
  const digits = orderInput.replace(/\D/g, "");
  const id = digits ? `ORD-${digits}` : orderInput.trim().toUpperCase() || "ORD-0000";

  return {
    ...source,
    id,
    contactEmail: email.trim() || source.contactEmail,
    invoiceId: `INV-${digits || "0000"}`,
    days: source.days.map((d) => ({
      ...d,
      items: d.items.map((it, i) => ({ ...it, lineId: makeLineId(id, d.date, it.itemId, i) })),
    })),
  };
}

/**
 * The signed-out half of `/rate`: resolve an order from a number the customer
 * read off a receipt plus the email it was sent to.
 *
 * **Every lookup succeeds.** A number that matches a delivered order in the
 * seed returns that order; anything else returns a stand-in carrying the number
 * and email that were typed. This is a demo decision, not a product one — the
 * seed holds sixteen orders belonging to one fictional employee, so a real
 * person trying this form has no way to type something that exists, and a
 * truthful "we couldn't find it" makes the whole path untestable.
 *
 * What the real implementation has to do, and what this deliberately skips:
 *
 * - **Authorise on the email.** It is the half that proves the asker is the
 *   customer; the number alone runs in sequence and can be guessed.
 * - **Report a wrong number and a wrong email identically.** Telling them apart
 *   turns this into an oracle for which order numbers exist.
 * - **Check the order was delivered**, and say so plainly when it wasn't.
 *
 * `OrderLookupResult` keeps its `not-found` / `undelivered` / `cancelled` arms
 * for that reason: the strings and the error rendering are still in place, so
 * restoring the real rules is a change to this function alone.
 */
export function lookupOrderForRating(orderInput: string, email: string): OrderLookupResult {
  const order = findOrder(orderInput);
  if (order && order.status === "delivered") return { status: "ok", order };
  return { status: "ok", order: standInOrder(orderInput, email) };
}

/** Delivered orders, newest first — what `/rate` offers a signed-in customer. */
export const rateableOrders = orders
  .filter((o) => o.status === "delivered")
  .sort((a, b) => b.date.localeCompare(a.date));

export const upcomingOrders = orders.filter(
  (o) => o.status === "draft" || o.status === "confirmed",
);
export const pastOrders = orders.filter(
  (o) => o.status === "delivered" || o.status === "cancelled",
);
