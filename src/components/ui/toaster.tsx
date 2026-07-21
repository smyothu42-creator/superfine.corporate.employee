"use client";

import * as React from "react";
import { CheckCircle2, Info, AlertTriangle, XCircle, X } from "lucide-react";
import { useToastStore, type Toast, type ToastTone } from "@/store/use-toast-store";
import { cn } from "@/lib/utils";

const TONE: Record<ToastTone, { icon: React.ElementType; ring: string; iconColor: string }> = {
  success: { icon: CheckCircle2, ring: "border-success-border", iconColor: "text-success" },
  info: { icon: Info, ring: "border-info-border", iconColor: "text-info" },
  warning: { icon: AlertTriangle, ring: "border-warning-border", iconColor: "text-warning" },
  danger: { icon: XCircle, ring: "border-danger-border", iconColor: "text-danger" },
};

function ToastCard({ toast }: { toast: Toast }) {
  const dismiss = useToastStore((s) => s.dismiss);
  const meta = TONE[toast.tone];
  const Icon = meta.icon;

  React.useEffect(() => {
    if (!toast.duration) return;
    const timer = setTimeout(() => dismiss(toast.id), toast.duration);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, dismiss]);

  return (
    <div
      className={cn(
        "pointer-events-auto flex w-full items-start gap-3 rounded-2xl border bg-card p-3.5 shadow-raised animate-fade-in",
        meta.ring,
      )}
    >
      <Icon className={cn("mt-0.5 size-5 shrink-0", meta.iconColor)} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{toast.title}</p>
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
        <X className="size-4" />
      </button>
    </div>
  );
}

/** Global toast region — mounted once in the admin shell. */
function Toaster() {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <div
      role="region"
      aria-label="Notifications"
      aria-live="polite"
      className="pointer-events-none fixed right-4 top-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col items-end gap-2 sm:w-96"
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} />
      ))}
    </div>
  );
}

export { Toaster };
