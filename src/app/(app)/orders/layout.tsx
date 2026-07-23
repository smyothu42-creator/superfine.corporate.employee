import type { Metadata } from "next";

/** Names this route in the tab, the history and the screen reader's first words. */
/* An object, not a string: a plain string consumes the root template, so
   the nested detail route below would lose the " · Superfine Kitchen"
   suffix. Re-declaring the template keeps the children named too. */
export const metadata: Metadata = {
  title: { default: "My orders", template: "%s · Superfine Kitchen" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
