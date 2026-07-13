"use client";

import * as React from "react";
import { IdentityFlow, type AuthMode } from "@/features/auth/identity-flow";
import { cn } from "@/lib/utils";
import type { Account } from "@/store/use-session-store";

/**
 * The tabbed sign in / sign up card body — the mode toggle above the shared
 * {@link IdentityFlow}. Both the `/login` page and the guest sign-in modal use
 * it so the two screens can never drift apart; each wraps it in its own shell
 * and adds (or omits) its own footer links around it.
 */
export function AuthPanel({
  initialMode = "signin",
  /**
   * Forwarded to {@link IdentityFlow}: whether a new individual should be asked
   * for their delivery location on the menu after signing in. `/login` sets it
   * (that door isn't behind the location gate); the guest sign-in wall leaves it
   * off (its users are already on the menu with a ZIP answered).
   */
  resetLocation = false,
  onDone,
}: {
  initialMode?: AuthMode;
  resetLocation?: boolean;
  onDone?: (account: Account) => void;
}) {
  const [mode, setMode] = React.useState<AuthMode>(initialMode);

  return (
    <>
      <div className="mb-6 flex rounded-full border border-border bg-muted/60 p-1">
        <ModeTab active={mode === "signin"} onClick={() => setMode("signin")}>
          Sign in
        </ModeTab>
        <ModeTab active={mode === "signup"} onClick={() => setMode("signup")}>
          Sign up
        </ModeTab>
      </div>

      {/* Remounting on mode change resets a half-typed password — the toggle is
          a change of intent, and carrying the old state across it reads as a bug. */}
      <IdentityFlow
        key={mode}
        mode={mode}
        showModeSwitch={false}
        resetLocation={resetLocation}
        onModeChange={setMode}
        onDone={onDone}
      />
    </>
  );
}

function ModeTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex-1 rounded-full px-4 py-2 text-[13px] font-semibold transition-colors",
        active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
