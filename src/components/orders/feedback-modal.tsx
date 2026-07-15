"use client";

import * as React from "react";
import { X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea, Label } from "@/components/ui/input";
import { toast } from "@/store/use-toast-store";
import { useFeedbackStore } from "@/store/use-feedback-store";
import { cn } from "@/lib/utils";

/**
 * Lightweight in-platform feedback form for a specific order. A single free-text
 * note tied to the order — no ratings, no meal reviews, no photo attachments,
 * matching the generic feedback form used everywhere else. Modeled on the app's
 * other bottom-sheet/centered modals.
 */
export function FeedbackModal({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const [shown, setShown] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const submitFeedback = useFeedbackStore((s) => s.submit);

  React.useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

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
    toast.success("Thanks for your feedback", `Your note about ${orderId} was sent to the kitchen.`);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={`Leave feedback for ${orderId}`}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className={cn("absolute inset-0 bg-black/50 transition-opacity", shown ? "opacity-100" : "opacity-0")}
      />
      <div
        className={cn(
          "relative flex max-h-[90dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-card shadow-raised transition-all duration-200 sm:rounded-3xl",
          shown ? "translate-y-0 sm:scale-100 sm:opacity-100" : "translate-y-full sm:translate-y-0 sm:scale-95 sm:opacity-0",
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h3 className="font-display text-lg font-semibold tracking-tight">Share your feedback</h3>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              A quick note on {orderId}. The kitchen reads every one.
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
          {/* Free-text feedback */}
          <div>
            <Label htmlFor="feedback-message">Your feedback</Label>
            <Textarea
              id="feedback-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us what's on your mind."
              maxLength={500}
            />
          </div>
        </div>

        <div className="shrink-0 border-t border-border px-5 py-4">
          <Button block size="lg" disabled={!canSubmit} onClick={submit}>
            <Send className="size-4" /> Submit feedback
          </Button>
          {!canSubmit ? (
            <p className="mt-2 text-center text-2xs text-muted-foreground">Add a note to submit.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
