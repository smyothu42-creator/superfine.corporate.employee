"use client";

import { useRouter } from "next/navigation";
import { confirm } from "@/store/use-confirm-store";
import { useSessionStore } from "@/store/use-session-store";
import { useUiStore } from "@/store/use-ui-store";

/**
 * Signing out, in one place.
 *
 * Three entry points ask for it — the desktop rail, the mobile drawer, and the
 * account screen's own row — and the order of the four steps is what makes it
 * correct, so none of them should be spelling it out for themselves:
 *
 *  1. confirm, because a corporate session takes the company's pricing with it;
 *  2. raise `signingOut`, so `AccessGate` stands down instead of bouncing the
 *     now-account-less viewer to the menu under a sign-in dialog;
 *  3. drop the session — navigating alone used to leave the subsidy applied to
 *     whoever sat down at the machine next;
 *  4. land on `/login`, which is sign-in and sign-up on one screen.
 *
 * `onDone` closes whatever chrome the caller opened (the mobile drawer) before
 * the navigation, so it isn't still sitting there on arrival.
 */
export function useSignOut(onDone?: () => void) {
  const router = useRouter();
  const account = useSessionStore((s) => s.account);
  const signOut = useSessionStore((s) => s.signOut);
  const beginSignOut = useUiStore((s) => s.beginSignOut);

  return async function handleSignOut() {
    const ok = await confirm({
      title: account?.company ? `Sign out of ${account.company}?` : "Sign out?",
      description: account?.company
        ? "Your company's pricing will no longer apply until you verify again."
        : "You can keep browsing, but you'll need to sign in again to order.",
      confirmLabel: "Sign out",
    });
    if (!ok) return;

    beginSignOut();
    signOut();
    onDone?.();
    router.push("/login");
  };
}
