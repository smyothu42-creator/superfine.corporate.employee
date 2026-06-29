"use client";

import * as React from "react";
import { AlertTriangle, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfirmStore } from "@/store/use-confirm-store";
import { cn } from "@/lib/utils";

/**
 * Accessible confirmation modal — mounted once in the admin shell, driven by the
 * confirm() promise helper. Traps initial focus on the confirm button, closes on
 * Escape or backdrop click, and labels itself for screen readers.
 */
function ConfirmDialog() {
  const { open, options, respond } = useConfirmStore();
  const confirmRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") respond(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, respond]);

  if (!open || !options) return null;

  const danger = options.tone === "danger";
  const warning = options.tone === "warning";
  const Icon = danger ? AlertTriangle : warning ? AlertTriangle : HelpCircle;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-teal-deep/50 animate-fade-in"
        onClick={() => respond(false)}
        aria-hidden
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby={options.description ? "confirm-desc" : undefined}
        className="relative w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-raised animate-fade-in"
      >
        <div className="flex items-start gap-3.5">
          <span
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-2xl",
              danger ? "bg-danger-bg text-danger" : warning ? "bg-warning-bg text-warning" : "bg-teal-wash text-teal",
            )}
          >
            <Icon className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="confirm-title" className="font-display text-lg font-semibold tracking-tight">
              {options.title}
            </h2>
            {options.description ? (
              <p id="confirm-desc" className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                {options.description}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => respond(false)}>
            {options.cancelLabel ?? "Cancel"}
          </Button>
          <Button
            ref={confirmRef}
            variant={danger ? "danger" : warning ? "warning" : "default"}
            onClick={() => respond(true)}
          >
            {options.confirmLabel ?? "Confirm"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export { ConfirmDialog };
