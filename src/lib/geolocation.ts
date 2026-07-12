import { zipForCoords } from "@/data/service-areas";

/**
 * What asking the browser for a location can tell us. Every outcome other than
 * `located` lands the user on the same manual ZIP field — the point of asking is
 * to save five keystrokes, never to gate the menu behind a permission grant.
 */
export type LocationResult =
  /** Permission granted and the coordinate falls inside a delivery ZIP. */
  | { status: "located"; zip: string }
  /** Permission granted, but we deliver nowhere near there. */
  | { status: "outside-zone" }
  /** The user said no, or the browser has no geolocation to offer. */
  | { status: "denied" }
  /** Timed out, or the device couldn't get a fix. */
  | { status: "unavailable" };

/** Long enough for a cold GPS fix, short enough that nobody stares at a spinner. */
const TIMEOUT_MS = 8000;

/**
 * Ask the browser where we are. Never rejects: a location we couldn't get is a
 * normal branch of this flow, not an exception for a caller to handle.
 *
 * Calling this is what triggers the permission prompt, so it must run from a
 * user gesture — a browser will otherwise ignore it, or worse, silently hang.
 */
export function requestLocation(): Promise<LocationResult> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.resolve({ status: "denied" });
  }

  return new Promise((resolve) => {
    // A permission prompt has no timeout of its own — a user who never answers
    // would leave the promise pending and the button spinning forever.
    const timer = setTimeout(() => resolve({ status: "unavailable" }), TIMEOUT_MS + 1000);
    const settle = (result: LocationResult) => {
      clearTimeout(timer);
      resolve(result);
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const zip = zipForCoords(position.coords.latitude, position.coords.longitude);
        settle(zip ? { status: "located", zip } : { status: "outside-zone" });
      },
      (error) => {
        settle(
          error.code === error.PERMISSION_DENIED
            ? { status: "denied" }
            : { status: "unavailable" },
        );
      },
      { timeout: TIMEOUT_MS, maximumAge: 5 * 60 * 1000 },
    );
  });
}
