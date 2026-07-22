"use client";

import * as React from "react";
import Link from "next/link";
import { Send, PartyPopper, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label } from "@/components/ui/input";
import { useFeedbackStore, type FeedbackEntry } from "@/store/use-feedback-store";
import { cn } from "@/lib/utils";

/**
 * The order-problem form — a single free-text field, plus an optional order
 * number when it's about a specific delivery. Deliberately star-free: this is
 * the logistics door (late, missing, wrong, mischarged) and the stars on
 * `/rate` are the food door, because a delivery that never arrived used to come
 * back as a one-star recipe and the kitchen changed a dish that was fine.
 *
 * The same component behind every entrance — the `/feedback` route, the `/rate`
 * note view, signed in or out — so the wording someone meets is the same
 * wherever they came from and there is one place to change it.
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
        <Label>Is this about a specific order?</Label>
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

      {/* Free-text report. The label follows the answer above: about an order,
          it's a problem; otherwise it's anything at all, and pretending a
          suggestion about packaging is a fault would be its own confusion. */}
      <div>
        <Label htmlFor="fb-message">
          {relatedToOrder ? "What went wrong?" : "What's on your mind?"}
        </Label>
        <Textarea
          id="fb-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={
            relatedToOrder
              ? "e.g. it arrived an hour late, a meal was missing, or I was charged twice."
              : "Anything about the service, the app, or your workplace plan."
          }
          maxLength={800}
        />
      </div>

      {/* The other door, named where the mistake gets made. */}
      <p className="rounded-2xl bg-muted/60 p-3.5 text-2xs text-muted-foreground">
        Was it the food itself?{" "}
        <Link
          href={orderNumber.trim() ? `/rate?order=${orderNumber.trim()}` : "/rate"}
          className="font-semibold text-primary underline underline-offset-2"
        >
          Rate the meals
        </Link>{" "}
        instead — stars go to the kitchen and only cover how the meal was.
      </p>

      <Button block size="lg" disabled={!canSubmit} onClick={submit}>
        <Send className="size-4" /> {relatedToOrder ? "Report the problem" : "Send to our team"}
      </Button>
      {!canSubmit ? (
        <p className="text-center text-2xs text-muted-foreground">Add a few words to submit.</p>
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
        Thanks — we&apos;re on it
      </h1>
      <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
        Your note went to our operations team. They read every one, and they&apos;ll come back to
        you if there&apos;s anything to put right.
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
