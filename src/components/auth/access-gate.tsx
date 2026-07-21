"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { LocationGate } from "@/features/location/location-gate";
import { requiresAccount } from "@/lib/nav";
import { useSessionStore } from "@/store/use-session-store";
import { useUiStore } from "@/store/use-ui-store";

/**
 * What a viewer is allowed to reach. Two different questions, in order:
 * *where* are you (the menu changes by delivery zone), and *who* are you (only
 * some screens care). Conflating them is what forced everyone through a sign-in
 * wall to look at lunch.
 *
 * "Who" is answered here: a guest who lands on an account-only screen (see
 * {@link requiresAccount}) — by typing the URL or following a stale link — is
 * bounced to the menu with the sign-in dialog raised over it, remembering where
 * they were headed so signing in lands them there. The nav rails open the same
 * dialog in place, so the guest never navigates to a page there's nothing to
 * show them on. "Where" is answered by `LocationGate`, in place.
 */
export function AccessGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useSessionStore((s) => s.hydrated);
  const account = useSessionStore((s) => s.account);
  const openSignInPrompt = useUiStore((s) => s.openSignInPrompt);
  const signingOut = useUiStore((s) => s.signingOut);

  // Signing out *from* an account-only screen looks exactly like a guest
  // landing on one, so without this the gate would race the sign-out's own
  // navigation and win — dropping the user on the menu under a sign-in dialog
  // instead of on the sign-in page they asked for.
  const gated = hydrated && requiresAccount(pathname) && !account && !signingOut;

  React.useEffect(() => {
    if (gated) {
      openSignInPrompt(pathname);
      router.replace("/menu");
    }
  }, [gated, pathname, openSignInPrompt, router]);

  // The flag is a handoff, not a mode: once the sign-out's navigation has
  // actually left the gated path, drop it so the gate guards again.
  const endSignOut = useUiStore((s) => s.endSignOut);
  React.useEffect(() => {
    if (signingOut && !requiresAccount(pathname)) endSignOut();
  }, [signingOut, pathname, endSignOut]);

  // Render through the un-hydrated tick, so a returning visitor with a saved
  // session doesn't get a flash of nothing on every navigation.
  //
  // `leaving` is the same blank, for the tick or two between the session
  // dropping and the sign-out's navigation landing. The gate is deliberately
  // standing down there, so without it the account screen would render against
  // a null account and throw on the way out the door.
  const leaving = hydrated && requiresAccount(pathname) && !account && signingOut;
  if (gated || leaving) return null;
  return <LocationGate>{children}</LocationGate>;
}
