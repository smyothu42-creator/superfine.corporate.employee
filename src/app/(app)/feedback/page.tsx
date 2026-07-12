"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Star, ImagePlus, Send, X, PartyPopper, BadgeCheck, MessageSquareHeart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label } from "@/components/ui/input";
import { useFeedbackStore, type FeedbackEntry } from "@/store/use-feedback-store";
import { cn } from "@/lib/utils";

const RATING_WORDS = ["", "Poor", "Fair", "Good", "Great", "Loved it"];

/**
 * In-app feedback screen. It renders inside the app shell (sidebar + topbar) —
 * the "Feedback" rail item lands here. The content itself borrows the sign-in
 * screen's two-column shape: a branded illustration + copy on the left, the form
 * on the right, collapsing to just the form on phones (the panel is hidden,
 * exactly as the sign-in hero is). No account is required and the whole flow
 * stays in the app.
 *
 * The order number is optional. If it's blank or doesn't match a real order the
 * feedback is still accepted — it's simply recorded as unverified for the
 * kitchen (see {@link useFeedbackStore}). A valid order number links the review
 * and marks it verified.
 *
 * Deep-linkable: `/feedback?order=ORD-2891` pre-fills the number, which is how
 * the "Leave feedback" action on a past order arrives here already verified.
 */
export default function FeedbackPage() {
  return (
    // Full-bleed: cancel the app shell's content padding (and its reserved
    // tab-bar space) so the two panels touch all four edges of the content area
    // instead of floating as a centered card. `4rem` is the topbar height.
    <div className="-mx-4 -mt-6 -mb-tab-bar sm:-mx-6 lg:-mx-8">
      <div className="grid lg:min-h-[calc(100dvh-4rem)] lg:grid-cols-2">
        {/* Left panel: the same login-page hero (logo, headline, copy, green
            line) in the Auto-Order header's lemon-yellow/teal palette — but with
            no background illustration. */}
        <FeedbackHero />
        {/* Form fills the right half and centres on desktop; on mobile it's the
            whole width and keeps clearance above the fixed tab bar. */}
        <div className="flex flex-col justify-center bg-card p-6 pb-tab-bar sm:p-10 lg:p-12">
          <div className="mx-auto w-full max-w-md">
            <React.Suspense fallback={<div className="h-[520px]" />}>
              <FeedbackForm />
            </React.Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Left panel — mirrors the sign-in hero (logo, headline, supporting copy, and
 * the green-business line) in the Auto-Order header's lemon-yellow / teal-deep
 * palette. Unlike the shared {@link AuthHero} it carries no food-doodle backdrop.
 * Hidden on phones, where the form takes the whole width.
 */
function FeedbackHero() {
  return (
    <div className="relative hidden flex-col justify-center bg-hero-yellow p-10 text-teal-deep lg:flex">
      <div className="max-w-md">
        {/* White-wash icon chip — the same treatment the Auto-Order header uses. */}
        <span className="flex size-16 items-center justify-center rounded-full bg-white/40 text-teal-deep">
          <MessageSquareHeart className="size-8" />
        </span>
        <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.1] tracking-tight text-teal-deep">
          Loved it? Tell us.<br />Missed the mark? Tell us too.
        </h1>
        <p className="mt-4 text-base leading-relaxed text-teal-deep/80">
          A quick rating, a few words, maybe a photo. That&apos;s all it takes. Every review lands
          straight with the chef who made your meal, and we read them all.
        </p>
      </div>
      {/* Pinned to the bottom of the panel, as before. */}
      <p className="absolute inset-x-10 bottom-10 text-[13px] font-medium text-teal-deep/80">
        Certified SF Green Business · Made daily in our SF kitchen
      </p>
    </div>
  );
}

function FeedbackForm() {
  const params = useSearchParams();
  const submitFeedback = useFeedbackStore((s) => s.submit);

  const [orderNumber, setOrderNumber] = React.useState(params.get("order") ?? "");
  const [rating, setRating] = React.useState(0);
  const [hover, setHover] = React.useState(0);
  const [review, setReview] = React.useState("");
  const [photo, setPhoto] = React.useState<{ url: string; name: string } | null>(null);
  const [submitted, setSubmitted] = React.useState<FeedbackEntry | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  // Free the object URL when the preview changes or the page unmounts.
  React.useEffect(() => {
    return () => {
      if (photo) URL.revokeObjectURL(photo.url);
    };
  }, [photo]);

  const shownStars = hover || rating;
  const canSubmit = rating > 0;

  function pickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (photo) URL.revokeObjectURL(photo.url);
    setPhoto({ url: URL.createObjectURL(file), name: file.name });
    e.target.value = "";
  }

  function removePhoto() {
    if (photo) URL.revokeObjectURL(photo.url);
    setPhoto(null);
  }

  function submit() {
    if (!canSubmit) return;
    const entry = submitFeedback({
      orderNumber,
      rating,
      review,
      photoName: photo?.name ?? null,
      source: "public",
    });
    setSubmitted(entry);
  }

  if (submitted) return <ThankYou entry={submitted} />;

  return (
    <div>
      <div className="space-y-5">
        {/* Star rating (required) */}
        <div>
          <Label>Your rating</Label>
          <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                aria-label={`${n} star${n === 1 ? "" : "s"}`}
                aria-pressed={rating === n}
                onMouseEnter={() => setHover(n)}
                onClick={() => setRating(n)}
                className="rounded-full p-2 transition-transform hover:scale-110 sm:p-1"
              >
                <Star
                  className={cn(
                    "size-8 transition-colors",
                    n <= shownStars ? "fill-yellow text-yellow" : "fill-transparent text-muted-foreground/40",
                  )}
                />
              </button>
            ))}
            <span className="ml-2 text-[13px] font-semibold text-muted-foreground">
              {RATING_WORDS[shownStars] ?? ""}
            </span>
          </div>
        </div>

        {/* Order number (optional) */}
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

        {/* Written review / details */}
        <div>
          <Label htmlFor="fb-review">
            Your review{" "}
            <span className="font-normal normal-case text-muted-foreground">(optional)</span>
          </Label>
          <Textarea
            id="fb-review"
            value={review}
            onChange={(e) => setReview(e.target.value)}
            placeholder="What did you think of the meal, portion, freshness or delivery?"
            maxLength={800}
          />
        </div>

        {/* Photo upload (optional) */}
        <div>
          <Label>
            Photo{" "}
            <span className="font-normal normal-case text-muted-foreground">(optional)</span>
          </Label>
          <input ref={fileRef} type="file" accept="image/*" onChange={pickPhoto} className="hidden" />
          {photo ? (
            <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt="Selected meal" className="size-14 shrink-0 rounded-lg object-cover" />
              <span className="min-w-0 flex-1 truncate text-[13px] text-muted-foreground">{photo.name}</span>
              <button
                type="button"
                onClick={removePhoto}
                aria-label="Remove photo"
                className="shrink-0 rounded-full border border-border bg-card p-1.5 text-muted-foreground hover:bg-muted hover:text-danger"
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

        <Button block size="lg" disabled={!canSubmit} onClick={submit}>
          <Send className="size-4" /> Submit feedback
        </Button>
        {!canSubmit ? (
          <p className="text-center text-2xs text-muted-foreground">Add a star rating to submit.</p>
        ) : null}
      </div>
    </div>
  );
}

/** Post-submit confirmation — reflects whether the order number verified. */
function ThankYou({ entry }: { entry: FeedbackEntry }) {
  return (
    <div className="py-4 text-center">
      <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-teal-wash text-primary">
        <PartyPopper className="size-7" />
      </div>
      <h1 className="mt-5 font-display text-2xl font-semibold tracking-tight text-foreground">
        Thanks for your feedback
      </h1>
      <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
        Your {entry.rating}-star review was sent to the kitchen. They read every one.
      </p>

      {/* A verified order gets a positive confirmation; unverified needs nothing. */}
      {entry.verified ? (
        <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-teal-wash px-3.5 py-1.5 text-[13px] font-semibold text-teal-deep">
          <BadgeCheck className="size-4" /> Linked to order {entry.orderId}
        </div>
      ) : null}

      <div className="mt-7">
        <Button variant="outline" asChild>
          <Link href="/menu">Browse the menu</Link>
        </Button>
      </div>
    </div>
  );
}
