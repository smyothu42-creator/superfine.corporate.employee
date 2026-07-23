"use client";

import { X } from "lucide-react";
import { Sidebar } from "./sidebar";
import { useUiStore } from "@/store/use-ui-store";
import { useDialog } from "@/lib/use-dialog";
import { cn } from "@/lib/utils";

/**
 * Slide-in drawer holding the same Sidebar the desktop rail shows — the whole
 * nav, not the four or five entries a tab bar had room for. Opened from the
 * topbar's hamburger, which is the only phone navigation there is.
 *
 * A real dialog, via the same hook every other layer uses. It used to be a bare
 * `<div>`: no role, no focus trap, no Escape, no focus restore. Worse, when
 * closed it was `aria-hidden` but still parked in the tab order — `aria-hidden`
 * hides an element from a screen reader without removing it from Tab, and
 * `pointer-events-none` stops the mouse but not the keyboard. So a keyboard user
 * tabbing past the hamburger fell into eight invisible offscreen links their
 * screen reader could not describe, and focus appeared to vanish.
 *
 * Mounting it only while open is what fixes that for good: what isn't in the
 * document can't be tabbed into.
 */
function MobileDrawer() {
  const open = useUiStore((s) => s.mobileNavOpen);
  const setOpen = useUiStore((s) => s.setMobileNavOpen);
  const close = () => setOpen(false);
  const dialog = useDialog({ open, onClose: close });

  if (!open) return null;

  return (
    <div className="lg:hidden">
      <div onClick={close} aria-hidden className="fixed inset-0 z-40 bg-teal-deep/50 animate-fade-in" />
      <div
        id="mobile-nav"
        role="dialog"
        aria-modal="true"
        aria-label="Site navigation"
        {...dialog.props}
        className="fixed inset-y-0 left-0 z-50 w-64"
      >
        <button
          type="button"
          onClick={close}
          aria-label="Close navigation"
          className="absolute -right-12 top-3 rounded-full bg-card p-2 text-foreground shadow-card"
        >
          <X className="size-5" aria-hidden />
        </button>
        <Sidebar onNavigate={close} />
      </div>
    </div>
  );
}

export { MobileDrawer };
