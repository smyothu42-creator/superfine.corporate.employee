import type { Metadata } from "next";

/** Names this route in the tab, the history and the screen reader's first words. */
export const metadata: Metadata = { title: "Set your password" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
