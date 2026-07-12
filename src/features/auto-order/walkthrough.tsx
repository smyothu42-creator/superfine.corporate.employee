"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import {
  X,
  ChevronLeft,
  ChevronRight,
  PartyPopper,
  Repeat,
  Search,
  Check,
  CalendarClock,
  Mail,
  SkipForward,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Guided tour for the Auto-Order flow ("Take a quick tour" on the intro card /
 * first-run modal).
 *
 * This is a self-contained modal walkthrough: it never navigates the live app.
 * Each step shows a small mockup "screen image" of the flow with a short
 * explanation, so a first-time user can preview the whole thing without setting
 * anything up. The explanation style (step chip, title, body, progress bar,
 * Back / Next) matches the site's other guided surfaces.
 */

/** Dispatched by the "Take a quick tour" button / first-run modal. */
export const TOUR_START_EVENT = "sfk:auto-order-tour-start";
/** Kept for the SetupWizard listener; unused by the modal tour. */
export const TOUR_PICK_EVENT = "sfk:auto-order-tour-pick";

type TourStep = {
  id: string;
  title: string;
  body: string;
  visual: React.ReactNode;
};

const STEPS: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to Auto-Order",
    body: "Put your lunches on autopilot in about a minute. Here's a quick look at how it works, screen by screen. Nothing gets set up until you're ready.",
    visual: <WelcomeVisual />,
  },
  {
    id: "pick",
    title: "1. Pick your meals",
    body: "Open the meal picker and tap cards to build your rotation: one meal to repeat daily or a few to rotate. Search and filters help you find them fast, and meals with your allergens are hidden automatically.",
    visual: <PickVisual />,
  },
  {
    id: "confirm",
    title: "2. Lock in your pool",
    body: "Your running count keeps track as you go, and picked meals stay visible even as you filter. Happy with the selection? Confirm moves you on to one last quick rule.",
    visual: <ConfirmVisual />,
  },
  {
    id: "rule",
    title: "3. Set one quick rule",
    body: "Choose what happens if a meal isn't available on a service day: we email you to swap it (recommended) or simply skip that day. Then flip Auto-Order on.",
    visual: <RuleVisual />,
  },
  {
    id: "dashboard",
    title: "4. You're all set 🎉",
    body: "From your dashboard you'll see when the next draft lands, edit your rotation anytime, and turn Auto-Order off whenever you like. We draft each day 48h before its cutoff and email you to review.",
    visual: <DashboardVisual />,
  },
  {
    id: "done",
    title: "That's the whole flow!",
    body: "Ready to set it up? Close this and tap “Set up Auto-Order” whenever you like. Enjoy never forgetting lunch again.",
    visual: <DoneVisual />,
  },
];

/**
 * Mounted once by AutoOrderView (all states). Idle until the "Take a quick
 * tour" button fires TOUR_START_EVENT.
 */
export function AutoOrderWalkthrough() {
  const [active, setActive] = React.useState(false);

  React.useEffect(() => {
    const start = () => setActive(true);
    window.addEventListener(TOUR_START_EVENT, start);
    return () => window.removeEventListener(TOUR_START_EVENT, start);
  }, []);

  if (!active) return null;
  return <TourModal onExit={() => setActive(false)} />;
}

function TourModal({ onExit }: { onExit: () => void }) {
  const [index, setIndex] = React.useState(0);
  const [shown, setShown] = React.useState(false);
  const step = STEPS[index];
  const isLast = index === STEPS.length - 1;

  React.useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const next = React.useCallback(() => {
    setIndex((i) => (i >= STEPS.length - 1 ? i : i + 1));
  }, []);
  const back = React.useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onExit();
      else if (e.key === "ArrowRight") setIndex((i) => (i >= STEPS.length - 1 ? i : i + 1));
      else if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onExit]);

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Auto-Order tour"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onExit}
        className={cn("absolute inset-0 bg-black/50 transition-opacity", shown ? "opacity-100" : "opacity-0")}
      />
      <div
        className={cn(
          "relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-card shadow-raised transition-all duration-300 sm:rounded-3xl",
          shown ? "translate-y-0 sm:opacity-100" : "translate-y-full sm:translate-y-2 sm:opacity-0",
        )}
      >
        <button
          type="button"
          onClick={onExit}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 rounded-full border border-border bg-card/80 touch-target p-1.5 text-muted-foreground backdrop-blur hover:bg-muted"
        >
          <X className="size-4" />
        </button>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {/* "Screen image" mockup for this step. */}
          <div className="bg-muted/40 px-6 py-6">
            <div className="mx-auto max-w-[300px]">{step.visual}</div>
          </div>

          {/* Explanation — same style as the site's other guided surfaces. */}
          <div className="px-6 py-5">
            <span className="flex w-fit items-center gap-1.5 rounded-full bg-teal-wash px-2.5 py-0.5 text-2xs font-semibold text-teal-deep">
              Step {index + 1} of {STEPS.length}
            </span>
            <h3 className="mt-2.5 font-display text-lg font-semibold tracking-tight">{step.title}</h3>
            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{step.body}</p>

            {/* Progress — yellow on the muted track, like the brand accents. */}
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-yellow transition-all duration-300"
                style={{ width: `${((index + 1) / STEPS.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border px-6 py-4">
          {index > 0 ? (
            <Button variant="ghost" size="sm" onClick={back}>
              <ChevronLeft className="size-4" /> Back
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={onExit}>
              Skip Tutorial
            </Button>
          )}
          <Button variant="teal" size="sm" onClick={isLast ? onExit : next}>
            {isLast ? "Finish" : "Next"}
            {!isLast ? <ChevronRight className="size-4" /> : null}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ----------------------------------------------------------------------- */
/* Per-screen mockups — lightweight, token-styled "screen images".          */
/* ----------------------------------------------------------------------- */

/** A faux app-window frame so each mockup reads as a screenshot. */
function ScreenFrame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-card">
      <div className="flex items-center gap-1.5 border-b border-border bg-muted/60 px-3 py-2">
        <span className="size-2 rounded-full bg-coral" />
        <span className="size-2 rounded-full bg-yellow" />
        <span className="size-2 rounded-full bg-primary" />
        <span className="ml-2 text-2xs font-semibold text-muted-foreground">{label}</span>
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

function MiniMealCard({ selected }: { selected?: boolean }) {
  return (
    <div
      className={cn(
        "relative rounded-xl border p-1.5",
        selected ? "border-primary ring-2 ring-primary/25" : "border-border",
      )}
    >
      <div className="mb-1 h-8 rounded-lg bg-muted" />
      <div className="h-1.5 w-3/4 rounded-full bg-muted-foreground/20" />
      {selected ? (
        <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="size-2.5" />
        </span>
      ) : null}
    </div>
  );
}

function MiniOption({ icon: Icon, title, selected }: { icon: LucideIcon; title: string; selected?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl border px-2.5 py-2",
        selected ? "border-primary bg-teal-wash" : "border-border",
      )}
    >
      <span
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-lg",
          selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="size-3" />
      </span>
      <span className="flex-1 text-2xs font-semibold text-foreground">{title}</span>
      {selected ? <Check className="size-3.5 text-primary" /> : null}
    </div>
  );
}

function WelcomeVisual() {
  return (
    <div className="rounded-2xl bg-hero-yellow p-5 text-teal-deep shadow-card">
      <span className="flex size-11 items-center justify-center rounded-2xl bg-white/40">
        <Repeat className="size-5" />
      </span>
      <p className="mt-2.5 font-display text-base font-semibold tracking-tight">Set it and forget it</p>
      <div className="mt-2.5 space-y-1.5">
        <div className="h-2 w-full rounded-full bg-white/45" />
        <div className="h-2 w-4/5 rounded-full bg-white/30" />
      </div>
    </div>
  );
}

function PickVisual() {
  return (
    <ScreenFrame label="Meal picker">
      <div className="mb-2.5 flex items-center gap-1.5">
        <div className="flex flex-1 items-center gap-1 rounded-full border border-border bg-card px-2 py-1 text-2xs text-muted-foreground">
          <Search className="size-3" /> Search meals
        </div>
        <div className="rounded-full bg-teal-wash px-2 py-1 text-2xs font-semibold text-teal-deep">Veg</div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <MiniMealCard selected />
        <MiniMealCard />
        <MiniMealCard />
        <MiniMealCard />
      </div>
    </ScreenFrame>
  );
}

function ConfirmVisual() {
  return (
    <ScreenFrame label="Meal picker">
      <div className="mb-2 flex items-center justify-between">
        <div className="rounded-full bg-teal-wash px-2 py-1 text-2xs font-semibold text-teal-deep">
          3 meals selected
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <MiniMealCard selected />
        <MiniMealCard selected />
        <MiniMealCard selected />
        <MiniMealCard />
      </div>
      <div className="mt-2.5 flex justify-end">
        <div className="rounded-full bg-primary px-3 py-1 text-2xs font-semibold text-primary-foreground ring-2 ring-primary/25">
          Confirm →
        </div>
      </div>
    </ScreenFrame>
  );
}

function RuleVisual() {
  return (
    <ScreenFrame label="One quick rule">
      <div className="space-y-2">
        <MiniOption icon={Mail} title="Email me to swap" selected />
        <MiniOption icon={SkipForward} title="Skip that day" />
      </div>
      <div className="mt-2.5 flex justify-center">
        <div className="rounded-full bg-primary px-3 py-1 text-2xs font-semibold text-primary-foreground ring-2 ring-primary/25">
          Turn on Auto-Order
        </div>
      </div>
    </ScreenFrame>
  );
}

function DashboardVisual() {
  return (
    <ScreenFrame label="Auto Order dashboard">
      <div className="rounded-xl bg-hero-yellow px-3 py-2.5 text-teal-deep">
        <p className="flex items-center gap-1 text-2xs font-bold">
          <span className="size-1.5 rounded-full bg-teal-deep" /> Auto-Order is on
        </p>
        <div className="mt-1.5 h-1.5 w-2/3 rounded-full bg-white/45" />
      </div>
      <div className="mt-2 flex items-center gap-2 rounded-xl border border-border p-2">
        <CalendarClock className="size-4 shrink-0 text-primary" />
        <div className="flex-1 space-y-1">
          <div className="h-1.5 w-1/2 rounded-full bg-muted-foreground/20" />
          <div className="h-1.5 w-1/3 rounded-full bg-muted-foreground/15" />
        </div>
        <div className="rounded-full bg-teal-wash px-2 py-0.5 text-[9px] font-semibold text-teal-deep">
          Review
        </div>
      </div>
    </ScreenFrame>
  );
}

function DoneVisual() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl bg-teal-wash py-9 text-primary shadow-card">
      <PartyPopper className="size-10" />
      <p className="mt-2 font-display text-sm font-semibold text-teal-deep">You&apos;re ready to go!</p>
    </div>
  );
}
