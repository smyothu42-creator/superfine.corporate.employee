"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, ShoppingCart, Maximize2, Pencil } from "lucide-react";
import { useUiStore } from "@/store/use-ui-store";
import { useCartStore } from "@/store/use-cart-store";
import { useOrderEditStore } from "@/store/use-order-edit-store";
import { CartPanelBody } from "@/features/cart/cart-view";
import { useDialog } from "@/lib/use-dialog";
import { cn } from "@/lib/utils";

const WIDTH = "w-[400px]";

/**
 * Slide-in cart side panel. On desktop it's a push panel — a flex sibling that
 * collapses its width when closed, so the content shrinks beside it (no
 * overlap). On smaller screens it becomes an overlay drawer with a backdrop.
 */
export function CartPanel() {
  const open = useUiStore((s) => s.cartOpen);
  const close = useUiStore((s) => s.closeCart);
  const count = useCartStore((s) => s.count());
  const editingOrderId = useOrderEditStore((s) => s.editingOrderId);
  const editActive = useOrderEditStore((s) => s.active);
  const pathname = usePathname();

  // The cart belongs to the menu: keep it open across the menu + item pages, and
  // close it anywhere else (e.g. tapping Checkout inside the panel), where the
  // page-level banner takes over.
  //
  // This used to require an active edit session to stay open, because an edit was
  // the only thing that opened the cart *and* navigated in one gesture. Checkout's
  // "Edit order" does the same now, and it isn't an edit session — so the rule is
  // the destination, not the session. Nothing persists `cartOpen`, so a cold load
  // of /menu still starts closed.
  React.useEffect(() => {
    if (pathname.startsWith("/menu")) return;
    close();
  }, [pathname, close]);

  /**
   * Only the small-screen render is a modal. Above `lg` the cart is a push
   * sibling: the page beside it stays scrollable and fully usable, so trapping
   * focus inside it and freezing the body — both of which `useDialog` does —
   * would be wrong there. This is the one thing the CSS breakpoint can't tell
   * us, because `lg:hidden` decides which aside is visible at paint time and
   * the hook has to decide the same thing at render time.
   *
   * Starts false so a server render and the first client paint agree, and so a
   * mistimed lock can never be the thing that freezes the page.
   */
  const [overlay, setOverlay] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023.98px)");
    const sync = () => setOverlay(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const dialog = useDialog({ open: open && overlay, onClose: close });

  // Escape for the desktop push panel, where the hook is deliberately stood
  // down. Gated on `!overlay` so exactly one of the two handlers is ever live —
  // the drawer's Escape is the hook's, and this is the other half of it.
  React.useEffect(() => {
    if (!open || overlay) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, overlay, close]);

  const header = (
    <div
      className={cn(
        "flex items-center justify-between border-b px-4 py-3.5",
        // Editing wears a distinct coral/warning header so it never reads as an
        // ordinary cart — you're changing a placed order, not building a new one.
        editActive ? "border-warning-border bg-warning-bg" : "border-control",
      )}
    >
      {editActive ? (
        <h2 className="flex items-center gap-2 font-display text-base font-semibold tracking-tight text-coral-deep">
          <Pencil className="size-4" />
          Editing {editingOrderId}
        </h2>
      ) : (
        <h2 className="flex items-center gap-2 font-display text-base font-semibold tracking-tight">
          <ShoppingCart className="size-4 text-primary" />
          Your cart
          {count > 0 ? (
            <span className="rounded-full bg-coral px-1.5 text-2xs font-bold text-white">{count}</span>
          ) : null}
        </h2>
      )}
      {/* gap-2 so the two icons' 44px touch boxes don't overlap on a phone. */}
      <div className="flex items-center gap-2">
        <Link
          href="/cart"
          onClick={close}
          aria-label="Open cart as full page"
          title="View as full page"
          className="rounded-full border border-control bg-card touch-target p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Maximize2 className="size-4" />
        </Link>
        <button
          type="button"
          onClick={close}
          aria-label="Close cart"
          className="rounded-full border border-control bg-card touch-target p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );

  /**
   * What a closed panel owes the rest of the page: nothing.
   *
   * Both panels stay mounted so they can animate, which meant that when the cart
   * was shut its controls were still in the tab order and still readable by a
   * screen reader. Tab past the last control on the page and you landed inside
   * an invisible cart — offscreen, so the view didn't follow, and focus simply
   * appeared to disappear. `inert` takes an element out of both the tab order
   * and the accessibility tree without touching how it looks, so the transition
   * is unchanged.
   *
   * Spread rather than written inline: `inert` isn't in React 18's JSX types.
   */
  const closedOff = open ? {} : ({ inert: "", "aria-hidden": true } as Record<string, unknown>);

  return (
    <>
      {/* Desktop: push panel — collapses width so the content shrinks, no overlap */}
      <aside
        aria-label="Cart"
        {...closedOff}
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 overflow-hidden border-l bg-card transition-[width] duration-300 ease-out lg:block",
          editActive ? "border-warning-border" : "border-control",
          open ? WIDTH : "w-0",
        )}
      >
        <div
          className={cn(
            "flex h-full flex-col transition-transform duration-300 ease-out",
            WIDTH,
            open ? "translate-x-0" : "translate-x-full",
          )}
        >
          {header}
          <CartPanelBody />
        </div>
      </aside>

      {/* Mobile / tablet: overlay drawer with backdrop */}
      <div className="lg:hidden">
        <div
          onClick={close}
          aria-hidden
          className={cn(
            "fixed inset-0 z-40 bg-black/50 transition-opacity duration-300",
            open ? "opacity-100" : "pointer-events-none opacity-0",
          )}
        />
        <aside
          aria-label="Cart"
          // Only announced as a modal while it's actually covering the page —
          // the closed drawer is parked offscreen, not holding the page inert.
          role={open && overlay ? "dialog" : undefined}
          aria-modal={open && overlay ? true : undefined}
          {...closedOff}
          {...dialog.props}
          className={cn(
            "fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col bg-background transition-transform duration-300 ease-out",
            // Shadow only while open — offscreen at translate-x-full its blur
            // still bleeds back into the viewport as a grey strip on the right.
            open ? "translate-x-0 shadow-raised" : "translate-x-full",
          )}
        >
          {header}
          <CartPanelBody />
        </aside>
      </div>
    </>
  );
}
