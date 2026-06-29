/** Shared domain types for the Corporate Employee ordering app. */

export type DietaryTag =
  | "Vegan"
  | "Vegetarian"
  | "Halal"
  | "Gluten-Free"
  | "Nut-Free"
  | "Dairy-Free";

export type OrderType = "individual" | "family_style";

/** Customer-facing order lifecycle from the interviews:
 *  Draft → Confirmed → Out for Delivery → Delivered (+ Cancelled). */
export type OrderStatus =
  | "draft"
  | "confirmed"
  | "out_for_delivery"
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

export interface MenuItem {
  id: string;
  name: string;
  category: string;
  cuisine: string;
  description: string;
  allergens: string;
  tags: DietaryTag[];
  price: number;
  type: OrderType;
  serves?: number;
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
  /** Delivery channel for opt-in alerts. */
  channel: "email" | "email_text";
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
  /** Human description of the subsidy model. */
  subsidyModel: string;
  /** When false, the employee never sees retail prices — only the budget. */
  showPrices: boolean;
  mealsPerDay: number;
  /** Which weekdays the program runs, e.g. "Mon–Wed". */
  serviceDays: string;
  /** Weekday numbers (1=Mon) the program delivers. */
  serviceDayNums: number[];
  individualSoftCutoff: string;
  individualHardCutoff: string;
  familyCutoff: string;
  /** How long before delivery an order can still be cancelled/changed. */
  changeWindow: string;
  deliveryWindows: string[];
  utensilsPolicy: string;
  pricingTier: string;
  /** Menu categories excluded from this company's contract. */
  excludedCategories?: string[];
}

/** A line on a placed/draft order, including resolved add-ons. */
export interface OrderItem {
  itemId: string;
  name: string;
  qty: number;
  /** Resolved add-on labels, e.g. ["Brisket", "Extra chimichurri"]. */
  addOns: string[];
  /** Unit price incl. add-ons. */
  price: number;
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
