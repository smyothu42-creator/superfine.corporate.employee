"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { AuthLoadingScreen } from "@/components/brand/auth-loading";
import { useUiStore } from "@/store/use-ui-store";

/**
 * Mounted once at the document root so the sign-in hand-off screen can outlive
 * whatever raised it — the guest wall's modal closes and `/login` navigates
 * away, and the whole point of the screen is to still be there while that
 * happens.
 *
 * It takes itself down rather than waiting to be dismissed, because the thing
 * it is covering has no completion callback: the caller has already navigated,
 * and the destination doesn't know a hand-off was in progress.
 */
export function AuthHandoff() {
  const handoff = useUiStore((s) => s.authHandoff);
  const end = useUiStore((s) => s.endAuthHandoff);
  const pathname = usePathname();
  // The route we were raised on. A change away from it means the destination
  // has mounted and there is nothing left to cover.
  const openedOn = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!handoff) {
      openedOn.current = null;
      return;
    }
    if (openedOn.current === null) {
      openedOn.current = pathname;
    } else if (pathname !== openedOn.current) {
      end();
      return;
    }
    // Signing in from the guest wall onto the page you were already on doesn't
    // navigate, so there is no route change coming to end this. Hold a short
    // completion beat, then hand the screen back. It doubles as the backstop
    // for a navigation that never lands.
    const settle = window.setTimeout(end, SETTLE_MS);
    return () => window.clearTimeout(settle);
  }, [handoff, pathname, end]);

  if (!handoff) return null;
  return <AuthLoadingScreen title={handoff.title} detail={handoff.detail} />;
}

/**
 * How long the screen stays up when no navigation follows. Long enough to read
 * as a finished beat rather than a flicker, short enough that a same-page sign
 * in doesn't feel held up by its own confirmation.
 */
const SETTLE_MS = 700;
