"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { RateItems } from "@/features/ratings/rate-items";
import { useDialog } from "@/lib/use-dialog";
import { fromISODate, formatDay } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { Order } from "@/data/types";

/**
 * Rate one meal, in place.
 *
 * The dedicated page (`/rate`) is the flow for "I want to say something about
 * lunch" arriving cold. This is the other case: already looking at a past order
 * in My Orders, one meal in it worth a word. Navigating away to a page and back
 * for a single tap of a star would cost more than the rating is worth, so this
 * one stays a sheet.
 *
 * It is the same {@link RateItems} underneath — scoped to one line — so the star
 * control, the tags, the 24-hour lock and the submit path cannot drift from the
 * page's.
 */
export function RateItemModal({
  order,
  lineId,
  itemName,
  onClose,
}: {
  order: Order;
  lineId: string;
  itemName: string;
  onClose: () => void;
}) {
  const [shown, setShown] = React.useState(false);

  React.useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Mounted only while open, so it is open for its whole life. Supplies the
  // focus trap, Escape, focus restore and the scroll lock.
  const dialog = useDialog({ open: true, onClose });

  /**
   * Portalled to `<body>`, because the caller renders this from inside an order
   * card — and that card is `overflow-hidden` with a transform on hover, either
   * of which makes it the containing block for `position: fixed` and clips a
   * full-screen overlay down to the card.
   *
   * The portal is only half the job. React events bubble through the *React*
   * tree, not the DOM one, so a click on a star still reaches the card's own
   * `onClick` — which is a `router.push` to the order detail page. That fired on
   * the first star press, navigating away and unmounting this sheet mid-rating.
   * Hence the `stopPropagation` on the root below: it is load-bearing, not
   * defensive.
   */
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
    <div
      onClick={(e) => e.stopPropagation()}
      className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center"
    >
      <div
        aria-hidden
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-black/50 transition-opacity",
          shown ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="rate-item-title"
        {...dialog.props}
        className={cn(
          "relative flex max-h-[90dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-card shadow-raised transition-all duration-200 sm:rounded-3xl",
          shown
            ? "translate-y-0 sm:scale-100 sm:opacity-100"
            : "translate-y-full sm:translate-y-0 sm:scale-95 sm:opacity-0",
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2 id="rate-item-title" className="font-display text-lg font-semibold tracking-tight">
              Rate this meal
            </h2>
            <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
              {itemName} · delivered {formatDay(fromISODate(order.date))}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="touch-target flex size-8 shrink-0 items-center justify-center rounded-full border border-control bg-card text-muted-foreground transition-colors hover:bg-muted"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <RateItems order={order} lineId={lineId} source="account" onDone={onClose} compact />
        </div>
      </div>
    </div>,
    document.body,
  );
}
