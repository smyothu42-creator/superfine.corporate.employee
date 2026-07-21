"use client";

import * as React from "react";
import { useCartStore } from "@/store/use-cart-store";
import { useSessionStore } from "@/store/use-session-store";
import { useAddressesStore } from "@/store/use-addresses-store";
import { useCardsStore } from "@/store/use-cards-store";
import { useRatingsStore } from "@/store/use-ratings-store";
import { useOrderEditStore } from "@/store/use-order-edit-store";

/**
 * Reads the persisted stores back in, once, after the first paint.
 *
 * Both stores set `skipHydration`, because the alternative is worse: zustand
 * restores localStorage the moment the module is imported, so the client's very
 * first render already knows about a cart and a session that the server — which
 * has neither — did not render. React compares the two and throws.
 *
 * The cost is one extra render on load, in which the app is a signed-out guest
 * with an empty cart. Everything that would flicker keys off `session.hydrated`,
 * which is set by this pass.
 */
export function StoreHydrator() {
  React.useEffect(() => {
    void useCartStore.persist.rehydrate();
    // The in-progress "edit a placed order" session shadows the cart, so it
    // restores on the same pass — the resume/discard banner survives a reload.
    void useOrderEditStore.persist.rehydrate();
    // The individual's saved-address book — same skipHydration treatment.
    void useAddressesStore.persist.rehydrate();
    // …and their wallet, so a returning customer's saved card is already the
    // selected payment method by the time checkout paints.
    void useCardsStore.persist.rehydrate();
    // Meal ratings — restored so an already-rated meal shows as rated rather
    // than inviting a second rating the store would then reject.
    void useRatingsStore.persist.rehydrate();
    // Sets `hydrated`, which the gates wait for before deciding anything.
    void useSessionStore.persist.rehydrate();
  }, []);

  return null;
}
