"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Repeat, UtensilsCrossed, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/store/use-toast-store";
import { useAutoOrderStore } from "@/store/use-auto-order-store";
import { useSessionStore, isSubsidized } from "@/store/use-session-store";
import { SetupWizard } from "./setup-wizard";
import { ActiveDashboard } from "./active-dashboard";
import { AutoOrderNotEnabled } from "./not-enabled";
import { AUTO_ORDER_BENEFITS, Benefit } from "./benefits";
import { AutoOrderWalkthrough, TOUR_START_EVENT } from "./walkthrough";

export function AutoOrderView() {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  // Auto-Order draws from a company subsidy, so it's corporate-only. An
  // individual who deep-links here is sent back to the menu once the session
  // has hydrated (before that, account is null and we don't act on it).
  const router = useRouter();
  const account = useSessionStore((s) => s.account);
  const hydrated = useSessionStore((s) => s.hydrated);
  const blocked = hydrated && !isSubsidized(account);
  React.useEffect(() => {
    if (blocked) router.replace("/menu");
  }, [blocked, router]);

  // Held in the store, not local state: this page unmounts on every navigation,
  // so an active setup has to outlive it. Only "Stop ordering" clears it.
  const config = useAutoOrderStore((s) => s.config);
  const setConfig = useAutoOrderStore((s) => s.setConfig);
  const [setupOpen, setSetupOpen] = React.useState(false);

  // Whether the company's contract includes the feature at all. This gates
  // every state below — including an already-active config, because a contract
  // that stops covering Auto-Order stops it running too.
  const companyEnabled = useAutoOrderStore((s) => s.companyEnabled);

  // Drive the topbar title per state: while picking meals it's "Edit Your Auto
  // Order" when an active/paused config already exists (you came in via Edit),
  // else "Build Your Auto Order". Once active it's "Auto Order Dashboard",
  // otherwise plain "Auto-Order".
  const setNavTitle = useAutoOrderStore((s) => s.setNavTitle);
  React.useEffect(() => {
    // Not enabled: the page is an explainer, so it keeps the plain nav title —
    // "Dashboard" would name a thing that isn't there.
    const active = companyEnabled && (config.status === "active" || config.status === "paused");
    setNavTitle(
      setupOpen && companyEnabled
        ? active
          ? "Edit Your Auto Order"
          : "Build Your Auto Order"
        : active
          ? "Auto Order Dashboard"
          : "Auto-Order",
    );
    return () => setNavTitle(null);
  }, [setupOpen, config.status, companyEnabled, setNavTitle]);

  // While the meal-picking wizard is open, let the Topbar show the "See how it
  // works" tour trigger. (The Back button lives on the wizard page itself.)
  const setInSetup = useAutoOrderStore((s) => s.setInSetup);
  React.useEffect(() => {
    setInSetup(setupOpen);
    return () => setInSetup(false);
  }, [setupOpen, setInSetup]);

  // Individuals aren't eligible — render nothing while the redirect above runs.
  if (blocked) return null;

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

  // Ahead of every other state, including an active config: if the contract
  // stopped covering Auto-Order, the dashboard for a running one would be a
  // screen full of controls that no longer do anything.
  if (!companyEnabled) {
    return (
      <>
        <AutoOrderWalkthrough />
        <div className="w-full space-y-4">
          <AutoOrderNotEnabled />
          <DemoContractToggle enabled={false} />
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
        initialDays={editing ? config.days : undefined}
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
        <div className="w-full space-y-4">
          <ActiveDashboard config={config} setConfig={setConfig} onEditSetup={() => setSetupOpen(true)} />
          <DemoContractToggle enabled />
        </div>
      </>
    );
  }

  // Inactive — intro / empty state.
  const hasFavorites = config.favorites.length > 0;
  return (
    <>
    <AutoOrderWalkthrough />
    <div className="w-full space-y-4">
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
          {AUTO_ORDER_BENEFITS.map((b) => (
            <Benefit key={b.title} icon={b.icon} title={b.title} desc={b.desc} />
          ))}

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
      <DemoContractToggle enabled />
    </div>
    </>
  );
}

/**
 * Demo affordance: flips the company's contract setting so both sides of it can
 * be seen without editing `program.ts` and reloading.
 *
 * Deliberately quiet and deliberately last — it's a switch no real employee has,
 * and styling it as a normal control would teach the wrong thing about who
 * decides this. It matches the other demo doorways in the app (the corporate
 * email filler on sign-in, the subsidy-model switch), which use the same
 * muted-underline treatment for the same reason.
 */
function DemoContractToggle({ enabled }: { enabled: boolean }) {
  const setCompanyEnabled = useAutoOrderStore((s) => s.setCompanyEnabled);
  return (
    <p className="px-1 text-center text-2xs text-muted-foreground">
      <button
        type="button"
        onClick={() => setCompanyEnabled(!enabled)}
        className="underline underline-offset-2 hover:text-muted-foreground"
      >
        Demo:{" "}
        {enabled
          ? "preview this page with Auto-Order not enabled by the company"
          : "switch back to a company that has Auto-Order enabled"}
      </button>
    </p>
  );
}
