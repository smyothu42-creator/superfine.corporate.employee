import { Repeat, CalendarClock, Mail, PlusCircle, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * What Auto-Order does, in one list.
 *
 * Shared because two screens describe the same feature: the intro an eligible
 * employee sets it up from, and the screen someone sees when their company
 * hasn't enabled it. Those must not drift — the second is a pitch the reader
 * may forward to whoever can turn it on, and a pitch that describes a slightly
 * different product than the one they'd get is worse than no pitch.
 */
export const AUTO_ORDER_BENEFITS: { icon: LucideIcon; title: string; desc: string }[] = [
  {
    icon: Repeat,
    title: "Pick your meals once",
    desc: "Choose one to repeat daily or a few to rotate.",
  },
  {
    icon: CalendarClock,
    title: "We draft 48 hours before cutoff",
    desc: "Each day's order is built automatically from your pool, nothing to remember.",
  },
  {
    icon: Mail,
    title: "Review before it's placed",
    desc: "Get an email to keep it, swap the meal, or add sides & drinks.",
  },
  {
    icon: PlusCircle,
    title: "Add-ons happen at review",
    desc: "Sides and beverages aren't part of setup. You add them per draft.",
  },
];

export function Benefit({
  icon: Icon,
  title,
  desc,
  /**
   * Dims the icon to a neutral tone. Used on the not-enabled screen, where the
   * teal would read as the feature being live and ready to use.
   */
  muted = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-xl",
          muted ? "bg-muted text-muted-foreground" : "bg-teal-wash text-primary",
        )}
      >
        <Icon className="size-4" />
      </span>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-2xs text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}
