"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Leaf, Star } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { FoodDoodles } from "@/components/brand/food-doodles";
import { RateEntry } from "@/features/ratings/rate-entry";
import { StoreHydrator } from "@/store/store-hydrator";

/**
 * `/rate` — leave item feedback, signed in or not.
 *
 * Wears the same two-tone brand shape as the other pre-app screens (sign-in,
 * `/feedback`): lemon-yellow panel left, the flow on white right, collapsing to
 * a yellow banner over the flow on phones. It is deliberately *not* the app
 * shell — the signed-out half has no session, and a rail, a cart and an account
 * menu around a guest are all furniture for doors they can't open.
 *
 * The shell is also what normally rehydrates the persisted stores, so this route
 * mounts {@link StoreHydrator} itself — without it the page can't read the
 * session (so the order picker never appears) and can't tell an already-rated
 * meal from a fresh one.
 */
export default function RatePage() {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <StoreHydrator />
      <RateHero />

      <div className="flex flex-col bg-card">
        <RateHeroBanner />

        <div className="flex flex-1 flex-col px-5 py-8 sm:px-8 lg:justify-center lg:px-12 lg:py-10">
          <div className="mx-auto w-full max-w-lg">
            {/* "Back to menu" belongs to the entry view only — once an order is
                open, its own "Choose a different order" is the back affordance,
                and two competing ones read as a maze. RateEntry renders it. */}
            <React.Suspense fallback={<div className="h-[420px]" />}>
              <DeepLinkedEntry />
            </React.Suspense>

            <p className="mt-8 text-center text-2xs text-muted-foreground">
              © 2026 Superfine Kitchen
            </p>
          </div>
        </div>
      </div>
    </div>
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

/** Desktop brand panel — the same lemon-yellow split the auth screens use. */
function RateHero() {
  return (
    <div className="relative hidden flex-col justify-between overflow-hidden bg-hero-yellow p-10 lg:flex">
      <FoodDoodles patternId="food-doodles-rate" className="text-[#8f7c00] opacity-20" />

      <div className="relative">
        <Logo variant="dark" size="xl" />
      </div>

      <div className="relative max-w-md">
        <span className="flex size-16 items-center justify-center rounded-full bg-white/40 text-teal-deep">
          <Star className="size-8" aria-hidden />
        </span>
        {/* One line: "How was your lunch?" breaks after "your" at this size,
            and a two-line question reads as two thoughts. */}
        <h1 className="mt-5 whitespace-nowrap font-display text-5xl font-semibold leading-[1.05] tracking-tight text-teal-deep">
          How was your lunch?
        </h1>
        <p className="mt-4 text-base leading-relaxed text-teal-deep/80">
          Rate the meals themselves. A tap each is plenty, and it&apos;s how the kitchen decides
          what stays on the menu and what comes back.
        </p>
      </div>

      <div className="relative flex items-center gap-2 text-[13px] font-medium text-teal-deep/80">
        <Leaf className="size-4" aria-hidden /> Certified SF Green Business · Made daily in our SF
        kitchen
      </div>
    </div>
  );
}

/** Phones get the brand colour as a banner, so the page still reads two-tone. */
function RateHeroBanner() {
  return (
    <div className="relative flex flex-col items-center overflow-hidden bg-hero-yellow px-5 py-7 lg:hidden">
      <FoodDoodles patternId="food-doodles-rate-banner" className="text-[#8f7c00] opacity-20" />
      <div className="relative flex flex-col items-center text-center">
        <Logo variant="dark" size="xl" />
        <h1 className="mt-4 whitespace-nowrap font-display text-2xl font-semibold tracking-tight text-teal-deep">
          How was your lunch?
        </h1>
        <p className="mt-1 text-[13px] leading-relaxed text-teal-deep/80">
          Rate the meals. It&apos;s how the kitchen decides what stays on the menu.
        </p>
      </div>
    </div>
  );
}
