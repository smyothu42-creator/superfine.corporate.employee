"use client";

import * as React from "react";
import { AlertTriangle, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfirmStore } from "@/store/use-confirm-store";
import { useDialog } from "@/lib/use-dialog";
import { cn } from "@/lib/utils";

/**
 * Accessible confirmation modal — mounted once in the admin shell, driven by the
 * confirm() promise helper. Traps initial focus on the confirm button, closes on
 * Escape or backdrop click, and labels itself for screen readers.
 */
function ConfirmDialog() {
  const { open, options, respond } = useConfirmStore();
  const confirmRef = React.useRef<HTMLButtonElement>(null);

  // Dismissing is answering "no" — a confirm that goes away without a verdict
  // would leave the caller's promise hanging forever.
  const cancel = React.useCallback(() => respond(false), [respond]);
  const dialog = useDialog({ open, onClose: cancel });

  // The hook opens on the first thing you can act on, which here is Cancel. This
  // dialog has always opened on Confirm instead — it's the answer the caller is
  // waiting for, and Escape and the backdrop already make "no" the cheap one to
  // reach. Declared after the hook so it runs second and wins.
  React.useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus({ preventScroll: true });
  }, [open]);

  if (!open || !options) return null;

  const danger = options.tone === "danger";
  const warning = options.tone === "warning";
  const Icon = danger ? AlertTriangle : warning ? AlertTriangle : HelpCircle;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-teal-deep/50 animate-fade-in"
        onClick={cancel}
        aria-hidden
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby={options.description ? "confirm-desc" : undefined}
        {...dialog.props}
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
          <Button variant="ghost" onClick={cancel}>
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
