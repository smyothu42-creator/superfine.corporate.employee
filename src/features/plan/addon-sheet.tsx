"use client";

import * as React from "react";
import { X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, cn } from "@/lib/utils";
import type { MenuItem } from "@/data/types";
import type { PlanLine } from "./types";

interface AddOnSheetProps {
  item: MenuItem;
  /** Budget left for the day — used to flag over-budget choices. */
  remaining: number;
  onClose: () => void;
  onAdd: (line: PlanLine) => void;
}

/**
 * Native-feeling bottom sheet for mandatory (and optional) add-ons. Slides up
 * over a dark backdrop; the CTA stays disabled until every required group has a
 * selection — "Fail-Safe, Not Fail-Confusing".
 */
export function AddOnSheet({ item, remaining, onClose, onAdd }: AddOnSheetProps) {
  const groups = item.addOns ?? [];
  // selection: groupId -> set of optionIds
  const [picked, setPicked] = React.useState<Record<string, string[]>>({});

  // Animate in on mount.
  const [shown, setShown] = React.useState(false);
  React.useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function toggle(groupId: string, optionId: string, select: "single" | "multi", max?: number) {
    setPicked((prev) => {
      const cur = prev[groupId] ?? [];
      if (select === "single") return { ...prev, [groupId]: [optionId] };
      const has = cur.includes(optionId);
      let next = has ? cur.filter((id) => id !== optionId) : [...cur, optionId];
      if (max && next.length > max) next = next.slice(next.length - max);
      return { ...prev, [groupId]: next };
    });
  }

  const requiredSatisfied = groups
    .filter((g) => g.required)
    .every((g) => (picked[g.id]?.length ?? 0) > 0);

  const addOnTotal = groups.reduce((sum, g) => {
    const ids = picked[g.id] ?? [];
    return sum + g.options.filter((o) => ids.includes(o.id)).reduce((s, o) => s + o.price, 0);
  }, 0);

  const finalPrice = item.price + addOnTotal;
  const overage = Math.max(0, finalPrice - remaining);

  function handleAdd() {
    const labels = groups.flatMap((g) =>
      (picked[g.id] ?? []).map((id) => g.options.find((o) => o.id === id)?.name ?? ""),
    );
    onAdd({
      uid: `${item.id}__${Date.now()}`,
      itemId: item.id,
      name: item.name,
      price: finalPrice,
      image: item.image,
      addOnLabel: labels.filter(Boolean).join(" · ") || undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-black/50 transition-opacity",
          shown ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        className={cn(
          "relative w-full max-w-[430px] rounded-t-3xl bg-card p-4 pb-6 shadow-raised transition-transform duration-300",
          shown ? "translate-y-0" : "translate-y-full",
        )}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-border" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-semibold leading-tight">{item.name}</h3>
            <p className="text-[13px] text-muted-foreground">Choose your options</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full border border-border bg-card touch-target p-1.5 text-muted-foreground hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-4 max-h-[50dvh] space-y-4 overflow-y-auto">
          {groups.map((g) => (
            <div key={g.id}>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[13px] font-semibold">{g.name}</span>
                <span className="text-2xs text-muted-foreground">
                  {g.required ? "Required" : "Optional"}
                  {g.select === "multi" && g.max ? ` · up to ${g.max}` : ""}
                </span>
              </div>
              <div className="space-y-2">
                {g.options.map((o) => {
                  const isOn = (picked[g.id] ?? []).includes(o.id);
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => toggle(g.id, o.id, g.select, g.max)}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 rounded-2xl border-2 px-4 py-3 text-left transition-colors",
                        isOn ? "border-primary bg-teal-wash" : "border-border bg-card hover:bg-muted",
                      )}
                    >
                      <span className="flex items-center gap-3">
                        <span
                          className={cn(
                            "flex size-5 shrink-0 items-center justify-center border-2 transition-colors",
                            g.select === "single" ? "rounded-full" : "rounded-md",
                            isOn ? "border-primary bg-primary text-primary-foreground" : "border-border",
                          )}
                        >
                          {isOn ? <Check className="size-3" /> : null}
                        </span>
                        <span className="text-sm font-medium">{o.name}</span>
                      </span>
                      {o.price > 0 ? (
                        <span className="text-[13px] font-semibold text-muted-foreground nums">
                          +{formatCurrency(o.price)}
                        </span>
                      ) : (
                        <span className="text-2xs font-semibold text-success">Included</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {overage > 0 ? (
          <p className="mt-3 text-center text-[13px] font-semibold text-coral-deep">
            Adds {formatCurrency(overage)} to what you pay this day
          </p>
        ) : null}

        <Button
          variant="teal"
          block
          size="lg"
          className="mt-3"
          disabled={!requiredSatisfied}
          onClick={handleAdd}
        >
          {requiredSatisfied
            ? `Add to ${formatCurrency(finalPrice)}`.replace("Add to", "Add ·")
            : "Choose your options"}
        </Button>
      </div>
    </div>
  );
}
