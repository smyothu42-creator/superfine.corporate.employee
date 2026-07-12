import { create } from "zustand";
import { persist } from "zustand/middleware";
import { program } from "@/data/program";
import { useUiStore } from "@/store/use-ui-store";
import { companyCovers, employeeCovers, budgetRemaining } from "@/lib/subsidy";
import type { PaymentChoice } from "@/data/types";

/** A resolved add-on selection on a cart line. */
export interface CartAddOn {
  groupId: string;
  optionId: string;
  name: string;
  price: number;
}

/**
 * One option a family-style line assigned servings to, e.g. 30 servings of
 * paneer within the "Mains" group.
 */
export interface CartServing {
  groupId: string;
  groupName: string;
  optionId: string;
  name: string;
  qty: number;
  /** Unit word for the group, e.g. "serving", "taco", "tray". */
  unit: string;
}

/** One line in the cart — a specific item, on a specific date, with its choices. */
export interface CartItem {
  /** Stable id = date + item + resolved choices, so identical lines merge. */
  uid: string;
  date: string; // ISO yyyy-mm-dd
  itemId: string;
  name: string;
  basePrice: number;
  /** base + add-on up-charges. For family style, the whole package price. */
  unitPrice: number;
  qty: number;
  addOns: CartAddOn[];
  type: "individual" | "family_style";

  /* Family Style only. */
  /** Headcount the package was priced and portioned for. */
  guests?: number;
  /** How the guest count was distributed across each group's options. */
  servings?: CartServing[];
}

/**
 * Two lines merge only if they are the same meal, on the same day, configured
 * the same way — so an individual line keys off its add-ons, and a family-style
 * line keys off its headcount and its full quantity split.
 */
function lineUid(
  date: string,
  itemId: string,
  addOns: CartAddOn[],
  guests?: number,
  servings?: CartServing[],
) {
  const choices = addOns
    .map((a) => `${a.groupId}:${a.optionId}`)
    .sort()
    .join("|");
  // A combined pairing is its own optionId, so the split already distinguishes
  // 4 chicken-with-ranch from 4 chicken-with-bbq.
  const split = (servings ?? [])
    .map((s) => `${s.groupId}:${s.optionId}=${s.qty}`)
    .sort()
    .join("|");
  return `${date}__${itemId}__${choices}__${guests ?? ""}__${split}`;
}

/** The active subsidy contract, read fresh so a toggle takes effect immediately. */
const subsidyMode = () => useUiStore.getState().subsidyMode;

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
  /**
   * Single-day mode: retarget the cart from one delivery date to another. Lines
   * whose meal isn't available on the new date (per `isAvailable`) are dropped;
   * the rest move to `to` (merging into any identical line already there). The
   * day's delivery window follows along. Returns the dropped line names so the
   * caller can tell the user which meals didn't make the move.
   */
  moveDay: (from: string, to: string, isAvailable: (itemId: string) => boolean) => string[];
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

/**
 * The cart outlives the page, and — more importantly — it outlives signing in.
 * This flow deliberately defers identity until checkout, so a guest cart that
 * evaporated on reload would be a lost order, not a small annoyance.
 */
export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
  items: [],
  payment: "covered",
  windows: {},
  addressId: "hq-floor-3",

  add: (line) => {
    const unitPrice =
      line.unitPrice ?? line.basePrice + line.addOns.reduce((s, a) => s + a.price, 0);
    const uid = lineUid(line.date, line.itemId, line.addOns, line.guests, line.servings);
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
  moveDay: (from, to, isAvailable) => {
    if (from === to) return [];
    const moving = get().items.filter((i) => i.date === from);
    const dropped = moving.filter((i) => !isAvailable(i.itemId)).map((i) => i.name);
    set((s) => {
      const result = s.items.filter((i) => i.date !== from);
      for (const it of moving) {
        if (!isAvailable(it.itemId)) continue;
        const uid = lineUid(to, it.itemId, it.addOns, it.guests, it.servings);
        const idx = result.findIndex((r) => r.uid === uid);
        if (idx >= 0) {
          result[idx] = { ...result[idx], qty: result[idx].qty + it.qty };
        } else {
          result.push({ ...it, date: to, uid });
        }
      }
      // Carry the delivery window over to the new date (don't clobber one the
      // target day already has), then drop the old date's window.
      const windows = { ...s.windows };
      if (windows[from] && !windows[to]) windows[to] = windows[from];
      delete windows[from];
      return { items: result, windows };
    });
    return dropped;
  },
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
  // The subsidy contract is a UI-level switch, so these read it live rather than
  // caching a split that would go stale the moment the model is toggled.
  daySubsidy: (date) => companyCovers(get().dayTotal(date), subsidyMode()),
  dayRemaining: (date) => budgetRemaining(get().dayTotal(date), subsidyMode()),
  dayEmployeePaid: (date) => employeeCovers(get().dayTotal(date), subsidyMode()),
  subtotal: () => get().items.reduce((s, i) => s + i.unitPrice * i.qty, 0),
  totalSubsidy: () => get().dates().reduce((s, d) => s + get().daySubsidy(d), 0),
  totalEmployeePaid: () => get().dates().reduce((s, d) => s + get().dayEmployeePaid(d), 0),
  tax: () => Math.round(get().totalEmployeePaid() * program.taxRate * 100) / 100,
  total: () => get().totalEmployeePaid() + get().tax(),
  count: () => get().items.reduce((s, i) => s + i.qty, 0),
    }),
    {
      name: "sfk:cart",
      // Read localStorage after mount, never during the first render — the
      // server has no cart, so a synchronously-restored one makes React find a
      // badge in the DOM that the server never wrote. `StoreHydrator` does it.
      skipHydration: true,
      // Only the contents. The selectors are functions, and prices are re-derived
      // from the live session on every read — a persisted subsidised total would
      // otherwise survive a sign-out.
      partialize: (s) => ({
        items: s.items,
        payment: s.payment,
        windows: s.windows,
        addressId: s.addressId,
      }),
    },
  ),
);
