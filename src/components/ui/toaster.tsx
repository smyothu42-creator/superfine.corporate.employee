"use client";

import * as React from "react";
import { CheckCircle2, Info, AlertTriangle, XCircle, X } from "lucide-react";
import { useToastStore, type Toast, type ToastTone } from "@/store/use-toast-store";
import { cn } from "@/lib/utils";

/** `label` is the tone said out loud — the icon's shape and colour carry it for
 *  sighted users, and carried it for nobody else. */
const TONE: Record<
  ToastTone,
  { icon: React.ElementType; ring: string; iconColor: string; label: string }
> = {
  success: { icon: CheckCircle2, ring: "border-success-border", iconColor: "text-success", label: "Success" },
  info: { icon: Info, ring: "border-info-border", iconColor: "text-info", label: "Information" },
  warning: { icon: AlertTriangle, ring: "border-warning-border", iconColor: "text-warning", label: "Warning" },
  danger: { icon: XCircle, ring: "border-danger-border", iconColor: "text-danger", label: "Error" },
};

function ToastCard({ toast }: { toast: Toast }) {
  const dismiss = useToastStore((s) => s.dismiss);
  const meta = TONE[toast.tone];
  const Icon = meta.icon;
  /**
   * The countdown stops while the toast is being read or reached for.
   *
   * A message that erases itself after four seconds is a message some people
   * never finish — anyone reading slowly, anyone using magnification who has to
   * pan across to it, anyone whose pointer is halfway to the dismiss button when
   * it disappears. Hovering or focusing it holds it; leaving restarts the clock.
   */
  const [paused, setPaused] = React.useState(false);

  React.useEffect(() => {
    if (!toast.duration || paused) return;
    const timer = setTimeout(() => dismiss(toast.id), toast.duration);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, dismiss, paused]);

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      className={cn(
        "pointer-events-auto flex w-full items-start gap-3 rounded-2xl border bg-card p-3.5 shadow-raised animate-fade-in",
        meta.ring,
      )}
    >
      <Icon aria-hidden className={cn("mt-0.5 size-5 shrink-0", meta.iconColor)} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">
          <span className="sr-only">{meta.label}: </span>
          {toast.title}
        </p>
        {toast.description ? (
          <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">{toast.description}</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => dismiss(toast.id)}
        aria-label="Dismiss notification"
        className="touch-target rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}

/**
 * Global toast region — mounted once in the app shell.
 *
 * Two regions, not one. Everything used to be announced "politely", which means
 * it waits for whatever the screen reader is already saying to finish — so an
 * error could sit silently behind an unrelated sentence and then be erased by
 * its own timer before it was ever spoken. Failures interrupt; the rest waits
 * its turn.
 */
function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const urgent = toasts.filter((t) => t.tone === "danger" || t.tone === "warning");
  const calm = toasts.filter((t) => t.tone !== "danger" && t.tone !== "warning");

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col items-end gap-2 sm:w-96">
      <div role="alert" aria-live="assertive" className="contents">
        {urgent.map((t) => (
          <ToastCard key={t.id} toast={t} />
        ))}
      </div>
      <div role="status" aria-live="polite" className="contents">
        {calm.map((t) => (
          <ToastCard key={t.id} toast={t} />
        ))}
      </div>
    </div>
  );
}

export { Toaster };
