import { create } from "zustand";
import { program } from "@/data/program";
import type { PaymentChoice } from "@/data/types";

/** A resolved add-on selection on a cart line. */
export interface CartAddOn {
  groupId: string;
  optionId: string;
  name: string;
  price: number;
}

/** One line in the cart — a specific item, on a specific date, with add-ons. */
export interface CartItem {
  /** Stable id = date + item + add-on combo, so identical lines merge. */
  uid: string;
  date: string; // ISO yyyy-mm-dd
  itemId: string;
  name: string;
  basePrice: number;
  /** base + add-on up-charges. */
  unitPrice: number;
  qty: number;
  addOns: CartAddOn[];
  type: "individual" | "family_style";
}

function lineUid(date: string, itemId: string, addOns: CartAddOn[]) {
  const combo = addOns
    .map((a) => `${a.groupId}:${a.optionId}`)
    .sort()
    .join("|");
  return `${date}__${itemId}__${combo}`;
}

interface CartState {
  items: CartItem[];
  payment: PaymentChoice;
  /** Delivery window per date (defaults applied at checkout). */
  windows: Record<string, string>;
  addressId: string;

  add: (line: Omit<CartItem, "uid" | "unitPrice"> & { unitPrice?: number }) => void;
  setQty: (uid: string, qty: number) => void;
  remove: (uid: string) => void;
  clearDay: (date: string) => void;
  /**
   * Keep only items (and delivery windows) whose date falls within the
   * inclusive [start, end] range. Used when the multi-day range changes so
   * meals on now-unselected days are dropped from the cart.
   */
  retainRange: (start: string, end: string) => void;
  clear: () => void;
  setPayment: (p: PaymentChoice) => void;
  setWindow: (date: string, window: string) => void;
  setAddress: (id: string) => void;

  /** Distinct ISO dates in the cart, ascending. */
  dates: () => string[];
  itemsForDate: (date: string) => CartItem[];
  /** Gross subtotal for a single day. */
  dayTotal: (date: string) => number;
  /** Subsidy applied to a day (capped at the daily allowance). */
  daySubsidy: (date: string) => number;
  /** Budget left for a day (never negative). */
  dayRemaining: (date: string) => number;
  /** What the employee owes for a day after subsidy. */
  dayEmployeePaid: (date: string) => number;
  subtotal: () => number;
  totalSubsidy: () => number;
  totalEmployeePaid: () => number;
  /** Sales tax on the employee-paid portion (0 when fully covered). */
  tax: () => number;
  /** Final amount the employee pays: out-of-pocket meals + tax. */
  total: () => number;
  count: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  payment: "covered",
  windows: {},
  addressId: "hq-floor-3",

  add: (line) => {
    const unitPrice =
      line.unitPrice ?? line.basePrice + line.addOns.reduce((s, a) => s + a.price, 0);
    const uid = lineUid(line.date, line.itemId, line.addOns);
    set((s) => {
      const existing = s.items.find((i) => i.uid === uid);
      if (existing) {
        return {
          items: s.items.map((i) => (i.uid === uid ? { ...i, qty: i.qty + line.qty } : i)),
        };
      }
      return { items: [...s.items, { ...line, uid, unitPrice }] };
    });
  },
  setQty: (uid, qty) =>
    set((s) => ({
      items: s.items.map((i) => (i.uid === uid ? { ...i, qty: Math.max(0, qty) } : i)).filter((i) => i.qty > 0),
    })),
  remove: (uid) => set((s) => ({ items: s.items.filter((i) => i.uid !== uid) })),
  clearDay: (date) => set((s) => ({ items: s.items.filter((i) => i.date !== date) })),
  // ISO yyyy-mm-dd sorts lexically, so string comparison is a valid date range check.
  retainRange: (start, end) =>
    set((s) => ({
      items: s.items.filter((i) => i.date >= start && i.date <= end),
      windows: Object.fromEntries(
        Object.entries(s.windows).filter(([d]) => d >= start && d <= end),
      ),
    })),
  clear: () => set({ items: [] }),
  setPayment: (payment) => set({ payment }),
  setWindow: (date, window) => set((s) => ({ windows: { ...s.windows, [date]: window } })),
  setAddress: (addressId) => set({ addressId }),

  dates: () => Array.from(new Set(get().items.map((i) => i.date))).sort(),
  itemsForDate: (date) => get().items.filter((i) => i.date === date),
  dayTotal: (date) =>
    get()
      .items.filter((i) => i.date === date)
      .reduce((s, i) => s + i.unitPrice * i.qty, 0),
  daySubsidy: (date) => Math.min(get().dayTotal(date), program.subsidyPerDay),
  dayRemaining: (date) => Math.max(0, program.subsidyPerDay - get().dayTotal(date)),
  dayEmployeePaid: (date) => Math.max(0, get().dayTotal(date) - program.subsidyPerDay),
  subtotal: () => get().items.reduce((s, i) => s + i.unitPrice * i.qty, 0),
  totalSubsidy: () => get().dates().reduce((s, d) => s + get().daySubsidy(d), 0),
  totalEmployeePaid: () => get().dates().reduce((s, d) => s + get().dayEmployeePaid(d), 0),
  tax: () => Math.round(get().totalEmployeePaid() * program.taxRate * 100) / 100,
  total: () => get().totalEmployeePaid() + get().tax(),
  count: () => get().items.reduce((s, i) => s + i.qty, 0),
}));
