import { program } from "./program";

/**
 * The companies with a meal-program contract, keyed by the email domain their
 * employees sign in with. A corporate employee is identified by their domain.
 *
 * In production this lives behind an API. Note that a domain is a weaker claim
 * than a per-employee roster: a contractor or a departed employee who still
 * holds an address on the domain resolves as an entitled employee here. The
 * contract's admin surface (not built) is where that list would be pinned down.
 */
interface CompanyContract {
  companyId: string;
  company: string;
  domain: string;
}

const contracts: CompanyContract[] = [
  { companyId: "neptune", company: program.company, domain: "neptunecorp.com" },
];

/**
 * The entitlement. Only ever called once an address has been *proved* — a
 * password checked, a verification link opened, or an OAuth provider vouching
 * for it. Nothing before that point may learn whether a domain has a contract:
 * answering "is this a Superfine customer?" from an unauthenticated screen turns
 * it into an oracle for enumerating our clients. In production this is the
 * server minting a session, never a client-side lookup.
 */
export function lookupCorporate(email: string): CompanyContract | null {
  const domain = email.trim().toLowerCase().split("@")[1];
  return contracts.find((c) => c.domain === domain) ?? null;
}

/** Demo affordance: the address that will actually resolve to a company. */
export const demoCorporateEmail = "maya.chen@neptunecorp.com";

/** Demo affordance: what the Google OAuth round trip hands back — no contract. */
export const demoGoogleEmail = "alex.morgan@gmail.com";

/** Demo affordance: what the Microsoft OAuth round trip hands back — a personal
 *  outlook address, so it resolves to an individual, not a company. */
export const demoMicrosoftEmail = "jordan.lee@outlook.com";
