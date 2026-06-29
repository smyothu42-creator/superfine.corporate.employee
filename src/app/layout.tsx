import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk } from "next/font/google";
import "./globals.css";

/**
 * Single typeface for the whole site — Hanken Grotesk across headings, body,
 * and UI. One variable drives every font role.
 */
const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["400", "500", "600", "700"],
  fallback: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "Arial", "sans-serif"],
  adjustFontFallback: false,
});

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
    <html lang="en" className={hanken.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
