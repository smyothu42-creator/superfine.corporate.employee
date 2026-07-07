import type { Config } from "tailwindcss";

/**
 * Superfine Kitchen — Corporate Admin
 * Design system matched 1:1 to superfinekitchen.com:
 *   - Type: Hanken Grotesk — a single sans for headings, body, and UI
 *   - Color: deep petrol teal (#007078 / #004045) as the structural brand,
 *     lemon yellow (#F5E516) pops, coral (#F0875A) CTAs, warm cream surfaces
 *   - Shape: generously rounded cards, pill buttons, soft warm shadows
 */
const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1.5rem" },
    extend: {
      colors: {
        // Semantic surfaces
        background: "#FBF7EC", // warm cream page
        foreground: "#2B2E2C", // charcoal ink
        card: { DEFAULT: "#FFFFFF", foreground: "#2B2E2C" },
        border: "#ECE6D5",
        input: "#E0DAC6",
        ring: "#007078",
        muted: { DEFAULT: "#F4EFE0", foreground: "#76786E" },
        secondary: { DEFAULT: "#F1ECDB", foreground: "#2B2E2C" },

        // Primary = teal (structural brand)
        primary: { DEFAULT: "#007078", foreground: "#FBF7EC" },

        // Named brand scales (used for deliberate pops)
        teal: { DEFAULT: "#007078", deep: "#004045", soft: "#DCEDED", wash: "#EFF6F5" },
        yellow: { DEFAULT: "#F5E516", soft: "#FBF3A0", wash: "#FBF6CB", deep: "#C9B800" },
        coral: { DEFAULT: "#F0875A", deep: "#DC6B3C", soft: "#FBE4D6" },

        // `brand` alias → teal, so shared atoms read as the structural brand
        brand: { DEFAULT: "#007078", foreground: "#FFFFFF", soft: "#DCEDED" },
        accent: { DEFAULT: "#F0875A", foreground: "#FFFFFF" },

        // Dark navigation rail = the site's deep-teal footer tone
        sidebar: {
          DEFAULT: "#01413F",
          foreground: "#E8F1EE",
          muted: "#7FA8A2",
          border: "#0A534F",
          active: "#0A5A55",
        },

        // Status palette (warm-tuned)
        success: { DEFAULT: "#2E7D55", bg: "#E7F3EA", border: "#BEE0C8" },
        warning: { DEFAULT: "#B7791F", bg: "#FBF3D6", border: "#F0DCA0" },
        danger: { DEFAULT: "#C2502F", bg: "#FBE7DF", border: "#F2C3AE" },
        info: { DEFAULT: "#0B6E76", bg: "#DCEDED", border: "#A9D6D6" },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "0.9rem" }],
      },
      borderRadius: {
        lg: "1rem",
        xl: "1.25rem",
        "2xl": "1.5rem",
        "3xl": "2rem",
        card: "1.25rem",
      },
      boxShadow: {
        card: "0 2px 14px rgba(43, 46, 44, 0.05)",
        raised: "0 14px 40px rgba(1, 65, 63, 0.16)",
        pop: "0 6px 0 0 #004045",
      },
      backgroundImage: {
        "hero-yellow": "linear-gradient(135deg, #F8EC58 0%, #F5E516 55%, #EFD90C 100%)",
      },
      keyframes: {
        // Opacity-only: a `transform` here would make any element using this
        // animation (e.g. the app-shell content wrapper) a containing block for
        // its `position: fixed` descendants, clipping full-screen modal overlays
        // to the content area instead of the viewport.
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "slide-in-down": {
          from: { opacity: "0", transform: "translateY(-10px)", maxHeight: "0" },
          to: { opacity: "1", transform: "translateY(0)", maxHeight: "1000px" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.3s ease-out",
        "slide-in-down": "slide-in-down 0.32s cubic-bezier(.4,0,.2,1)",
      },
    },
  },
  plugins: [],
};

export default config;
