"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { MOBILE_NAV, isActive, visibleNav, requiresAccount } from "@/lib/nav";
import { Sidebar } from "./sidebar";
import { useUiStore } from "@/store/use-ui-store";
import { useSessionStore } from "@/store/use-session-store";
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
  // Auto-Order is corporate-only, so individuals get a 4-tab bar, not 5.
  const items = visibleNav(MOBILE_NAV, account);
  return (
    // `pb-safe` keeps the labels off the home indicator, which otherwise draws
    // straight through them on any modern iPhone.
    <nav
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
            className={cn(
              // min-h-[3.25rem] + the icon puck clears Apple's 44px target.
              "flex min-h-[3.25rem] flex-col items-center justify-center gap-1 py-2.5 text-2xs font-semibold transition-colors",
              active ? "text-primary" : "text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "flex size-9 items-center justify-center rounded-full transition-colors",
                active ? "bg-yellow text-teal-deep" : "bg-transparent",
              )}
            >
              <Icon className="size-5" />
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export { MobileDrawer, MobileTabBar };
