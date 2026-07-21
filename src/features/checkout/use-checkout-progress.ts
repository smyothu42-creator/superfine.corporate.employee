"use client";

import { useSessionStore, isSubsidized, deliveryComplete } from "@/store/use-session-store";

/** The two gates an order can wait on. Identity always; address only individuals. */
export type CheckoutStepId = "identity" | "address";

export interface CheckoutStep {
  id: CheckoutStepId;
  /** What the row says closed — an answer once done, the ask while not. */
  label: string;
  hint: string;
  done: boolean;
}

export interface CheckoutProgress {
  steps: CheckoutStep[];
  total: number;
  done: number;
  remaining: number;
  /** The step the CTA and the header pill both jump to, or null when ready. */
  firstIncomplete: CheckoutStep | null;
  /** 0–100, for the progress bar fill. */
  pct: number;
}

/**
 * The checklist that gates placing an order, derived from the session. The docked
 * CTA in CheckoutView reads `firstIncomplete` to decide whether a tap places the
 * order or jumps to the field at fault (the sign-in dialog, the address row).
 *
 * Display only — no `action`. The taps that clear a step live in CheckoutView,
 * which owns that state; this hook only says what's left.
 */
export function useCheckoutProgress(): CheckoutProgress {
  const account = useSessionStore((s) => s.account);
  const delivery = useSessionStore((s) => s.delivery);
  const corporate = isSubsidized(account);

  // Identity first: it decides whether an address is even asked.
  const steps: CheckoutStep[] = [
    {
      id: "identity",
      label: account ? "Signed in" : "Sign in to continue",
      hint: account
        ? corporate
          ? `${account.company} pricing applied`
          : account.email
        : "Unlock your company subsidy, or check out as an individual.",
      done: Boolean(account),
    },
  ];

  // The delivery address is only a question once we know it's an individual
  // order — a corporate order ships to the contract site, and a guest hasn't
  // said which they are yet.
  if (account && !corporate) {
    const ready = deliveryComplete(delivery);
    steps.push({
      id: "address",
      label: ready ? "Delivery address" : "Add a delivery address",
      hint: ready
        ? [delivery.street, delivery.apt, delivery.city, delivery.zip].filter(Boolean).join(", ")
        : "Where should we bring your order?",
      done: ready,
    });
  }

  const total = steps.length;
  const done = steps.filter((s) => s.done).length;
  const remaining = total - done;
  const firstIncomplete = steps.find((s) => !s.done) ?? null;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return { steps, total, done, remaining, firstIncomplete, pct };
}
