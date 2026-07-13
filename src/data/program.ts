import type { MealProgram, Address } from "./types";

/**
 * Neptune Corp's meal-program contract on Superfine Kitchen / Honey Cart —
 * the same demo company as the Corporate Admin product, seen from the
 * employee's side. Fixed $15/day subsidy; employee pays any remainder.
 */
export const program: MealProgram = {
  company: "Neptune Corp",
  platform: "Superfine Kitchen",
  subsidyPerDay: 15,
  subsidyPercent: 70,
  subsidyModel: "Company covers $15 each service day. You pay any remainder.",
  // SF prepared-food sales tax, applied to the employee-paid portion only.
  taxRate: 0.08625,
  // Neptune lets employees see prices so they know what (if anything) they owe.
  showPrices: true,
  mealsPerDay: 1,
  serviceDays: "Mon–Wed",
  serviceDayNums: [1, 2, 3],
  individualSoftCutoff: "4:00 PM the day before",
  individualHardCutoff: "24 hours before delivery",
  familyCutoff: "72 hours before delivery",
  familyMinPeople: 8,
  changeWindow: "Up to 48 hours before delivery",
  deliveryWindows: ["11:30 AM – 12:00 PM", "12:00 PM – 12:30 PM", "12:30 PM – 1:00 PM"],
  utensilsPolicy: "Optional. You choose per order",
  pricingTier: "L1 Standard",
  excludedCategories: [],
};

/**
 * Company delivery addresses. These are contract-locked: most employees see
 * them read-only (only those with the `editAddress` permission can change them).
 */
export const addresses: Address[] = [
  {
    id: "hq-floor-3",
    name: "HQ · Floor 3 Kitchen",
    address: "500 Market St, Floor 3, San Francisco, CA 94105",
    instructions: "Check in at front desk, elevator to Floor 3, kitchen on the left.",
    isDefault: true,
  },
  {
    id: "hq-floor-5",
    name: "HQ · Floor 5 Lounge",
    address: "500 Market St, Floor 5, San Francisco, CA 94105",
    instructions: "Elevator to Floor 5, lounge by the east windows.",
    isDefault: false,
  },
];

/**
 * Where to route someone who needs an order placed *after* the normal cutoff —
 * a same-day or rush order, most often a family-style one (which locks a full 72
 * hours out). The kitchen can sometimes still fit these in by phone, so the
 * closed-day tooltip links here.
 *
 * NOTE: placeholder demo values — swap `phone`/`phoneHref` for the real ordering
 * line and `contactUrl` for the kitchen's main contact page before shipping.
 */
export const support = {
  /** Display form, e.g. shown on the "Call" button. */
  phone: "(555) 012-3456",
  /** `tel:` target — digits only, with country code, so it dials on a phone. */
  phoneHref: "tel:+15550123456",
  /** Main contact page opened by the "Contact page" link. */
  contactUrl: "https://superfinekitchen.example/contact",
};

export function getAddress(id: string) {
  return addresses.find((a) => a.id === id) ?? addresses[0];
}

export function defaultAddress() {
  return addresses.find((a) => a.isDefault) ?? addresses[0];
}
