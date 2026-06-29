import {
  UtensilsCrossed,
  ClipboardList,
  Repeat,
  Bell,
  UserCog,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Extra path prefixes that should keep this item highlighted. */
  match?: string[];
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
  { label: "Auto-Order", href: "/auto-order", icon: Repeat },
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Account & Profile", href: "/account", icon: UserCog },
];

/**
 * Compact bottom-bar nav for mobile — the platform is mobile-first for
 * employees (manufacturers are phone-only). The 5 highest-traffic tasks.
 */
export const MOBILE_NAV: NavItem[] = [
  { label: "Menu", href: "/menu", icon: UtensilsCrossed },
  { label: "Cart", href: "/cart", icon: ShoppingBag, match: ["/checkout"] },
  { label: "Orders", href: "/orders", icon: ClipboardList },
  { label: "Auto", href: "/auto-order", icon: Repeat },
  { label: "Account", href: "/account", icon: UserCog },
];

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
