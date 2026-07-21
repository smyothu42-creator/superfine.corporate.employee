"use client";

import * as React from "react";
import { X, Star, PenLine, ChevronRight, ArrowLeft } from "lucide-react";
import { FeedbackForm } from "@/features/feedback/feedback-form";
import { RateItems } from "@/features/ratings/rate-items";
import { useUiStore } from "@/store/use-ui-store";
import { useSessionStore } from "@/store/use-session-store";
import { useOrdersStore } from "@/store/use-orders-store";
import { useRatingsStore } from "@/store/use-ratings-store";
import { useDialog } from "@/lib/use-dialog";
import { fromISODate, formatDay } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { Order } from "@/data/types";

/**
 * The door to both kinds of feedback, in a bottom-sheet (mobile) / centered
 * (desktop) modal. Mounted by the shell on every page and opened from the
 * store — the rail's "Share your feedback" link, and "Leave feedback" on a past
 * order.
 *
 * Two paths, kept apart all the way down to their stores: rating the meals
 * (an opinion about a recipe, {@link useRatingsStore}) and telling us something
 * (a wrong order, a refund to chase, {@link useFeedbackStore}). One door because
 * "I want to say something about my lunch" is one intent at the moment it's
 * felt; two destinations because a 1-star Bibimbap and a missing delivery need
 * different people to read them. The rating path never asks about refunds and
 * the note path never asks for stars.
 */

type Pane = "choose" | "rate" | "note";
function FeedbackModal() {
  const isOpen = useUiStore((s) => s.feedbackModalOpen);
  const order = useUiStore((s) => s.feedbackModalOrder);
  const close = useUiStore((s) => s.closeFeedbackModal);
  const account = useSessionStore((s) => s.account);
  const orders = useOrdersStore((s) => s.orders);
  const ratings = useRatingsStore((s) => s.ratings);
  const [shown, setShown] = React.useState(false);
  const [pane, setPane] = React.useState<Pane>("choose");

  /**
   * The order the rating path opens on: the one this sheet was opened *from*
   * ("Leave feedback" on an order), else the most recent delivery that still
   * has something left to rate.
   *
   * "Most recent delivery" alone was wrong — rate the one meal in yesterday's
   * order and the whole rating path disappeared, while three unrated meals sat
   * in the delivery before it. Newest-with-work-left keeps the door open for as
   * long as there is anything behind it.
   */
  const { rateable, unrated } = React.useMemo(() => {
    const left = (o: Order) => {
      const rated = new Set(ratings.filter((r) => r.orderId === o.id).map((r) => r.lineId));
      return o.days.flatMap((d) => d.items).filter((i) => !rated.has(i.lineId)).length;
    };
    const delivered = orders
      .filter((o) => o.status === "delivered")
      .sort((a, b) => b.date.localeCompare(a.date));
    // An order named by the caller wins even if it's fully rated — the sheet was
    // opened *from* it, and silently swapping in a different order's meals is
    // worse than showing a rated one.
    const named = order ? delivered.find((o) => o.id === order) : undefined;
    const target = named ?? delivered.find((o) => left(o) > 0) ?? delivered[0] ?? null;
    return { rateable: target, unrated: target ? left(target) : 0 };
  }, [orders, order, ratings]);

  // Guests have no orders to rate, so there is nothing to choose between and the
  // sheet is the note form it has always been.
  const canRate = Boolean(account && rateable && unrated > 0);

  /**
   * The order the rate pane is *showing*, pinned the moment it opens.
   *
   * Without the pin, submitting the last unrated meal of an order made
   * `rateable` fall through to the next one — swapping the meals out from under
   * the thank-you screen, so the sheet said "delivered Tue" about ratings just
   * left on Wednesday's lunch. The picker chooses where to start; once started,
   * the sheet stays on that order until it closes.
   */
  const [pinnedId, setPinnedId] = React.useState<string | null>(null);
  const rating = React.useMemo(
    () => orders.find((o) => o.id === pinnedId) ?? rateable,
    [orders, pinnedId, rateable],
  );

  // Every open starts at the fork, not wherever the last one was abandoned.
  React.useEffect(() => {
    if (!isOpen) return;
    setPane(canRate ? "choose" : "note");
    setPinnedId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  function openRatePane() {
    setPinnedId(rateable?.id ?? null);
    setPane("rate");
  }

  // Drive the enter transition on mount. Escape, the focus trap, focus restore
  // and the scroll lock all come from useDialog now.
  React.useEffect(() => {
    if (!isOpen) {
      setShown(false);
      return;
    }
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, [isOpen]);

  // Called above the early return so the hook count holds on closed renders.
  const dialog = useDialog({ open: isOpen, onClose: close });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close"
        onClick={close}
        className={cn("absolute inset-0 bg-black/50 transition-opacity", shown ? "opacity-100" : "opacity-0")}
      />
      {/* The dialog is the sheet, not the box that also holds the scrim, so the
          trap ends where the panel does. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-modal-title"
        {...dialog.props}
        className={cn(
          "relative flex max-h-[90dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-card shadow-raised transition-all duration-200 sm:rounded-3xl",
          shown
            ? "translate-y-0 sm:scale-100 sm:opacity-100"
            : "translate-y-full sm:translate-y-0 sm:scale-95 sm:opacity-0",
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex min-w-0 items-start gap-2">
            {/* Back only from a pane there was a fork to arrive from — with one
                path available the sheet opens straight into it, and a back
                arrow to a choice that was never offered is a dead end. */}
            {pane !== "choose" && canRate ? (
              <button
                type="button"
                onClick={() => setPane("choose")}
                aria-label="Back"
                className="mt-0.5 shrink-0 rounded-full touch-target p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <ArrowLeft className="size-4" />
              </button>
            ) : null}
            <div className="min-w-0">
              <h3 id="feedback-modal-title" className="font-display text-lg font-semibold tracking-tight">
                {pane === "rate" ? "Rate your meals" : "Share your feedback"}
              </h3>
              <p className="mt-0.5 text-[13px] text-muted-foreground">
                {pane === "rate" && rating
                  ? `Delivered ${formatDay(fromISODate(rating.date))} · rate what you'd like`
                  : "A few words is all it takes. The kitchen reads every one."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="shrink-0 rounded-full border border-border bg-card touch-target p-1.5 text-muted-foreground hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {pane === "choose" && rateable ? (
            <div className="space-y-2.5">
              <PathCard
                icon={Star}
                title="Rate your meals"
                subtitle={`${formatDay(fromISODate(rateable.date))} · ${unrated} to rate`}
                onClick={openRatePane}
              />
              <PathCard
                icon={PenLine}
                title="Tell us something else"
                subtitle="A wrong order, a refund, or a note to the kitchen"
                onClick={() => setPane("note")}
              />
            </div>
          ) : pane === "rate" && rating ? (
            <RateItems order={rating} source="account" onDone={close} compact />
          ) : (
            <FeedbackForm initialOrder={order ?? ""} onDone={close} />
          )}
        </div>
      </div>
    </div>
  );
}

/** One of the two ways in, as a row you press. */
function PathCard({
  icon: Icon,
  title,
  subtitle,
  onClick,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3.5 text-left transition-colors hover:bg-muted/50"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-teal-wash text-primary">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-semibold">{title}</span>
        <span className="block truncate text-2xs text-muted-foreground">{subtitle}</span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

export { FeedbackModal };
