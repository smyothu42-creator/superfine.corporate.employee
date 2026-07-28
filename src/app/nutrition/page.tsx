"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { StandalonePage } from "@/components/layout/standalone-page";
import { NutritionLookup } from "@/features/nutrition/nutrition-lookup";

/**
 * Standalone nutrition lookup route (no account or order needed). Reached from
 * the sidebar's "Check the nutrition information" link and from direct links,
 * including `/nutrition?item=…`.
 *
 * Wears {@link StandalonePage}, the same shell as `/rate`, so the two
 * sidebar-free screens are one flow. The page's yellow title hero belongs to
 * the picker card below, not to the shell, so {@link NutritionLookup} carries
 * it — see `PageHero`.
 */
export default function NutritionPage() {
  return (
    <StandalonePage doodleId="food-doodles-nutrition">
      <React.Suspense fallback={<div className="h-[420px]" />}>
        <DeepLinkedLookup />
      </React.Suspense>
    </StandalonePage>
  );
}

/** Reads the optional `?item=` deep link and hands it to the shared lookup. */
function DeepLinkedLookup() {
  const params = useSearchParams();
  return <NutritionLookup initialItemId={params.get("item") ?? undefined} />;
}
