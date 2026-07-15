"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Pencil, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUiStore } from "@/store/use-ui-store";
import { useOrderEdit } from "@/features/orders/use-order-edit";

/**
 * A persistent "you're editing an order" bar. It sticks just under the topbar so
 * it stays in view while the page scrolls, and publishes its own height as the
 * `--edit-banner-h` CSS variable so a page's own sticky header (the menu greeting,
 * the checkout steps) can stack *below* it instead of colliding.
 *
 * Hidden while the cart is open — the cart carries its own editing box + controls.
 */
export function OrderEditBanner() {
  const { editingOrderId, discardEdit, resumeEdit } = useOrderEdit();
  const cartOpen = useUiStore((s) => s.cartOpen);
  const pathname = usePathname();
  const ref = React.useRef<HTMLDivElement>(null);

  // The banner only belongs on two pages: the menu (where editing happens) and
  // the My Orders list. Everywhere else — an order's detail page, a meal's detail
  // page, checkout, account, Auto-Order… — it would just be noise.
  const onMenu = pathname === "/menu";
  const onOrders = pathname === "/orders";

  const show = Boolean(editingOrderId) && !cartOpen && (onMenu || onOrders);

  // Publish the bar's height (0 when hidden) so sticky page headers offset by it.
  React.useEffect(() => {
    const root = document.documentElement;
    const el = ref.current;
    if (!show || !el) {
      root.style.setProperty("--edit-banner-h", "0px");
      return;
    }
    const set = () => root.style.setProperty("--edit-banner-h", `${el.offsetHeight}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.style.setProperty("--edit-banner-h", "0px");
    };
  }, [show]);

  if (!show) return null;

  // Both pages the banner shows on (the menu and My Orders) should offer to jump
  // back into the edit — "Continue editing" reopens the cart workspace over the
  // menu and reloads the order's meals.
  const showResume = true;

  return (
    <div
      ref={ref}
      className="sticky top-16 z-30 -mx-4 bg-background px-4 pb-3 pt-1 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
    >
      <div className="flex items-center gap-3 rounded-2xl border border-warning-border bg-warning-bg px-3 py-2.5 sm:px-4">
        {/* Icon chip */}
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-warning-border bg-card text-coral-deep sm:size-10">
          <Pencil className="size-4 sm:size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-coral-deep">Editing {editingOrderId}</p>
          <p className="truncate text-[13px] text-coral-deep/80">Your changes aren&apos;t saved yet.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button size="sm" variant="ghost" onClick={discardEdit}>
            <X className="size-4" /> Discard
          </Button>
          {showResume ? (
            <Button size="sm" onClick={resumeEdit}>
              Continue editing <ArrowRight className="size-4" />
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
