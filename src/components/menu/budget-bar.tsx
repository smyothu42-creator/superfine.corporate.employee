import * as React from "react";
import { Wallet } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { program } from "@/data/program";

interface BudgetBarProps {
  /** Gross total ordered for this day. */
  dayTotal: number;
  /** Inline, tighter layout with no card chrome (e.g. nested inside a panel). */
  compact?: boolean;
  /** Show the "covers $X each service day · resets daily" footer line. */
  showNote?: boolean;
  className?: string;
}

/**
 * Per-day subsidy meter — the User Flow's "budget bar shows how much is left."
 * The allowance resets every service day. When the day's total exceeds the
 * subsidy, we switch from "left" to the clear amount the employee will owe
 * (interview pain point: people panic at unexpected totals).
 */
export function BudgetBar({ dayTotal, compact = false, showNote = true, className }: BudgetBarProps) {
  const allowance = program.subsidyPerDay;
  const remaining = Math.max(0, allowance - dayTotal);
  const over = Math.max(0, dayTotal - allowance);
  const pct = Math.min(100, allowance === 0 ? 0 : (Math.min(dayTotal, allowance) / allowance) * 100);

  return (
    <div
      className={cn(
        compact ? "" : "rounded-2xl border border-border bg-card p-3.5 shadow-card",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Wallet className="size-3.5 text-primary" />
          Today&apos;s budget
        </span>
        {over > 0 ? (
          <span className="text-[13px] font-semibold text-coral-deep nums">
            You&apos;ll pay {formatCurrency(over)}
          </span>
        ) : (
          <span className="text-[13px] font-semibold text-success nums">
            {formatCurrency(remaining)} left
          </span>
        )}
      </div>
      <div className={cn("w-full overflow-hidden rounded-full bg-muted", compact ? "mt-1.5 h-2" : "mt-2 h-2.5")}>
        <div
          className={cn("h-full rounded-full transition-all", over > 0 ? "bg-coral" : "bg-primary")}
          style={{ width: `${pct}%` }}
        />
      </div>
      {!compact && showNote ? (
        <p className="mt-1.5 text-2xs text-muted-foreground">
          {program.company} covers {formatCurrency(allowance)} each service day · resets daily
        </p>
      ) : null}
    </div>
  );
}
