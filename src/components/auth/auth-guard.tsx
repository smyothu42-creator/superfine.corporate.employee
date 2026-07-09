"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/store/use-session-store";

/**
 * Identity is the one thing the app needs before anything else is worth
 * rendering. Every price on every screen is a subsidised price, so someone who
 * deep-links straight to /menu — a shared link, a bookmark — has to sign in
 * first rather than be quoted a number that isn't theirs.
 *
 * This replaces the old ZIP gate: there is no browse-before-you-sign-in path
 * any more, and serviceability is a delivery question, not an entry question.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const hydrated = useSessionStore((s) => s.hydrated);
  const account = useSessionStore((s) => s.account);
  const needsSignIn = hydrated && !account;

  React.useEffect(() => {
    if (needsSignIn) router.replace("/login");
  }, [needsSignIn, router]);

  // Render children until the store has rehydrated, so a returning employee with
  // a saved session doesn't get a flash of nothing on every navigation.
  if (needsSignIn) return null;
  return <>{children}</>;
}
