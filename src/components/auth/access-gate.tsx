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

  const gated = hydrated && requiresAccount(pathname) && !account;

  React.useEffect(() => {
    if (gated) {
      openSignInPrompt(pathname);
      router.replace("/menu");
    }
  }, [gated, pathname, openSignInPrompt, router]);

  // Render through the un-hydrated tick, so a returning visitor with a saved
  // session doesn't get a flash of nothing on every navigation.
  if (gated) return null;
  return <LocationGate>{children}</LocationGate>;
}
