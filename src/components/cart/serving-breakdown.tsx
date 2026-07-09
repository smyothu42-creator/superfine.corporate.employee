import type { CartServing } from "@/store/use-cart-store";

/**
 * How a family-style line's guest count was split, grouped the way it was
 * chosen — "Entrées · 20 × Brisket, 30 × Paneer, 50 × Jackfruit". This is the
 * whole point of a family order, so it reads in full rather than as a summary.
 */
export function ServingBreakdown({ servings }: { servings: CartServing[] }) {
  const groups = servings.reduce<Record<string, CartServing[]>>((acc, s) => {
    (acc[s.groupName] ??= []).push(s);
    return acc;
  }, {});

  return (
    <div className="mt-1.5 space-y-1">
      {Object.entries(groups).map(([groupName, lines]) => (
        <div
          key={groupName}
          className="flex flex-wrap items-baseline gap-x-1.5 text-[13px]"
        >
          <span className="font-semibold text-foreground/70">{groupName}:</span>
          {lines.map((s, i) => (
            <span key={s.optionId} className="text-muted-foreground">
              <span className="font-semibold nums text-foreground">
                {s.qty}
              </span>{" "}
              × {s.name}
              {i < lines.length - 1 ? "," : ""}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
