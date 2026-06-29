# Superfine Kitchen — Corporate Employee

Frontend for the **Corporate Employee** experience of the Superfine Kitchen /
Honey Cart corporate meal-ordering platform. It reuses the exact design system,
tooling and folder structure of the **`superfine-corp-admin`** project, and
re-shapes the product around the employee's Information Architecture, Ordering
User Flow, and interview findings.

> Sibling app to `superfine-corp-admin`. Same Next.js App Router stack, same
> Tailwind theme (deep petrol-teal + lemon yellow + coral, Hanken Grotesk),
> same UI primitives — a different user, a different journey.

## Tech stack

- **Next.js 14** (App Router, RSC) · **React 18** · **TypeScript** (strict)
- **Tailwind CSS** design system (shared 1:1 with the admin app)
- **Zustand** for the cart, toasts, confirm dialog and shell UI state
- **lucide-react** icons · **class-variance-authority** for variants

## Getting started

```bash
pnpm install      # or npm install
pnpm dev          # http://localhost:3000  →  redirects to /login
pnpm build        # production build
pnpm typecheck    # tsc --noEmit
```

The app opens at **`/login`**. Sign in (any credentials — it's a prototype) to
land on **`/menu`**, your company menu. Demo user: **Maya Chen**, an engineer at
**Neptune Corp** ($15/day subsidy, service days Mon–Wed).

## What's modelled from the discovery docs

### Information Architecture (Corporate Employee IA)

| IA section | Where it lives |
|---|---|
| **Account & Profile** — dietary/allergens, utensils, program policy (read-only), permissions, addresses, notification prefs | `/account` |
| **Browse & Ordering** — browse/search/filter, item detail + nutrition, single & multi-day, calendar | `/menu`, `/menu/[id]` |
| **Checkout & Payments** — auto-applied subsidy, $0 skip, pay-now / pay-later, multi-day | `/cart`, `/checkout` |
| **Order Management** — live status, cancel/change, upcoming/history, invoices, feedback, OOO | `/orders`, `/orders/[id]` |
| **Notifications** — confirmations, daily reminder, arrival alert, specials | `/notifications` |
| **Set up automatic orders** | `/auto-order` |

### Ordering User Flow

The `/menu` flow follows the user-flow diagram exactly:

- **Start an order → one day _or_ multiple days.** Single-day uses a date strip;
  multi-day uses a start/end range with **weekends and blocked days skipped
  automatically**, then a per-day tab switcher ("swipe between days").
- **Browse the menu** — each card shows photo, tags, a short description and
  allergen info, so there's *no need to open the item to decide*. A **budget bar**
  shows how much of the daily subsidy is left.
- **Add-ons** — items with no add-ons add straight to the cart; items with
  **mandatory** add-ons force a choice via a bottom sheet first; **optional**
  add-ons live behind *Customize*.
- **Review the cart** (every day together) → **Checkout** — subsidy applied
  automatically, default address shown with a change option, delivery time
  editable for permitted employees.
- **Total $0 → straight to confirmation; > $0 → add payment** (pay now / pay
  later). Either way: one on-screen confirmation + one email, and **payment is
  taken 24 hours before delivery — never a surprise second email.**

### Interview findings baked into the UX

- **One front door** — sign in with the company email and land on the *right*
  company menu with the correct subsidy. No "individual vs. family" detour, no
  special link to click first.
- **Mobile-first** — persistent bottom tab bar, bottom-sheet add-ons, sticky
  "review cart" bar (manufacturers are phone-only).
- **Clear order status** — Draft → Confirmed → Out for Delivery → Delivered, so
  employees always know whether food is actually coming.
- **Fail-safe, not fail-confusing** — explicit cutoff/lock messaging; promise of
  one honest confirmation instead of a misleading "Order Confirmed" after cutoff.
- **Low-friction feedback** — one-tap airport-style smileys tied to an order, not
  a survey.
- **Self-service** — auto-order, self-cancel before cutoff, mark out-of-office.

## Project structure

```
src/
  app/
    layout.tsx                 # root: Hanken Grotesk, metadata, theme color
    page.tsx                   # → redirects to /login
    login/                     # employee sign-in (brand hero)
    (app)/                     # authenticated shell (rail + bottom tab bar)
      layout.tsx  loading.tsx
      menu/  menu/[id]/        # Browse & Ordering + item detail
      cart/  checkout/         # Checkout & Payments
      orders/  orders/[id]/    # Order Management
      auto-order/              # automatic orders
      account/                 # Account & Profile
      notifications/           # Notifications feed
  components/
    layout/                    # app-shell, sidebar, topbar (cart), mobile-nav
    menu/                      # menu-item-card, add-on-modal, budget-bar
    orders/                    # order-status (badge + timeline)
    ui/                        # shared primitives (shared with admin app)
    brand/                     # logo
  data/                        # me, program, menu, orders, notifications, types
  lib/                         # nav, dates, utils
  store/                       # cart, toast, confirm, ui (Zustand)
```

## Notes

- All data is mock/seed data (`src/data`) — no backend. Mutations (place order,
  cancel, save prefs, feedback) surface optimistic toasts.
- The demo "today" is **Sun, Jun 28 2026**; dates and cutoffs are computed
  relative to the real current date so the calendar always looks live.
- Design tokens, UI primitives and tooling are intentionally identical to
  `superfine-corp-admin` so the two products feel like one platform.
