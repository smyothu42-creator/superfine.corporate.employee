"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { MOBILE_NAV, isActive, visibleNav, requiresAccount } from "@/lib/nav";
import { Sidebar } from "./sidebar";
import { useUiStore } from "@/store/use-ui-store";
import { useSessionStore } from "@/store/use-session-store";
import { useCartStore } from "@/store/use-cart-store";
import { cn } from "@/lib/utils";

/** Slide-in drawer (full nav) used on tablet/mobile. */
function MobileDrawer() {
  const open = useUiStore((s) => s.mobileNavOpen);
  const setOpen = useUiStore((s) => s.setMobileNavOpen);

  return (
    <div className={cn("lg:hidden", open ? "pointer-events-auto" : "pointer-events-none")} aria-hidden={!open}>
      <div
        onClick={() => setOpen(false)}
        className={cn(
          "fixed inset-0 z-40 bg-teal-deep/50 transition-opacity",
          open ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transition-transform duration-200",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close navigation"
          className={cn(
            "absolute -right-12 top-3 rounded-full bg-card p-2 text-foreground shadow-card transition-opacity",
            open ? "opacity-100" : "opacity-0",
          )}
        >
          <X className="size-5" />
        </button>
        <Sidebar onNavigate={() => setOpen(false)} />
      </div>
    </div>
  );
}

/** Persistent bottom tab bar — the interview's "mobile admin" requirement. */
function MobileTabBar() {
  const pathname = usePathname();
  const account = useSessionStore((s) => s.account);
  const openSignInPrompt = useUiStore((s) => s.openSignInPrompt);
  // Total items in the cart — drives the count badge on the Cart tab, matching
  // the header cart's coral badge.
  const cartCount = useCartStore((s) => s.items.reduce((n, i) => n + i.qty, 0));
  // Auto-Order is corporate-only, so individuals get a 4-tab bar, not 5.
  const items = visibleNav(MOBILE_NAV, account);
  return (
    // Normal edge-to-edge bottom bar. `pb-safe` keeps the labels off the iPhone
    // home indicator, which otherwise draws straight through them.
    <nav
      aria-label="Primary"
      className={cn(
        "pb-safe fixed inset-x-0 bottom-0 z-30 grid border-t border-border bg-card/95 backdrop-blur lg:hidden",
        items.length === 5 ? "grid-cols-5" : "grid-cols-4",
      )}
    >
      {items.map((item) => {
        const active = isActive(pathname, item);
        const Icon = item.icon;
        // Guests get the sign-in prompt in place rather than a page there's
        // nothing to render for them.
        const gated = !account && requiresAccount(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={
              gated
                ? (e) => {
                    e.preventDefault();
                    openSignInPrompt(item.href);
                  }
                : undefined
            }
            aria-current={active ? "page" : undefined}
            aria-label={
              item.href === "/cart" && cartCount > 0
                ? `${item.label}, ${cartCount} items`
                : undefined
            }
            className={cn(
              // min-h clears Apple's 44px touch target, with a little extra
              // breathing room top and bottom.
              "flex min-h-[3.75rem] flex-col items-center justify-center gap-1 py-3 text-2xs font-semibold transition-colors",
              active ? "text-primary" : "text-muted-foreground",
            )}
          >
            {/* Active tab = a coloured, slightly larger icon (no background puck),
                matching the reference. The Cart tab carries a coral count badge
                when there's anything in the cart, like the header cart. */}
            <span className="relative">
              <Icon className={cn("size-[22px] transition-transform", active && "scale-110")} />
              {item.href === "/cart" && cartCount > 0 ? (
                <span
                  aria-hidden
                  className="absolute -right-2.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-coral px-1 text-[10px] font-bold leading-none text-white"
                >
                  {cartCount}
                </span>
              ) : null}
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export { MobileDrawer, MobileTabBar };
