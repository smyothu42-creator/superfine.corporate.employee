"use client";

import * as React from "react";
import { Repeat, CalendarClock, Mail, PlusCircle, X, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDialog } from "@/lib/use-dialog";
import { TOUR_START_EVENT } from "./walkthrough";

const SEEN_KEY = "sfk:auto-order-intro-seen-v2";

/**
 * First-run tutorial for Auto-Order. Shown once (localStorage-gated) the first
 * time an employee opens the Auto-Order page: a lightweight three-point primer
 * plus a one-tap hand-off to the live guided walkthrough. Dismissing (either
 * button, Esc, or the scrim) marks it seen so it never nags again — the tour is
 * still available anytime from the topbar's "Walk me through".
 */
export function AutoOrderIntroModal() {
  const [open, setOpen] = React.useState(false);
  const [shown, setShown] = React.useState(false);

  // Decide on mount (client-only — localStorage). Off by default so SSR/first
  // paint never flashes the modal for returning users.
  React.useEffect(() => {
    try {
      if (!localStorage.getItem(SEEN_KEY)) setOpen(true);
    } catch {
      /* localStorage blocked — just skip the intro. */
    }
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, [open]);

  const dismiss = React.useCallback(() => {
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* ignore */
    }
    setShown(false);
    setOpen(false);
  }, []);

  // Called before the early return below — the hook has to run on every render,
  // and it already no-ops on `open: false`.
  const dialog = useDialog({ open, onClose: dismiss });

  if (!open) return null;

  function startTour() {
    dismiss();
    // Let the modal unmount before the tour spotlights live elements.
    requestAnimationFrame(() => window.dispatchEvent(new Event(TOUR_START_EVENT)));
  }

  return (
    <div className="fixed inset-0 z-[65] flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close"
        onClick={dismiss}
        className={cn("absolute inset-0 bg-black/50 transition-opacity", shown ? "opacity-100" : "opacity-0")}
      />
      {/* The dialog role moves to the panel so the focus trap's subtree excludes
          the scrim button above it. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Welcome to Auto-Order"
        {...dialog.props}
        className={cn(
          "relative w-full max-w-md rounded-t-3xl bg-card shadow-raised transition-all duration-300 sm:rounded-3xl",
          shown ? "translate-y-0 sm:opacity-100" : "translate-y-full sm:translate-y-2 sm:opacity-0",
        )}
      >
        <div className="relative overflow-hidden rounded-t-3xl bg-hero-yellow px-6 py-6 text-teal-deep">
          <button
            type="button"
            onClick={dismiss}
            aria-label="Close"
            className="absolute right-4 top-4 rounded-full bg-white/40 touch-target p-1.5 text-teal-deep hover:bg-white/60"
          >
            <X className="size-4" />
          </button>
          <span className="flex size-12 items-center justify-center rounded-2xl bg-white/40">
            <Repeat className="size-6" />
          </span>
          <h2 className="mt-3 font-display text-xl font-semibold tracking-tight">Welcome to Auto-Order</h2>
          <p className="mt-1 text-[13px]">
            Set your lunches on autopilot in about a minute. Here&apos;s the gist.
          </p>
        </div>

        <ul className="space-y-3 px-6 py-5">
          <IntroRow
            icon={Repeat}
            title="Pick your meals once"
            desc="Choose one to repeat daily or a few to rotate. Your customizations are saved for next time."
          />
          <IntroRow
            icon={CalendarClock}
            title="We draft 48 hours before cutoff"
            desc="Each day's order is built automatically from your pool, nothing to remember."
          />
          <IntroRow
            icon={Mail}
            title="Review before it's placed"
            desc="Get an email to keep it, swap the meal, or add sides & drinks."
          />
          <IntroRow
            icon={PlusCircle}
            title="Add-ons happen at review"
            desc="Sides and beverages aren't part of setup. You add them per draft."
            last
          />
        </ul>

        <div className="flex flex-col-reverse gap-2 border-t border-border px-6 py-4 sm:flex-row sm:justify-between">
          <Button variant="ghost" onClick={dismiss}>
            Explore on my own
          </Button>
          <Button variant="teal" onClick={startTour}>
            <BookOpen className="size-4" /> See how it works
          </Button>
        </div>
      </div>
    </div>
  );
}

function IntroRow({
  icon: Icon,
  title,
  desc,
  last,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  last?: boolean;
}) {
  return (
    <li className="flex gap-3">
      <div className="flex flex-col items-center">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-teal-wash text-primary">
          <Icon className="size-4" />
        </span>
        {!last ? <span className="mt-1 w-px flex-1 bg-border" /> : null}
      </div>
      <div className="min-w-0 pb-1">
        <p className="text-[13px] font-semibold">{title}</p>
        <p className="mt-0.5 text-2xs text-muted-foreground">{desc}</p>
      </div>
    </li>
  );
}
