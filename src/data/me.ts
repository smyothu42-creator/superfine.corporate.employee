import type { Employee } from "./types";

/**
 * The signed-in corporate employee. Addresses the #1 interview pain point:
 * sign in once with the company email and land straight on the right company
 * menu — no special links, no "individual vs family" detour.
 */
export const me: Employee = {
  id: "maya-chen",
  name: "Maya Chen",
  firstName: "Maya",
  email: "maya.chen@neptunecorp.com",
  phone: "+1 (555) 123-4567",
  role: "Software Engineer",
  company: "Neptune Corp",
  dietary: ["Vegetarian"],
  allergens: ["Peanuts"],
  utensils: true,
  defaultAddressId: "hq-floor-3",
  permissions: {
    // Granted by SFK / corp admin — not every employee gets these.
    payLater: true,
    flexibleDelivery: true,
    editAddress: false,
  },
  notifications: {
    orderConfirmation: true,
    dailyReminder: true,
    arrivalAlert: true,
    weeklySpecials: false,
    channel: "email_text",
  },
  autoOrder: {
    enabled: false,
    days: ["Mon", "Tue", "Wed"],
    favorites: ["quinoa-salad", "jackfruit-tacos", "paneer-bowl"],
    reminderIfEmpty: true,
  },
};
