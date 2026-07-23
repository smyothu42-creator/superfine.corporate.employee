import type { Metadata } from "next";

/** Names this route in the tab, the history and the screen reader's first words.
 *  The emailed rating link is the most public surface in the app — it is reached
 *  without an account, often from a phone, and it was the one route still
 *  reporting the root title. */
export const metadata: Metadata = { title: "Rate your lunch" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
