"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { StandalonePage } from "@/components/layout/standalone-page";
import { RateEntry } from "@/features/ratings/rate-entry";
import { StoreHydrator } from "@/store/store-hydrator";

/**
 * `/rate` — leave item feedback, signed in or not.
 *
 * Wears {@link StandalonePage}, the same shell as `/nutrition`: doodle wash,
 * sticky bar with "Back to menu", then the flow. It is deliberately *not* the
 * app shell — the signed-out half has no session, and a rail, a cart and an
 * account menu around a guest are all furniture for doors they can't open.
 *
 * The yellow title hero is the head of the flow's own card rather than a panel
 * the shell floats above it, so {@link RateEntry} renders it — see `PageHero`.
 *
 * The shell is also what normally rehydrates the persisted stores, so this route
 * mounts {@link StoreHydrator} itself — without it the page can't read the
 * session (so the order picker never appears) and can't tell an already-rated
 * meal from a fresh one.
 */
export default function RatePage() {
  return (
    <StandalonePage doodleId="food-doodles-rate">
      <StoreHydrator />
      {/* "Back to menu" is the shell's, not the flow's — once an order is open,
          RateEntry's own "Choose a different order" is the back affordance. */}
      <React.Suspense fallback={<div className="h-[420px]" />}>
        <DeepLinkedEntry />
      </React.Suspense>
    </StandalonePage>
  );
}

/**
 * The email-link contract. `?order=` + `?email=` is the pair the confirmation
 * mail already holds, so a link carrying both lands straight on that order's
 * meals; `?order=` alone pre-fills the lookup (and is enough on its own when
 * there's a session); `?view=note` opens the general note form, and
 * `?view=lookup` opens the order lookup — the in-app problem form's "Your order
 * isn't on the list?" link, which lives outside this page and so can only ask
 * through the URL.
 *
 *   /rate?order=ORD-2855&email=maya.chen@neptunecorp.com
 *   /rate?order=ORD-2855
 *   /rate?view=note&order=ORD-2855
 *   /rate?view=lookup
 */
function DeepLinkedEntry() {
  const params = useSearchParams();
  const view = params.get("view");
  return (
    <RateEntry
      initialOrder={params.get("order") ?? ""}
      initialEmail={params.get("email") ?? ""}
      initialView={view === "note" || view === "lookup" ? view : undefined}
    />
  );
}
