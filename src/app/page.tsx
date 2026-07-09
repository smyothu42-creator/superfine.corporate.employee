import { redirect } from "next/navigation";

/**
 * Entry point. There is one door: sign in with your corporate email and
 * password. No ZIP question, no browse-first path — every price in the app is a
 * company-subsidised price, so there is nothing to show before we know who you
 * are.
 */
export default function HomePage() {
  redirect("/login");
}
