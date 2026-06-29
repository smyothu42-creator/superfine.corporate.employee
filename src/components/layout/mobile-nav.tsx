"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { MOBILE_NAV, isActive } from "@/lib/nav";
import { Sidebar } from "./sidebar";
import { useUiStore } from "@/store/use-ui-store";
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
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-card/95 backdrop-blur lg:hidden">
      {MOBILE_NAV.map((item) => {
        const active = isActive(pathname, item);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-col items-center gap-1 py-2.5 text-2xs font-semibold transition-colors",
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
