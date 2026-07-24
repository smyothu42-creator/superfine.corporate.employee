# Superfine Kitchen — Design System

**A complete, portable specification of the visual language, component library, layout
system, interaction contracts and accessibility rules used across the Superfine Kitchen /
Honey Cart corporate meal-ordering platform.**

This document is written to be *applied to another platform*. Everything here is either a
literal token value, a copy-pasteable snippet, or an explicit rule with its reasoning. Where
a decision looks arbitrary, the reason is stated — because the reason is what tells you
whether the decision survives a port.

**Stack the system was extracted from:** Next.js 14 (App Router) · React 18 · TypeScript
strict · Tailwind CSS 3.4 · `class-variance-authority` + `tailwind-merge` · `lucide-react`
icons · Zustand for state. Nothing in the *design* system depends on that stack — the tokens
are plain hex/rem values and the components are ~250 lines of markup each — but the Tailwind
config below is the fastest path to reproducing it.

---

## Table of contents

1. [Design principles](#1-design-principles)
2. [Foundations](#2-foundations)
   - [2.1 Color](#21-color)
   - [2.2 Typography](#22-typography)
   - [2.3 Spacing & sizing](#23-spacing--sizing)
   - [2.4 Radius](#24-radius)
   - [2.5 Elevation & shadow](#25-elevation--shadow)
   - [2.6 Borders — the two-tier rule](#26-borders--the-two-tier-rule)
   - [2.7 Motion](#27-motion)
   - [2.8 Iconography](#28-iconography)
   - [2.9 Z-index scale](#29-z-index-scale)
   - [2.10 Breakpoints & responsive strategy](#210-breakpoints--responsive-strategy)
   - [2.11 Safe areas & viewport](#211-safe-areas--viewport)
   - [2.12 Focus & keyboard](#212-focus--keyboard)
3. [Layout system](#3-layout-system)
4. [Component library](#4-component-library)
5. [Composition patterns](#5-composition-patterns)
6. [Content & copy guidelines](#6-content--copy-guidelines)
7. [Accessibility contract](#7-accessibility-contract)
8. [Data display conventions](#8-data-display-conventions)
9. [Porting guide](#9-porting-guide)
10. [Appendix — full Tailwind config & global CSS](#10-appendix--full-tailwind-config--global-css)

---

## 1. Design principles

These are the six rules that produced every specific decision below. Port these first; the
tokens follow from them.

### 1.1 Warm, not clinical
The page is **cream (`#FBF7EC`)**, not white. Cards are white and sit *on* the cream, so a
card reads as a raised object rather than as a region of the page. Shadows are warm-tinted
(`rgba(43,46,44,0.05)`, `rgba(1,65,63,0.16)`) — never neutral grey. The result is a food
product that feels like a kitchen, not a dashboard.

### 1.2 Round everything, but at three distinct scales
Radius carries meaning:
- **`rounded-full`** — anything you press or that is a *token* of something (buttons, pills,
  chips, badges, avatars, toggles, nav items, calendar days, counters). 237 uses.
- **`rounded-2xl` (1.5rem)** — surfaces: cards, panels, list containers, tiles. 84 uses.
- **`rounded-xl` (1.25rem)** — inputs, inner rows, nested boxes inside a card. 69 uses.
- **`rounded-3xl` (2rem)** — modal panels only. 30 uses.

A control's radius is how a user tells "press me" from "read me" before they read anything.
Never mix: a squared button in this system reads as broken.

### 1.3 Contrast is a hard floor, not a preference
Every interactive element's **boundary** clears 3:1 against *both* surfaces it can sit on
(white card and cream page). Every piece of **text** clears 4.5:1 against *every* background
it lands on. This forced real palette changes (coral was deepened from `#F0875A` to
`#B85C36`, muted text from `#76786E` to `#67695F`) and it forbids a whole technique:
**never fade a colour toward its background with `opacity` or `/70` to de-emphasise it.**
Fading a colour toward its background is exactly what the contrast ratio measures. Use a
different, tested token instead, or reduce font-weight.

### 1.4 One control, one Tab stop; arrows do what the role promises
If a group of things reads visually as one control (a tab strip, a chip row, a radio group,
a month grid, a star rating), it collapses to **one Tab stop** and the **arrow keys** move
within it. If a group is a list of *destinations* (the nav rail), every item keeps its own
Tab stop and arrows are purely additive. Announcing "radio button, 1 of 5" and then not
answering the arrows is a broken promise, and this system treats it as a defect.

### 1.5 Every layer owes four things
Escape closes it · Tab stays inside it · focus starts inside it and returns to whatever
opened it · the page behind stops scrolling and goes `inert`. These are not per-dialog
decisions — they live in one hook (`useDialog`) that every layer uses. See §4.20.

### 1.6 Say what's left to do, in the label
Primary buttons never sit disabled-and-silent. They carry the next unanswered question:
`Choose Protein` → `Complete Customization 2` → `Add to order · $14.50`. A dimmed button
with no explanation reads as a bug; a live button that names the blocker moves the user
forward.

---

## 2. Foundations

### 2.1 Color

#### 2.1.1 The brand triad

| Role | Token | Hex | Meaning |
|---|---|---|---|
| **Structural brand** | `teal` / `primary` | `#007078` | Deep petrol teal. Icons, active states, selected rows, focus ring, links, progress fills, secondary CTA. The colour of *structure and state*. |
| **Depth / ink on light brand** | `teal-deep` | `#004045` | Headings on yellow/teal surfaces, table headers, dropdown trigger labels, hard offset shadows, theme-color. |
| **Energy / hero** | `yellow` | `#F5E516` | Lemon yellow. Auth hero panel, food-photo placeholder, active nav pill on the dark rail, focus ring on dark surfaces. Never a CTA. |
| **Action** | `coral` | `#B85C36` | The primary CTA and *only* the primary CTA (plus count badges). One coral thing per view, ideally. |

**The discipline that makes this work:** teal is everywhere and means "this is the app";
coral is rare and means "press this"; yellow is a surface, never an action. If coral starts
appearing on three things per screen, the system has failed.

#### 2.1.2 Full palette

**Surfaces**

| Token | Hex | Use |
|---|---|---|
| `background` | `#FBF7EC` | Warm cream page. The default backdrop for everything. |
| `card` / `card-foreground` | `#FFFFFF` / `#2B2E2C` | Raised surfaces. Cards, panels, sheets, popovers, inputs, dropdown lists. |
| `foreground` | `#2B2E2C` | Charcoal ink. Primary text. |
| `muted` / `muted-foreground` | `#F4EFE0` / `#67695F` | Quiet fills (progress tracks, hover, tinted notes) / secondary text. `muted-foreground` clears 4.5:1 on **all five** surfaces it lands on: card, page, teal-wash, muted, secondary. |
| `secondary` / `secondary-foreground` | `#F1ECDB` / `#2B2E2C` | Alternate quiet fill. |

**Named brand scales**

| Token | Hex | Use |
|---|---|---|
| `teal.DEFAULT` | `#007078` | See above. |
| `teal.deep` | `#004045` | See above. |
| `teal.soft` | `#DCEDED` | Avatar fill, brand badge border, card gradient stop. |
| `teal.wash` | `#EFF6F5` | The *selected / active* tint. Selected option rows, active dropdown rows, table headers, section header bands, icon chips, hover on outline buttons. **This is the single most important secondary colour in the system.** |
| `yellow.DEFAULT` | `#F5E516` | Hero, active nav pill, dark-surface focus ring. |
| `yellow.soft` | `#FBF3A0` | — |
| `yellow.wash` | `#FBF6CB` | Yellow badge fill. |
| `yellow.deep` | `#C9B800` | Yellow button hover; badge border at 40% alpha. |
| `coral.DEFAULT` | `#B85C36` | Primary CTA fill, count badges, over-budget meter. |
| `coral.deep` | `#A34E2C` | CTA hover **and body text** — it doubles as an ink colour in a dozen places (editing-mode headers, "you'll pay" figures, sale prices). |
| `coral.soft` | `#FBE4D6` | — |
| `brand.*` | alias → teal | `brand` = `#007078`, `brand-foreground` = `#FFFFFF`, `brand-soft` = `#DCEDED`. Lets shared atoms read as "the brand" without hard-coding teal. |
| `accent` | `#B85C36` / `#FFFFFF` | alias → coral. |

**Navigation rail (dark surface)**

| Token | Hex | Use |
|---|---|---|
| `sidebar.DEFAULT` | `#01413F` | Rail background — the marketing site's deep-teal footer tone. |
| `sidebar.foreground` | `#E8F1EE` | Rail text. |
| `sidebar.muted` | `#ADC7C3` | Inactive nav labels, secondary rail links. Lifted from `#7FA8A2`, which failed on all three rail states — worst on the *active* row. |
| `sidebar.border` | `#0A534F` | — |
| `sidebar.active` | `#0A5A55` | Hover fill on nav rows; profile chip fill at 40% alpha. |

**Status palette (warm-tuned)**

Each triple is `{ DEFAULT, bg, border }` where `DEFAULT` is the **text/icon colour**, held to
4.5:1 on both its own `bg` **and** on white.

| Tone | text (`DEFAULT`) | fill (`bg`) | edge (`border`) | Means |
|---|---|---|---|---|
| `success` | `#2D7B53` | `#E7F3EA` | `#BEE0C8` | Done, covered, within cutoff, fully paid. |
| `warning` | `#98641A` | `#FBF3D6` | `#F0DCA0` | Deadline, incomplete, editing-in-progress, budget exhausted. |
| `danger` | `#B24A2B` | `#FBE7DF` | `#F2C3AE` | Cancelled, past cutoff, over budget, destructive. |
| `info` | `#0B6E76` | `#DCEDED` | `#A9D6D6` | Neutral fact, subsidy breakdown, confirmed status. |

**Control edges** (see §2.6)

| Token | Hex | Contrast |
|---|---|---|
| `border.DEFAULT` | `#ECE6D5` | 1.25:1 on white, 1.16:1 on cream — **decorative only** |
| `border.strong` | `#D9D1B7` | 1.53:1 / 1.43:1 — decorative, for large shapes |
| `input` = `control` | `#8A8677` | 3.65:1 on white, 3.41:1 on cream — **every operable edge** |
| `ring` | `#007078` | Focus ring |

**Gradient**

```css
--hero-yellow: linear-gradient(135deg, #F8EC58 0%, #F5E516 55%, #EFD90C 100%);
```
Used for: the auth hero panel, the auth loading screen, food-photo placeholders, the
`yellow` StatCard tone, and 16px icon tiles. It is the only gradient in the system.

#### 2.1.3 Colour usage rules

| Do | Don't |
|---|---|
| Use `teal-wash` for every "this one is selected" state. | Invent a second selection tint. |
| Use `coral` for the single primary action of a view. | Use coral for status, links, or secondary actions. |
| Use the four status triples together (`text` on `bg` inside `border`). | Mix a status `bg` with `foreground` text — the pairs are contrast-tested as pairs. |
| Use `border-{tone}` (solid, e.g. `border-danger`) when the tinted box is a **button**. | Use `border-{tone}-border` (pale) on a control — those pale tones are made for the edge of a notice card nobody has to aim at; on a button the edge is the only thing marking where it is (the pale info tone measured 1.48:1 against the topbar). |
| Reduce emphasis with `font-weight` or a different token. | Reduce emphasis with `opacity`, `/70`, `/50` on text. |
| Put white text on `coral`, `primary`, `danger`, `warning`, `success`, `coral-deep`. | Put white text on `yellow` (use `teal-deep`) or on `teal-soft`/`teal-wash`. |

**Disabled** is the one sanctioned exception to the opacity rule: `disabled:opacity-50` on
buttons, `disabled:opacity-60` on fields, `disabled:opacity-30/40` on steppers and calendar
days. These fall below 3:1 by design — a disabled control is allowed to.

#### 2.1.4 Dark mode

The config declares `darkMode: ["class"]` but **no dark palette is defined**. There is one
dark *surface* — the navigation rail — and it is handled with explicit `sidebar.*` tokens
plus a `[data-dark-surface]` attribute that swaps the focus ring from teal to yellow. If you
port this system and need dark mode, mirror that approach: name the dark surface, give it
its own token block, and mark it with a data attribute so global rules (focus rings,
outlines) can adapt.

---

### 2.2 Typography

#### 2.2.1 Family

**One typeface for everything** — headings, body, UI, numerals. The system is designed
around a single humanist sans with a tall x-height.

- **Shipping font:** Geist Sans, loaded via `next/font` and exposed as `--font-geist-sans`.
- **Design-intent font (per the config comment):** Hanken Grotesk, inherited from
  superfinekitchen.com.
- **The indirection that makes both true:** one CSS variable, `--font-sans`, drives every
  role. `fontFamily.sans`, `fontFamily.serif` and the `.font-display` utility all resolve to
  `var(--font-sans)`.

```html
<html style="--font-sans: var(--font-geist-sans)">
```

> **Port note.** Swap the typeface by changing one variable. `font-serif` and `font-display`
> are deliberately aliased to the same stack so a stray `font-serif` in someone's markup
> cannot introduce a second family. Keep that alias.

Fallback stack: `system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`.
Body sets `antialiased` and `text-rendering: optimizeLegibility`.

#### 2.2.2 Scale

The scale is **compressed and bottom-heavy** — this is a dense information product, so the
two smallest sizes carry most of the interface.

| Token | Size | Line-height | Frequency | Role |
|---|---|---|---|---|
| `text-2xs` | **0.6875rem / 11px** | 0.9rem | 207 uses | **The workhorse.** Meta, labels, allergens, captions, badges, counts, overlines, helper text, footnotes. |
| `text-[11px]` | 11px | — | rare | Numeric badge inside a pill. |
| `text-xs` | 0.75rem / 12px | 1rem | 10 uses | Phone-width tab labels, chip labels. |
| `text-[13px]` | 13px | — | very common | **The body size.** Descriptions, notice text, option rows, dropdown rows, secondary paragraphs. Sits between `xs` and `sm` deliberately — `sm` (14px) reads slightly too large for stacked rows. |
| `text-sm` | 0.875rem / 14px | 1.25rem | 77 uses | Default button text, nav labels, inputs at `sm+`, section body. |
| `text-base` | 1rem / 16px | 1.5rem | 49 uses | Card item titles, prices, large buttons, **all inputs at phone width** (see below). |
| `text-lg` | 1.125rem / 18px | 1.75rem | 36 uses | Card titles, modal titles, page title in the topbar. |
| `text-xl` | 1.25rem / 20px | — | 16 uses | Loading-screen headline. |
| `text-2xl` | 1.5rem | — | 13 uses | Section hero numbers. |
| `text-3xl` | 1.875rem | — | 2 uses | **StatCard value.** |
| `text-5xl` | 3rem | — | 2 uses | Auth hero headline (`leading-[1.05]`). |

**The 16px input rule — non-negotiable.**

```
text-base sm:text-sm
```
Every `<input>`, `<textarea>` and `<select>` carries this pair. 16px is not a type choice —
below it, **iOS Safari zooms the whole page in on focus and never zooms back out.** From
`sm` up you are on a pointer device and 14px reads better. Ship both.

#### 2.2.3 Weight

| Weight | Frequency | Use |
|---|---|---|
| `font-semibold` (600) | **322 uses** | The default emphasis. Every button, every label, every title, every selected state, every price. |
| `font-medium` (500) | 66 | Unselected dropdown rows, dietary tags, quiet links. |
| `font-bold` (700) | 31 | Numeric badges, overline labels, StatCard labels, table headers, docked-bar totals. |
| `font-normal` (400) | 7 | Body paragraphs; de-emphasised weekend column headers. |

There is **no light or extralight**. Emphasis in this system is carried by weight and colour,
never by size alone and never by opacity.

#### 2.2.4 Tracking & clamping

- `tracking-tight` on every heading (`font-display text-lg font-semibold tracking-tight`).
- `line-clamp-2` on card titles, `line-clamp-1`/`line-clamp-2` on descriptions
  (`line-clamp-2 sm:line-clamp-1` — phones get the extra line).
- `break-words` on card titles: a long single word must wrap, not clip to `"Marg…"`.
- `truncate` on anything in a fixed-width row (dropdown labels, nav names, docked totals).
- **Wrap, don't truncate, a user-supplied name in a narrow column.** A truncated name beside
  a badge reads as `"Pane…"`.

#### 2.2.5 Type utilities

```css
.font-display { font-family: var(--font-sans), system-ui, sans-serif; }
.text-overline { @apply text-2xs font-semibold text-muted-foreground; }
.nums { font-variant-numeric: tabular-nums; }
```

- **`.font-display`** — semantically marks "this is a heading", even though it resolves to the
  same family. Keep it: it is the seam where a second display face would be introduced.
- **`.text-overline`** — the standard field label and section-group label. Always paired with
  `mb-1.5 block` on a `<label>`, or `mb-2 px-1` on an `<h2>` above a card.
- **`.nums`** — **mandatory on every number that can change**: prices, counts, quantities,
  percentages, budget figures, order totals. Without tabular figures a price that ticks from
  `$9.99` to `$10.00` jitters the whole row.

---

### 2.3 Spacing & sizing

Tailwind's default 4px scale, used with a strong preference for a handful of steps.

**Gaps (flex/grid)** — `gap-2` (8px) and `gap-3` (12px) carry the system; `gap-1.5` (6px) for
icon-to-label; `gap-1` for tight chip rows; `gap-4`/`gap-5` for card grids.

| Step | px | Frequency | Canonical use |
|---|---|---|---|
| `gap-1` | 4 | 48 | Chips in a scroll row, tab pills inside their track. |
| `gap-1.5` | 6 | 78 | **Icon → label** inside a button, badge, or pill. |
| `gap-2` | 8 | 118 | Buttons in a row; badge clusters. |
| `gap-3` | 12 | 109 | Card internals; row icon → text block; modal header. |
| `gap-4` | 16 | 13 | Card grid, photo → text column in a menu card. |
| `gap-5` | 20 | 5 | Page-level grid columns. |

**Vertical rhythm (`space-y`)**

| Step | Use |
|---|---|
| `space-y-1` / `space-y-1.5` | Lines inside a block (a label + its value). |
| `space-y-2` / `space-y-2.5` | Option rows, radio lists. |
| `space-y-3` | Cards inside a section; sheet body blocks. |
| `space-y-4` | Card body sections. |
| `space-y-5` | **Page root.** Every page view is `<div className="space-y-5">`. |
| `space-y-6` | Checkout's left column (between section cards). |

**Padding**

| Step | Use |
|---|---|
| `p-1` / `p-1.5` | Icon-button padding; dropdown list inner padding; tab-track padding. |
| `p-3` / `p-3.5` | Compact cards, toast, option rows, cart panel header. |
| `p-4` | Menu cards, tinted panels, modal footers. |
| `p-5` | **`CardBody` default.** Modal headers/bodies, calendar modal. |
| `p-6` | Confirm/subsidy modal panels. |
| `p-7` / `p-9` | Auth card (`p-7 sm:p-9`). |
| `p-10` | Auth hero panel; empty-state boxes. |

**Asymmetric row padding** — list rows use `px-4 py-3`; card headers use `px-5 py-4`; table
cells use `px-4 py-3`.

**Control heights**

| Height | Token | Used by |
|---|---|---|
| `h-8` (32px) | `size="sm"` | Small buttons, pill dropdowns, filter pills, inline steppers. |
| `h-9` (36px) | — | `sm:` variant of pill dropdowns, scroll-arrow buttons, calendar days. |
| `h-10` (40px) | `size="default"` | **Default button**, icon button (`h-10 w-10`), search input. |
| `h-11` (44px) | — | **Inputs, selects, ThemeSelect `box`, DateField/TimeField triggers.** 44px is Apple's touch minimum. |
| `h-12` (48px) | `size="lg"` | Large buttons, quantity stepper pill, "add another" dashed button. |
| `h-16` (64px) | `--topbar-h` | The sticky topbar. |

**Icon sizes** — `size-3` (12px) inside a badge · `size-3.5` (14px) inside a pill or small
button · `size-4` (16px) **default, enforced by the Button base via `[&_svg]:size-4`** ·
`size-5` (20px) in a topbar/close button · `size-6`+ only in empty states and hero blocks.

**Avatar / circle sizes** — `size-8` (sm) · `size-10` (md) · `size-14` (lg) · `size-24`/
`size-28` for menu-card photos (`size-24 sm:size-28`).

**Layout widths**

| Value | Use |
|---|---|
| `--sidebar-w: 16rem` | Desktop rail. Anything `fixed` that must start where content starts reads this variable rather than re-typing `256px`. |
| `w-[400px]` | Desktop cart push-panel. |
| `w-64` | Mobile nav drawer. |
| `max-w-sm` (24rem) | Calendar modal, toast column, mobile cart drawer. |
| `max-w-md` (28rem) | **Most modals**, confirmation copy blocks, sheets. 24 uses. |
| `max-w-lg` (32rem) | Auth card, sign-in modal, subsidy explainer. |
| `w-56` / `w-64` / `w-44` | Multi-select panel / budget breakdown / pill dropdown list. |
| `container` | `center: true, padding: 1.5rem`. Barely used — pages fill the content well instead. |

---

### 2.4 Radius

```js
borderRadius: {
  lg:    "1rem",     // 16px  — overridden from Tailwind's 0.5rem
  xl:    "1.25rem",  // 20px  — overridden from Tailwind's 0.75rem
  "2xl": "1.5rem",   // 24px  — overridden from Tailwind's 1rem
  "3xl": "2rem",     // 32px  — overridden from Tailwind's 1.5rem
  card:  "1.25rem",  // alias
}
```

**Every radius step is overridden to be larger than Tailwind's default.** This is the single
change that makes the system feel like this system. If you port only one thing beyond colour,
port this.

| Radius | Applies to |
|---|---|
| `rounded-full` | Buttons, pills, chips, badges, nav items, avatars, toggles, calendar days, counters, progress tracks, icon buttons, scroll arrows, tab pills, search bar. |
| `rounded-3xl` (32px) | **Modal panels only.** Bottom sheets use `rounded-t-3xl sm:rounded-3xl`. |
| `rounded-2xl` (24px) | Cards, tiles, dropdown lists, popovers, toasts, tables, tinted panels, StatCards, day-strip boxes. |
| `rounded-xl` (20px) | Inputs, textareas, selects, notices, option rows, inner boxes, icon chips, dropdown rows. |
| `rounded-lg` (16px) | Skeletons, tiny inline tints, time-picker cells. |
| `rounded-md` | Checkbox squares only (paired against `rounded-full` radios — the shape is the affordance). |

**Overflow rule:** any card with a tinted header band **must** carry `overflow-hidden`, or
the band's square corners paint past the card's rounded ones. This is why checkout defines
`const SECTION_CARD = "overflow-hidden"` and treats it as non-optional.

---

### 2.5 Elevation & shadow

```js
boxShadow: {
  card:   "0 2px 14px rgba(43, 46, 44, 0.05)",   // warm charcoal, very soft
  raised: "0 14px 40px rgba(1, 65, 63, 0.16)",   // deep teal, pronounced
  pop:    "0 6px 0 0 #004045",                    // hard neo-brutalist offset
}
```

| Level | Token | Meaning | Frequency |
|---|---|---|---|
| 0 | — | Flush with the page. Dividers only. | |
| 1 | `shadow-card` | **Resting surface.** Every card, table, tile, StatCard. | 24 |
| 1.5 | `shadow-sm` | Small pressable objects: button fills, dropdown triggers, chips, active nav pill. | 16 |
| 2 | `shadow-raised` | **Anything floating over content**: modals, sheets, popovers, dropdown lists, toasts, drawers, scroll arrows. Also the **hover** state of an interactive card. | 44 |
| 2* | `shadow-lg` | Two legacy popovers (budget breakdown, day tooltip) — prefer `shadow-raised`. | 3 |
| — | `shadow-pop` / `shadow-[4px_4px_0_0_#004045]` | Neo-brutalist StatCard variant: `border-2 border-teal-deep` + hard offset. Deliberate, occasional. | |
| — | `shadow-[0_-4px_16px_-8px_rgb(0_0_0/0.15)]` | **Upward** shadow on a bottom-docked action bar. | |

**The hover promotion.** An interactive card goes `shadow-card → shadow-raised` on hover
(`transition-shadow`). Some add `hover:-translate-y-0.5`. A non-interactive card never
changes shadow. This is the primary "is this clickable?" signal for whole-card targets.

---

### 2.6 Borders — the two-tier rule

**This is the most transferable idea in the system.** One border colour was doing two
different jobs with two different requirements. Splitting it fixed 99 controls.

```js
// Decorative: separates cards and rows. 1.25:1 on white — that is all it is fit for.
border: { DEFAULT: "#ECE6D5", strong: "#D9D1B7" },

// Operable: the visible edge of anything you can press, type in, or choose from.
// 3.65:1 on a white card, 3.41:1 on the cream page.
const CONTROL_EDGE = "#8A8677";
input:   CONTROL_EDGE,
control: CONTROL_EDGE,
```

| Class | Colour | Use it on |
|---|---|---|
| `border-border` | `#ECE6D5` | Card outlines, row rules, dividers, table borders, section separators, dashed empty-state boxes. **Anything that merely divides the page.** |
| `border-border-strong` | `#D9D1B7` | A *decorative* edge that must hold a large shape together — the full-width search-and-filter pill, where the default tint disappears over that much length. Still decorative; still short of 3:1. |
| `border-control` / `border-input` | `#8A8677` | **Every button, field, select, icon button, close button, chevron button, stepper, dropdown trigger, unselected option row, toggle track.** Anything a person operates. |

**One constant under two names.** `input` and `control` are the same hex so a field and a
button can never drift apart. Fields already used `input`; buttons adopted `control`.

**Border widths:** `border` (1px) everywhere; `border-2` only for the outline button
(`border-2 border-primary`), a selected card ring, and the `pop` StatCard. Selection is
usually expressed as `border-primary ring-2 ring-primary`, not as a thicker border.

**Dividers:** `divide-y divide-border` on a row group; `border-t border-border` for a section
rule; `border-b border-border` on `CardHeader` and table rows (`last:border-0`).

**Dashed** (`border-dashed border-border`) means *"nothing here yet"* — empty states, empty
day cards, "add another" affordances. It is the system's only dashed border and it always
carries that meaning.

---

### 2.7 Motion

```js
keyframes: {
  "fade-in":      { from: { opacity: "0" }, to: { opacity: "1" } },
  "slide-in-down":{ from: { opacity: "0", transform: "translateY(-10px)", maxHeight: "0" },
                    to:   { opacity: "1", transform: "translateY(0)",     maxHeight: "1000px" } },
  "track-sweep":  { "0%":  { transform: "translateX(-100%)" },
                    "100%":{ transform: "translateX(340%)" } },
  "rise-in":      { from: { opacity: "0", transform: "translateY(8px)" },
                    to:   { opacity: "1", transform: "translateY(0)" } },
},
animation: {
  "fade-in":       "fade-in 0.3s ease-out",
  "slide-in-down": "slide-in-down 0.32s cubic-bezier(.4,0,.2,1)",
  "track-sweep":   "track-sweep 1.15s cubic-bezier(.65,0,.35,1) infinite",
  "rise-in":       "rise-in 0.36s cubic-bezier(.4,0,.2,1) both",
},
```
Plus a global utility:
```css
.animate-reveal-down { animation: reveal-down 0.35s cubic-bezier(0.4, 0, 0.2, 1); }
@keyframes reveal-down { from { transform: translateY(-100%) } to { transform: translateY(0) } }
```

**Durations:** `150ms` (hover-panel reveal) · `200ms` (chevron rotate, modal scale) ·
`300ms` (fade-in, panel slide, photo zoom) · `320–360ms` (entrance animations).
**Easing:** `cubic-bezier(.4,0,.2,1)` (Material standard) for entrances; `ease-out` for
fades; `ease-out` for panel transforms.

**Standard transitions**
- `transition-colors` — hover/active on any tinted control. The default.
- `transition-all` — buttons (they move: `active:translate-y-px`).
- `transition-shadow` — cards on hover.
- `transition-transform` — chevrons (`rotate-180` when open, `rotate-90` on a disclosure row).
- `transition-[width] duration-300 ease-out` — the desktop cart push-panel.

**Press feedback:** `active:translate-y-px` on Button; `active:scale-95` on the floating
circular add button. Combined with `-webkit-tap-highlight-color: transparent` so iOS's grey
box never fights the app's own timing.

**Two hard rules learned the expensive way:**

1. **Never put a `transform` on a layout wrapper that contains `position: fixed`
   descendants.** A transformed ancestor becomes the containing block for fixed children,
   which clips full-screen modal overlays to the content area. This is why `fade-in` is
   opacity-only and why the app-shell content wrapper has no animation at all.
2. **Gate spinners and sweeps on `motion-safe:`, not on the global reduced-motion rule.**
   The global rule collapses duration to ~0, which parks a sweeping segment off the end of
   its track and leaves a spinner frozen mid-rotation — both read as *broken*, not as
   *still*. Provide an explicit `motion-reduce:` alternative:

```html
<span class="motion-safe:animate-track-sweep motion-reduce:hidden" />
<span class="hidden motion-reduce:block" />   <!-- the still equivalent -->
```

**Global reduced-motion**
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

### 2.8 Iconography

**Library:** [`lucide-react`](https://lucide.dev) — thin (1.5–2px), rounded-cap line icons
that match the brand's hand-drawn warmth without being illustrative.

**Sizing is enforced, not chosen.** The Button base includes:
```
[&_svg]:size-4 [&_svg]:shrink-0
```
So any icon inside a button is 16px and never squashes. Elsewhere use the table in §2.3.

**Colour convention**
- An icon that is *decoration inside a coloured control* inherits `currentColor`.
- A leading icon in a neutral control is `text-primary` (teal) — this is what makes a
  ThemeSelect trigger or a SettingRow read as branded.
- A status icon takes its tone's `DEFAULT` (`[&>svg]:text-warning` etc. on Notice).

**Semantic icon map** (keep these stable across the platform):

| Concept | Icon |
|---|---|
| Menu / food | `UtensilsCrossed`, `Utensils` |
| Orders | `ClipboardList` |
| Recurring / auto | `Repeat` |
| Notifications | `Bell` |
| Account | `UserCog` |
| Cart | `ShoppingCart` |
| Budget / money | `Wallet`, `Percent` |
| Address | `MapPin` |
| Date | `CalendarDays`, `Calendar`, `CalendarRange`, `CalendarOff` |
| Time | `Clock` |
| Confirm / done | `Check`, `CheckCheck`, `CheckCircle2` |
| Info | `Info` |
| Warning / risk | `AlertTriangle` |
| Error | `XCircle` |
| Locked | `Lock` |
| Close / remove | `X` |
| Add | `Plus` · Remove one: `Minus` |
| Edit | `Pencil` |
| Navigate in | `ChevronRight` · Expand: `ChevronDown` · Month: `ChevronLeft`/`Right` |
| Loading | `LoaderCircle` (with `animate-spin`) |
| Dietary: vegan/vegetarian | `Leaf` · Gluten-free: `Wheat` · Halal: `ShieldCheck` · Nut-free: `Nut` · Dairy-free: `Milk` |
| Popular | `Flame` · Seasonal: `SunSnow` · Serves N: `Users` |
| Sign in / out | `LogIn` / `LogOut` |
| Feedback | `MessageSquareHeart` · Nutrition: `Apple` |
| Demo/experimental | `FlaskConical` |

**Decorative icons carry `aria-hidden`.** An icon that *is* the button's only content must
have an `aria-label` on the button.

**Brand illustration.** A single reusable SVG pattern component (`FoodDoodles`) draws a
repeating hand-drawn wash — apple, carrot, leaf, fork & knife, citrus half, avocado, bowl
with steam, drop — on a 240×240 tile, `stroke-width: 1.8`, round caps and joins. It renders
as an absolutely positioned, non-interactive layer tinted with a `text-*` class
(`text-[#8f7c00] opacity-20` on yellow; `text-teal-deep/[0.05]` by default). **Each instance
must be given a unique `patternId`** — duplicate SVG pattern ids make every later instance
resolve to the first and render nothing.

There is also a CSS dot texture:
```css
.bg-pattern {
  background-image: radial-gradient(rgba(0, 64, 69, 0.10) 1.5px, transparent 1.5px);
  background-size: 18px 18px;
}
```

---

### 2.9 Z-index scale

A flat, documented ladder. Never invent a value outside it.

| z | Layer |
|---|---|
| `z-10` | In-card raised bits: scroll arrows, a photo above a gradient mask, the sheet panel above its own scrim. |
| `z-20` | Sticky in-page furniture (the menu's sticky ordering box). |
| `z-30` | **Sticky topbar** and **bottom-docked action bars**. |
| `z-40` | Drawer/overlay backdrops; the topbar's hover breakdown panel. |
| `z-50` | Drawer panels; portalled dropdown lists; multi-select panels; day tooltips. |
| `z-[60]` | Toasts; in-page (non-portalled) modals — calendar modal, payment modal. |
| `z-[65]` | Reserved slot between modal tiers. |
| `z-[70]` | **Portalled modals**: confirm dialog, sign-in modal, add-on sheet, subsidy explainer. |
| `z-[80]` | Skip-to-content link (must beat everything the keyboard can reach past). |
| `z-[100]` | Full-screen auth loading hand-off. |

**Rule:** a `fixed` overlay must be **portalled to `<body>`** if any ancestor could have a
`transform`, a filter, or `overflow: hidden`. `z-index` cannot rescue a clipped box —
leaving the ancestor is the only fix. The same applies to dropdown lists inside cards with
`overflow-hidden`: portal them and position them `fixed` from a measured trigger rect.

---

### 2.10 Breakpoints & responsive strategy

Tailwind defaults, but only **three** are really used:

| Breakpoint | Width | Uses | Meaning in this system |
|---|---|---|---|
| `sm:` | 640px | **238** | "A pointer device is probably doing the aiming." Type shrinks, touch targets relax, labels reappear, sheets become centred modals, grids go to 2–3 columns. |
| `md:` | 768px | 7 | Rare. One or two flex-direction flips. |
| `lg:` | 1024px | **123** | "There is a desktop rail." The nav rail appears, the cart becomes a push panel instead of an overlay, the checkout goes 3-column, docked bars inset by `--sidebar-w`. |
| `xl:` | 1280px | 2 | Effectively unused. |

**Mobile-first, always.** Every class is the phone value; `sm:`/`lg:` are the enhancements.

**Canonical responsive idioms**

```html
<!-- Sheet on phone, centred modal on desktop -->
<div class="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
  <div class="w-full rounded-t-3xl sm:max-w-md sm:rounded-3xl">…</div>
</div>

<!-- Icon-only on phone, icon+label from sm -->
<span class="hidden sm:inline">Cart</span>

<!-- Bigger touch target on phone, tighter proportions from sm -->
<button class="px-2 py-2.5 text-xs sm:px-4 sm:py-1.5 sm:text-[13px]">

<!-- Content well padding -->
<main class="px-4 py-6 sm:px-6 lg:px-8">

<!-- Docked bar clears the desktop rail -->
<div class="fixed inset-x-0 lg:left-[var(--sidebar-w)]">

<!-- Two-up card grid, collapsing to one when the cart panel is open -->
const gridCols = cn("grid grid-cols-1 gap-4", cartOpen ? "" : "lg:grid-cols-2");
```

**The `dvh` rule.** Use `min-h-dvh` / `max-h-[90dvh]`, never `min-h-screen` / `100vh`. Mobile
Safari's `100vh` is the height with the URL bar *hidden*, so a `min-h-screen` page is always
taller than the viewport and its last row hides under browser chrome.

**Scrollbars are hidden globally** (`scrollbar-width: none` + `::-webkit-scrollbar { display: none }`)
while scrolling still works. Horizontal scroll rows therefore need explicit affordances —
edge gradient masks plus scroll-arrow buttons (see §5.7).

---

### 2.11 Safe areas & viewport

```ts
export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#004045",   // teal-deep
  viewportFit: "cover",    // paint behind the notch and home indicator
};
```

`viewportFit: "cover"` is what makes `env(safe-area-inset-*)` non-zero. Without it iOS
letterboxes the app in a white band. **Because the page paints under the OS furniture, every
fixed element touching an edge must pad itself back out.**

```css
.pb-safe    { padding-bottom: env(safe-area-inset-bottom, 0px); }
.pb-floor   { padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 1.5rem); }
.-mb-floor  { margin-bottom: calc(-1 * (env(safe-area-inset-bottom, 0px) + 1.5rem)); }
.bottom-dock{ bottom: 0; }
@media (min-width: 1024px) {
  .pb-floor  { padding-bottom: 1.5rem; }
  .-mb-floor { margin-bottom: -1.5rem; }
}
```

- **`.pb-floor`** on the content well — end-of-page breathing room, clear of the home
  indicator. `.-mb-floor` cancels it for a full-bleed page that re-adds it inside.
- **`.pb-safe`** on any bottom-anchored bar.
- **The two-box rule for docked bars:** `.pb-safe` *sets* `padding-bottom`, so the bar's own
  padding must live on a **separate inner element**, or on desktop (inset = 0) the bar
  silently loses its bottom padding and the button sits on the floor.

```html
<div class="bottom-dock pb-safe fixed inset-x-0 z-30 border-t border-border bg-card
            shadow-[0_-4px_16px_-8px_rgb(0_0_0/0.15)] lg:left-[var(--sidebar-w)]">
  <div class="flex items-center gap-3 px-4 py-3 sm:px-6 lg:px-8"> … </div>
</div>
```
A page with a docked bar reserves its height with a spacer: `<div class="h-24" aria-hidden />`.

**Docked bars are `fixed`, never `sticky`** — the shell's `main` carries bottom padding a
sticky bar could never escape, so it would strand a strip of page background beneath itself.
And their fill is **opaque `bg-card`, never `bg-card/95`** — at 95% the content behind ghosts
through the total.

---

### 2.12 Focus & keyboard

**Global focus ring** — applied to *every* interactive element, not just links:

```css
a:focus-visible, button:focus-visible, input:focus-visible, select:focus-visible,
textarea:focus-visible, summary:focus-visible,
[tabindex]:not([tabindex="-1"]):focus-visible {
  outline: 2px solid #007078;
  outline-offset: 2px;
}

/* On the dark navigation rail the teal ring is under 2:1. Yellow reads at 8.8:1. */
[data-dark-surface] a:focus-visible,
[data-dark-surface] button:focus-visible,
[data-dark-surface] [tabindex]:not([tabindex="-1"]):focus-visible {
  outline-color: #f5e516;
}
```

**Deliberately no `border-radius` on the outline.** Setting one forces *every* focused
control to that radius — a pill button squares off, a `rounded-xl` field flattens — because
radius is a property of the element, not of the outline. The outline already follows the
element's own shape. Say nothing.

**Component-level rings** use `focus-visible:ring-2 focus-visible:ring-ring
focus-visible:ring-offset-2 focus-visible:ring-offset-background` (buttons) or the softer
`focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30` (fields).

**Scroll padding** — so a keyboard-focused control never lands behind sticky furniture:
```css
html {
  scroll-padding-top: calc(var(--topbar-h) + 1rem);
  scroll-padding-bottom: 7rem;
}
```

**Touch targets**
```css
.touch-target { position: relative; }
.touch-target.absolute { position: absolute; }   /* two classes beat one */
.touch-target.fixed    { position: fixed; }
.touch-target::after {
  content: ""; position: absolute; left: 50%; top: 50%;
  height: 44px; width: 44px; transform: translate(-50%, -50%);
}
@media (pointer: fine) { .touch-target::after { height: 24px; width: 24px; } }
```
Grows a small icon button's *hit* area to 44px without changing what it paints.

- **Use it on isolated controls** — a modal close, a pencil, a dismiss.
- **Never use it on controls sitting side by side** (a −/+ stepper, a row of stars): their
  44px boxes would overlap and the top one swallows taps meant for its neighbour. Grow those
  for real instead (e.g. `size-10` buttons inside an `h-12` pill).
- On a fine pointer it shrinks to **24px, not zero** — plenty of mouse users have tremor or
  limited dexterity, and the minimum-target rule applies to every input device.

**Autofill suppression** — Chrome ignores `autocomplete="off"` for credential fields and
paints them pale blue. Repaint with an inset shadow so an autofilled field is
indistinguishable from an empty one:
```css
input:-webkit-autofill, /* …:hover, :focus, :active, textarea, select… */ {
  -webkit-box-shadow: 0 0 0 1000px #ffffff inset;
  box-shadow: 0 0 0 1000px #ffffff inset;
  -webkit-text-fill-color: #2b2e2c;
  caret-color: #2b2e2c;
  transition: background-color 600000s 0s, color 600000s 0s;
}
```

---

## 3. Layout system

### 3.1 CSS custom properties

```css
:root {
  --sidebar-w: 16rem;  /* desktop rail width */
  --topbar-h: 4rem;    /* sticky topbar height */
}
```
Plus a runtime-set `--edit-banner-h` used by sticky offsets when a persistent banner is up:
`sticky top-[calc(4rem_+_var(--edit-banner-h,0px))]`.

> **Sticky offset trap.** A `sticky` element under the topbar offsets by `--topbar-h` **plus
> the content well's own top padding**. Pick a larger number and the element *sinks below*
> the content it should sit beside, because sticky pushes a box down when its resting place
> is above the offset.

### 3.2 The application shell

```
┌──────────────┬───────────────────────────────────────┬──────────────┐
│              │  Topbar  (sticky, h-16, z-30)         │              │
│   Sidebar    ├───────────────────────────────────────┤  CartPanel   │
│  (rail,      │                                       │  (push panel │
│   16rem,     │  <main id="main-content">             │   w-[400px], │
│   sticky,    │    OrderEditBanner                    │   lg only)   │
│   h-dvh,     │    {children}                         │              │
│   lg only,   │    px-4 py-6 sm:px-6 lg:px-8 pb-floor │              │
│   dark)      │                                       │              │
└──────────────┴───────────────────────────────────────┴──────────────┘
        ↑ mobile: drawer behind the topbar hamburger
                                        Toaster · ConfirmDialog · global modals
```

```tsx
<div className="flex min-h-dvh bg-background">
  <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4
     focus:top-4 focus:z-[80] focus:rounded-full focus:bg-primary focus:px-4 focus:py-2
     focus:text-sm focus:font-semibold focus:text-primary-foreground focus:shadow-raised">
    Skip to content
  </a>

  <aside className="sticky top-0 hidden h-dvh shrink-0 lg:block"><Sidebar /></aside>
  <MobileDrawer />

  <div className="flex min-w-0 flex-1 flex-col">
    <Topbar />
    <main id="main-content" tabIndex={-1}
          className="pb-floor flex-1 px-4 py-6 outline-none sm:px-6 lg:px-8">
      <div className="w-full">          {/* NO transform here — see §2.7 rule 1 */}
        <OrderEditBanner />
        {children}
      </div>
    </main>
  </div>

  <CartPanel />
  <Toaster /><ConfirmDialog /><EditLeaveGuard /><SubsidyModelModal /><SignInModal />
</div>
```

**Design notes**
- **One navigation, at every width.** The phone gets the *whole* rail in a drawer, not a
  five-tab bottom bar — a tab bar could only ever carry half the IA and it stole a strip of
  every page for the privilege.
- The `<aside>` holding the rail carries **no label**; the `<nav aria-label="Main">` inside
  it does. An `aside` is a *complementary* region, so labelling it "Primary" names the wrong
  thing.
- `min-w-0` on the content column is required or long content forces the flex row wider than
  the viewport.
- Global layers (toaster, confirm, sign-in) are **mounted once in the shell**, never per page.

### 3.3 Sidebar (dark navigation rail)

```tsx
<div data-dark-surface
     className="flex h-full w-[var(--sidebar-w)] flex-col bg-sidebar text-sidebar-foreground">
  <div className="flex items-center px-4 py-6"><Logo variant="light" size="xl" /></div>

  <nav aria-label="Main" className="flex-1 space-y-2.5 overflow-y-auto px-3 py-1">
    {/* nav row */}
    <Link aria-current={active ? "page" : undefined}
      className={cn("flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors",
        active ? "bg-yellow text-teal-deep shadow-sm"
               : "text-sidebar-muted hover:bg-sidebar-active hover:text-white")}>
      <Icon className="size-[18px] shrink-0" />
      <span className="flex-1">{label}</span>
      {/* badge */}
      <span className={cn("flex min-w-[20px] items-center justify-center rounded-full px-1.5 text-2xs font-bold leading-5",
        active ? "bg-teal-deep text-white" : "bg-coral text-white")}>
        {unread}<span className="sr-only"> unread</span>
      </span>
    </Link>
  </nav>

  {/* Quiet secondary links — NOT nav, and not styled like it */}
  <div className="space-y-0.5 px-4 pb-1 pt-2">
    <Link className="flex items-center gap-2 py-1 text-2xs font-medium text-sidebar-muted
                     transition-colors hover:text-white">
      <Icon className="size-3.5 shrink-0" /> Check the nutrition information
    </Link>
  </div>

  {/* Profile chip */}
  <div className="border-t border-sidebar-active/50 p-3">
    <div className="flex items-center gap-2 rounded-full bg-sidebar-active/40 py-1 pl-1 pr-1.5">…</div>
  </div>
</div>
```

**Rules**
- The active row is **yellow on deep teal** — the highest-contrast pairing available (8.8:1),
  and the one place yellow acts as a state.
- `data-dark-surface` on the root switches the global focus ring to yellow.
- **Secondary links are visually not nav.** Utility destinations that aren't *places in the
  app* (nutrition lookup, feedback) get `text-2xs` quiet links at the foot — a pill among
  the pills would read as another section.
- The badge count lives on the row it belongs to, at every width. On a phone the hamburger
  carries only a **dot** ("something is in here"), because the count is one tap away and the
  button's job is not to say how much.

### 3.4 Topbar

```tsx
<header className="sticky top-0 z-30 flex h-[var(--topbar-h)] items-center justify-between
                   border-b border-border bg-background px-4 sm:px-6">
  <div className="flex min-w-0 flex-1 items-center gap-3">
    <button className="touch-target relative -ml-1 shrink-0 rounded-full border border-control
                       bg-card p-2 text-foreground hover:bg-muted lg:hidden">…</button>
    <h1 className="truncate font-display text-lg font-semibold tracking-tight">{title}</h1>
  </div>
  <div className="flex shrink-0 items-center gap-2 sm:gap-3">{/* contextual actions */}</div>
  <span aria-live="polite" aria-atomic="true" className="sr-only">{cartCount} items in cart</span>
</header>
```

**The adaptive-right-side pattern.** The topbar's right side swaps by route. This keeps
per-page chrome out of the page body and gives every screen exactly the controls it needs:

| Route | Right side |
|---|---|
| Menu / default | Budget indicator pill + Cart button |
| `/auto-order` | Contextual auto-order controls |
| `/notifications` | "N unread" + **Mark all read** |
| `/checkout`, `/orders`, `/account`, `/cart` | *(nothing — the page owns its own actions)* |

**One live region for the whole shell.** The cart count's `aria-live` announcement is
declared **once**, in the topbar, outside every conditional — a live region mounted at the
same moment as its content is never announced, and two of them would read every add twice.
Spell out units: `"3 items in cart"`, never `"3"`.

### 3.5 Cart panel (push panel / overlay drawer)

Two renders of the same body:

- **`lg` and up — a push panel.** A flex *sibling* of the content that animates its width
  from `w-0` to `w-[400px]` (`transition-[width] duration-300 ease-out`), with an inner
  `translate-x-full → translate-x-0` slide. The page beside it shrinks; nothing overlaps; the
  page stays fully usable, so it is **not** a modal (no focus trap, no scroll lock — just an
  Escape handler).
- **Below `lg` — an overlay drawer.** `fixed inset-y-0 right-0 z-50 w-full max-w-sm` with a
  `bg-black/50` backdrop, and it *is* a modal (`role="dialog" aria-modal`, focus trap, scroll
  lock).

The switch is decided at **render time** with `matchMedia("(max-width: 1023.98px)")`, because
CSS breakpoints decide at *paint* time and the hook must decide at *render* time. Start the
state `false` so SSR and first client paint agree.

**A closed-but-mounted panel must be `inert`.** Both panels stay mounted so they can animate,
which means their controls remain tabbable and readable while invisible — a keyboard user
tabs past the last visible control and lands inside an offscreen cart, and focus appears to
vanish. `inert` + `aria-hidden` removes it from both the tab order and the accessibility tree
without touching how it looks.

**Shadow only while open** — offscreen at `translate-x-full`, a `shadow-raised` blur still
bleeds back into the viewport as a grey strip.

### 3.6 Pre-app (auth) layout

```tsx
<div className="grid min-h-dvh lg:grid-cols-2">
  <AuthHero />                          {/* hidden below lg */}
  <div className="flex flex-col bg-background lg:justify-center">
    <AuthHeroBanner />                  {/* yellow banner, lg:hidden */}
    <main id="main-content" className="flex flex-1 flex-col items-center justify-center px-5 py-10 lg:py-0">
      {children}
      <p className="mt-6 text-center text-2xs text-muted-foreground">© 2026 Superfine Kitchen</p>
    </main>
  </div>
</div>
```

The hero is `bg-hero-yellow` + `FoodDoodles` + `Logo` + a `text-5xl leading-[1.05]
tracking-tight text-teal-deep` headline + a trust line. On phones the split collapses into a
**yellow banner over the flow**, so small screens still read as two-tone rather than as one
flat neutral page.

**The hand-off screen.** Between authenticating and landing in the app, a full-viewport
`bg-hero-yellow` panel with the same doodle wash, the logo, a title/detail pair and an
**indeterminate** sweeping track. It is portalled to `document.body`, carries
`role="status" aria-live="polite"`, and has **no fade on the panel itself** — it replaces a
form that unmounts as it appears, so anything less than instant shows the empty card
collapsing behind it. The *content inside* animates (`animate-rise-in`).

### 3.7 Page template

```tsx
export function SomeView() {
  return (
    <div className="space-y-5">
      {/* 1. Page-level notices / banners */}
      <Notice tone="warning">…</Notice>

      {/* 2. Optional sticky control bar */}
      <div className="sticky top-[calc(4rem_+_var(--edit-banner-h,0px))] z-20 bg-background pb-1 pt-2">…</div>

      {/* 3. Content — cards, grids, lists */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">{/* main column */}</div>
        <div>{/* summary rail */}</div>
      </div>

      {/* 4. Docked action bar + its spacer */}
      <div className="h-24" aria-hidden />
      <div className="bottom-dock pb-safe fixed inset-x-0 z-30 …">…</div>
    </div>
  );
}
```

**The page never renders its own `<h1>`** — the topbar already shows the page title, so a
`PageHeader` in this system renders *only* right-aligned actions and returns `null` when
there are none. Duplicating the title would announce it twice.

---

## 4. Component library

Each entry below gives: **purpose → anatomy → variants → states → a11y contract → rules**.

---

### 4.1 Button

The most-specified component in the system.

```tsx
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold \
transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring \
focus-visible:ring-offset-2 focus-visible:ring-offset-background \
disabled:pointer-events-none disabled:opacity-50 active:translate-y-px \
[&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-coral text-white hover:bg-coral-deep shadow-sm",   // PRIMARY CTA
        teal:    "bg-primary text-primary-foreground hover:bg-teal-deep shadow-sm",
        brand:   "bg-primary text-primary-foreground hover:bg-teal-deep shadow-sm",
        yellow:  "bg-yellow text-teal-deep hover:bg-yellow-deep",
        outline: "border-2 border-primary bg-transparent text-primary hover:bg-teal-wash",
        ghost:   "border border-control bg-card text-foreground hover:bg-muted",
        danger:  "bg-danger text-white hover:bg-danger/90",
        warning: "bg-warning text-white hover:bg-warning/90",
        success: "bg-success text-white hover:bg-success/90",
        link:    "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5 text-sm",
        sm:      "h-8 px-4 text-[13px]",
        lg:      "h-12 px-7 text-base",
        icon:    "h-10 w-10",
      },
      block: { true: "w-full" },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);
```

**Variant semantics**

| Variant | Means | Where |
|---|---|---|
| `default` (coral) | *The* action of this view. | Add to order, Place order, Checkout, Got it. |
| `teal` / `brand` | Structural confirm — an action that commits within a step. | Apply dates, Set N days, Save. |
| `ghost` | Secondary action; the workhorse. **Note it is bordered** (`border-control bg-card`), not transparent — this system's "ghost" is a light outlined button. | Cancel, topbar actions, Mark all read. |
| `outline` | Emphatic secondary, tied to the brand. | Rare — a strong alternative next to a coral CTA. |
| `yellow` | Playful highlight. | Rare. |
| `danger` / `warning` / `success` | Tone-matched confirms inside a dialog of that tone. | ConfirmDialog. |
| `link` | Inline textual action. | "Browse the menu without signing up". |

**`loading` prop.** Swaps the leading content for a `LoaderCircle`, blocks presses, and sets
`aria-busy`. Critically, it does **not** rely on `disabled` alone: `disabled` drops the button
out of the tab order mid-task and throws focus to `<body>`; `aria-busy` is what actually says
"working". The spinner is `motion-safe:animate-spin motion-reduce:opacity-60`.

**`asChild`** (Radix `Slot`) renders a `Link` with button styling. `loading` is ignored under
`asChild` — a `Slot` accepts exactly one child, so there is nowhere to put the spinner.

**Rules**
- One `default` (coral) button per view. If you need two, the second is `ghost`.
- `size="lg"` for a docked/primary commit; `size="sm"` for topbar and inline actions.
- The button's **label carries the blocker** (§1.6). Prefer a live button with an explanatory
  label over a disabled one.
- `whitespace-nowrap` is in the base. If a label is a *sentence*, override with
  `whitespace-normal h-auto` — an unwrappable sentence sets the grid track's min-content
  width and can push a 320px layout into horizontal scroll.

---

### 4.2 Card

```tsx
<Card>       // rounded-2xl border border-border bg-card text-card-foreground shadow-card
  <CardHeader>   // flex items-center justify-between gap-3 border-b border-border px-5 py-4
    <CardTitle>…</CardTitle>   // font-display text-lg font-semibold tracking-tight
  </CardHeader>
  <CardBody>…</CardBody>       // p-5
</Card>
```

**Variants by composition, not by prop:**

| Look | How |
|---|---|
| Standard | `<Card>` |
| **Branded section** (checkout, order cards) | `<Card className="overflow-hidden">` + `<CardHeader className="border-teal-soft bg-teal-wash">` + `<CardTitle className="text-teal-deep">`. `overflow-hidden` is mandatory. |
| Divider list (no inner boxes) | `<CardBody className="divide-y divide-border [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">` |
| Row group (edge-to-edge rows) | `<div className="divide-y divide-border">` directly under the header, no `CardBody` |
| Empty / placeholder | `<Card className="border-dashed">` |
| Interactive | add `transition-shadow hover:shadow-raised` (+ optional `hover:-translate-y-0.5`) |
| Selected | `border-primary ring-2 ring-primary` |

**Card title sizing.** `CardTitle` defaults to `text-lg`; settings-style cards override to
`text-base` so a page of eight sections doesn't read as eight headlines.

---

### 4.3 Badge

```tsx
"inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-2xs font-semibold leading-none"
```

| Tone | Classes |
|---|---|
| `neutral` (default) | `border-border bg-muted text-muted-foreground` |
| `success` | `border-success-border bg-success-bg text-success` |
| `warning` | `border-warning-border bg-warning-bg text-warning` |
| `danger` | `border-danger-border bg-danger-bg text-danger` |
| `info` | `border-info-border bg-info-bg text-info` |
| `brand` | `border-teal-soft bg-teal-wash text-teal` |
| `yellow` | `border-yellow-deep/40 bg-yellow-wash text-teal-deep` |

Every tone is the same triple: **pale fill + pale border + saturated text**. To add a tone,
add a triple; never mix a fill from one tone with text from another.

**Badges are read-only.** A pressable pill is a *chip* (§4.16), which is bigger, has a hover
state, and uses `border-control`.

---

### 4.4 Notice (inline alert)

```tsx
"flex items-start gap-3 rounded-xl border px-4 py-3 text-[13px] leading-relaxed"
```

| Tone | Icon | Classes |
|---|---|---|
| `info` (default) | `Info` | `border-info-border bg-info-bg text-info [&>svg]:text-info` |
| `warning` | `AlertTriangle` | `border-warning-border bg-warning-bg text-warning …` |
| `success` | `CheckCircle2` | `border-success-border bg-success-bg text-success …` |
| `locked` | `Lock` | `border-border bg-muted text-muted-foreground …` |

Icon is `mt-0.5 size-4 shrink-0` (optically aligned to the first text line, not centred).
`locked` is a genuinely distinct semantic — *"this is fixed by policy"* — not a fourth
severity.

---

### 4.5 Input / Textarea / Label / Field

```tsx
const MOBILE_SAFE_TEXT = "text-base sm:text-sm";   // see §2.2.2

// Input
"h-11 w-full rounded-xl border border-input bg-card px-3.5 text-foreground \
placeholder:text-muted-foreground transition-colors \
focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 \
disabled:cursor-not-allowed disabled:opacity-60 read-only:bg-muted"

// Textarea — same, plus:
"min-h-[90px] py-2.5"

// Label
"mb-1.5 block text-overline"
```

**Field anatomy:** `Label` (overline) → control → helper/error text (`text-2xs`). Errors use
`text-danger`; the field itself takes `border-danger`.

The focus treatment is **border + soft ring** (`ring-ring/30`), not the hard global 2px
outline — fields draw their own, which is why the global rule says "components with their own
ring still override it."

---

### 4.6 Select (native) & ThemeSelect (custom)

**`Select`** wraps a native `<select>` with `appearance-none`, a right-aligned `ChevronDown`,
and the same field chrome (`h-11 rounded-xl border-input`, `pr-10` for the chevron). Use it
for long, simple lists where the OS picker is genuinely better.

**`ThemeSelect`** is the branded dropdown, and it exists because a native `<select>` opens a
popup drawn by the *browser* with an OS-blue highlight that no CSS can reach.

| Prop | Values |
|---|---|
| `variant` | `box` — full bordered pill (`rounded-full border-control bg-card shadow-sm hover:border-primary hover:bg-teal-wash`) · `pill` — inline borderless (`h-8 rounded-full bg-transparent hover:bg-teal-wash`) |
| `size` | `sm` (`h-8 pl-3.5 pr-2.5 text-[13px]`) · `md` (`h-11 pl-4 pr-3 text-sm`) |
| `align` | `left` · `right` |
| `icon` | optional leading `LucideIcon`, rendered `text-primary` |
| `labelClassName` | e.g. `hidden sm:inline` to collapse to icon-only on phones |

Trigger label is `font-semibold text-teal-deep`; the chevron is `text-primary` and rotates
180° when open.

**Open list:** `rounded-2xl border border-border bg-card p-1.5 shadow-raised`, rows are
`rounded-xl px-3 py-2 text-[13px]` with three states — selected (`bg-teal-wash font-semibold
text-teal-deep` + `Check` in `text-primary`), keyboard-highlighted (`bg-muted font-medium`),
and default (`hover:bg-muted`).

**Four implementation requirements that make it work:**

1. **Portal the list to `<body>` and position it `fixed`** from a measured trigger rect. An
   `absolute` list is clipped by any ancestor with `overflow: hidden` — and this app has
   several by necessity (section cards hide overflow to keep their tinted band inside the
   rounded corners). `z-index` cannot rescue a clipped box.
2. **Re-measure on `scroll` (capture phase) and `resize`.** The trigger may live inside a
   scrolling panel whose scroll doesn't bubble to `window`.
3. **Flip up only when genuinely cramped** — `below < MIN_H(120) && above > below`. A list
   that flips on a few pixels' difference jumps sides as the page scrolls. Clamp height to
   `[120, 288]`.
4. **Options are not tab stops.** Because the list is portalled to the end of the document,
   tabbing into it would throw the user past every remaining control on the page. Instead:
   `tabIndex={-1}` on rows, focus moves to the *list*, arrows move a highlight, and
   `aria-activedescendant` reads it out. Focus returns to the trigger on close.

**Keyboard:** `↓`/`↑` open a closed trigger (like a native select) · `↓↑` move · `Home`/`End`
jump · `Enter`/`Space` commit · `Escape` closes and restores focus · `Tab` closes first, so
focus lands on the *next* control rather than at the end of the page.

The open list carries **`data-escape-layer`** — see §4.20.

---

### 4.7 MultiSelectFilter

A `ThemeSelect`-styled pill that ticks several options. Trigger: `h-8 rounded-full pl-2.5
pr-2 text-xs font-semibold text-teal-deep sm:h-9 sm:text-[13px]`, filled `bg-teal-wash` when
any are selected, with a count badge (`bg-primary text-primary-foreground rounded-full
min-w-[18px] text-[11px] font-bold`).

Rows carry a **square** check box (`size-4 rounded border`, filled `bg-primary` when on) —
square because these are independent yes/nos, versus the round radio marks elsewhere.

**Two structural lessons worth porting:**

- **A `listbox` may only contain `option`/`group` children.** The "Clear all" row is a
  *command*, not a choice, so it cannot live inside the listbox. The pattern: the outer
  focusable panel is `role="group"` with `aria-activedescendant`; a nested `<div
  role="listbox" aria-multiselectable>` holds only the options; "Clear all" sits outside it
  with its own id. The arrows still reach it (it is the row after the last option).
- **Never leave `aria-activedescendant` pointing at a removed element.** Clearing removes the
  "Clear all" row, so the highlight moves off it in the same handler.

**Ticking does not close the panel** — the whole point of a multi-select is choosing several
without reopening.

On phones the panel is `fixed` and clamped to the viewport (`Math.min(Math.max(8, anchored),
vw - w - 8)`), because an anchored `absolute` panel overhangs the screen edge when the pill
sits near it.

---

### 4.8 Checkbox & RadioGroup

**Checkbox** — a lightweight labelled native input: `size-4 rounded border-input
accent-brand` inside an `inline-flex cursor-pointer items-center gap-2 text-[13px]` label.

**RadioGroup** — a behaviour wrapper, not a visual one. It works off the **DOM** rather than
a list of values, so it wraps markup that already exists; no call site had to be
restructured and nothing moved a pixel.

What it adds:
- **Arrows move between options; `Home`/`End` jump to the ends; both wrap.** Both axes are
  answered (`↑↓←→`) because these groups are drawn both ways — the packaging options stack,
  the delivery-time cards sit side by side.
- **The group is one Tab stop**, landing on the chosen option (roving `tabIndex`). With
  nothing chosen the first option holds the stop, so the group can never fall out of the tab
  order entirely.
- **Arrows move focus only; `Space`/`Enter` commits.** The APG allows either this or
  selection-follows-focus, and here the choice is forced: several options do something *on
  selection* (picking an address fires a toast and closes the panel; "Custom pickup time"
  opens a dialog). Arrowing past them must not fire all of that.
- Scoped to *this* group (`el.closest('[role="radiogroup"]') === root`) so a nested group
  can't have its options stolen.
- Disabled options are skipped, not focused-and-dead.
- It defers to a call site's own `onKeyDown` (runs it first, stands down if `defaultPrevented`)
  and ignores arrows when focus is on a control *inside* a row (a row can hold Replace/Remove
  buttons of its own).

**Visual radio row** (from `OptionGroups`):
```html
<button role="radio" aria-checked class="flex w-full items-center justify-between gap-3
        rounded-xl border p-3 text-left text-[13px] transition-colors
        [checked] border-primary bg-teal-wash
        [unchecked] border-control bg-card hover:bg-muted/50">
  <span class="flex size-5 shrink-0 items-center justify-center border
               [radio] rounded-full  [checkbox] rounded-md
               [checked] border-primary bg-primary text-primary-foreground
               [unchecked] border-control">
    <Check class="size-3.5" />
  </span>
  …
</button>
```
**The shape is the affordance:** radios read as circles, checkboxes as squares — the shape
tells you whether picking this drops the last one.

---

### 4.9 ToggleSwitch

```tsx
"relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors
 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
 disabled:opacity-50"
// on: bg-primary   off: bg-input
// knob: "inline-block size-4 transform rounded-full bg-white shadow transition-transform"
//       on: translate-x-[22px]   off: translate-x-1
```
`role="switch"` + `aria-checked`. Controlled-or-uncontrolled via `checked` / `defaultChecked`.

**Toggles apply immediately.** Settings lists of toggles have no Save button — the change *is*
the commit. A Save button next to a switch that already moved is a lie about what happened.

---

### 4.10 Tabs

```tsx
// Track
"inline-flex gap-1 rounded-full border border-border bg-card p-1"   role="tablist"

// Tab
"whitespace-nowrap rounded-full px-2 py-2.5 text-xs font-semibold transition-colors
 sm:px-4 sm:py-1.5 sm:text-[13px]"
// active:   "bg-primary text-primary-foreground"
// inactive: "text-muted-foreground hover:text-foreground"
```

Pill-in-a-track. Taller than the label needs on phones — with the wrapper's `p-1` and border
this brings the whole control to ~46px, the touch floor. **Height only**: horizontal padding
and type size stay put, because on the menu this sits beside a date pill and extra width
drops that pill onto a second line.

**Keyboard:** `←`/`→` move between tabs, `Home`/`End` jump; `Tab` moves *past the whole
strip*. A tab strip is one control, not one control per tab. Selection follows focus here
(unlike RadioGroup) because switching a tab is idempotent and cheap.

**Defensive roving stop:** if `value` ever fails to match a tab (a stale filter, a renamed
route), every tab would be `tabIndex={-1}` and the strip would drop out of the tab order.
The first tab holds the stop in that case — showing the wrong tab as current is a lesser
failure than an unreachable control.

---

### 4.11 StatCard

```tsx
"rounded-2xl border p-5"
// + shadow-card, or pop: "border-2 border-teal-deep shadow-[4px_4px_0_0_#004045]"
```

| Tone | Fill |
|---|---|
| `default` | `border-border bg-card` |
| `teal` | `border-transparent bg-teal text-primary-foreground` |
| `yellow` | `border-transparent bg-hero-yellow text-teal-deep` |
| `coral` | `border-transparent bg-coral-deep text-white` (`coral-deep`, not `coral` — light coral failed white text) |

Anatomy: `icon + label` row (`text-2xs font-bold`, `text-muted-foreground` when uncoloured,
icon `text-primary`) → value (`mt-4 font-display text-3xl font-semibold leading-none
tracking-tight nums`) → optional sub (`mt-1.5 text-xs`).

**No `opacity` on the text of a coloured tile.** 80% white on teal measured 4.09:1 — under
the bar. Full strength reads the same and passes.

---

### 4.12 Table

```tsx
// wrapper: "w-full overflow-x-auto rounded-2xl border border-border bg-card shadow-card"
// table:   "w-full border-collapse text-sm"
// thead:   "bg-teal-wash"
// tr:      "border-b border-border last:border-0 hover:bg-muted/50"
// th:      "whitespace-nowrap px-4 py-3 text-left text-2xs font-bold text-teal-deep"  scope="col"
// td:      "px-4 py-3 align-middle text-foreground"
```

`TH` defaults `scope="col"`. Without `scope`, a screen reader reads a table cell by cell with
no idea which column it is in — `"$12.40"` instead of `"You pay: $12.40"`. Row headers pass
`scope="row"`.

Wide tables scroll inside their own wrapper; the page body never scrolls horizontally.

---

### 4.13 Avatar

```tsx
"inline-flex shrink-0 items-center justify-center rounded-full bg-teal-soft
 font-display font-semibold text-teal-deep"
// sm: "size-8 text-2xs"   md: "size-10 text-xs"   lg: "size-14 text-lg"
```
Initials from the first two words of a name, uppercased. `aria-hidden` — the name is always
adjacent in text, so announcing the initials would say it twice. On the dark rail it is
overridden to `bg-yellow text-teal-deep`.

---

### 4.14 Skeleton

```tsx
"animate-pulse rounded-lg bg-muted"
```
Route-level loading states mirror the real layout's shapes and radii:
```tsx
<Skeleton className="h-10 w-64 rounded-full" />   {/* the tab strip */}
<Skeleton className="h-16 rounded-2xl" />         {/* the header card */}
<div className={gridCols}>{…<Skeleton className="h-36 rounded-2xl" />}</div>
```

---

### 4.15 Breadcrumb

```tsx
<nav aria-label="Breadcrumb" className="mb-3">
  <ol className="flex flex-wrap items-center gap-1.5 text-[13px]">
```
Links `text-muted-foreground hover:text-foreground hover:underline`; the last crumb is
`font-medium text-foreground` with `aria-current="page"` and is never a link. Separator is
`ChevronRight size-3.5 text-muted-foreground`.

---

### 4.16 Chips & pills (a family, not a component)

Recurring inline tokens. All are `rounded-full`.

| Kind | Classes | Use |
|---|---|---|
| **Filter chip** (pressable) | `flex items-center gap-1 rounded-full bg-muted px-2.5 py-2 text-xs font-semibold text-muted-foreground sm:px-3 sm:py-[11px] sm:text-[13px]`; selected → `bg-primary text-primary-foreground` | Dietary filters, category rows. In a `role="toolbar"` with roving arrows. |
| **Promo pill** | `inline-flex items-center gap-1 rounded-full bg-coral/10 px-2 py-0.5 text-2xs font-semibold text-coral-deep` | Popular, guest minimum. |
| **Seasonal pill** | same, `bg-teal-wash text-primary` | Seasonal. |
| **Count badge** | `flex min-w-[20px] items-center justify-center rounded-full bg-coral px-1.5 text-2xs font-bold text-white` (+ `ring-2 ring-card` when it overlaps a photo) | Cart counts, unread counts, "N in cart". |
| **Section note** | `inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-2xs font-medium leading-snug` on `bg-{tone}-bg text-{tone}` | A standing fact riding beside a section title. |
| **Status pill (operable)** | `rounded-full border px-3 py-1.5 text-[13px] font-semibold` with a **solid** tone border (`border-danger bg-danger-bg text-danger`) | The topbar budget pill. Solid border because it is a button. |
| **Info pill (static)** | `rounded-full border border-border bg-card px-3 py-1 text-2xs font-semibold` | "N meals in rotation". |

---

### 4.17 Toaster

Region: `pointer-events-none fixed right-4 top-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm
flex-col items-end gap-2 sm:w-96`.

Card: `pointer-events-auto flex w-full items-start gap-3 rounded-2xl border bg-card p-3.5
shadow-raised animate-fade-in`, with a tone-coloured **border** (`border-success-border`
etc.) and a tone-coloured icon. Title `text-sm font-semibold`; description `mt-0.5
text-[13px] leading-snug text-muted-foreground`. Dismiss button is `touch-target rounded-full
p-1`.

**Two live regions, not one.**
```tsx
<div role="alert"  aria-live="assertive" className="contents">{danger + warning}</div>
<div role="status" aria-live="polite"    className="contents">{success + info}</div>
```
Everything announced "politely" waits for whatever the screen reader is already saying — so
an error could sit silently behind an unrelated sentence and then be erased by its own timer
before it was ever spoken. **Failures interrupt; the rest waits its turn.**

**The countdown pauses on hover *and* focus.** A message that erases itself after four
seconds is a message some people never finish — anyone reading slowly, anyone using
magnification who has to pan across to it, anyone whose pointer is halfway to the dismiss
button. `onMouseEnter`/`onMouseLeave` + `onFocusCapture`/`onBlurCapture`.

**The tone is said out loud.** The icon's shape and colour carry it for sighted users and for
nobody else, so each card prepends `<span className="sr-only">Success: </span>`.

---

### 4.18 ConfirmDialog

Promise-based: `const ok = await confirm({ title, description, tone, confirmLabel, cancelLabel })`.

```tsx
<div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
  <div className="absolute inset-0 bg-teal-deep/50 animate-fade-in" onClick={cancel} aria-hidden />
  <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-title"
       className="relative w-full max-w-md rounded-3xl border border-border bg-card p-6
                  shadow-raised animate-fade-in">
    <div className="flex items-start gap-3.5">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl
                       bg-{tone}-bg text-{tone}">{icon}</span>
      <div className="min-w-0 flex-1">
        <h2 className="font-display text-lg font-semibold tracking-tight">…</h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">…</p>
      </div>
    </div>
    <div className="mt-6 flex justify-end gap-2">
      <Button variant="ghost">Cancel</Button>
      <Button variant={danger ? "danger" : warning ? "warning" : "default"}>Confirm</Button>
    </div>
  </div>
</div>
```

- **`role="alertdialog"`**, not `dialog`.
- **Dismissing is answering "no"** — Escape and backdrop resolve `false`, so a caller's
  promise can never hang.
- **Focus opens on Confirm**, overriding the hook's default of "first actionable thing"
  (which would be Cancel). It is the answer the caller is waiting for, and Escape/backdrop
  already make "no" the cheap one to reach.
- The tone icon sits in a `size-11 rounded-2xl` tinted square — the standard "icon chip"
  shape used throughout (also `size-8 rounded-xl` and `size-9 rounded-xl` variants).

---

### 4.19 Date & time fields, calendars

**Why they're custom:** `<input type="date">` and `<input type="time">` open a popup drawn by
the *browser* — an OS calendar and an OS spinner with an OS-blue highlight no CSS can reach.
The only way for them to match the site is to not be native. They keep the *shape* of what
they replace (a month grid; hour/minute/meridiem columns), so this is the site's paint on an
interaction people already know. Values stay in native formats (`yyyy-mm-dd`, 24h `HH:MM`) so
callers don't change.

```tsx
const TRIGGER = "flex h-11 w-full items-center justify-between gap-1.5 rounded-full
  border border-control bg-card pl-4 pr-3 text-sm font-semibold text-teal-deep shadow-sm
  outline-none transition-colors hover:border-primary hover:bg-teal-wash
  focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30";

const POPOVER = "absolute left-0 top-full z-50 mt-2 rounded-2xl border border-border
  bg-card p-3 shadow-raised";
```

**Day cell:** `flex size-9 items-center justify-center rounded-full text-sm transition-colors`
(`size-11 sm:size-9` in the full-screen modal, for touch).
- selected → `bg-primary font-semibold text-primary-foreground`
- disabled → `cursor-not-allowed text-muted-foreground/40` (+ `line-through` for a non-service day)
- today → `ring-1 ring-inset ring-primary/60`
- default → `text-foreground hover:bg-muted`

**Weekday header:** `grid grid-cols-7 text-center text-2xs font-semibold text-muted-foreground`.
Weekends are de-emphasised by **weight** (`font-normal`), not by fading the ink — these labels
are the only thing naming the columns.

**Three rules that matter more than the styling:**

1. **Use `aria-disabled`, never `disabled`, on calendar days.** A truly disabled button cannot
   be focused, so the arrow keys stop dead on a weekend instead of stepping over it, and a
   screen-reader user is never told the day is there. Refuse the *press* in the handler.
2. **The whole grid is one Tab stop** with arrow-key roving (`useRovingCalendar`). 31 days ×
   31 Tab presses is not navigation. Focus starts on the day already chosen — someone editing
   a date arrives on their own answer, not at the top of the month.
3. **Popovers are role-less.** They used to claim `role="dialog"`, which promises a layer that
   traps focus and seals the page — none of which is true or wanted. Tab is meant to walk out
   of a picker to the next field. The trigger's `aria-expanded` carries the state; a shared
   `useDismiss` hook supplies Escape + outside click.

**The Escape-ordering subtlety.** `useDialog` registers a capture-phase `keydown` on
`document` when the sheet mounts — *before* a picker inside it is opened. Two capture
listeners on the same node fire in registration order, so a `document`-level listener in the
picker would run second, after the sheet had already closed itself. The picker therefore
listens on **`window`** in the capture phase, which is reached *before* `document`, letting
its `stopPropagation()` actually win.

**Time picker:** three `role="listbox"` columns (Hour / Minute / AM-PM), `max-h-48
overflow-y-auto`, cells `w-full rounded-lg py-1.5 text-center text-[13px]`, active =
`bg-primary text-primary-foreground`. Minutes step by 5.

---

### 4.20 Dialog / sheet primitives — `useDialog`

**The single most important behavioural component in the system.** Four obligations in one
hook, applied to every layer, so they cannot disagree with each other.

```tsx
const dialog = useDialog({ open, onClose: close });
<div role="dialog" aria-modal="true" {...dialog.props}>…</div>
```

1. **Focus in on open, back out on close.** Opening focuses `[data-autofocus]` if present,
   else the first focusable element, else the panel itself. Closing restores focus to whatever
   had it when the dialog went up. If that opener is gone (some triggers swap themselves out —
   the cart button becomes a close button), focus falls to `<main>` (given `tabindex="-1"`
   on demand), never to `<body>` — `<body>` drops a keyboard user to the very top of the page.
   `autoFocus` cannot express this: React fires it on mount, before the effect runs.
2. **Escape closes; Tab cycles within.** Registered in the **capture** phase so a nested layer
   can't swallow Escape before an outer one sees it. Tab wraps at both ends and pulls focus
   back in if it has already escaped (a backdrop click).
3. **The page behind goes `inert`.** The Tab trap stops a *keyboard* user leaving, but a
   screen-reader user reading in browse mode doesn't Tab — they move by line, heading or
   landmark, which walks straight out of the dialog and through the page behind it. The hook
   walks up from the panel to `<body>`, marking every sibling at each level `inert` +
   `data-dialog-inert`. Marking (rather than blindly stripping on cleanup) is what lets two
   stacked dialogs coexist.
4. **Scroll lock, counted.** Two dialogs can overlap, so the inner one closing must not hand
   scrolling back while the outer is still up (`body.dataset.scrollLocks`). The lock holds the
   scroll position (`position: fixed; top: -Ypx`) because `overflow: hidden` alone drops iOS
   Safari to the top of the page.

**`data-escape-layer`** — the release valve. Anything transient that handles its own Escape
(a dropdown list, a filter panel) marks itself with this attribute while open. The dialog then
stands down for that press and lets the event through. The same rule applies to **Tab**, but
only when focus is genuinely *inside* the layer — those lists are portalled to the end of the
document, so the trap would otherwise see "focus outside the panel" and yank it back to the
top of the dialog mid-selection.

**Trap the panel, not the scrim.** `{...dialog.props}` goes on the **sheet**, never on the box
that also contains the backdrop — otherwise Tab keeps landing on the very backdrop the user is
being kept away from.

#### Modal chrome recipes

**Centred modal**
```html
<div class="fixed inset-0 z-[70] flex items-center justify-center p-4">
  <div class="absolute inset-0 bg-teal-deep/50 animate-fade-in" aria-hidden />
  <div role="dialog" aria-modal="true" aria-labelledby="…"
       class="relative w-full max-w-md rounded-3xl border border-border bg-card p-6
              shadow-raised animate-fade-in">…</div>
</div>
```

**Bottom sheet → centred modal**
```html
<div class="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
  <div class="absolute inset-0 bg-teal-deep/50" aria-hidden />
  <div role="dialog" aria-modal="true"
       class="relative z-10 flex max-h-[90dvh] w-full flex-col overflow-hidden
              rounded-t-3xl border border-border bg-card shadow-raised
              sm:max-w-md sm:rounded-3xl">
    <div class="flex items-start justify-between gap-3 border-b border-border p-5">…header…</div>
    <div class="flex-1 space-y-3 overflow-y-auto p-5">…body…</div>
    <div class="space-y-2.5 border-t border-border p-4">…footer…</div>
  </div>
</div>
```

**Scrim tokens:** `bg-teal-deep/50` for branded layers (modals, sheets, nav drawer);
`bg-black/50` for the calendar modal and the mobile cart drawer. Prefer `bg-teal-deep/50` —
it is the house scrim.

**Close button:** `rounded-full border border-control bg-card touch-target p-1.5
text-muted-foreground transition-colors hover:bg-muted hover:text-foreground` with
`aria-label="Close"`.

**Entrance:** `animate-fade-in`, or a `scale-95 opacity-0 → scale-100 opacity-100` transition
over `duration-200` driven by a `requestAnimationFrame` flag.

---

### 4.21 FoodPhoto (media with branded fallback)

```tsx
<div className="relative flex items-center justify-center overflow-hidden
                bg-hero-yellow text-teal-deep {className}">
  <Utensils aria-hidden className="opacity-80 {iconClassName}" />   {/* sits underneath */}
  {showImage
    ? <img src loading="lazy" onError={…}
           className="absolute inset-0 size-full object-cover transition-transform
                      duration-300 group-hover:scale-105" />
    : alt ? <span className="sr-only">{alt}</span> : null}
</div>
```

**Three rules generalise to any media component:**

1. **The placeholder sits *underneath*, not instead.** A branded yellow utensils tile shows
   through until the photo paints — no grey box, no layout shift.
2. **`alt` is a decision, not a formality.** Pass `""` whenever the item's name is already on
   screen beside the photo (nearly everywhere) — a named thumbnail beside a named row says the
   thing twice. Pass the name only where the photo is the *sole* content of something
   operable.
3. **The name must survive the photo not arriving.** When an `<img>` fails, its `alt` goes
   with it — so a photo-only link collapses to an unnamed "link". Render the alt as `sr-only`
   text in the fallback branch. (Verified: with images blocked, five of ten meal links on the
   menu had no accessible name at all.)

Photo zoom on hover uses the parent's `group` class: `group-hover:scale-105`.

---

### 4.22 Logo

Image wordmark with a `light` variant for dark backgrounds
(`brightness-0 invert`, also applied as an **inline style** so a slow or failed CSS load can't
render the mark in the wrong colour). Sizes `md/lg/xl/2xl` = `h-8/12/16/20`, with matching
inline pixel heights so a missing utility class can't render the image at its intrinsic
2220px and blow up the layout. Optional platform sub-label in `text-2xs font-medium`.

---

## 5. Composition patterns

### 5.1 Section card with tinted header band

The house pattern for a settings- or checkout-style section.

```tsx
const SECTION_CARD   = "overflow-hidden";                 // mandatory with a band
const SECTION_HEADER = "border-teal-soft bg-teal-wash";
const SECTION_TITLE  = "text-teal-deep";

<Card className={SECTION_CARD}>
  <CardHeader className={cn("flex-wrap", SECTION_HEADER)}>
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <CardTitle className={SECTION_TITLE}>Delivery details</CardTitle>
      <SectionNote icon={Mail} tone="success">You'll receive an email when confirmed.</SectionNote>
    </div>
  </CardHeader>
  <RowGroup>…</RowGroup>
</Card>
```

### 5.2 SettingRow — the disclosure row

One setting, closed: **what it is · what it currently says · a chevron into the thing that
changes it.** This replaced a checkout page where the address form, time picker and packaging
choice were all unfolded at once, which pushed Payment below the fold.

```tsx
<button className="flex w-full scroll-mt-20 items-center gap-3 px-4 py-3 text-left
                   transition-colors hover:bg-muted/40 focus-visible:bg-muted/40
                   focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-55"
        aria-expanded={expanded}>
  <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-xl",
        incomplete ? "bg-warning-bg text-warning" : "bg-teal-wash text-primary")}>
    <Icon className="size-4" />
  </span>
  <span className="min-w-0 flex-1">
    <span className="block text-[13px] font-semibold">{label}</span>
    <span className={cn("block truncate text-2xs",
          incomplete ? "font-medium text-warning" : "text-muted-foreground")}>{value}</span>
  </span>
  <ChevronRight className={cn("size-4 shrink-0 text-muted-foreground transition-transform
                               duration-200", expanded && "rotate-90")} />
</button>
```

- **`incomplete` is not styling.** It is the difference between `"Disposable"` (an answer) and
  `"Add a delivery address"` (a hole). A row that reads like an answer when it's blank is how
  someone reaches a disabled commit button with no idea which row is at fault.
- **The chevron rotates 90°** when open — a chevron that always points right promises a page
  it never goes to. Only a real disclosure sets `aria-expanded`; a row that opens a *dialog*
  leaves it off, or it announces a panel that never appears.
- **The row scrolls itself to the top when it opens** (`scrollIntoView({ block: "start" })` +
  `scroll-mt-20` to clear the sticky topbar), anchored on the *row*, not the panel — a panel
  taller than the viewport would otherwise land with its first field above the fold. Key the
  effect on `expanded` so re-renders while open never yank the page.
- **The open row keeps the card's white.** The turned chevron and the unfolded panel already
  say which row is open; tinting the row on top of that breaks the white run.

```tsx
function RowGroup({ children }) { return <div className="divide-y divide-border">{children}</div> }
function RowPanel({ children }) { return <div className="bg-muted/30 px-4 py-4">{children}</div> }
```
The panel **is** tinted — an expanded panel and the next collapsed row are otherwise both
just bands in a stack, and the fields read as belonging to the row *below* rather than the one
above.

### 5.3 Progress / stepper

Connected circles with a rule between them.

```tsx
<span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full
                     text-2xs font-bold transition-colors",
  done   && "bg-success text-white",
  active && "bg-primary text-primary-foreground",
  !done && !active && "border border-border text-muted-foreground")}>
  {done ? <Check className="size-4" strokeWidth={3} /> : i + 1}
</span>
<span className={cn("h-0.5 flex-1 rounded-full transition-colors",
  done ? "bg-success" : "bg-border")} />
```
Labels sit **absolutely under** each circle on phones (so they don't shift the row) and
**inline beside** it from `sm` — edge steps align to their circle's edge so nothing clips:
```
"absolute top-full mt-1 whitespace-nowrap text-2xs"
+ isFirst ? "left-0" : isLast ? "right-0" : "left-1/2 -translate-x-1/2"
+ "sm:static sm:left-auto sm:right-auto sm:top-auto sm:mt-0 sm:translate-x-0 sm:text-[13px]"
```
The container reserves `pb-6 sm:pb-0` for the stacked labels.

### 5.4 Meter / progress bar

```tsx
<div className="w-full overflow-hidden rounded-full bg-muted h-2.5">   {/* h-2 when compact */}
  <div className={cn("h-full rounded-full transition-all", over ? "bg-coral" : "bg-primary")}
       style={{ width: `${pct}%` }} />
</div>
```
A **split** meter (two shares, no cap) is two flex children instead of one:
`bg-primary` at `x%` + `bg-coral` at `100-x%`.

An **indeterminate** track is a `w-1/3` segment sweeping `translateX(-100%) → 340%` inside an
`overflow-hidden` track, with a `motion-reduce:` still equivalent.

### 5.5 Empty state

```tsx
<div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center
                text-[13px] text-muted-foreground">
  No meals match these filters.
</div>
```
Dashed border + centred `text-[13px] text-muted-foreground` + generous `p-10`. Larger empty
states add a `size-14 rounded-full bg-muted` icon circle above the copy and a single CTA
below. Empty-state copy is a **fact plus a way out**, never an apology.

### 5.6 Search + filter bar (the unified pill)

```tsx
<div className="mt-4 flex flex-col gap-2 rounded-xl border border-border-strong bg-card p-1.5
                shadow-sm sm:flex-row sm:items-center sm:gap-1 sm:rounded-full">
  <div className="relative flex-1">
    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    <input className="h-10 w-full rounded-full bg-transparent pl-9 pr-3 text-base
                      text-foreground outline-none placeholder:text-muted-foreground
                      sm:h-9 sm:text-sm" />
  </div>
  <div className="flex flex-wrap items-center gap-1 sm:contents">
    {/* ThemeSelect variant="pill" + MultiSelectFilter pills */}
  </div>
</div>
```
Rounded rectangle stacking on phones, a **single full-width pill** from `sm`. This is the one
place `border-strong` is used, and the one operable thing in the app on a decorative edge — a
knowing exception, because at control strength the line read heavier than the design wanted
and the box is held together visually by its white fill, the search glyph and the placeholder.
The input keeps its own focus ring, so keyboard users are unaffected.

### 5.7 Horizontal scroll row

Because scrollbars are hidden globally, a horizontal row needs explicit affordances:

```tsx
<div className="relative">
  {/* edge masks */}
  <div className="pointer-events-none absolute inset-y-0 left-0 w-12 rounded-l-2xl
                  bg-gradient-to-r from-card to-transparent" />
  <div className="pointer-events-none absolute inset-y-0 right-0 w-12 rounded-r-2xl
                  bg-gradient-to-l from-card to-transparent" />
  {/* arrows */}
  <button className="touch-target absolute left-0 top-1/2 z-10 flex size-9 -translate-y-1/2
                     items-center justify-center rounded-full border border-control bg-card
                     text-foreground shadow-raised transition hover:bg-primary
                     hover:text-primary-foreground disabled:pointer-events-none
                     disabled:opacity-40" />
  {/* track */}
  <div className="-mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1
                  [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">…</div>
</div>
```

### 5.8 List card with photo (the menu card)

A horizontal row: **text column (flex-1, min-w-0) + square photo (shrink-0)** with a floating
circular action button in the photo's bottom-right corner.

```
┌─────────────────────────────────────────────┬──────────┐
│ Name  [Popular]                      $12.50 │  photo   │
│ One-line description                        │  96/112  │
│                                             │       (+)│  ← -bottom-2 -right-2
│ 🌿 Vegan  🌾 Gluten-Free    (mt-auto)       │          │
│ Allergens: Peanuts                          │          │
└─────────────────────────────────────────────┴──────────┘
```

```tsx
"group flex gap-4 rounded-2xl border border-border bg-card p-4 shadow-card
 transition-shadow hover:shadow-raised"
// photo frame:  "relative size-24 shrink-0 self-center sm:size-28"
// float button: "touch-target absolute -bottom-2 -right-2 flex size-8 items-center
//                justify-center rounded-full bg-coral text-white shadow-md ring-2 ring-card
//                transition-colors hover:bg-coral-deep active:scale-95"
```

**Structural rules**
- **A tight primary cluster** (eyebrow/badges + name + price + description) and a **lighter
  meta section pinned to the bottom** with `mt-auto space-y-1.5 pt-3`. The auto margin is what
  keeps cards of differing description lengths aligned along their meta rows.
- **The `ring-2 ring-card` on the floating button** is what separates it from the photo behind
  it — a ring in the *card's* colour, not a border.
- **A count badge goes top-left** of the photo so it never collides with the bottom-right
  action.
- **The photo link is a duplicate link.** A mouse wants it (the photo is the obvious thing to
  click), but hearing "Chicken Bowl, link" twice and tabbing through both is pure noise. The
  photo link gets `aria-hidden tabIndex={-1}`; the named text link above is the one everybody
  else uses.
- **Selector mode**: the whole card becomes `role="button" tabIndex={0} aria-pressed`, no
  inner links, selected = `border-primary ring-2 ring-primary`, and the `+` becomes a `Check`
  in a filled teal circle.

### 5.9 Quantity stepper

```tsx
// Pill form (inline with a large CTA)
<div className="flex h-12 shrink-0 items-center gap-0.5 rounded-full border border-border bg-card px-1">
  <button className="flex size-10 items-center justify-center rounded-full text-foreground
                     hover:bg-muted disabled:pointer-events-none disabled:opacity-30">
    <Minus className="size-4" />
  </button>
  <span className="w-6 text-center text-base font-semibold nums" aria-live="polite">{qty}</span>
  <button className="flex size-10 …"><Plus className="size-4" /></button>
</div>

// Compact form (in a list row)
<button className="flex size-8 items-center justify-center rounded-full border border-control
                   bg-card hover:bg-muted"><Minus className="size-3.5" /></button>
<span className="w-6 text-center text-sm font-semibold nums">{qty}</span>
<button className="flex size-8 items-center justify-center rounded-full bg-primary
                   text-primary-foreground hover:bg-teal-deep"><Plus className="size-3.5" /></button>
```
Buttons are **grown for real** (`size-10` / `size-8`), never `.touch-target` — adjacent 44px
boxes would overlap and steal each other's taps. The value carries `aria-live="polite"` and
`.nums`. Minus at 1 either disables (there is always at least one) or removes the row —
choose one and be consistent; "none of it" belongs to Close, not to a stepper that turns into
a bin.

### 5.10 Icon chip

A tinted rounded square holding an icon — the recurring "this row/section has a category"
mark.

| Size | Classes | Use |
|---|---|---|
| `size-8 rounded-xl` | `bg-teal-wash text-primary` | SettingRow leading mark |
| `size-9 sm:size-10 rounded-xl` | `border border-warning-border bg-card text-coral-deep` | Banner mark |
| `size-11 rounded-2xl` | `bg-{tone}-bg text-{tone}` | ConfirmDialog tone mark |
| `size-14 rounded-full` | `bg-muted text-muted-foreground` | Empty-state mark |

### 5.11 Hover-revealed breakdown panel

For a pill that opens a detail panel on hover *and* tap:

```tsx
"pointer-events-none invisible absolute right-0 top-full z-40 mt-2 w-64 origin-top-right
 rounded-2xl border border-border bg-card p-4 text-foreground opacity-0 shadow-lg
 transition-all duration-150"
+ !dismissed && "group-hover:pointer-events-auto group-hover:visible group-hover:opacity-100
                 group-focus-within:pointer-events-auto group-focus-within:visible
                 group-focus-within:opacity-100"
+ open && "pointer-events-auto visible opacity-100"
```

**Four requirements, all learned from real failures:**
1. **It must open on tap too.** `group-hover` never fires on a touch pointer, so a
   hover-only panel is simply unreachable on a phone. Add an explicit `onClick` toggle; the
   click state is applied *after* the hover rules so moving the mouse away can't slam a
   tapped-open panel shut.
2. **`pointer-events-auto` on hover, not only on tap.** Otherwise moving the pointer toward
   the panel leaves the pill, hover is lost, and the panel vanishes mid-sentence — anyone
   using magnification, who reads by moving the pointer across it, cannot read it at all.
3. **Escape must dismiss it even when it is only open because of hover** (someone using
   magnification cannot move the mouse away while reading). Track a `hoverDismissed` flag and
   clear it on `pointerLeave`, so the panel is available again next time.
4. **It is deliberately role-less.** Calling a non-modal anchored panel a `dialog` promises a
   layer that traps focus and blocks the page. `aria-expanded` + `aria-controls` on the
   trigger is what actually describes the relationship.

### 5.12 Persistent mode banner

When the app is in an unusual mode (editing a placed order), every surface says so:

- A **page-level banner** in the shell, above `{children}`.
- The **checkout header** switches to a `border-warning-border bg-warning-bg` strip with a
  `Pencil` mark and `text-coral-deep` copy.
- The **cart panel header** switches to the same warning fill and reads `Editing {id}`.
- The **panel border** switches from `border-control` to `border-warning-border`.
- The **CTA verb** changes from "Place order" to "Save changes".

**Rule:** a mode that changes what a button *does* must change what every surface *looks
like*. A cart that looks like an ordinary cart but saves into a placed order is a trap.

---

## 6. Content & copy guidelines

The voice is **plain, specific, and never blaming**. It is a substantial part of why the
product feels the way it does.

**1. Say the fact, then the consequence.**
> `$8.50 of your $15.00 allowance left · resets daily`
> `Over the $15.00 allowance. The extra $4.50 is charged to you.`

**2. Buttons name the next action or the blocker — never "Submit", never "OK".**
> `Choose Protein` · `Complete Customization 2` · `Add to order · $14.50` · `Set 3 days` ·
> `Mark all read` · `Got it`

**3. Empty states are a fact plus a way out, not an apology.**
> `No cancelled orders.` · `This meal comes as it is. Nothing to choose.` ·
> `You're all caught up`

**4. Use the user's noun, and keep it the same all the way through.** If the confirm button
says "Add to order", the plural says "2 meals · Add to order" — never "order" for one and
"cart" for several.

**5. Numbers get their unit spelled out for assistive tech.**
> `"3"` → `"3 items in cart"`; a badge renders `{unread}<span className="sr-only"> unread</span>`.

**6. Explain the mechanism when the mechanism is the question.**
> `Quantity makes more of **this exact meal**, each packed separately.`
> `Tap any weekday (Mon–Fri) to add or remove it. Weekends are off.`

**7. Sentence case everywhere.** Titles, buttons, labels, badges. No Title Case, no ALL CAPS
(the overline is small and semibold, not uppercased).

**8. Demo/experimental affordances are labelled as such**, with a `FlaskConical` icon and
warning-toned copy: `Demo purposes only. Nothing here changes real billing.`

**9. Never blame the user.** `"Add a delivery address"` (a hole to fill), not
`"Address is required"` (a failure).

---

## 7. Accessibility contract

Treat every line here as a build requirement, not a nice-to-have. Each one exists because its
absence broke something real.

### 7.1 Colour & contrast
- Text ≥ **4.5:1** against *every* surface it can land on (not just the common one).
- The visible boundary of any operable control ≥ **3:1** against *both* the card and the page.
- **Never** create emphasis differences with `opacity` / `/50` / `/70` on text.
- Colour is never the only carrier: status pairs colour with an **icon** and with **words**.
- Disabled controls may fall below 3:1 (`opacity-30/40/50/55/60`). That is the one exception.

### 7.2 Keyboard
- Every interactive element has a visible `:focus-visible` indicator — enforced globally over
  `a, button, input, select, textarea, summary, [tabindex]`, not just links.
- The focus outline sets **no radius** (it follows the element's own shape).
- Composite controls = **one Tab stop + arrow keys**; lists of destinations keep per-item
  stops.
- A `role` that implies arrow-key behaviour (`radio`, `tab`, `option`, `listbox`) **must**
  answer the arrow keys. Announcing "1 of 5" and doing nothing is a defect.
- Calendars use `aria-disabled`, never `disabled`, so arrows can step over unavailable days.
- `Home`/`End` are supported wherever arrows are.
- Skip-to-content link, first in the DOM, `z-[80]`.
- `scroll-padding-top/bottom` so focus never lands behind sticky furniture.

### 7.3 Layers
All four obligations of §4.20, in one shared hook, on every layer. Plus:
- Trap the **panel**, not the box containing the scrim.
- Portal any `fixed` overlay whose ancestors might transform or clip.
- Only announce `role="dialog" aria-modal` when the layer *is* modal (the desktop cart push
  panel is not).
- A closed-but-mounted panel is `inert` + `aria-hidden`. `aria-hidden` alone hides it from a
  screen reader while leaving it in the tab order — the worst of both.
- Non-modal anchored popovers are **role-less**; the trigger's `aria-expanded` carries state.

### 7.4 Announcements
- Exactly **one** live region per fact, mounted before the fact changes.
- Two regions by urgency: `role="alert" aria-live="assertive"` for failures,
  `role="status" aria-live="polite"` for everything else.
- Timed messages pause on hover **and** focus.
- Tone is spoken (`<span className="sr-only">Error: </span>`), not just coloured.
- Route transitions that take time get `role="status" aria-live="polite"`.

### 7.5 Naming & structure
- Every image decides its `alt` deliberately; duplicate links are `aria-hidden tabIndex={-1}`.
- An accessible name must survive its image failing to load.
- `<th scope>` on every table header.
- Option groups are named with `aria-labelledby` pointing at the visible heading — otherwise
  a list of five radios is five unexplained options.
- Landmarks are named and unique: `<nav aria-label="Main">`, one `<main id="main-content">`;
  an `<aside>` is complementary, so don't label it "Primary".
- Every route sets its own `<title>` via a template (`"%s · Superfine Kitchen"`). Fifteen tabs
  all reading the same title is a real navigation failure.
- `aria-controls` only ever names an element that exists right now.
- `aria-expanded` only on genuine disclosures — not on a button that opens a dialog, and not
  on a control that only exists in one state (a value true by construction says nothing).
- A `listbox` contains only `option`/`group`. Commands live outside it under a `role="group"`
  that legally carries `aria-activedescendant`.

### 7.6 Touch & pointer
- 44px minimum touch target; 24px minimum on a fine pointer (never zero).
- `.touch-target` for isolated controls only; grow adjacent controls for real.
- 16px minimum font size on any focusable field (iOS zoom).
- `-webkit-tap-highlight-color: transparent` with `:active`/`:hover` doing the job properly.
- `overscroll-behavior-y: none` on `body` so a rubber-band scroll doesn't drag an open
  sheet's backdrop.

### 7.7 Motion
- Global `prefers-reduced-motion` rule collapses durations.
- Anything whose *meaning* is the motion (spinners, indeterminate tracks) is
  `motion-safe:`-gated with an explicit `motion-reduce:` still equivalent.

---

## 8. Data display conventions

**Currency**
```ts
new Intl.NumberFormat("en-US", { style: "currency", currency: "USD",
  minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
```
Always `.nums`. Always two decimals. `$0.00` is written as `Fully covered` when it means
"someone else paid", never as a bare zero.

**A price that can be hidden.** The program may hide prices entirely (`showPrices: false`).
Every price render site is conditional; nothing assumes a price is displayable.

**Sale price:** the old price leads, struck through and muted, so the drop reads
left-to-right and the live price is the one in strong type:
```html
<span class="mr-1.5 text-[13px] font-medium text-muted-foreground line-through">$14.00</span>
<span class="text-coral-deep">$11.50</span>
```

**Dates**
- Short: `Mon, Jul 27` · Long: `Monday, July 27` · Range: `Jul 27 – Jul 31`
- Storage/comparison format is always ISO `yyyy-mm-dd` — string comparison is date
  comparison.
- Weekday column headers: `Su Mo Tu We Th Fr Sa`.

**Time**
- Displayed 12-hour with meridiem (`1:30 PM`); stored 24-hour `HH:MM`.
- Minute granularity is 5.

**Counts**
- Singular/plural is always handled: `1 day selected` / `3 days selected`;
  `1 meal` / `3 meals`.
- A numeric badge caps at nothing but is always paired with an `sr-only` unit.

**Initials:** first letter of the first two words, uppercased.

---

## 9. Porting guide

### 9.1 Order of operations

1. **Tokens first.** Drop in the Tailwind `theme.extend` block (§10) and the `globals.css`
   base + utilities layer. This alone gets you ~70% of the look.
2. **`cn()` + CVA.** `cn = twMerge(clsx(...))`. Every component takes `className` and merges
   last, so call sites can override without specificity wars.
3. **The four atoms**: `Button`, `Card`, `Badge`, `Input`. Everything else composes from these
   plus raw markup.
4. **`useDialog`.** Port it verbatim before you build a second modal. Every layer in the app
   uses it, and the value is in the fact that they *can't disagree*.
5. **The shell**: `--sidebar-w` / `--topbar-h`, the flex row, the skip link, the `pb-floor`
   content well, and the single mount point for global layers.
6. **Roving keyboard helpers** (`useRoving`, `useRovingCalendar`, `RadioGroup`) before you
   build a chip row, a tab strip, or a calendar.
7. **Feature components** last.

### 9.2 File structure

```
src/
├── app/                    # routes — thin; each renders a *-view from features/
├── features/               # one folder per screen/flow, holds the screen logic
├── components/
│   ├── layout/             # AppShell, Sidebar, Topbar, CartPanel, MobileDrawer, banners
│   ├── ui/                 # design-system primitives (this document's §4)
│   ├── brand/              # Logo, hero panels, doodle pattern, loading screen
│   └── <domain>/           # domain components (menu/, orders/, payment/, auth/)
├── store/                  # global state slices
├── data/                   # domain types + data access
└── lib/                    # pure helpers + behavioural hooks (use-dialog, roving, utils)
```
**Convention:** routes are thin — they render a `*-view` component from the matching
`features/` folder. Design-system primitives never import from `features/` or `data/`.

### 9.3 Component authoring rules

- **Variants via CVA**, not via boolean props sprinkled through JSX.
- **`className` is always the last argument to `cn()`** so a caller wins.
- **`forwardRef`** on anything a parent may need to focus or measure.
- **Controlled-or-uncontrolled** for stateful primitives (`checked` ?? internal state).
- **Comment the non-obvious.** This codebase's comments explain *why* a value is what it is
  (contrast ratios, iOS behaviours, focus-order consequences). That is what let this document
  be written. Keep the habit — a token with a reason survives a redesign; a token without one
  gets "cleaned up".

### 9.4 Adoption checklist

- [ ] Cream page (`#FBF7EC`), white cards, warm shadows
- [ ] Radius scale overridden larger than framework defaults; `rounded-full` on all controls
- [ ] **Two-tier border system** — `border` decorative vs `control`/`input` operable at 3:1
- [ ] Single typeface via one CSS variable; `text-2xs` + `text-[13px]` carry the UI
- [ ] `text-base sm:text-sm` on every field (iOS zoom)
- [ ] `.nums` on every changeable number
- [ ] Coral reserved for the single primary action; teal for structure; yellow never an action
- [ ] `teal-wash` as the one selection tint
- [ ] Four status triples used as triples
- [ ] No `opacity` on text for emphasis
- [ ] Global `:focus-visible` on *all* interactive elements, no radius, yellow on dark surfaces
- [ ] `useDialog` (focus in/out, Escape, Tab trap, `inert`, counted scroll lock) on every layer
- [ ] `data-escape-layer` release valve for nested transient layers
- [ ] Composite controls = one Tab stop + arrows; calendars use `aria-disabled`
- [ ] `.touch-target` (44/24px) on isolated icon buttons; adjacent controls grown for real
- [ ] Safe-area utilities + `viewportFit: "cover"` + the two-box docked-bar rule
- [ ] `dvh` not `vh`
- [ ] Portalled overlays; nothing `fixed` inside a transformed ancestor
- [ ] Two toast live regions by urgency; one live region per fact
- [ ] `motion-safe:` gating with `motion-reduce:` still equivalents
- [ ] Per-route `<title>` template
- [ ] Sentence case; buttons name the next action or the blocker

### 9.5 Known drift

Two things a porting team should decide about explicitly:

1. **Font.** The config comments describe **Hanken Grotesk**; the app ships **Geist Sans**.
   Both flow through `--font-sans`, so it is a one-line decision — but decide it rather than
   inheriting the ambiguity.
2. **Coral.** The app's `#B85C36` is deliberately deeper than the marketing site's and the
   email templates' `#F0875A`, because white text on the old value measured **2.52:1** against
   the 4.5:1 an accessible button needs. Until a designer reconciles them, the app and the
   marketing surfaces will not match. If you port coral, port the *deep* value and fix the
   marketing side — not the reverse.

---

## 10. Appendix — full Tailwind config & global CSS

### 10.1 `tailwind.config.ts`

```ts
import type { Config } from "tailwindcss";

/** The edge of anything you can press, type in, or choose from.
 *  3.65:1 on a white card, 3.41:1 on the cream page. One constant, two names:
 *  fields use it as `input`, buttons as `control`. */
const CONTROL_EDGE = "#8A8677";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1.5rem" },
    extend: {
      colors: {
        background: "#FBF7EC",
        foreground: "#2B2E2C",
        card: { DEFAULT: "#FFFFFF", foreground: "#2B2E2C" },
        // Decorative only — card outlines, row rules, dividers.
        border: { DEFAULT: "#ECE6D5", strong: "#D9D1B7" },
        input: CONTROL_EDGE,
        control: CONTROL_EDGE,
        ring: "#007078",
        muted: { DEFAULT: "#F4EFE0", foreground: "#67695F" },
        secondary: { DEFAULT: "#F1ECDB", foreground: "#2B2E2C" },

        primary: { DEFAULT: "#007078", foreground: "#FBF7EC" },

        teal:   { DEFAULT: "#007078", deep: "#004045", soft: "#DCEDED", wash: "#EFF6F5" },
        yellow: { DEFAULT: "#F5E516", soft: "#FBF3A0", wash: "#FBF6CB", deep: "#C9B800" },
        coral:  { DEFAULT: "#B85C36", deep: "#A34E2C", soft: "#FBE4D6" },

        brand:  { DEFAULT: "#007078", foreground: "#FFFFFF", soft: "#DCEDED" },
        accent: { DEFAULT: "#B85C36", foreground: "#FFFFFF" },

        sidebar: {
          DEFAULT: "#01413F",
          foreground: "#E8F1EE",
          muted: "#ADC7C3",
          border: "#0A534F",
          active: "#0A5A55",
        },

        success: { DEFAULT: "#2D7B53", bg: "#E7F3EA", border: "#BEE0C8" },
        warning: { DEFAULT: "#98641A", bg: "#FBF3D6", border: "#F0DCA0" },
        danger:  { DEFAULT: "#B24A2B", bg: "#FBE7DF", border: "#F2C3AE" },
        info:    { DEFAULT: "#0B6E76", bg: "#DCEDED", border: "#A9D6D6" },
      },
      fontFamily: {
        sans:  ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-sans)", "system-ui", "sans-serif"],  // aliased on purpose
      },
      fontSize: { "2xs": ["0.6875rem", { lineHeight: "0.9rem" }] },
      borderRadius: { lg: "1rem", xl: "1.25rem", "2xl": "1.5rem", "3xl": "2rem", card: "1.25rem" },
      boxShadow: {
        card:   "0 2px 14px rgba(43, 46, 44, 0.05)",
        raised: "0 14px 40px rgba(1, 65, 63, 0.16)",
        pop:    "0 6px 0 0 #004045",
      },
      backgroundImage: {
        "hero-yellow": "linear-gradient(135deg, #F8EC58 0%, #F5E516 55%, #EFD90C 100%)",
      },
      keyframes: {
        // Opacity-only: a `transform` here would make any element using this animation a
        // containing block for its `position: fixed` descendants, clipping full-screen
        // modal overlays to the content area instead of the viewport.
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "slide-in-down": {
          from: { opacity: "0", transform: "translateY(-10px)", maxHeight: "0" },
          to:   { opacity: "1", transform: "translateY(0)",     maxHeight: "1000px" },
        },
        "track-sweep": {
          "0%":   { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(340%)" },
        },
        "rise-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in":       "fade-in 0.3s ease-out",
        "slide-in-down": "slide-in-down 0.32s cubic-bezier(.4,0,.2,1)",
        "track-sweep":   "track-sweep 1.15s cubic-bezier(.65,0,.35,1) infinite",
        "rise-in":       "rise-in 0.36s cubic-bezier(.4,0,.2,1) both",
      },
    },
  },
  plugins: [],
};

export default config;
```

### 10.2 `globals.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  * { @apply border-border; }

  :root {
    --sidebar-w: 16rem;
    --topbar-h: 4rem;
  }

  html {
    -webkit-text-size-adjust: 100%;
    /* Keep whatever the keyboard just moved to clear of the sticky topbar and
       the docked action bars. */
    scroll-padding-top: calc(var(--topbar-h) + 1rem);
    scroll-padding-bottom: 7rem;
  }

  body {
    @apply bg-background text-foreground antialiased;
    font-family: var(--font-sans), system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
    text-rendering: optimizeLegibility;
    /* A rubber-band scroll behind an open sheet drags its backdrop and looks broken. */
    overscroll-behavior-y: none;
  }

  a, button, [role="button"], input, select, textarea {
    -webkit-tap-highlight-color: transparent;
  }

  /* Kill Chrome's pale-blue autofill background without losing the caret/ink. */
  input:-webkit-autofill,
  input:-webkit-autofill:hover,
  input:-webkit-autofill:focus,
  input:-webkit-autofill:active,
  textarea:-webkit-autofill,
  select:-webkit-autofill {
    -webkit-box-shadow: 0 0 0 1000px #ffffff inset;
    box-shadow: 0 0 0 1000px #ffffff inset;
    -webkit-text-fill-color: #2b2e2c;
    caret-color: #2b2e2c;
    transition: background-color 600000s 0s, color 600000s 0s;
  }

  h1, h2, h3 { font-family: var(--font-sans), system-ui, sans-serif; }

  /* Visible keyboard focus on anything that hasn't drawn its own.
     Deliberately no border-radius — the outline follows the element's shape. */
  a:focus-visible,
  button:focus-visible,
  input:focus-visible,
  select:focus-visible,
  textarea:focus-visible,
  summary:focus-visible,
  [tabindex]:not([tabindex="-1"]):focus-visible {
    outline: 2px solid #007078;
    outline-offset: 2px;
  }

  /* On the dark rail the teal ring is under 2:1. Yellow reads at 8.8:1. */
  [data-dark-surface] a:focus-visible,
  [data-dark-surface] button:focus-visible,
  [data-dark-surface] [tabindex]:not([tabindex="-1"]):focus-visible {
    outline-color: #f5e516;
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.001ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.001ms !important;
      scroll-behavior: auto !important;
    }
  }

  /* Hide scrollbars everywhere (keep scrolling). */
  * { scrollbar-width: none; }
  ::-webkit-scrollbar { width: 0; height: 0; display: none; }
}

@layer utilities {
  /* ── Safe areas ─────────────────────────────────────────────────────────
     The viewport is `viewport-fit=cover`, so the page paints under the notch
     and the home indicator. Every fixed element that touches an edge has to
     pad itself back out. */
  .pb-safe   { padding-bottom: env(safe-area-inset-bottom, 0px); }
  .pb-floor  { padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 1.5rem); }
  .-mb-floor { margin-bottom: calc(-1 * (env(safe-area-inset-bottom, 0px) + 1.5rem)); }
  .bottom-dock { bottom: 0; }
  @media (min-width: 1024px) {
    .pb-floor  { padding-bottom: 1.5rem; }
    .-mb-floor { margin-bottom: -1.5rem; }
  }

  /* Grows a small icon button's *hit* area to 44px without touching the box it
     paints. Use on ISOLATED controls only — side-by-side targets would overlap
     and the top one would swallow its neighbour's taps. */
  .touch-target { position: relative; }
  .touch-target.absolute { position: absolute; }
  .touch-target.fixed    { position: fixed; }
  .touch-target::after {
    content: "";
    position: absolute;
    left: 50%; top: 50%;
    height: 44px; width: 44px;
    transform: translate(-50%, -50%);
  }
  /* On a precise pointer the box shrinks — it does not disappear. Tremor,
     limited dexterity and trackpads are all fine pointers. */
  @media (pointer: fine) {
    .touch-target::after { height: 24px; width: 24px; }
  }

  .font-display { font-family: var(--font-sans), system-ui, sans-serif; }
  .text-overline { @apply text-2xs font-semibold text-muted-foreground; }
  .nums { font-variant-numeric: tabular-nums; }

  /* Hand-drawn line-art vibe — subtle dotted food texture. */
  .bg-pattern {
    background-image: radial-gradient(rgba(0, 64, 69, 0.10) 1.5px, transparent 1.5px);
    background-size: 18px 18px;
  }

  .animate-reveal-down { animation: reveal-down 0.35s cubic-bezier(0.4, 0, 0.2, 1); }
  @keyframes reveal-down {
    from { transform: translateY(-100%); }
    to   { transform: translateY(0); }
  }
}
```

### 10.3 `lib/utils.ts`

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes with conditional logic (shadcn convention). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, opts?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD",
    minimumFractionDigits: 2, maximumFractionDigits: 2,
    ...opts,
  }).format(value);
}

/** "Sarah Chen" -> "SC" */
export function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}
```

### 10.4 Root layout wiring

```tsx
import "./globals.css";                       // global styles lead — importing them after a
                                              // client component lets that component's own
                                              // stylesheet win the cascade and strip the page
import { GeistSans } from "geist/font/sans";

export const metadata = {
  title: { default: "My Meals · Superfine Kitchen", template: "%s · Superfine Kitchen" },
  description: "…",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#004045",
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={GeistSans.variable}
          style={{ "--font-sans": "var(--font-geist-sans)" }}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
```

---

*Generated from a full read of `tailwind.config.ts`, `src/app/globals.css`, all 24
`components/ui` primitives, the layout/brand/menu/auth/payment component families, the
feature views, and `ACCESSIBILITY-AUDIT.md`. Token frequencies are measured counts across
`src/**/*.tsx`.*
