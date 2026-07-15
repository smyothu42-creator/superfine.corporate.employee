"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useOrderEditStore } from "@/store/use-order-edit-store";
import { useOrderEdit } from "@/features/orders/use-order-edit";
import { confirm } from "@/store/use-confirm-store";

/**
 * Pages that are part of the edit/order flow itself — navigating between them
 * doesn't "leave" the edit, so they're never intercepted.
 */
function isFlowPath(path: string) {
  return (
    path === "/menu" ||
    path.startsWith("/menu/") ||
    path.startsWith("/checkout") ||
    path.startsWith("/cart")
  );
}

/**
 * Guards against wandering off mid-edit. While the edit workspace is live on the
 * menu, clicking a link to another section (Orders, Account, Auto-Order…) is
 * intercepted with a confirm: leaving *parks* the edit (the meal comes out of the
 * cart, the menu becomes a clean new-order flow) rather than losing or committing
 * it — the banner's "Continue editing" brings it back. Staying keeps editing.
 *
 * Implemented as a capture-phase click listener so it beats Next's <Link>
 * navigation (which fires in the bubble phase) without having to wrap every link.
 */
export function EditLeaveGuard() {
  const active = useOrderEditStore((s) => s.active);
  const pathname = usePathname();
  const router = useRouter();
  const { pauseEdit } = useOrderEdit();

  // Only arm on the menu surface (the grid and a meal's detail page), where the
  // edit workspace lives.
  const armed = active && pathname.startsWith("/menu");
  const ref = React.useRef({ armed, router, pauseEdit });
  ref.current = { armed, router, pauseEdit };
  const busy = React.useRef(false);

  React.useEffect(() => {
    async function onClick(e: MouseEvent) {
      const { armed, router, pauseEdit } = ref.current;
      if (!armed || busy.current) return;
      // Let modified clicks (new tab/window) and non-primary buttons pass.
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      const href = anchor.getAttribute("href") || "";
      if (!href.startsWith("/")) return; // external / hash / mailto
      const path = href.split("?")[0].split("#")[0];
      if (isFlowPath(path)) return;

      // Block the navigation and ask first.
      e.preventDefault();
      e.stopPropagation();
      busy.current = true;
      const ok = await confirm({
        title: "Leave editing this meal?",
        description:
          "You're currently editing this order. Leaving here won't change the meal yet — your edit is kept. To pick it back up, tap “Continue editing” in the banner.",
        confirmLabel: "Leave",
        cancelLabel: "Keep editing",
        tone: "warning",
      });
      busy.current = false;
      if (ok) {
        pauseEdit();
        router.push(href);
      }
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
