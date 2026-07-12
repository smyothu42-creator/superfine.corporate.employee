"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { MapPin, X, ArrowRight, Check, Mail, Navigation, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Field } from "@/components/ui/input";
import { checkZip, neighborhoodFor } from "@/data/service-areas";
import { useSessionStore } from "@/store/use-session-store";

/**
 * Where the browse-without-an-account path resolves a delivery ZIP.
 *
 * We ask before the browser does. A raw permission prompt on a page the user
 * hasn't read is a question with no context — "why does a lunch menu want my
 * location?" — and the honest answer ("the menu changes by delivery zone") only
 * fits in a dialog we control. The browser's prompt then follows from a click
 * that already means yes.
 *
 * Every outcome other than "granted, inside the zone" lands on the same manual
 * ZIP field. Nobody is ever stuck behind a permission they declined.
 */
export type LocationPhase =
  /** Our own ask, ahead of the browser's. */
  | "permission"
  /** Ask for a ZIP: permission denied, unavailable, or the user is editing. */
  | "zip"
  /** A ZIP we don't deliver to, detected or typed. */
  | "unserviceable";

export function LocationDialog({
  open,
  phase,
  detectedZip,
  blocking = false,
  locating = false,
  onAllow,
  onClose,
  onServiceable,
}: {
  open: boolean;
  phase: LocationPhase;
  /** A ZIP we already know is out of zone, shown back so it can be corrected. */
  detectedZip?: string;
  /**
   * The screen behind this dialog can't be used without an answer, so there is
   * no dismissing it: no close button, no backdrop click, no Escape, and nowhere
   * to leave to. Location is required to browse, full stop.
   */
  blocking?: boolean;
  /** The browser prompt is up, or a fix is being taken. */
  locating?: boolean;
  /** Hand off to the browser's prompt. Required by the `permission` phase. */
  onAllow?: () => void;
  /** Dismiss the dialog. Ignored while `blocking` — there is nothing behind it. */
  onClose?: () => void;
  onServiceable: (zip: string) => void;
}) {
  const setZip = useSessionStore((s) => s.setZip);
  const [value, setValue] = React.useState("");
  const [state, setState] = React.useState<LocationPhase>(phase);
  const [notified, setNotified] = React.useState(false);

  // The caller's phase is the opening position; after that the dialog drives
  // itself, so re-syncing on every render would trap the user on one screen.
  React.useEffect(() => {
    if (open) {
      setState(phase);
      setValue(detectedZip ?? "");
      setNotified(false);
    }
  }, [open, phase, detectedZip]);

  React.useEffect(() => {
    if (!open || blocking) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, blocking, onClose]);

  if (!open || typeof document === "undefined") return null;

  const status = checkZip(value);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    // "Continue" is disabled outside the zone, so this only fires on a hit.
    if (status !== "serviceable") return;
    setZip(value.trim(), "serviceable");
    onServiceable(value.trim());
  }

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-teal-deep/50 animate-fade-in"
        onClick={blocking ? undefined : onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Delivery location"
        className="relative w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-raised animate-fade-in"
      >
        {blocking ? null : (
          <button
            type="button"
            onClick={() => onClose?.()}
            aria-label="Close"
            className="absolute right-4 top-4 rounded-full border border-border touch-target p-1.5 text-muted-foreground hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        )}

        {state === "permission" ? (
          <div className="space-y-5">
            <div>
              <span className="flex size-11 items-center justify-center rounded-2xl bg-teal-wash text-primary">
                <Navigation className="size-5" />
              </span>
              <h2 className="mt-3 font-display text-xl font-semibold tracking-tight">
                Where are we delivering?
              </h2>
              <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                The menu changes by delivery zone. Share your location and we&apos;ll show what
                today&apos;s kitchen can get to you. No account needed.
              </p>
            </div>

            {/* The browser's own prompt opens from this click, so it arrives
                after the user has already agreed to the idea. */}
            <Button block size="lg" disabled={locating} onClick={onAllow}>
              {locating ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" /> Finding you…
                </>
              ) : (
                <>
                  <Navigation className="size-4" /> Use my current location
                </>
              )}
            </Button>

            <button
              type="button"
              disabled={locating}
              onClick={() => setState("zip")}
              className="block w-full text-center text-[13px] font-semibold text-primary hover:underline disabled:opacity-50"
            >
              Enter a ZIP code instead
            </button>
          </div>
        ) : state === "unserviceable" ? (
          <div className="space-y-5">
            <div>
              <span className="flex size-11 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <MapPin className="size-5" />
              </span>
              <h2 className="mt-3 font-display text-xl font-semibold tracking-tight">
                We&apos;re not delivering to {value.trim() || "your area"} yet
              </h2>
              <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                We cook in San Francisco and deliver across SoMa, the Mission, Mission Bay and the
                Financial District. You&apos;re just outside that for now, so there&apos;s no menu
                we can show you here.
              </p>
            </div>

            {notified ? (
              <p className="flex items-center gap-2 rounded-xl border border-border bg-teal-wash px-4 py-3 text-[13px] font-medium text-teal-deep">
                <Check className="size-4 shrink-0" /> We&apos;ll email you the day we reach{" "}
                {value.trim()}.
              </p>
            ) : (
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  setNotified(true);
                }}
              >
                <Field>
                  <Label htmlFor="notify-email">Tell me when you deliver here</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="notify-email"
                      type="email"
                      required
                      placeholder="you@example.com"
                      className="pl-10"
                      autoComplete="email"
                    />
                  </div>
                </Field>
                <Button block size="lg" variant="ghost" type="submit">
                  Notify me
                </Button>
              </form>
            )}

            <button
              type="button"
              onClick={() => {
                setValue("");
                setState("zip");
              }}
              className="block w-full text-center text-[13px] font-semibold text-primary hover:underline"
            >
              Try a different ZIP code
            </button>
          </div>
        ) : (
          <form className="space-y-5" onSubmit={submit}>
            <div>
              <span className="flex size-11 items-center justify-center rounded-2xl bg-teal-wash text-primary">
                <MapPin className="size-5" />
              </span>
              <h2 className="mt-3 font-display text-xl font-semibold tracking-tight">
                Where are we delivering?
              </h2>
              <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                Your ZIP code tells us what&apos;s on the menu today. No account needed.
              </p>
            </div>

            <Field>
              <Label htmlFor="zip">ZIP code</Label>
              <Input
                id="zip"
                inputMode="numeric"
                maxLength={5}
                required
                value={value}
                onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))}
                placeholder="94103"
                autoComplete="postal-code"
                autoFocus
              />
              {/* Confirm the hit as they type — five digits with no feedback is
                  five digits you re-read before trusting the button. */}
              {status === "serviceable" ? (
                <p className="mt-1.5 flex items-center gap-1.5 text-2xs font-medium text-primary">
                  <Check className="size-3.5 shrink-0" /> We deliver to {neighborhoodFor(value)}.
                </p>
              ) : status === "unserviceable" ? (
                <p className="mt-1.5 text-2xs text-muted-foreground">
                  We don&apos;t deliver to {value} yet.{" "}
                  <button
                    type="button"
                    onClick={() => {
                      // Remember the miss — it's what a "we've launched" email
                      // keys off — then show the notify form.
                      setZip(value.trim(), "unserviceable");
                      setState("unserviceable");
                    }}
                    className="font-semibold text-primary hover:underline"
                  >
                    Notify me when we do
                  </button>
                </p>
              ) : (
                <p className="mt-1.5 text-2xs text-muted-foreground">
                  Currently serving San Francisco: 94103, 94105, 94107, 94110, 94111, 94158.
                </p>
              )}
            </Field>

            {/* Enabled only inside the zone: an out-of-zone ZIP has no menu to
                show, so "Continue" stays dead until the ZIP is one we deliver to. */}
            <Button block size="lg" type="submit" disabled={status !== "serviceable"}>
              See the menu <ArrowRight className="size-4" />
            </Button>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
}
