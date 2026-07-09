import { program } from "./program";

/**
 * The corporate roster: which companies have a contract, and which employee
 * emails their admin has added. Corporate access requires BOTH — a matching
 * domain alone is not enough, so a contractor or a departed employee on the
 * company domain cannot claim the subsidy.
 *
 * In production this lives behind an API. It is modelled here as a lookup that
 * the UI may only call through `resolveIdentity`, which deliberately returns
 * the same shape whether or not the address is on the roster (see below).
 */
interface CompanyContract {
  companyId: string;
  company: string;
  domain: string;
}

const contracts: CompanyContract[] = [
  { companyId: "neptune", company: program.company, domain: "neptunecorp.com" },
];

/** Employee addresses an admin has explicitly added. */
const employeeRoster = new Set([
  "maya.chen@neptunecorp.com",
  "sam.rivera@neptunecorp.com",
  "priya.nair@neptunecorp.com",
]);

/**
 * What the client is allowed to learn from an email address before the user has
 * proved they control that inbox: only which *channel* to verify through.
 *
 * Never the company name, never the subsidy, and never "that address isn't on
 * the roster" — any of those turn this into an oracle for enumerating a
 * customer's employees. A corporate address and an unknown one are
 * indistinguishable to the caller until a magic link is opened.
 */
export type IdentityChannel =
  /** On a company roster — verify by magic link sent to the work address. */
  | { channel: "magic_link" }
  /** Everyone else — individual sign-up / sign-in. */
  | { channel: "individual" };

export function resolveIdentity(email: string): IdentityChannel {
  return lookupCorporate(email) ? { channel: "magic_link" } : { channel: "individual" };
}

/**
 * The entitlement itself. Only ever called when a magic link has been opened —
 * i.e. after the user has proved control of the work inbox. In production this
 * is the server minting a session, never a client-side lookup.
 */
export function lookupCorporate(email: string): CompanyContract | null {
  const normalized = email.trim().toLowerCase();
  if (!employeeRoster.has(normalized)) return null;
  const domain = normalized.split("@")[1];
  return contracts.find((c) => c.domain === domain) ?? null;
}

/** Demo affordance: the addresses that will actually resolve to a company. */
export const demoCorporateEmail = "maya.chen@neptunecorp.com";
