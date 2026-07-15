"use client";

import * as React from "react";
import Link from "next/link";
import { Send, PartyPopper, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label } from "@/components/ui/input";
import { useFeedbackStore, type FeedbackEntry } from "@/store/use-feedback-store";
import { cn } from "@/lib/utils";

/**
 * The general feedback form — a single free-text field, plus an optional order
 * number for feedback that's about a specific order. No ratings, no meal
 * reviews, no photo attachments: just a simple, generic way to tell us
 * something. Shared by the full `/feedback` route and the floating-button modal
 * so both stay in lock-step.
 *
 * A blank or unrecognised order number is still accepted (recorded as unverified
 * for the kitchen); a valid one links the feedback and marks it verified.
 *
 * `initialOrder` pre-fills the order number (the `/feedback?order=ORD-2891` deep
 * link, or the FAB opened from an order) and starts the form in "about an order"
 * mode. `onDone`, when provided, is called from the confirmation screen's
 * primary button — the modal uses it to close itself; the standalone page omits
 * it and offers a "Browse the menu" link instead.
 */
export function FeedbackForm({
  initialOrder = "",
  onDone,
}: {
  initialOrder?: string;
  onDone?: () => void;
}) {
  const submitFeedback = useFeedbackStore((s) => s.submit);

  const [relatedToOrder, setRelatedToOrder] = React.useState(initialOrder.trim().length > 0);
  const [orderNumber, setOrderNumber] = React.useState(initialOrder);
  const [message, setMessage] = React.useState("");
  const [submitted, setSubmitted] = React.useState<FeedbackEntry | null>(null);

  const canSubmit = message.trim().length > 0;

  function submit() {
    if (!canSubmit) return;
    const entry = submitFeedback({
      // Only send the order number when the feedback is about an order.
      orderNumber: relatedToOrder ? orderNumber : "",
      message,
      relatedToOrder,
      source: "public",
    });
    setSubmitted(entry);
  }

  if (submitted) return <ThankYou entry={submitted} onDone={onDone} />;

  return (
    <div className="space-y-5">
      {/* Is this about an order? (Yes/No) */}
      <div>
        <Label>Is your feedback about an order?</Label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Yes", value: true },
            { label: "No", value: false },
          ].map((opt) => (
            <button
              key={opt.label}
              type="button"
              aria-pressed={relatedToOrder === opt.value}
              onClick={() => setRelatedToOrder(opt.value)}
              className={cn(
                "rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors",
                relatedToOrder === opt.value
                  ? "border-primary bg-teal-wash text-teal-deep"
                  : "border-border bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Order number (optional) — only relevant when it's about an order */}
      {relatedToOrder ? (
        <div>
          <Label htmlFor="fb-order">
            Order number{" "}
            <span className="font-normal normal-case text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="fb-order"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="e.g. ORD-2891, from your receipt or delivery label"
            autoComplete="off"
          />
        </div>
      ) : null}

      {/* Free-text feedback */}
      <div>
        <Label htmlFor="fb-message">Your feedback</Label>
        <Textarea
          id="fb-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell us what's on your mind."
          maxLength={800}
        />
      </div>

      <Button block size="lg" disabled={!canSubmit} onClick={submit}>
        <Send className="size-4" /> Submit feedback
      </Button>
      {!canSubmit ? (
        <p className="text-center text-2xs text-muted-foreground">Add a note to submit.</p>
      ) : null}
    </div>
  );
}

/** Post-submit confirmation — reflects whether the order number verified. */
function ThankYou({ entry, onDone }: { entry: FeedbackEntry; onDone?: () => void }) {
  return (
    <div className="py-4 text-center">
      <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-teal-wash text-primary">
        <PartyPopper className="size-7" />
      </div>
      <h1 className="mt-5 font-display text-2xl font-semibold tracking-tight text-foreground">
        Thanks for your feedback
      </h1>
      <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
        Your note was sent to the kitchen. They read every one.
      </p>

      {/* A verified order gets a positive confirmation; unverified needs nothing. */}
      {entry.verified ? (
        <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-teal-wash px-3.5 py-1.5 text-[13px] font-semibold text-teal-deep">
          <BadgeCheck className="size-4" /> Linked to order {entry.orderId}
        </div>
      ) : null}

      <div className="mt-7">
        {/* In the modal, close and return to wherever they were; on the standalone
            page, send them into the menu. */}
        {onDone ? (
          <Button variant="outline" onClick={onDone}>
            Done
          </Button>
        ) : (
          <Button variant="outline" asChild>
            <Link href="/menu">Browse the menu</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
