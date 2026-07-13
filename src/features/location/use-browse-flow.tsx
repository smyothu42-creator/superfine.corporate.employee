"use client";

import { useRouter } from "next/navigation";
import { useSessionStore } from "@/store/use-session-store";

/**
 * "Browse the menu, no account needed" — the door, not the doorman.
 *
 * The button navigates and nothing else. Asking for a location here would ask it
 * on the wrong screen: anyone who reaches the menu owes us the same answer,
 * however they got there — signed up with an email, came back through Google, or
 * pressed this button — so `LocationGate` asks once, on the menu, for everyone.
 *
 * The saved ZIP is cleared on the way, because this button *is* the request to
 * be asked. A granted browser permission answers it again without a prompt, so
 * the cost of re-asking someone who never moved is nothing; the cost of not
 * asking someone who did is a menu from a city they left.
 *
 * `locating` and `dialogNode` remain so the callers' loading and dialog slots
 * keep working while the gate owns the actual prompt.
 */
export function useBrowseFlow() {
  const router = useRouter();
  const clearZip = useSessionStore((s) => s.clearZip);
  const signOut = useSessionStore((s) => s.signOut);

  return {
    browse: () => {
      // "Browse without signing up" is an explicit request to be a guest, so it
      // drops any lingering account (a persisted session from a previous sign-in
      // would otherwise leave the sidebar showing a profile instead of "Sign
      // in") — browsing this way is never a real sign-in.
      signOut();
      clearZip();
      router.push("/menu");
    },
    locating: false,
    dialogNode: null,
  };
}
