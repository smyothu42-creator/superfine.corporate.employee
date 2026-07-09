"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { checkZip, type ZipStatus } from "@/data/service-areas";

/**
 * Who the viewer is. A signed-out visitor is `null` — not a corporate employee,
 * which is what the old flow assumed of everyone who reached the app.
 */
export interface Account {
  /** Corporate = entitled to a company subsidy. Individual = pays retail. */
  kind: "individual" | "corporate";
  email: string;
  name?: string;
  phone?: string;
  /* Corporate only — set by the server when a magic link is opened. */
  companyId?: string;
  company?: string;
}

/**
 * An individual's own delivery address. Corporate employees never fill this in —
 * their orders go to a contract-locked company location, which is precisely why
 * the two checkouts can't share one address widget.
 */
export interface DeliveryDetails {
  street: string;
  apt: string;
  city: string;
  zip: string;
  phone: string;
  instructions: string;
}

export const emptyDelivery: DeliveryDetails = {
  street: "",
  apt: "",
  city: "",
  zip: "",
  phone: "",
  instructions: "",
};

interface SessionState {
  /** Delivery ZIP, asked for up front. "" until answered. */
  zip: string;
  zipStatus: ZipStatus | null;
  account: Account | null;
  /** Individual delivery details, collected at checkout. */
  delivery: DeliveryDetails;
  /** localStorage has been read — until then, render as a signed-out guest. */
  hydrated: boolean;

  setZip: (zip: string, status: ZipStatus) => void;
  clearZip: () => void;
  setDelivery: (delivery: DeliveryDetails) => void;
  signIn: (account: Account) => void;
  signOut: () => void;
  markHydrated: () => void;
}

/**
 * Everything the driver needs before an individual order can be placed. The ZIP
 * must be one we actually deliver to, not merely well-formed — the field is
 * editable after the serviceability check, so this is the last place a typo'd
 * out-of-zone address gets caught before payment.
 */
export function deliveryComplete(d: DeliveryDetails): boolean {
  return Boolean(
    d.street.trim() && d.city.trim() && checkZip(d.zip) === "serviceable" && d.phone.trim(),
  );
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      zip: "",
      zipStatus: null,
      account: null,
      delivery: emptyDelivery,
      hydrated: false,
      // Seed the delivery ZIP from the serviceability answer — they already told
      // us once, and a mismatch here would mean delivering outside the zone.
      setZip: (zip, zipStatus) =>
        set((s) => ({ zip, zipStatus, delivery: { ...s.delivery, zip } })),
      clearZip: () => set({ zip: "", zipStatus: null }),
      setDelivery: (delivery) => set({ delivery }),
      signIn: (account) =>
        set((s) => ({
          account,
          // Carry the phone the individual just gave us into the address form.
          delivery: account.phone ? { ...s.delivery, phone: account.phone } : s.delivery,
        })),
      // The ZIP survives sign-out: it isn't identity, and re-asking is friction.
      // The address does not — it belongs to the person who just left.
      signOut: () => set((s) => ({ account: null, delivery: { ...emptyDelivery, zip: s.zip } })),
      markHydrated: () => set({ hydrated: true }),
    }),
    {
      name: "sfk:session",
      // `hydrated` is derived, never stored — persisting it would make a cold
      // load claim it had already read a store it hasn't.
      partialize: (s) => ({
        zip: s.zip,
        zipStatus: s.zipStatus,
        account: s.account,
        delivery: s.delivery,
      }),
      onRehydrateStorage: () => (state) => state?.markHydrated(),
    },
  ),
);

/** True only for a verified corporate employee. Guests and individuals pay retail. */
export function isSubsidized(account: Account | null): boolean {
  return account?.kind === "corporate";
}
