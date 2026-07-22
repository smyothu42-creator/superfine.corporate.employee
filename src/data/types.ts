/** Shared domain types for the Corporate Employee ordering app. */

export type DietaryTag =
  | "Vegan"
  | "Vegetarian"
  | "Halal"
  | "Gluten-Free"
  | "Nut-Free"
  | "Dairy-Free";

export type OrderType = "individual" | "family_style";

/** The main protein an item is built around — used for the menu protein filter. */
export type ProteinType =
  | "Chicken"
  | "Beef"
  | "Seafood"
  | "Vegetarian"
  | "Plant-based";

/** Customer-facing order lifecycle:
 *  Placed → Confirmed → Delivered. A confirmed order that is past its change
 *  cutoff surfaces as "Locked for changes" (driven by `Order.locked`).
 *  "Out for delivery" is intentionally NOT shown to customers. */
export type OrderStatus =
  | "draft"
  | "confirmed"
  | "delivered"
  | "cancelled";

export type PaymentChoice = "pay_later" | "pay_now" | "covered";

export interface Nutrition {
  calories: number;
  protein: number; // grams
  carbs: number; // grams
  fat: number; // grams
}

/** A single selectable add-on (e.g. a protein, a sauce, an extra side). */
export interface AddOnOption {
  id: string;
  name: string;
  /** Up-charge in dollars; 0 = included. */
  price: number;
}

/**
 * A group of add-ons attached to a menu item. `required` groups must be
 * resolved before the item can be added (the User Flow's "mandatory add-on"
 * branch); optional groups appear behind "Customize".
 */
export interface AddOnGroup {
  id: string;
  name: string;
  /** "single" = pick one (radio); "multi" = pick several (checkbox). */
  select: "single" | "multi";
  required: boolean;
  /** For multi groups, an optional cap on selections. */
  max?: number;
  options: AddOnOption[];
}

/* ── Family Style ────────────────────────────────────────────────────────────
 * Individual meals are picked one plate at a time: choose a dish, resolve its
 * option groups (protein, sauce, dressing…), set a quantity.
 *
 * Family Style is quantity-first. You tell us the headcount, and the package
 * derives how many servings you owe each choice group (headcount × perGuest).
 * You then distribute those servings across the group's options however you
 * like — 100 servings might be 20 chicken, 30 paneer, 50 brisket. The order
 * can't be placed until every required group balances exactly.
 */

/** One option a family-style guest count can be distributed across. */
export interface ServingOption {
  id: string;
  name: string;
  description?: string;
  /** Per-serving up-charge over the package's per-guest price. 0 = included. */
  upchargePerServing: number;
  tags?: DietaryTag[];
}

/**
 * A family-style choice group. The user must assign exactly
 * `guests × perGuest` servings across `options` before the package is orderable.
 * `perGuest: 0` marks an optional extra — any quantity, nothing to balance.
 */
export interface ServingGroup {
  id: string;
  name: string;
  /** One-line instruction, e.g. "One entrée per guest — split them any way you like." */
  helper?: string;
  /** Servings each guest receives from this group. 0 = optional extra. */
  perGuest: number;
  /** Word for one unit, e.g. "serving", "taco", "slice". Defaults to "serving". */
  unit?: string;
  options: ServingOption[];
}

/** A dish that comes with every family-style package — no choice to make. */
export interface IncludedItem {
  name: string;
  /** How much of it arrives, e.g. "2 per guest" or "Shared trays". */
  note?: string;
}

/** One resolved option within a preset selection (structurally a cart add-on). */
export interface ComboSelection {
  groupId: string;
  /** The group this option came from, e.g. "Spice level", "Add a side". */
  groupName: string;
  optionId: string;
  name: string;
  price: number;
}

/** One line in a combo's "what's included" breakdown, e.g. { group: "Side", item: "Sumac fries" }. */
export interface ComboInclude {
  group: string;
  item: string;
}

/**
 * A pre-bundled set of add-ons — one option per group — that the user picks as
 * a single choice instead of resolving each group separately. Auto-generated
 * from an item's add-on groups (the cartesian product of one option per group).
 */
export interface MenuCombo {
  id: string;
  /** Display label, e.g. "Mild · Sumac fries". */
  name: string;
  /** What the combo includes, broken down by group (protein / sauce / side …). */
  includes: ComboInclude[];
  /** The resolved add-on selections this combo maps to. */
  selections: ComboSelection[];
  /** Up-charge over the base price (sum of selection prices). */
  upcharge: number;
}

export interface MenuItem {
  id: string;
  name: string;
  category: string;
  cuisine: string;
  description: string;
  allergens: string;
  tags: DietaryTag[];
  /** Individual: price of one plate. Family Style: price of the minimum package. */
  price: number;
  /**
   * The pre-discount price, shown struck through beside `price` when the item is
   * on offer. `price` is always what's charged, so nothing downstream — cart,
   * subsidy, tax — needs to know a sale is running. Omit when not discounted.
   */
  originalPrice?: number;
  type: OrderType;
  /** Main protein the dish is built around (drives the menu protein filter). */
  proteinType?: ProteinType;
  serves?: number;

  /**
   * The same dish on the other menu, e.g. the Chicken Shawarma Wrap you order
   * one of, and the Chicken Shawarma Feast you order for twenty. They are
   * separate menu entries with separate prices and cutoffs; this link lets each
   * one point at the other so the switch is one tap.
   */
  counterpartId?: string;

  /* Family Style only. */
  /** Price of one guest's share, before any per-serving up-charges. */
  pricePerGuest?: number;
  /** Smallest headcount the kitchen will cook this package for. */
  minGuests?: number;
  /** Arrives with every package, whatever the guest chooses. */
  includedItems?: IncludedItem[];
  /** Choice groups whose servings the user distributes across options. */
  servingGroups?: ServingGroup[];

  /** Food photo for the card / detail hero. Falls back to a placeholder. */
  image?: string;
  /** Full ingredient list (item detail / Nutrition page). */
  ingredients?: string;
  /** Nutrition facts / macros (item detail / Nutrition page). */
  nutrition?: Nutrition;
  /** Limited-time seasonal item. */
  seasonal?: boolean;
  /** Surfaced as a "Popular" pick. */
  popular?: boolean;
  /** Weekdays (1=Mon … 5=Fri) this item is on the menu. Empty = always on. */
  availableDays?: number[];
  /** Mandatory + optional customisations. */
  addOns?: AddOnGroup[];
}

/** A saved delivery address / office location. */
export interface Address {
  id: string;
  name: string;
  address: string;
  /** Floor, desk, dock, entry protocol, etc. */
  instructions?: string;
  isDefault: boolean;
}

/** Per-employee permissions, granted by the SFK / corporate admin. */
export interface Permissions {
  /** Can defer payment to the company invoice instead of paying now. */
  payLater: boolean;
  /** Can pick a delivery window outside the company default. */
  flexibleDelivery: boolean;
  /** Can add or change the delivery address (most are view-only). */
  editAddress: boolean;
}

export interface NotificationPrefs {
  orderConfirmation: boolean;
  dailyReminder: boolean;
  arrivalAlert: boolean;
  weeklySpecials: boolean;
  /** Delivery channel for opt-in alerts. Email only (SMS is a later feature). */
  channel: "email";
}

/** Automatic ordering — "set it and forget it" rotation from saved favourites. */
export interface AutoOrderConfig {
  enabled: boolean;
  /** Weekday labels the rotation covers, e.g. ["Mon", "Tue", "Wed"]. */
  days: string[];
  /** Menu item ids the rotation chooses from. */
  favorites: string[];
  /** Remind me each morning if nothing is queued and auto-order is off. */
  reminderIfEmpty: boolean;
}

/** The signed-in corporate employee. */
export interface Employee {
  id: string;
  name: string;
  firstName: string;
  email: string;
  phone: string;
  role: string;
  company: string;
  dietary: DietaryTag[];
  allergens: string[];
  /** Default utensils preference (where the company allows the choice). */
  utensils: boolean;
  defaultAddressId: string;
  permissions: Permissions;
  notifications: NotificationPrefs;
  autoOrder: AutoOrderConfig;
}

/** The company meal-program contract, as it appears to the employee. */
export interface MealProgram {
  company: string;
  platform: string;
  /** Fixed daily subsidy in dollars (Neptune model: $15/day). */
  subsidyPerDay: number;
  /**
   * Percentage of each order the company covers, for contracts priced as a
   * share rather than a cap. Demo-only alternative to `subsidyPerDay` — the
   * topbar can switch between the two models.
   */
  subsidyPercent: number;
  /** Human description of the subsidy model. */
  subsidyModel: string;
  /** Sales-tax rate applied to the employee-paid portion (e.g. 0.08625 = 8.625%). */
  taxRate: number;
  /** When false, the employee never sees retail prices — only the budget. */
  showPrices: boolean;
  mealsPerDay: number;
  /**
   * Whether the contract includes Auto-Order. This is the company's call, not
   * the employee's: when false the feature is still explained on its own page —
   * people ask for what they can see — but nothing on it can switch it on.
   * Only the company's program admin can, through their own admin surface.
   */
  autoOrderEnabled: boolean;
  /** Which weekdays the program runs, e.g. "Mon–Wed". */
  serviceDays: string;
  /** Weekday numbers (1=Mon) the program delivers. */
  serviceDayNums: number[];
  individualSoftCutoff: string;
  individualHardCutoff: string;
  familyCutoff: string;
  /** Minimum group size for a family-style order. */
  familyMinPeople: number;
  /** How long before delivery an order can still be cancelled/changed. */
  changeWindow: string;
  deliveryWindows: string[];
  utensilsPolicy: string;
  pricingTier: string;
  /** Menu categories excluded from this company's contract. */
  excludedCategories?: string[];
  /** Reusable-packaging program offered to individual orders at checkout. */
  reusablePackaging: ReusablePackaging;
}

/** One reusable-packaging fee band: a container-count range → a flat fee. */
export interface ReusableFeeTier {
  /** Inclusive lower bound of the range. */
  min: number;
  /** Inclusive upper bound, or null for the open-ended top tier. */
  max: number | null;
  /** Flat packaging fee charged for any quantity in this range. */
  fee: number;
  /** Short human label, e.g. "Up to 75 meals". */
  label: string;
}

/**
 * Admin-configured reusable-packaging program. Pickup during an included window
 * is free; a pickup outside them costs a ZIP-based fee. The packaging itself
 * costs a flat fee that scales with how many containers the order needs.
 */
export interface ReusablePackaging {
  /** Preset pickup windows included at no extra charge. */
  includedPickupWindows: string[];
  /** Flat packaging fee by container count (meals, or family-style guests). */
  feeTiers: ReusableFeeTier[];
}

/** A line on a placed/draft order, including resolved add-ons. */
export interface OrderItem {
  /**
   * Stable id for this line within its order — what a rating points at.
   *
   * `itemId` can't do that job: the same meal can appear twice in one order on
   * different days, or twice on one day with different add-ons, and a rating
   * that landed on "the Bibimbap" would be unattributable to a delivery.
   */
  lineId: string;
  itemId: string;
  name: string;
  qty: number;
  /** Resolved add-on labels, e.g. ["Brisket", "Extra chimichurri"]. */
  addOns: string[];
  /** Unit price incl. add-ons. */
  price: number;
  /**
   * The recipe as *delivered*, pinned at order time. Ratings copy it, so
   * changing a recipe later never retroactively re-attributes the scores it
   * earned in its old form — which is the whole basis of the before/after
   * comparison in the admin rollups.
   */
  recipeVersion: number;
}

/** One day's worth of meals within an order. */
export interface OrderDay {
  date: string;
  deliveryWindow: string;
  items: OrderItem[];
}

export interface Order {
  id: string;
  /** Primary delivery date (first day for multi-day orders). */
  date: string;
  /**
   * The email the order was placed under. It is the second half of the
   * credential on the signed-out rating path (`/rate`): an order number alone
   * is guessable — they run in sequence — so the number is only accepted
   * alongside the address the confirmation was sent to.
   */
  contactEmail: string;
  type: OrderType;
  days: OrderDay[];
  address: string;
  subtotal: number;
  subsidy: number;
  employeePaid: number;
  payment: PaymentChoice;
  status: OrderStatus;
  /** True once past cutoff — order can no longer be edited/cancelled. */
  locked: boolean;
  placedAt: string;
  /** Set when an invoice/receipt is available to download. */
  invoiceId?: string;
  /** How the order was created. "auto" = drafted by Auto-Order 24h before cutoff. */
  source?: "manual" | "auto";
  /** For auto-order drafts: the human cutoff label the user must review by. */
  reviewBy?: string;
}

export type NotificationType =
  | "confirmation"
  | "reminder"
  | "arrival"
  | "change"
  | "special";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  time: string;
  read: boolean;
}
