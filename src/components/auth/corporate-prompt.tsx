"use client";

import * as React from "react";
import { Building2, X } from "lucide-react";
import { IdentityModal } from "@/components/auth/identity-modal";
import { useSessionStore } from "@/store/use-session-store";

const DISMISSED_KEY = "sfk:corporate-prompt-dismissed";

/**
 * The corporate on-ramp for someone browsing as a guest.
 *
 * A corporate employee arriving through the general flow is the expected case,
 * not an edge case — nothing about the entry screen told them to identify
 * themselves. Without this, they'd browse at retail prices and only discover
 * their subsidy at checkout, having possibly bailed at the price long before.
 *
 * It says a company *may* cover lunch. It never names a company, because we
 * haven't verified anything yet.
 */
export function CorporatePrompt() {
  const account = useSessionStore((s) => s.account);
  const hydrated = useSessionStore((s) => s.hydrated);
  const [dismissed, setDismissed] = React.useState(true);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    setDismissed(localStorage.getItem(DISMISSED_KEY) === "1");
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
  }

  // Wait for the session to rehydrate — otherwise a signed-in corporate user is
  // told to sign in for a fraction of a second on every load.
  if (!hydrated || account || dismissed) return null;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-info-border bg-info-bg px-4 py-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-card text-primary">
          <Building2 className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-info">Ordering for work?</p>
          <p className="text-2xs text-info/80">
            Your company may cover part of the bill. Verify your work email to unlock it.
          </p>
        </div>
        {/* gap-2 keeps the dismiss X's 44px touch box off the primary CTA. */}
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-full bg-primary px-3.5 py-1.5 text-2xs font-bold text-primary-foreground hover:bg-teal-deep"
          >
            Check my email
          </button>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss"
            className="rounded-full touch-target p-1.5 text-info/70 hover:bg-card"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      <IdentityModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
