"use client";

import { X } from "lucide-react";
import { Sidebar } from "./sidebar";
import { useUiStore } from "@/store/use-ui-store";
import { cn } from "@/lib/utils";

/**
 * Slide-in drawer holding the same Sidebar the desktop rail shows — the whole
 * nav, not the four or five entries a tab bar had room for. Opened from the
 * topbar's hamburger, which is the only phone navigation there is.
 */
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

export { MobileDrawer };
