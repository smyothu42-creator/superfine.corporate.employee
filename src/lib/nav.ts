import {
  UtensilsCrossed,
  ClipboardList,
  Repeat,
  Bell,
  UserCog,
  type LucideIcon,
} from "lucide-react";
import { isSubsidized, type Account } from "@/store/use-session-store";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Extra path prefixes that should keep this item highlighted. */
  match?: string[];
  /** Only shown to subsidized (corporate) accounts, e.g. Auto-Order. */
  corporateOnly?: boolean;
};

/**
 * Primary navigation — mirrors the Corporate Employee information architecture:
 * Browse & Ordering (Menu) · Order Management (My Orders) · Auto-Order ·
 * Notifications · Account & Profile. Checkout flows out of the cart, so it
 * lives in the topbar rather than the rail.
 */
export const NAV_ITEMS: NavItem[] = [
  { label: "Menu", href: "/menu", icon: UtensilsCrossed, match: ["/checkout"] },
  { label: "My Orders", href: "/orders", icon: ClipboardList },
  // Auto-Order draws from a company subsidy, so it's corporate-only.
  { label: "Auto-Order", href: "/auto-order", icon: Repeat, corporateOnly: true },
  { label: "Notifications", href: "/notifications", icon: Bell },
  // Rating and problem-reporting are deliberately not nav items: they sit with
  // the rail's quiet secondary links below this list, where they're available
  // without asking to be noticed. The `/feedback` route still exists for the
  // "Problem with your order?" deep link from a past order.
  { label: "Account & Profile", href: "/account", icon: UserCog },
];

/** Nav items visible to the given account — hides corporate-only items (e.g.
 *  Auto-Order) from individuals and guests. */
export function visibleNav(items: NavItem[], account: Account | null): NavItem[] {
  return items.filter((item) => !item.corporateOnly || isSubsidized(account));
}

/**
 * Routes that are *about* an account — an order history, a saved profile, a
 * notification feed, a feedback thread. A guest reaching for one is shown a
 * sign-in prompt instead. The menu, cart and checkout are deliberately absent:
 * browsing needs a delivery area, not an identity, and checkout asks who you
 * are at the moment it finally needs to know.
 */
export const ACCOUNT_ROUTES = [
  "/account",
  "/orders",
  "/auto-order",
  "/plan",
  "/notifications",
  "/feedback",
];

/** Whether a path sits behind the sign-in wall (see {@link ACCOUNT_ROUTES}). */
export function requiresAccount(href: string): boolean {
  return ACCOUNT_ROUTES.some((r) => href === r || href.startsWith(r + "/"));
}

export function isActive(pathname: string, item: NavItem) {
  if (pathname === item.href) return true;
  if (pathname.startsWith(item.href + "/")) {
    // Don't highlight a parent item when a more specific nav item also matches
    // the current path — that item owns the route.
    const moreSpecific = NAV_ITEMS.some(
      (other) =>
        other.href !== item.href &&
        other.href.startsWith(item.href + "/") &&
        (pathname === other.href || pathname.startsWith(other.href + "/")),
    );
    if (!moreSpecific) return true;
  }
  return item.match?.some((m) => pathname === m || pathname.startsWith(m + "/")) ?? false;
}
