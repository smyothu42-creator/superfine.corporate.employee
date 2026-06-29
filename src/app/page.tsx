import { redirect } from "next/navigation";

/**
 * Entry point. The Corporate Employee app opens at the company sign-in screen;
 * once signed in, employees land straight on their company menu (see /menu).
 */
export default function HomePage() {
  redirect("/login");
}
