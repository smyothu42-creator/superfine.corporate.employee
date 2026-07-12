"use client";

import * as React from "react";
import { Star, X, ImagePlus, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label } from "@/components/ui/input";
import { toast } from "@/store/use-toast-store";
import { useFeedbackStore } from "@/store/use-feedback-store";
import { cn } from "@/lib/utils";

const RATING_WORDS = ["", "Poor", "Fair", "Good", "Great", "Loved it"];

/**
 * Lightweight in-platform feedback form for a delivered order. Captures a star
 * rating + a short title (both required), with an optional description and one
 * optional photo. Modeled on the app's other bottom-sheet/centered modals; the
 * photo stays client-side (object URL preview) since there's no upload backend.
 */
export function FeedbackModal({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const [shown, setShown] = React.useState(false);
  const [rating, setRating] = React.useState(0);
  const [hover, setHover] = React.useState(0);
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [photo, setPhoto] = React.useState<{ url: string; name: string } | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
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
  // Free the object URL when the preview changes or the modal unmounts.
  React.useEffect(() => {
    return () => {
      if (photo) URL.revokeObjectURL(photo.url);
    };
  }, [photo]);

  const shownStars = hover || rating;
  const canSubmit = rating > 0 && title.trim().length > 0;

  function pickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (photo) URL.revokeObjectURL(photo.url);
    setPhoto({ url: URL.createObjectURL(file), name: file.name });
    // Reset so re-selecting the same file still fires onChange.
    e.target.value = "";
  }

  function removePhoto() {
    if (photo) URL.revokeObjectURL(photo.url);
    setPhoto(null);
  }

  function submit() {
    if (!canSubmit) return;
    // A real, signed-in order — records to the same admin store as the public
    // form, resolving as verified since the order number exists.
    submitFeedback({
      orderNumber: orderId,
      rating,
      review: [title.trim(), description.trim()].filter(Boolean).join(". "),
      photoName: photo?.name ?? null,
      source: "past-order",
    });
    toast.success("Thanks for your feedback", `Your ${rating}-star review of ${orderId} was sent to the kitchen.`);
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
            <h3 className="font-display text-lg font-semibold tracking-tight">How was it?</h3>
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
          {/* Star rating */}
          <div>
            <div className="flex items-center justify-center gap-1.5" onMouseLeave={() => setHover(0)}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-label={`${n} star${n === 1 ? "" : "s"}`}
                  aria-pressed={rating === n}
                  onMouseEnter={() => setHover(n)}
                  onClick={() => setRating(n)}
                  // Real padding, not a `touch-target` overlay: five stars in a
                  // row would give each an invisible box overlapping its
                  // neighbours, and a tap meant for 4 would register as 5.
                  className="rounded-full p-1.5 transition-transform hover:scale-110"
                >
                  <Star
                    className={cn(
                      "size-8 transition-colors",
                      n <= shownStars ? "fill-yellow text-yellow" : "fill-transparent text-muted-foreground/40",
                    )}
                  />
                </button>
              ))}
            </div>
            <p className="mt-1 h-4 text-center text-2xs font-semibold text-muted-foreground">
              {RATING_WORDS[shownStars] ?? ""}
            </p>
          </div>

          {/* Comment title (required) */}
          <div>
            <Label htmlFor="feedback-title">Title</Label>
            <Input
              id="feedback-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Sum it up in a few words"
              maxLength={80}
            />
          </div>

          {/* Optional description */}
          <div>
            <Label htmlFor="feedback-desc">
              Details <span className="font-normal normal-case text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="feedback-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Anything on the meal, portion, freshness or delivery?"
              maxLength={500}
            />
          </div>

          {/* Optional photo */}
          <div>
            <Label>
              Photo <span className="font-normal normal-case text-muted-foreground">(optional)</span>
            </Label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={pickPhoto}
              className="hidden"
            />
            {photo ? (
              <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-2.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url} alt="Selected meal" className="size-14 shrink-0 rounded-lg object-cover" />
                <span className="min-w-0 flex-1 truncate text-[13px] text-muted-foreground">{photo.name}</span>
                <button
                  type="button"
                  onClick={removePhoto}
                  aria-label="Remove photo"
                  className="shrink-0 rounded-full border border-border bg-card touch-target p-1.5 text-muted-foreground hover:bg-muted hover:text-danger"
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card px-3 py-3 text-[13px] font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted/50 hover:text-foreground"
              >
                <ImagePlus className="size-4" /> Add a photo
              </button>
            )}
          </div>
        </div>

        <div className="shrink-0 border-t border-border px-5 py-4">
          <Button block size="lg" disabled={!canSubmit} onClick={submit}>
            <Send className="size-4" /> Submit feedback
          </Button>
          {!canSubmit ? (
            <p className="mt-2 text-center text-2xs text-muted-foreground">
              Add a rating and a title to submit.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
