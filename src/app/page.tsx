import { redirect } from "next/navigation";

/**
 * There is no landing page. It only ever offered three doors — browse, sign in,
 * sign up — and `/login` already holds all three, so the extra screen was one
 * more click in front of every one of them.
 */
export default function RootPage() {
  redirect("/login");
}
