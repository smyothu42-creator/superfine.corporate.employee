"use client";

import * as React from "react";
import { useCartStore } from "@/store/use-cart-store";
import { useSessionStore } from "@/store/use-session-store";
import { useAddressesStore } from "@/store/use-addresses-store";

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
    // The individual's saved-address book — same skipHydration treatment.
    void useAddressesStore.persist.rehydrate();
    // Sets `hydrated`, which the gates wait for before deciding anything.
    void useSessionStore.persist.rehydrate();
  }, []);

  return null;
}
