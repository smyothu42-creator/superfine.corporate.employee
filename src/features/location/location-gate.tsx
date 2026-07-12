"use client";

import * as React from "react";
import { LocationDialog, type LocationPhase } from "@/features/location/location-dialog";
import { requestLocation } from "@/lib/geolocation";
import { checkZip } from "@/data/service-areas";
import { useSessionStore } from "@/store/use-session-store";

/** Long enough to see the menu land, short enough to read as part of arriving. */
const ASK_DELAY_MS = 2000;

/**
 * Nobody orders from a menu we can't deliver, but everybody gets to see one.
 *
 * However an individual arrived — signed up with an email, came back through
 * Google or Microsoft, or pressed "browse without signing up" — the menu renders
 * first, and two seconds later a dialog asks where they are. We ask, not the
 * browser: a bare permission prompt over a page nobody has read is a question
 * without its reason, and it gets answered "Never allow" for exactly that
 * reason. The browser's own prompt, where it appears at all, opens from the
 * button in our dialog — after the user has agreed to the idea of being located.
 *
 * Allowing inside the zone ends it — the dialog closes and nothing was typed.
 * Denying falls back to a ZIP field, because a declined permission is a
 * preference, not a reason to be locked out. Landing outside the zone is the one
 * hard stop: there is no menu to order from where we don't cook. Location is
 * required to browse, so the dialog can't be dismissed — there is no menu behind
 * it to fall back to.
 *
 * A returning customer whose last order went to an address in our zone is never
 * asked at all: their saved address answers "where" the way Amazon reuses your
 * default shipping address, so we seed the ZIP from it and the dialog stays shut.
 *
 * Corporate employees skip all of it: their orders go to a contract-locked
 * company address, so their zone was settled when the contract was signed.
 */
export function LocationGate({ children }: { children: React.ReactNode }) {
  const hydrated = useSessionStore((s) => s.hydrated);
  const account = useSessionStore((s) => s.account);
  const zipStatus = useSessionStore((s) => s.zipStatus);
  const delivery = useSessionStore((s) => s.delivery);

  // A signed-in customer with a saved address in the zone has already answered
  // "where" — reuse it rather than asking. A saved street is what marks them as
  // a repeat customer; the ZIP is what we actually seed.
  const savedZip =
    account && delivery.street.trim() && checkZip(delivery.zip) === "serviceable"
      ? delivery.zip
      : null;

  const settled =
    account?.kind === "corporate" || zipStatus === "serviceable" || savedZip !== null;
  const [phase, setPhase] = React.useState<LocationPhase | null>(null);
  const [locating, setLocating] = React.useState(false);

  // Auto-fill the session ZIP from the saved address so the rest of the app sees
  // a settled location without the customer touching anything.
  React.useEffect(() => {
    if (hydrated && savedZip && zipStatus !== "serviceable") {
      useSessionStore.getState().setZip(savedZip, "serviceable");
    }
  }, [hydrated, savedZip, zipStatus]);

  /** Ask the browser. Called from the dialog's button, so the prompt is allowed. */
  async function allow() {
    setLocating(true);
    const result = await requestLocation();
    setLocating(false);

    switch (result.status) {
      case "located":
        // `settled` flips with the store, and this gate stops gating.
        useSessionStore.getState().setZip(result.zip, "serviceable");
        setPhase(null);
        return;
      case "outside-zone":
        // We know where they are and it isn't in the zone. Say so directly
        // rather than making them type a ZIP to be told the same thing.
        setPhase("unserviceable");
        return;
      case "denied":
      case "unavailable":
        setPhase("zip");
    }
  }

  /**
   * Waits for the store to be read — a `null` zipStatus that localStorage is
   * about to fill in would ask a returning visitor who already answered.
   *
   * The timer is the only guard against asking twice. A `useRef` latch would be
   * wrong: in development React mounts, cleans up, and re-runs every effect, and
   * a latch set on the first pass makes the second pass do nothing at all — so
   * the dialog only ever appeared on the render where `hydrated` flipped, i.e.
   * after a manual refresh.
   */
  React.useEffect(() => {
    if (!hydrated || settled) return;

    // Always our dialog first, whatever the browser already thinks. A standing
    // grant makes the button instant; a standing block makes it fall through to
    // the ZIP field. Neither is worth a second code path.
    const timer = window.setTimeout(() => setPhase("permission"), ASK_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [hydrated, settled]);

  return (
    <>
      {children}
      <LocationDialog
        open={phase !== null}
        phase={phase ?? "permission"}
        blocking
        locating={locating}
        onAllow={() => void allow()}
        onServiceable={() => setPhase(null)}
      />
    </>
  );
}
