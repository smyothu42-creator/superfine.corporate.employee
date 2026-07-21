// Global styles lead. Importing them after a client component lets that
// component's own stylesheet win the cascade, which strips the whole page.
import "./globals.css";
import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { StoreHydrator } from "@/store/store-hydrator";
import { AuthHandoff } from "@/components/brand/auth-handoff";

/**
 * Single typeface for the whole site — Geist across headings, body,
 * and UI. One variable (`--font-sans`) drives every font role.
 */

export const metadata: Metadata = {
  title: "My Meals · Superfine Kitchen",
  description:
    "Order your company-subsidized lunches on Superfine Kitchen: browse the menu, order for one day or the week, and track every delivery.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#004045",
  // Let the page paint behind the notch and the home indicator. Without this,
  // `env(safe-area-inset-*)` is always 0 and iOS letterboxes the app in a
  // white band — which is also why every fixed bar below pads itself back out.
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={GeistSans.variable}
      style={{ ["--font-sans" as string]: "var(--font-geist-sans)" }}
    >
      <body className="font-sans">
        <StoreHydrator />
        {children}
        {/* Outside `children` so it survives the route change it is covering. */}
        <AuthHandoff />
      </body>
    </html>
  );
}
