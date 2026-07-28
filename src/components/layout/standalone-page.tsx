import * as React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { FoodDoodles } from "@/components/brand/food-doodles";

/**
 * The shell for the screens that live outside the app shell — `/nutrition` and
 * `/rate`. Both can be opened by someone with no session (a link in an email, a
 * shared nutrition lookup), so neither may lean on the sidebar, the cart or the
 * account menu: furniture for doors a guest can't open.
 *
 * One shape for all of them, top to bottom:
 *
 *   doodle wash → sticky bar (back to menu + wordmark) → content
 *
 * The page's title is {@link PageHero}, which the content renders as the top
 * slice of its own card rather than the shell floating it above as a panel of
 * its own — see that component for why.
 */
export function StandalonePage({
  doodleId,
  children,
}: {
  /** Unique per page — a duplicate `<pattern>` id renders the wash blank. */
  doodleId: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative isolate flex min-h-dvh flex-col bg-background">
      {/* A hand-drawn food-doodle wash so the page reads as designed space
          rather than a flat cream field. Sits at -z-10 (behind content but above
          the page background). Shared with the sign-in screen. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <FoodDoodles patternId={doodleId} />
      </div>

      <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between gap-3 px-4">
          <Link
            href="/menu"
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary hover:underline"
          >
            <ArrowLeft className="size-4" aria-hidden /> Back to menu
          </Link>
          <Logo size="lg" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 space-y-5 px-4 py-6">{children}</main>

      <footer className="mx-auto w-full max-w-3xl px-4 pb-8 text-center text-2xs text-muted-foreground">
        © 2026 Superfine Kitchen
      </footer>
    </div>
  );
}

/**
 * The lemon-yellow title slice: a white-wash icon chip, the page's one `h1`, and
 * a supporting line. It carries the brand colour these pages used to get from a
 * half-screen panel.
 *
 * It is rendered *inside* the page's first `Card`, flush against its top edge —
 * the same shape as the Auto-Order intro box — rather than as a yellow card of
 * its own above the content. A title floating in a separate panel reads as two
 * unrelated things stacked up; joined, the colour is the head of the thing you
 * came to use, and the page has one object on it instead of two.
 *
 * Rounds its own top corners rather than relying on the card clipping it: the
 * nutrition card can't take `overflow-hidden` without cutting off the meal
 * dropdown.
 */
export function PageHero({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-t-2xl bg-hero-yellow px-6 py-8 text-teal-deep">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-white/40">
        <Icon className="size-6" aria-hidden />
      </span>
      <h1 className="mt-3 font-display text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-1 text-sm">{description}</p>
    </div>
  );
}
