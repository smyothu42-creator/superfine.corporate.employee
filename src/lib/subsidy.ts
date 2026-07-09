import { program } from "@/data/program";
import { isSubsidized, useSessionStore } from "@/store/use-session-store";
import type { SubsidyMode } from "@/store/use-ui-store";

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * Whether the *current viewer* is entitled to a company subsidy at all. Guests
 * and individual customers are not: they pay retail, and every split below
 * collapses to "you pay everything".
 *
 * This is the one gate that stops a signed-out visitor from being quoted a
 * corporate price. It reads the session live rather than taking a parameter, so
 * no call site can forget to pass it — the failure mode of forgetting would be
 * leaking subsidised pricing to a guest.
 *
 * It is a *display* gate only. The authoritative subsidy must be recomputed
 * server-side from the session's companyId when the order is placed; nothing a
 * browser says about its own entitlement can be trusted.
 */
function subsidyApplies(): boolean {
  return isSubsidized(useSessionStore.getState().account);
}

/**
 * What the company pays on a day's gross total, under whichever contract is
 * active. The two models differ in kind, not just in number: the fixed allowance
 * is a cap (spend past it and the rest is yours), while the percentage is a
 * share that holds at any total — which is why a percent day can never go "over".
 *
 * Every surface that splits a bill — topbar pill, cart, checkout — goes through
 * here, so switching the model can't leave one of them quoting the old contract.
 */
export function companyCovers(dayTotal: number, mode: SubsidyMode): number {
  if (!subsidyApplies()) return 0;
  return mode === "percent"
    ? round(dayTotal * (program.subsidyPercent / 100))
    : Math.min(dayTotal, program.subsidyPerDay);
}

/** What the employee owes on a day's gross total, after the company's share. */
export function employeeCovers(dayTotal: number, mode: SubsidyMode): number {
  return round(dayTotal - companyCovers(dayTotal, mode));
}

/**
 * Budget headroom left on a day. Only meaningful under the fixed allowance — a
 * percentage share has no cap, so nothing is ever "left" and this is always 0.
 */
export function budgetRemaining(dayTotal: number, mode: SubsidyMode): number {
  if (!subsidyApplies()) return 0;
  return mode === "percent" ? 0 : Math.max(0, program.subsidyPerDay - dayTotal);
}

/** Row label for the company's share — names the rate when it's a percentage. */
export function subsidyLabel(mode: SubsidyMode): string {
  return mode === "percent" ? `Company pays · ${program.subsidyPercent}%` : "Company pays";
}
