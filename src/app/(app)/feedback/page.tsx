"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { MessageSquareHeart } from "lucide-react";
import { FeedbackForm } from "@/features/feedback/feedback-form";

/**
 * In-app feedback screen. It renders inside the app shell (sidebar + topbar) and
 * is still reachable directly — notably via the `/feedback?order=ORD-2891` deep
 * link that the "Leave feedback" action on a past order uses to arrive here with
 * the order pre-filled. The everyday entry point is the floating action button
 * (the rail's "Share your feedback" link), which opens the same form as a modal.
 *
 * The content borrows the sign-in screen's two-column shape: a branded
 * illustration + copy on the left, the form on the right, collapsing to just the
 * form on phones. The form itself is shared with the modal.
 */
export default function FeedbackPage() {
  return (
    // Full-bleed: cancel the app shell's content padding (and its floor
    // clearance) so the two panels touch all four edges of the content area
    // instead of floating as a centered card. `4rem` is the topbar height.
    <div className="-mx-4 -mt-6 -mb-floor sm:-mx-6 lg:-mx-8">
      <div className="grid lg:min-h-[calc(100dvh-4rem)] lg:grid-cols-2">
        {/* Left panel: the same login-page hero (logo, headline, copy, green
            line) in the Auto-Order header's lemon-yellow/teal palette — but with
            no background illustration. */}
        <FeedbackHero />
        {/* Form fills the right half and centres on desktop; on mobile it's the
            whole width and keeps its foot clear of the home indicator. */}
        <div className="flex flex-col justify-center bg-card p-6 pb-floor sm:p-10 lg:p-12">
          <div className="mx-auto w-full max-w-md">
            <React.Suspense fallback={<div className="h-[520px]" />}>
              <DeepLinkedForm />
            </React.Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Reads the optional `?order=` deep link and hands it to the shared form. */
function DeepLinkedForm() {
  const params = useSearchParams();
  return <FeedbackForm initialOrder={params.get("order") ?? ""} />;
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
          Got something<br />to tell us?
        </h1>
        <p className="mt-4 text-base leading-relaxed text-teal-deep/80">
          A few words is all it takes. Whether it&apos;s about an order or anything else, your
          feedback lands straight with our team, and we read every note.
        </p>
      </div>
      {/* Pinned to the bottom of the panel, as before. */}
      <p className="absolute inset-x-10 bottom-10 text-[13px] font-medium text-teal-deep/80">
        Certified SF Green Business · Made daily in our SF kitchen
      </p>
    </div>
  );
}
