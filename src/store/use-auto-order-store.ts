import { create } from "zustand";
import { me } from "@/data/me";
import { program } from "@/data/program";
import { DEFAULT_AUTO_DAYS, type AutoConfig } from "@/features/auto-order/shared";

/**
 * Bridges the Auto-Order dashboard's controls up to the global Topbar, so the
 * nav header can carry the "Edit Auto Order" + "Stop ordering" actions and a
 * meal-pool count. The dashboard publishes this on mount and clears it on
 * unmount. `navTitle` lets the auto-order view set the page title per state
 * (Build Your Auto Order while picking, Auto Order Dashboard once active).
 */
export interface AutoOrderHeader {
  /** Number of meals in the rotation pool. */
  poolCount: number;
  /** Open the meal-picking / setup flow. */
  onEdit: () => void;
  /** Turn off auto-ordering. Absent while paused (nothing to turn off). */
  onStop?: () => void;
}

interface AutoOrderHeaderState {
  /**
   * The live Auto-Order config. It lives here rather than in the page because
   * the page unmounts on every navigation — once it's set up, leaving and
   * coming back must land on the dashboard, not the intro. Only turning it off
   * returns the status to "inactive".
   */
  config: AutoConfig;
  setConfig: (config: AutoConfig) => void;
  header: AutoOrderHeader | null;
  setHeader: (header: AutoOrderHeader | null) => void;
  /** Contextual page title for the auto-order route (null = default). */
  navTitle: string | null;
  setNavTitle: (title: string | null) => void;
  /** True while the meal-picking wizard is open — lets the Topbar show the
   *  "See how it works" tour trigger. (The Back button lives on the page.) */
  inSetup: boolean;
  setInSetup: (inSetup: boolean) => void;
  /**
   * Whether the company's contract includes Auto-Order. Seeded from the program
   * data; in production it would only ever change when the contract does.
   *
   * It's in the store purely so the demo toggle on the Auto-Order page can flip
   * it live — a contract setting isn't something an employee can change, and
   * this must not grow a UI outside that one demo affordance.
   */
  companyEnabled: boolean;
  setCompanyEnabled: (companyEnabled: boolean) => void;
}

export const useAutoOrderStore = create<AutoOrderHeaderState>((set) => ({
  config: {
    status: me.autoOrder.enabled ? "active" : "inactive",
    favorites: me.autoOrder.favorites,
    soldOut: "notify",
    days: DEFAULT_AUTO_DAYS,
  },
  setConfig: (config) => set({ config }),
  header: null,
  setHeader: (header) => set({ header }),
  navTitle: null,
  setNavTitle: (navTitle) => set({ navTitle }),
  inSetup: false,
  setInSetup: (inSetup) => set({ inSetup }),
  companyEnabled: program.autoOrderEnabled,
  setCompanyEnabled: (companyEnabled) => set({ companyEnabled }),
}));
