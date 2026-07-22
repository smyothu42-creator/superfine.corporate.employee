"use client";

import * as React from "react";
import Link from "next/link";
import { X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea, Label } from "@/components/ui/input";
import { toast } from "@/store/use-toast-store";
import { useFeedbackStore } from "@/store/use-feedback-store";
import { useDialog } from "@/lib/use-dialog";
import { cn } from "@/lib/utils";

/**
 * The order-problem sheet — logistics only: a late, missing, wrong or
 * mischarged delivery, tied to one order. A single free-text note, no stars.
 *
 * The stars deliberately live nowhere near it. When one control took both
 * "the driver never came" and "the Bibimbap was bland", the first arrived as a
 * one-star recipe score and the kitchen re-worked a dish that was never the
 * problem. Two doors, two inboxes, and copy at every entrance that says which
 * is which. Modeled on the app's other bottom-sheet/centered modals.
 */
export function FeedbackModal({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const [shown, setShown] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const submitFeedback = useFeedbackStore((s) => s.submit);

  React.useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);
  // Mounted only while it's up, so it's open for its whole life.
  const dialog = useDialog({ open: true, onClose });

  const canSubmit = message.trim().length > 0;

  function submit() {
    if (!canSubmit) return;
    // A real, signed-in order — records to the same admin store as the public
    // form, resolving as verified since the order number exists.
    submitFeedback({
      orderNumber: orderId,
      message: message.trim(),
      relatedToOrder: true,
      source: "past-order",
    });
    toast.success("Thanks — we're on it", `Your report about ${orderId} went to our operations team.`);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className={cn("absolute inset-0 bg-black/50 transition-opacity", shown ? "opacity-100" : "opacity-0")}
      />
      {/* The dialog is the sheet, not the box that also holds the scrim, so the
          trap ends where the panel does. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Report a problem with order ${orderId}`}
        {...dialog.props}
        className={cn(
          "relative flex max-h-[90dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-card shadow-raised transition-all duration-200 sm:rounded-3xl",
          shown ? "translate-y-0 sm:scale-100 sm:opacity-100" : "translate-y-full sm:translate-y-0 sm:scale-95 sm:opacity-0",
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h3 className="font-display text-lg font-semibold tracking-tight">
              Problem with your order?
            </h3>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              Late, missing, wrong item, or a billing issue with {orderId}. Goes to our operations
              team.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full border border-border bg-card touch-target p-1.5 text-muted-foreground hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          {/* Free-text report */}
          <div>
            <Label htmlFor="feedback-message">What went wrong?</Label>
            <Textarea
              id="feedback-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g. it arrived an hour late, a meal was missing, or I was charged twice."
              maxLength={500}
            />
          </div>

          {/* The other door, named at the point of confusion — someone who came
              here to say the salad was bland should leave with stars, not a
              logistics ticket. */}
          <p className="rounded-2xl bg-muted/60 p-3.5 text-2xs text-muted-foreground">
            Was it the food itself?{" "}
            <Link
              href={`/rate?order=${orderId}`}
              onClick={onClose}
              className="font-semibold text-primary underline underline-offset-2"
            >
              Rate the meals
            </Link>{" "}
            instead — star ratings go to the kitchen and only cover how the meal was.
          </p>
        </div>

        <div className="shrink-0 border-t border-border px-5 py-4">
          <Button block size="lg" disabled={!canSubmit} onClick={submit}>
            <Send className="size-4" /> Report the problem
          </Button>
          {!canSubmit ? (
            <p className="mt-2 text-center text-2xs text-muted-foreground">
              Add a few words to submit.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
