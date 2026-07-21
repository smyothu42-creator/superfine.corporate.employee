"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { IdentityFlow } from "@/features/auth/identity-flow";
import { useDialog } from "@/lib/use-dialog";
import type { Account } from "@/store/use-session-store";

/**
 * The identity flow in a dialog. Both places that ask "who are you" — the
 * corporate nudge on the menu and the gate at checkout — need the same three
 * steps, so they share one shell rather than each growing their own portal.
 *
 * Dismissable on purpose. At checkout the address below stays locked until an
 * email is given, so a closed dialog costs the user nothing but a click to
 * reopen; trapping them in a modal to make the same point would be worse.
 */
export function IdentityModal({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  onDone?: (account: Account) => void;
}) {
  // Escape, the focus trap, focus restore and the scroll lock all come from the
  // hook. It has to be called above the early-return below, and no-ops on
  // `open: false`, which is why `open` goes in rather than gating the call.
  const dialog = useDialog({ open, onClose });

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-teal-deep/50 animate-fade-in"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Sign in or continue as a guest"
        {...dialog.props}
        className="relative w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-raised animate-fade-in"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-full border border-border touch-target p-1.5 text-muted-foreground hover:bg-muted"
        >
          <X className="size-4" />
        </button>
        <IdentityFlow
          onDone={(account) => {
            onDone?.(account);
            onClose();
          }}
        />
      </div>
    </div>,
    document.body,
  );
}
