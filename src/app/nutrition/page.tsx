"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { FoodDoodles } from "@/components/brand/food-doodles";
import { NutritionLookup } from "@/features/nutrition/nutrition-lookup";

/**
 * Standalone nutrition lookup route (no account or order needed). The everyday
 * entry point is the sidebar's nutrition modal (same {@link NutritionLookup}
 * content); this route stays for direct links, including `/nutrition?item=…`.
 */
export default function NutritionPage() {
  return (
    <div className="relative isolate flex min-h-dvh flex-col bg-background">
      {/* A hand-drawn food-doodle wash so the page reads as designed space
          rather than a flat cream field. Sits at -z-10 (behind content but above
          the page background). Shared with the sign-in screen. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <FoodDoodles />
      </div>

      {/* App-consistent top bar: back to the menu + screen title. */}
      <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between gap-3 px-4">
          <Link
            href="/menu"
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary hover:underline"
          >
            <ArrowLeft className="size-4" /> Back to menu
          </Link>
          <Logo size="lg" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 space-y-5 px-4 py-6">
        <React.Suspense fallback={<div className="h-[420px]" />}>
          <DeepLinkedLookup />
        </React.Suspense>
      </main>
    </div>
  );
}

/** Reads the optional `?item=` deep link and hands it to the shared lookup. */
function DeepLinkedLookup() {
  const params = useSearchParams();
  return <NutritionLookup initialItemId={params.get("item") ?? undefined} />;
}
