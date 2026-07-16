"use client";

import * as React from "react";
import { Wallet, Percent, FlaskConical, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUiStore } from "@/store/use-ui-store";
import { program } from "@/data/program";
import { formatCurrency, cn } from "@/lib/utils";

/**
 * Demo-only explainer, shown when the topbar's subsidy pill is switched between
 * the fixed-dollar and percentage contracts. The two models answer different
 * questions, so the budget indicator reads differently in each — this modal
 * spells that out for anyone watching the demo.
 */
function SubsidyModelModal() {
  const open = useUiStore((s) => s.subsidyModalOpen);
  const mode = useUiStore((s) => s.subsidyMode);
  const close = useUiStore((s) => s.closeSubsidyModal);
  const dismissRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (!open) return;
    dismissRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  if (!open) return null;

  const percent = program.subsidyPercent;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-teal-deep/50 animate-fade-in" onClick={close} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="subsidy-model-title"
        className="relative w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-raised animate-fade-in"
      >
        <span className="inline-flex items-center gap-1.5 rounded-full border border-warning-border bg-warning-bg px-2.5 py-1 text-2xs font-semibold text-coral-deep">
          <FlaskConical className="size-3.5" /> Demo toggle
        </span>

        <h2 id="subsidy-model-title" className="mt-3 font-display text-lg font-semibold tracking-tight">
          Now showing the{" "}
          {mode === "fixed" ? "fixed daily allowance" : `${percent}% share`} model
        </h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
          The two contracts answer different questions, so the budget pill says different things. This
          switch is for the demo only. {program.company}&apos;s real contract is the fixed allowance.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <ModelCard
            active={mode === "fixed"}
            icon={<Wallet className="size-4" />}
            title={`${formatCurrency(program.subsidyPerDay)} a day`}
            pill={`${formatCurrency(program.subsidyPerDay)} left today`}
            points={[
              "There's a hard cap, so headroom exists.",
              "The pill counts down as you add meals.",
              "Go over and the extra is charged to you.",
            ]}
          />
          <ModelCard
            active={mode === "percent"}
            icon={<Percent className="size-4" />}
            title={`${percent}% of every order`}
            pill={`You pay ${formatCurrency(4.5)} · ${100 - percent}%`}
            points={[
              "No cap, so nothing is ever “left”.",
              `The pill shows your running ${100 - percent}% share.`,
              "Your share grows with the order, never resets.",
            ]}
          />
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <p className="flex items-center gap-1.5 text-2xs font-semibold text-coral-deep">
            <FlaskConical className="size-3.5 shrink-0" /> Demo purposes only. Nothing here changes
            real billing.
          </p>
          <Button ref={dismissRef} onClick={close}>
            Got it
          </Button>
        </div>
      </div>
    </div>
  );
}

function ModelCard({
  active,
  icon,
  title,
  pill,
  points,
}: {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  pill: string;
  points: string[];
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        active ? "border-primary bg-teal-wash" : "border-border bg-muted/40",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "flex items-center gap-1.5 text-[13px] font-semibold",
            active ? "text-teal-deep" : "text-muted-foreground",
          )}
        >
          {icon}
          {title}
        </span>
        {active ? <Check className="size-4 shrink-0 text-primary" /> : null}
      </div>

      <div className="mt-3 rounded-full border border-info-border bg-info-bg px-2.5 py-1 text-center text-2xs font-semibold text-info nums">
        {pill}
      </div>

      <ul className="mt-3 space-y-1.5 text-2xs leading-relaxed text-muted-foreground">
        {points.map((p) => (
          <li key={p} className="flex gap-1.5">
            <span aria-hidden className="text-primary">
              ·
            </span>
            {p}
          </li>
        ))}
      </ul>
    </div>
  );
}

export { SubsidyModelModal };
