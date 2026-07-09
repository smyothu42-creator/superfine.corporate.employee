"use client";

import * as React from "react";
import Link from "next/link";
import { Repeat, UtensilsCrossed, CalendarClock, Mail, PlusCircle, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/store/use-toast-store";
import { useAutoOrderStore } from "@/store/use-auto-order-store";
import { SetupWizard } from "./setup-wizard";
import { ActiveDashboard } from "./active-dashboard";
import { AutoOrderWalkthrough, TOUR_START_EVENT } from "./walkthrough";

export function AutoOrderView() {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  // Held in the store, not local state: this page unmounts on every navigation,
  // so an active setup has to outlive it. Only "Stop ordering" clears it.
  const config = useAutoOrderStore((s) => s.config);
  const setConfig = useAutoOrderStore((s) => s.setConfig);
  const [setupOpen, setSetupOpen] = React.useState(false);

  // Drive the topbar title per state: while picking meals it's "Edit Your Auto
  // Order" when an active/paused config already exists (you came in via Edit),
  // else "Build Your Auto Order". Once active it's "Auto Order Dashboard",
  // otherwise plain "Auto-Order".
  const setNavTitle = useAutoOrderStore((s) => s.setNavTitle);
  React.useEffect(() => {
    const active = config.status === "active" || config.status === "paused";
    setNavTitle(
      setupOpen
        ? active
          ? "Edit Your Auto Order"
          : "Build Your Auto Order"
        : active
          ? "Auto Order Dashboard"
          : "Auto-Order",
    );
    return () => setNavTitle(null);
  }, [setupOpen, config.status, setNavTitle]);

  // While the meal-picking wizard is open, let the Topbar show the "See how it
  // works" tour trigger. (The Back button lives on the wizard page itself.)
  const setInSetup = useAutoOrderStore((s) => s.setInSetup);
  React.useEffect(() => {
    setInSetup(setupOpen);
    return () => setInSetup(false);
  }, [setupOpen, setInSetup]);

  // NOTE: every branch below returns a fragment with <AutoOrderWalkthrough />
  // as the FIRST child. The shared position/type keeps the tour mounted (alive)
  // across state switches — a differing root element would remount it and end
  // the tour mid-flow.
  if (!mounted) {
    return (
      <>
        <AutoOrderWalkthrough />
        <div className="w-full space-y-4">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
      </>
    );
  }

  if (setupOpen) {
    const editing = config.status === "active" || config.status === "paused";
    return (
      <>
      <AutoOrderWalkthrough />
      <SetupWizard
        editing={editing}
        initialFavorites={editing ? config.favorites : []}
        initialCustomizations={editing ? config.customizations ?? {} : {}}
        initialSoldOut={editing ? config.soldOut : "notify"}
        onActivate={(c) => {
          setConfig(c);
          setSetupOpen(false);
          toast.success(
            editing ? "Auto-Order updated" : "Auto-Order is on",
            editing
              ? "Your meals, add-ons and rules have been saved."
              : "We'll draft each day's order 48h before its cutoff and email you to review.",
          );
        }}
        onCancel={() => setSetupOpen(false)}
      />
      </>
    );
  }

  if (config.status === "active" || config.status === "paused") {
    return (
      <>
        <AutoOrderWalkthrough />
        <ActiveDashboard config={config} setConfig={setConfig} onEditSetup={() => setSetupOpen(true)} />
      </>
    );
  }

  // Inactive — intro / empty state.
  const hasFavorites = config.favorites.length > 0;
  return (
    <>
    <AutoOrderWalkthrough />
    <div className="w-full">
      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-card">
        <div className="bg-hero-yellow px-6 py-8 text-teal-deep">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-white/40">
            <Repeat className="size-6" />
          </span>
          <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight">Set it and forget it</h2>
          <p className="mt-1 w-full text-sm">
            Pick your favorite meals once. We draft each day&apos;s lunch automatically and email you 48
            hours before the cutoff to review, swap, or add sides and drinks.
          </p>
        </div>

        <div className="space-y-5 p-6 sm:p-7">
          <Benefit
            icon={Repeat}
            title="Pick your meals once"
            desc="Choose one to repeat daily or a few to rotate."
          />
          <Benefit
            icon={CalendarClock}
            title="We draft 48 hours before cutoff"
            desc="Each day's order is built automatically from your pool, nothing to remember."
          />
          <Benefit
            icon={Mail}
            title="Review before it's placed"
            desc="Get an email to keep it, swap the meal, or add sides & drinks."
          />
          <Benefit
            icon={PlusCircle}
            title="Add-ons happen at review"
            desc="Sides and beverages aren't part of setup. You add them per draft."
          />

          {hasFavorites ? (
            <div className="grid gap-2 pt-2 sm:grid-cols-2">
              <Button variant="teal" size="lg" block data-tour="setup-btn" onClick={() => setSetupOpen(true)}>
                <Repeat className="size-4" /> Set up Auto-Order
              </Button>
              <Button
                variant="ghost"
                size="lg"
                block
                onClick={() => window.dispatchEvent(new Event(TOUR_START_EVENT))}
              >
                <BookOpen className="size-4" /> See how it works
              </Button>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border p-5 text-center">
              <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <UtensilsCrossed className="size-6" />
              </span>
              <h3 className="mt-2 font-display text-base font-semibold">No favorites yet</h3>
              <p className="mx-auto mt-1 max-w-xs text-[13px] text-muted-foreground">
                Order a few meals first, then we&apos;ll build your rotation.
              </p>
              <div className="mt-3 flex justify-center gap-2">
                <Button asChild>
                  <Link href="/menu">Browse menu</Link>
                </Button>
                <Button variant="ghost" data-tour="setup-btn" onClick={() => setSetupOpen(true)}>
                  Set up anyway
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}

function Benefit({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-teal-wash text-primary">
        <Icon className="size-4" />
      </span>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-2xs text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}
