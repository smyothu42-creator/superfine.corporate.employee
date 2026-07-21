"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Logo } from "@/components/brand/logo";
import { FoodDoodles } from "@/components/brand/food-doodles";

/**
 * The hand-off screen between proving who you are and landing in the app.
 *
 * It wears the same lemon-yellow brand panel as {@link AuthHero} — same
 * gradient, same food-doodle wash, same teal-deep ink — so signing in reads as
 * one continuous surface rather than a flash of neutral page between two
 * branded ones. On desktop that panel is already half the sign-in screen, so
 * covering the viewport with it feels like the panel growing to fill the space
 * rather than a new screen arriving.
 *
 * Rendered through a portal at the document root: the flow that triggers it
 * lives inside a modal on some routes, and an overlay clipped to a dialog is
 * not a loading *screen*.
 */
export function AuthLoadingScreen({
  /** What we're doing, in the user's terms — "Signing you in", "Setting up…". */
  title,
  /** The reassurance line under it. Keep it to one short sentence. */
  detail,
}: {
  title: string;
  detail: string;
}) {
  // The portal target only exists in the browser, and the overlay is never part
  // of the first paint, so there is nothing to server-render.
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      // `status` + `aria-live` so a screen reader announces the transition
      // instead of going silent while the app navigates underneath.
      role="status"
      aria-live="polite"
      // No fade on the panel itself. It replaces a form that unmounts as it
      // appears, so anything less than instant shows the empty card collapsing
      // behind it. The content inside is what animates in.
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-hero-yellow px-6"
      style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <FoodDoodles patternId="food-doodles-auth-loading" className="text-[#8f7c00] opacity-20" />

      <div className="relative flex w-full max-w-sm flex-col items-center text-center animate-rise-in">
        {/* The mark steps down a size on phones so it and the copy below it
            clear a landscape keyboard-height viewport without scrolling. */}
        <Logo variant="dark" size="lg" className="items-center sm:hidden" />
        <Logo variant="dark" size="xl" className="hidden items-center sm:flex" />

        <p className="mt-7 font-display text-xl font-semibold tracking-tight text-teal-deep sm:text-2xl">
          {title}
        </p>
        {/* /80 rather than the /70 the hero panel uses for its body copy: this
            line sits directly on the doodle wash with no card behind it, and
            the linework eats the last bit of contrast. */}
        <p className="mt-1.5 text-[13px] leading-relaxed text-teal-deep/80">{detail}</p>

        {/* Indeterminate track: we genuinely don't know how long the hand-off
            takes, and a fake percentage that jumps to 100 is worse than none. */}
        <div
          aria-hidden
          className="mt-7 h-1.5 w-40 overflow-hidden rounded-full bg-teal-deep/15 sm:w-48"
        >
          {/* Motion-gated rather than left to the global reduced-motion rule:
              that rule collapses the duration to ~0, which would park this
              segment off the end of the track and read as a broken bar. */}
          <span className="block h-full w-1/3 rounded-full bg-teal-deep/70 motion-safe:animate-track-sweep motion-reduce:hidden" />
          {/* The still equivalent — a filled track that says "working" without
              moving. Shown only when motion is turned down. */}
          <span className="hidden h-full w-full rounded-full bg-teal-deep/40 motion-reduce:block" />
        </div>
      </div>
    </div>,
    document.body,
  );
}
