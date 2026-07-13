"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { AuthPanel } from "@/features/auth/auth-panel";
import { useUiStore } from "@/store/use-ui-store";

/**
 * The sign-in wall a guest hits when they reach for an account-only screen —
 * My Orders, Notifications, Feedback, Account & Profile.
 *
 * It's the same tabbed sign in / sign up card as `/login`, minus the "browse the
 * menu without signing up" door: someone who is already browsing was shown this
 * dialog precisely because browsing isn't enough for where they're headed, so
 * offering it again would just be a button that closes the thing they need.
 *
 * Mounted once at the shell and driven by the UI store, so every entry point —
 * the nav rails and a direct URL caught by the access gate — opens the one
 * dialog. On success it lands them where they were originally headed.
 */
export function SignInModal() {
  const router = useRouter();
  const open = useUiStore((s) => s.signInPromptOpen);
  const close = useUiStore((s) => s.closeSignInPrompt);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-teal-deep/50 animate-fade-in" onClick={close} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Sign in"
        className="relative w-full max-w-lg rounded-3xl border border-border bg-card p-7 shadow-raised animate-fade-in sm:p-9"
      >
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-full border border-border touch-target p-1.5 text-muted-foreground hover:bg-muted"
        >
          <X className="size-4" />
        </button>
        <AuthPanel
          onDone={() => {
            // Read the pending destination before close() clears it, then send
            // them on to the screen they were originally trying to reach.
            const next = useUiStore.getState().signInPromptNext;
            close();
            if (next) router.push(next);
          }}
        />
      </div>
    </div>,
    document.body,
  );
}
