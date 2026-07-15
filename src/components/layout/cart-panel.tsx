"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, ShoppingCart, Maximize2, Pencil } from "lucide-react";
import { useUiStore } from "@/store/use-ui-store";
import { useCartStore } from "@/store/use-cart-store";
import { useOrderEditStore } from "@/store/use-order-edit-store";
import { CartPanelBody } from "@/features/cart/cart-view";
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

  // Close when navigating (e.g. tapping Checkout inside the panel). While actively
  // editing a placed order the cart is the edit workspace, so keep it open across
  // the menu + item pages; leaving the menu for another section still closes it
  // (and the page-level banner takes over there). Read the edit state fresh so
  // this effect only fires on real navigation, not when the session starts/ends.
  React.useEffect(() => {
    const { active } = useOrderEditStore.getState();
    if (active && pathname.startsWith("/menu")) return;
    close();
  }, [pathname, close]);

  // Close on Escape.
  React.useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  const header = (
    <div
      className={cn(
        "flex items-center justify-between border-b px-4 py-3.5",
        // Editing wears a distinct coral/warning header so it never reads as an
        // ordinary cart — you're changing a placed order, not building a new one.
        editActive ? "border-warning-border bg-warning-bg" : "border-border",
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
          className="rounded-full border border-border bg-card touch-target p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Maximize2 className="size-4" />
        </Link>
        <button
          type="button"
          onClick={close}
          aria-label="Close cart"
          className="rounded-full border border-border bg-card touch-target p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop: push panel — collapses width so the content shrinks, no overlap */}
      <aside
        aria-label="Cart"
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 overflow-hidden border-l bg-card transition-[width] duration-300 ease-out lg:block",
          editActive ? "border-warning-border" : "border-border",
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
