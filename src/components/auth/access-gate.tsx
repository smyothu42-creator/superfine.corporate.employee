"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { LocationGate } from "@/features/location/location-gate";
import { useSessionStore } from "@/store/use-session-store";

/**
 * Screens that are about a person rather than the food: an order history, a
 * saved profile, a standing rotation. A guest has none of these, so there is
 * nothing to render and no version of these pages that works without an account.
 *
 * The menu, the cart and checkout are deliberately absent. Browsing needs a
 * delivery area, not an identity, and checkout asks who you are at the moment it
 * finally needs to know.
 */
const ACCOUNT_ROUTES = ["/account", "/orders", "/auto-order", "/plan"];

/**
 * What a viewer is allowed to reach. Two different questions, in order:
 * *where* are you (the menu changes by delivery zone), and *who* are you (only
 * some screens care). Conflating them is what forced everyone through a sign-in
 * wall to look at lunch.
 *
 * "Who" is answered here, by a redirect to sign-in. "Where" is answered by
 * `LocationGate`, in place: bouncing an individual back to `/` to press a button
 * that asks the browser for their location is a round trip we can just make
 * here, on the screen they were trying to reach.
 */
export function AccessGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useSessionStore((s) => s.hydrated);
  const account = useSessionStore((s) => s.account);

  const needsAccount = ACCOUNT_ROUTES.some((r) => pathname.startsWith(r));
  const redirect = hydrated && needsAccount && !account ? "/login" : null;

  React.useEffect(() => {
    if (redirect) router.replace(redirect);
  }, [redirect, router]);

  // Render through the un-hydrated tick, so a returning visitor with a saved
  // session doesn't get a flash of nothing on every navigation.
  if (redirect) return null;
  return <LocationGate>{children}</LocationGate>;
}
