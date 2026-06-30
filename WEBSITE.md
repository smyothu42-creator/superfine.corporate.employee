# Superfine Kitchen — Corporate Employee Web App

Complete reference for the **Corporate Employee** experience of the Superfine
Kitchen / Honey Cart corporate meal‑ordering platform. This document describes
every page, the navigation shell, state management, data model, domain logic,
and the design system — so a new contributor can understand the whole site from
one file.

---

## 1. Product overview

The app is the employee‑facing side of a B2B corporate lunch program. An
employee signs in with their **company email**, lands on **their company's
menu** with the **correct subsidy** already applied, and orders lunch for one
day or a whole week. The company covers a fixed daily subsidy; the employee pays
any remainder (or nothing, if their meals are fully covered).

**Demo persona:** *Maya Chen*, a Software Engineer at **Neptune Corp**
($15/day subsidy, service days Mon–Wed, prices visible, allergen: Peanuts,
dietary: Vegetarian).

It is a **front‑end prototype** — all data is mocked in `src/data`, and all
state is in‑memory (Zustand). There is no backend; "Sign in" accepts anything.

---

## 2. Tech stack

| Layer | Choice |
|---|---|
| Framework | **Next.js 14** (App Router, React Server Components where possible) |
| UI runtime | **React 18**, **TypeScript** (strict) |
| Styling | **Tailwind CSS** design system (deep petrol‑teal + lemon‑yellow + coral, Hanken Grotesk display font) |
| State | **Zustand** stores (cart, UI shell, toasts, confirm dialog, auto‑order header, out‑of‑office, notifications) |
| Icons | **lucide-react** |
| Variants | **class-variance-authority** + **tailwind-merge** (`cn()` helper) |

### Scripts

```bash
npm run dev        # http://localhost:3000  → redirects to /login
npm run build      # production build
npm run typecheck  # tsc --noEmit
npm run lint       # next lint
```

---

## 3. Project structure

```
src/
├── app/                      # Next.js App Router
│   ├── layout.tsx            # Root layout (fonts, providers, toaster, confirm dialog)
│   ├── page.tsx              # "/" → redirects to /login (or /menu)
│   ├── login/page.tsx        # Sign-in screen (split hero + form)
│   └── (app)/                # Authenticated shell group
│       ├── layout.tsx        # AppShell (sidebar + topbar + content + cart panel)
│       ├── menu/page.tsx             # Browse & order
│       ├── menu/[id]/page.tsx        # Item detail
│       ├── plan/page.tsx             # Plan-the-week flow
│       ├── cart/page.tsx             # Full-page cart
│       ├── checkout/page.tsx         # Checkout
│       ├── orders/page.tsx           # My Orders (Upcoming / Past / Cancelled)
│       ├── orders/[id]/page.tsx      # Order detail
│       ├── auto-order/page.tsx       # Auto-Order (setup wizard + active dashboard)
│       ├── notifications/page.tsx    # Notification feed
│       └── account/page.tsx          # Account & Profile (settings)
├── features/                 # One folder per page/flow (the "screens")
├── components/
│   ├── layout/               # AppShell, Sidebar, Topbar, CartPanel, MobileNav
│   ├── ui/                   # Design-system primitives (Button, Card, Select…)
│   ├── brand/                # Logo
│   ├── menu/                 # FoodPhoto, MenuItemCard, AddOnModal
│   └── orders/               # OrderStatusBadge, OrderTimeline
├── store/                    # Zustand stores
├── data/                     # Mock data + TypeScript domain types
└── lib/                      # Pure helpers (dates, cutoff, nav, utils, fly-to-cart)
```

**Convention:** routes in `app/` are thin — they render a `*-view` component
from the matching `features/` folder, which holds the screen logic.

---

## 4. Navigation & app shell

Defined in `src/lib/nav.ts` and `src/components/layout/`.

- **Primary rail (`Sidebar`, desktop):** Menu · My Orders · Auto‑Order ·
  Notifications · Account & Profile.
- **Mobile bottom bar (`MobileTabBar`):** Menu · Cart · Orders · Auto · Account.
- **`Topbar`** (sticky, `h-16`): mobile menu trigger, the page title, and a
  **context‑adaptive right side** (see below).
- **`CartPanel`:** slide‑in cart (desktop push panel / mobile overlay).

Checkout is reached *out of* the cart, so it lives in the topbar flow rather
than the nav rail.

### Adaptive topbar (right side)

The topbar swaps its right‑side controls based on the current route:

| Route | Right side of topbar |
|---|---|
| `/auto-order` | Weekly **Total · Budget · Remaining** stats + **Auto‑Order** toggle |
| `/orders` | **Out of office** toggle (opens a multi‑date calendar; sets an alert banner) |
| `/checkout` | **Cutoff indicator** pill ("N days within cutoff" / red "N past cutoff") with a hover dropdown listing each day's Open/Passed status |
| `/notifications` | **"N unread"** text + **Mark all read** button |
| `/account`, `/cart` | *(nothing — header actions hidden)* |
| Menu / others | **Subsidy** budget indicator (hover breakdown) + **Cart** button |

These are powered by small bridge stores (`use-auto-order-store`,
`use-ooo-store`, `use-notifications-store`) or computed directly from the cart.

---

## 5. Pages & flows

### 5.1 Login — `/login`
Split screen. **Left hero:** lemon‑yellow gradient with a hand‑drawn
**food‑doodle SVG pattern** (fork, spoon, chef hat, pan, heart, plate), a large
**Superfine Kitchen logo**, a headline and supporting copy. **Right:** a
sign‑in card (company email + password, "use your invite link"). Any
credentials proceed to `/menu`.

### 5.2 Menu — `/menu`  (`features/menu/menu-view.tsx`)
The browse‑and‑order home.
- Sticky **"Hi Maya"** ordering box: greeting, **One‑day / Multiple‑days** tabs,
  and a unified search pill (search + cuisine + price filters).
- Multi‑day mode opens a **date‑range calendar** and shows a horizontally
  scrollable **DayStrip** (per‑day progress, prices, scroll arrows).
- **Dietary filter chips** (All, Vegan, Vegetarian, Gluten‑Free, …).
- A responsive grid of **MenuItemCard**s: photo, tags, allergens, price, and a
  filled CTA — **Add** (no add‑ons) or **Choose options** (opens the add‑on
  modal). Both use the same coral filled style.

### 5.3 Item detail — `/menu/[id]`  (`features/menu/item-detail-view.tsx`)
Full meal page: hero photo, description, **nutrition** (calories / protein /
carbs / fat), ingredients, allergens, dietary tags, add‑on selection, quantity,
and add‑to‑cart.

### 5.4 Plan the week — `/plan`  (`features/plan/`)
A guided multi‑day flow: pick a date range (`calendar-step`), then add a meal
per day (`menu-step` + `addon-sheet`), orchestrated by `plan-week-flow`.

### 5.5 Cart — `/cart`  (`features/cart/cart-view.tsx`)
- Per‑day **cards**: each delivery day with a "You pay $X / Fully covered"
  badge, line items with quantity steppers + remove, and a "Subsidy applied"
  row.
- A summary card (Subtotal · Company subsidy · You pay) with **Add another
  day** and **Checkout**.
- The same `CartDayList` is reused inside the checkout **Edit order** modal.
- Also renders inside the slide‑in `CartPanel` (`CartPanelBody`, pinned summary).

### 5.6 Checkout — `/checkout`  (`features/checkout/checkout-view.tsx`)
Three‑column layout (form + sticky order summary). Sections:
- **Sticky progress stepper** (Cart → Checkout → Confirmed), connected‑circle
  style matching the rest of the app.
- **Cutoff check** card (above Delivery address): per‑day **tags** — green +
  tick when within cutoff, red when passed — inside a muted box, with a warning
  notice below.
- **Delivery address** card: shows the selected address + an **edit (pencil)
  icon** that opens a modal of **radio‑button** addresses and a **Save address**
  button. (A **Delivery notification** button in the header opens a modal of
  themed check rows for email notification preferences — email only.)
- **Delivery time** card: one **common time for all days** (themed dropdown
  sized to match the button); a **Set time per day** button opens a modal with a
  per‑day themed dropdown for each day.
- **Payment** card: fully‑covered notice, or pay‑later/pay‑now options + a
  "save payment method" checkbox.
- **Order summary** (sidebar): an **Edit order** button (opens the cart as a
  modal with a pinned summary + **Save order**), per‑day sections, a sticky
  totals/actions block with the draft status line and **Place order**.
- Placing the order shows a confirmation state (order #, email note, links to
  orders/menu).

The checkout topbar shows the **cutoff indicator** instead of subsidy + cart.

### 5.7 My Orders — `/orders`  (`features/orders/orders-view.tsx`)
- **Sticky** tab bar: **Upcoming · Past · Cancelled** (counts).
- Order **cards** are fully clickable (pop‑up hover lift) and route to the order
  detail. Editable orders show **Change** + **Cancel** in the header; others
  show a chevron. **Change** opens the auto‑order `SwapSheet` modal (per‑item
  for multi‑item orders, via an item‑picker step).
- Multi‑meal orders show **overlapping circular photos** + "{n} meal orders".
- Out‑of‑office (set from the topbar toggle) shows a banner listing the away
  days.

### 5.8 Order detail — `/orders/[id]`  (`features/orders/order-detail-view.tsx`)
Per‑order timeline (Placed → Confirmed → Out for delivery → Delivered), items,
delivery, and payment breakdown.

### 5.9 Auto‑Order — `/auto-order`  (`features/auto-order/`)
- **Inactive:** intro/empty state explaining the benefit; **Set up Auto‑Order**.
- **Setup wizard** (`setup-wizard.tsx`): **sticky** 3‑step progress
  (Select Meal → Schedule → Confirmation); step 0 is a **meal rotation** picker
  (search/cuisine/diet filters, "Order Items n/10" counter, obvious selected
  state with photo tint + check + teal label), step 1 schedule + reminders,
  step 2 confirm.
- **Active dashboard** (`active-dashboard.tsx`): **week tabs** (This week +
  upcoming weeks, pill style) that switch the **orders below**; a "Plan more
  weeks" secondary button beside "Edit Auto Ordering"; the days render as **one
  bordered box with dividers** (round photos; multi‑meal days show overlapping
  photos + "{n} meal orders"). Each **review** day uses a **kebab (⋮) menu** for
  Swap / Skip. **Sold‑out** days show a "We'll swap in …" suggestion with
  compact **Accept / Pick other** buttons; confirming routes through a modal and
  marks the day "Superfine Kitchen is reviewing this order." The weekly
  Total/Budget/Remaining and the Auto‑Order toggle live in the **topbar**.
- `swap-sheet.tsx`: meal‑swap modal (bottom sheet on mobile, centered modal on
  desktop) with Favorites / Full‑menu tabs; reused by My Orders.

### 5.10 Notifications — `/notifications`  (`features/notifications/`)
A single feed list (confirmation, reminder, arrival, change, special), each row
marking itself read on click. The **unread count** and **Mark all read** live in
the **topbar** (driven by `use-notifications-store`).

### 5.11 Account & Profile — `/account`  (`features/account/account-view.tsx`)
Settings home:
- Profile header (avatar, name, role · company, **email**, **phone**).
- Subsidy snapshot stat cards (daily subsidy, meals/day, order cutoff).
- **Dietary preferences** as compact selectable **chips** + allergens to avoid.
- Program policy (read‑only) and permissions (granted by SFK).
- **Delivery addresses** — clean divider list (no inner boxes).
- **Notification preferences** — borderless divider list of toggles that apply
  immediately (no Save button).
- A single **"Include utensils by default"** toggle (left‑aligned, no border).

---

## 6. State management (Zustand stores — `src/store/`)

| Store | Responsibility |
|---|---|
| `use-cart-store` | Cart line items (per date + add‑ons), delivery windows, address, payment; derived `dates()`, `dayTotal`, `daySubsidy`, `dayEmployeePaid`, `subtotal`, `totalSubsidy`, `totalEmployeePaid`, `count` |
| `use-ui-store` | Shell UI: mobile nav, cart panel open, active order date, planned days, range‑picker request |
| `use-toast-store` | Toast notifications (`toast.success/info/...`) rendered by `Toaster` |
| `use-confirm-store` | Promise‑based confirm dialog (`confirm({...})` → boolean) rendered by `ConfirmDialog` |
| `use-auto-order-store` | Bridges the auto‑order weekly summary + toggle to the topbar |
| `use-ooo-store` | Out‑of‑office state (picked away days) for the orders topbar toggle + banner |
| `use-notifications-store` | Notification feed (`items`, `markRead`, `markAll`) shared by the page + topbar |

---

## 7. Data model (`src/data/`)

Mock data with strict TypeScript types in `types.ts`:

- **`MenuItem`** — id, name, category, cuisine, description, allergens, dietary
  `tags`, price, `type` (`individual` | `family_style`), `availableDays`,
  `image`, `ingredients`, `nutrition` ({calories, protein, carbs, fat}),
  `addOns` (groups of single/multi options). Images use stable **TheMealDB**
  food photos. (`menu.ts`)
- **`Employee`** (`me.ts`) — id, name, email, **phone**, role, company,
  `dietary`, `allergens`, `utensils`, `defaultAddressId`, `permissions`
  (payLater, flexibleDelivery, editAddress), `notifications`, `autoOrder`.
- **`MealProgram`** (`program.ts`) — company, platform, `subsidyPerDay`,
  `showPrices`, `serviceDayNums`, cutoffs, `deliveryWindows`, addresses, etc.
- **`Order` / `OrderDay` / `OrderItem`** (`orders.ts`) — the My Orders data;
  statuses `draft → confirmed → out_for_delivery → delivered` (+ `cancelled`).
- **`AppNotification`** (`notifications.ts`) — feed items with a
  `NotificationType`.

---

## 8. Domain logic (`src/lib/`)

- **`cutoff.ts`** — service‑day + cutoff rules. `cutoffFor(deliveryISO)` returns
  the cutoff instant (4 PM the prior day, `SOFT_CUTOFF_HOUR = 16`),
  `isCutoffPassed`, `isServiceDay`, `isHoliday`, `nextOpenDays`. `demoNow()`
  pins "now" to **today at 5 PM** so the cutoff‑passed scenario is always
  demonstrable. Used by checkout's cutoff tags/indicator and auto‑order.
- **`dates.ts`** — date helpers (`fromISODate`, `toISODate`, `formatDay`,
  `formatDayLong`, `addDays`, `WEEKDAY_SHORT`, service‑day utilities).
- **Subsidy math** (in `use-cart-store`) — each day is capped at
  `program.subsidyPerDay`; the employee pays only the per‑day remainder.
- **`nav.ts`** — nav items + `isActive(pathname, item)` highlighting.
- **`utils.ts`** — `cn()` (clsx + tailwind‑merge), `formatCurrency`.
- **`fly-to-cart.ts`** — the add‑to‑cart fly animation.

---

## 9. Design system

- **Theme:** deep petrol‑teal (primary), lemon‑yellow (hero/brand), coral
  (primary CTA), with success/warning/danger/info tonal tokens. Cream
  background, card surfaces, rounded‑2xl/3xl corners, soft shadows.
- **Typography:** Hanken Grotesk display font; tabular `nums` for currency.
- **Primitives** (`components/ui/`): `Button` (variants: default/coral, teal,
  brand, outline, ghost, danger…), `Card`, `Badge`, `Notice` (info/warning/
  success/locked), `Select` (native, themed chevron), **`ThemeSelect`** (fully
  themed dropdown, `box`/`pill` variants, `sm`/`md` sizes), `ToggleSwitch`,
  `Checkbox`, `Input`, `Tabs`, `Avatar`, `Skeleton`, `StatCard`, `Toaster`,
  `ConfirmDialog`, `DateMultiModal`.
- **Modals:** centered dialogs use `rounded-3xl` on all four corners with a
  scale/opacity transition; sheets slide up on mobile.
- **`FoodPhoto`** — image with a branded yellow utensils placeholder fallback.

---

## 10. Modeling notes

The IA, ordering flow, and copy are derived from discovery/interview findings:
one front door (company email → right menu + subsidy), explicit per‑day
delivery/cutoff clarity, simple customer‑facing order statuses, self‑service
auto‑order, and clear subsidy display. Prototype data lives entirely in
`src/data`; swapping in a real API means replacing those modules and the store
mutations.
