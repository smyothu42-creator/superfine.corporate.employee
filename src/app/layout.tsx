import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import "./globals.css";

/**
 * Single typeface for the whole site — Geist across headings, body,
 * and UI. One variable (`--font-sans`) drives every font role.
 */

export const metadata: Metadata = {
  title: "My Meals — Superfine Kitchen",
  description:
    "Order your company-subsidized lunches on Superfine Kitchen: browse the menu, order for one day or the week, and track every delivery.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#004045",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={GeistSans.variable}
      style={{ ["--font-sans" as string]: "var(--font-geist-sans)" }}
    >
      <body className="font-sans">{children}</body>
    </html>
  );
}
