import * as React from "react";
import { cn } from "@/lib/utils";

type StatTone = "default" | "teal" | "yellow" | "coral";

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: StatTone;
  /** "pop" = neo-brutalist: thick teal-deep border + hard offset shadow. */
  pop?: boolean;
  className?: string;
}

const TONES: Record<StatTone, string> = {
  default: "border-border bg-card",
  teal: "border-transparent bg-teal text-primary-foreground",
  yellow: "border-transparent bg-hero-yellow text-teal-deep",
  // coral-deep keeps white text legible (AA-large) where light coral did not
  coral: "border-transparent bg-coral-deep text-white",
};

/** Editorial KPI tile. Colour tones echo the site's playful blocks. */
function StatCard({ label, value, sub, icon, tone = "default", pop = false, className }: StatCardProps) {
  const colored = tone !== "default";
  return (
    <div
      className={cn(
        "rounded-2xl border p-5",
        pop
          ? "border-2 border-teal-deep shadow-[4px_4px_0_0_#004045]"
          : "shadow-card",
        // keep the colored fill but let the pop border override the transparent edge
        pop ? TONES[tone].replace("border-transparent", "") : TONES[tone],
        className,
      )}
    >
      <div className="flex items-center gap-2">
        {icon ? <span className={cn(colored ? "opacity-90" : "text-primary")}>{icon}</span> : null}
        <div
          className={cn(
            "text-2xs font-bold",
            colored ? null : "text-muted-foreground",
          )}
        >
          {label}
        </div>
      </div>
      <div className="mt-4 font-display text-3xl font-semibold leading-none tracking-tight nums">{value}</div>
      {/* No `opacity` on text. Fading a colour toward its background is exactly
          what the contrast rule measures, and 80% white on teal landed at
          4.09:1 — under the bar. Full strength reads the same and passes. */}
      {sub ? (
        <div className={cn("mt-1.5 text-xs", colored ? null : "text-muted-foreground")}>{sub}</div>
      ) : null}
    </div>
  );
}

export { StatCard };
