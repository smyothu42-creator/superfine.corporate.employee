"use client";

import * as React from "react";
import Link from "next/link";
import { Repeat, Sparkles, Clock, Wallet, UtensilsCrossed, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { program } from "@/data/program";
import { me } from "@/data/me";
import { toast } from "@/store/use-toast-store";
import { useAutoOrderStore } from "@/store/use-auto-order-store";
import { formatCurrency } from "@/lib/utils";
import { SetupWizard } from "./setup-wizard";
import { ActiveDashboard } from "./active-dashboard";
import type { AutoConfig } from "./shared";

export function AutoOrderView() {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const [config, setConfig] = React.useState<AutoConfig>(() => ({
    status: me.autoOrder.enabled ? "active" : "inactive",
    favorites: me.autoOrder.favorites,
    soldOut: "notify",
  }));
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

  if (!mounted) {
    return (
      <div className="w-full space-y-4">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );
  }

  if (setupOpen) {
    const editing = config.status === "active" || config.status === "paused";
    return (
      <SetupWizard
        editing={editing}
        initialFavorites={editing ? config.favorites : []}
        initialSoldOut={editing ? config.soldOut : "notify"}
        onActivate={(c) => {
          setConfig(c);
          setSetupOpen(false);
          toast.success(
            editing ? "Auto-Order updated" : "Auto-Order is on",
            editing
              ? "Your meal pool and rules have been saved."
              : "We'll draft each day's order 24h before its cutoff and email you to review.",
          );
        }}
        onCancel={() => setSetupOpen(false)}
      />
    );
  }

  if (config.status === "active" || config.status === "paused") {
    return (
      <ActiveDashboard config={config} setConfig={setConfig} onEditSetup={() => setSetupOpen(true)} />
    );
  }

  // Inactive — intro / empty state.
  const hasFavorites = config.favorites.length > 0;
  return (
    <div className="w-full">
      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-card">
        <div className="bg-hero-yellow px-6 py-8 text-teal-deep">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-white/40">
            <Repeat className="size-6" />
          </span>
          <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight">Set it and forget it</h2>
          <p className="mt-1 w-full text-sm">
            Pick a pool of favorite meals once. We draft each day&apos;s order automatically 24 hours before
            the cutoff and email you to review it in My Orders — no missed lunches, no surprises.
          </p>
        </div>

        <div className="space-y-3 p-6">
          <Benefit
            icon={Clock}
            title="Zero forgotten lunches"
            desc="A draft lands in My Orders before every cutoff for you to review."
          />
          <Benefit
            icon={Wallet}
            title={`Stays within your ${formatCurrency(program.subsidyPerDay)}/day`}
            desc="Over-budget picks warn you before they're ordered."
          />
          <Benefit
            icon={Sparkles}
            title="Allergy-safe"
            desc={`Items with ${me.allergens.join(", ") || "your allergens"} are never auto-ordered.`}
          />

          {hasFavorites ? (
            <div className="grid gap-2 pt-2 sm:grid-cols-2">
              <Button variant="teal" size="lg" block onClick={() => setSetupOpen(true)}>
                <Repeat className="size-4" /> Set up Auto-Order
              </Button>
              <Button variant="ghost" size="lg" block onClick={() => setConfig({ ...config, status: "active" })}>
                <RotateCcw className="size-4" /> Re-activate last setup
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
                <Button variant="ghost" onClick={() => setSetupOpen(true)}>
                  Set up anyway
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
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
