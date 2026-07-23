import type { Config } from "tailwindcss";

/**
 * The edge of anything you can press, type in, or choose from.
 *
 * `border` (#ECE6D5) is a *decorative* rule — it separates cards and rows, and
 * at 1.25:1 on white that is all it is fit for. It was also carrying the visible
 * edge of 73 interactive controls, which is a different job with a hard
 * requirement behind it: a control's boundary has to reach 3:1 against its
 * surroundings, or a low-vision user is told a button is there and cannot see
 * where. This tone measures 3.65:1 on a white card and 3.41:1 on the cream page.
 *
 * One constant, two names: fields already used it as `input`, and buttons now
 * use it as `control`. Anything a person operates gets this edge; anything that
 * merely divides the page keeps `border`.
 */
const CONTROL_EDGE = "#8A8677";

/**
 * Superfine Kitchen — Corporate Admin
 * Design system taken from superfinekitchen.com:
 *   - Type: Hanken Grotesk — a single sans for headings, body, and UI
 *   - Color: deep petrol teal (#007078 / #004045) as the structural brand,
 *     lemon yellow (#F5E516) pops, coral CTAs, warm cream surfaces
 *   - Shape: generously rounded cards, pill buttons, soft warm shadows
 *
 * No longer 1:1 with the marketing site, and deliberately so: coral was
 * deepened from #F0875A to #B85C36 because white text on the old CTA measured
 * 2.52:1, against the 4.5:1 an accessible button needs. The marketing site and
 * the email templates still carry the old value, so the two will not match
 * until a designer reconciles them — see ACCESSIBILITY-AUDIT.md, Appendix B ⑥.
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
        // Decorative only — card outlines, row rules, dividers. Not strong
        // enough to be a control's edge; use `control` for that (see above).
        //
        // `strong` is the same rule a step firmer (1.53:1 white / 1.43:1 cream,
        // against DEFAULT's 1.25 / 1.16) for a decorative edge that has to hold
        // a large shape together — the search-and-filter bar's full-width pill,
        // where the DEFAULT tint disappears over that much length. Still
        // decorative, still short of the 3:1 a control's edge owes a low-vision
        // user, so it is not a substitute for `control` on small chrome.
        border: { DEFAULT: "#ECE6D5", strong: "#D9D1B7" },
        // Field edges have to be *seen* to be aimed at, so `input` is held to
        // 3:1 against both surfaces a field ever sits on — white cards and the
        // cream page. The old #E0DAC6 was 1.40:1 on white: an invisible box.
        input: CONTROL_EDGE,
        control: CONTROL_EDGE,
        ring: "#007078",
        // 4.5:1 on all five surfaces this lands on: card, page, teal wash,
        // muted and secondary. The old #76786E missed every one of them.
        muted: { DEFAULT: "#F4EFE0", foreground: "#67695F" },
        secondary: { DEFAULT: "#F1ECDB", foreground: "#2B2E2C" },

        // Primary = teal (structural brand)
        primary: { DEFAULT: "#007078", foreground: "#FBF7EC" },

        // Named brand scales (used for deliberate pops)
        teal: { DEFAULT: "#007078", deep: "#004045", soft: "#DCEDED", wash: "#EFF6F5" },
        yellow: { DEFAULT: "#F5E516", soft: "#FBF3A0", wash: "#FBF6CB", deep: "#C9B800" },
        // Deepened from #F0875A/#DC6B3C. The old pair put white text at 2.52:1
        // on the app's primary button — the single most-pressed control in the
        // product — and left the button's own edge at 2.36:1 against the cream
        // page, so its shape was invisible to low-vision users. `deep` doubles
        // as body text in a dozen places, where it was 3.38:1 at best.
        coral: { DEFAULT: "#B85C36", deep: "#A34E2C", soft: "#FBE4D6" },

        // `brand` alias → teal, so shared atoms read as the structural brand
        brand: { DEFAULT: "#007078", foreground: "#FFFFFF", soft: "#DCEDED" },
        accent: { DEFAULT: "#B85C36", foreground: "#FFFFFF" },

        // Dark navigation rail = the site's deep-teal footer tone
        sidebar: {
          DEFAULT: "#01413F",
          foreground: "#E8F1EE",
          // Lifted from #7FA8A2, which failed on all three rail states — worst
          // on the *active* row (3.08:1), i.e. the one telling you where you are.
          muted: "#ADC7C3",
          border: "#0A534F",
          active: "#0A5A55",
        },

        // Status palette (warm-tuned). Each `DEFAULT` is the text colour on its
        // own `bg`, and on white — so every one is held to 4.5:1 on both.
        success: { DEFAULT: "#2D7B53", bg: "#E7F3EA", border: "#BEE0C8" },
        warning: { DEFAULT: "#98641A", bg: "#FBF3D6", border: "#F0DCA0" },
        danger: { DEFAULT: "#B24A2B", bg: "#FBE7DF", border: "#F2C3AE" },
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
        // Indeterminate progress: a short segment that sweeps the full track.
        // The track is `overflow-hidden`, so the segment enters and leaves off
        // both edges rather than bouncing inside the visible box.
        "track-sweep": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(340%)" },
        },
        // The brand mark settling in as the loading screen takes over. Small
        // travel, so it reads as arrival rather than as another thing to watch.
        "rise-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.3s ease-out",
        "slide-in-down": "slide-in-down 0.32s cubic-bezier(.4,0,.2,1)",
        "track-sweep": "track-sweep 1.15s cubic-bezier(.65,0,.35,1) infinite",
        "rise-in": "rise-in 0.36s cubic-bezier(.4,0,.2,1) both",
      },
    },
  },
  plugins: [],
};

export default config;
