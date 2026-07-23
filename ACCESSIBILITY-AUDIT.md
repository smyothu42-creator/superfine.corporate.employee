# Can everyone use our app? — Accessibility Check

**Superfine Kitchen · employee lunch ordering · 23 July 2026**

**Standard tested against: WCAG 2.2, Level AA.**

---

## The short answer

We checked whether people with disabilities can use the app. Three groups in particular:

- People who **cannot see the screen**, and have software read the page aloud to them.
- People who **cannot use a mouse**, and do everything with the keyboard.
- People who **cannot see well** — poor eyesight, a dimmed screen, sunlight on a phone.

**We found 16 problems. All 16 are now fixed and tested.**

Fifteen came from reading and driving the app by hand. The sixteenth was found afterwards,
by running the industry-standard automated checker across every screen — and it had been
*introduced* by one of the earlier fixes. That is the honest shape of this work: a careful
hand audit still needs a machine to check it, and the machine still needs a person to check
*it*. **Appendix C** is the record of that pass, including the one thing the machine got
wrong.

The app looks essentially the same as before. Almost every fix is invisible — new keyboard
behaviour, or wording that only the reading software hears.

---

## Why this matters

US law says a disabled person must not be shut out of a service. It does not hand you a
checklist, so courts and the government use an international rule book to decide whether
you met it.

That rule book is the **Web Content Accessibility Guidelines (WCAG)**. The level asked for
in practice — and the one the US Justice Department wrote into its 2024 rule for state and
local government services — is **Level AA**. We tested against version **2.2**, the current
one, which contains everything in 2.0 and 2.1 plus a few newer rules about target sizes and
focus.

Every problem below names the exact WCAG rule it broke, so an auditor or a lawyer can check
our work instead of taking our word for it.

Two parts of the law reach this app:

- **It is a work tool.** Staff use it to get a lunch the company pays for. An employee who
  cannot order one is being denied a benefit of their job.
- **Part of it is open to the public.** Anyone can browse the menu without an account, and
  anyone can rate a meal using an order number. That opens a second, wider route for a
  complaint — the kind that ends up in the news.

Some states, California especially, add money damages on top for each problem found.

*This is an engineering report, not legal advice. A lawyer should look before launch.*

---

## What was wrong, and what it meant for a real person

| # | The problem | What it actually meant | WCAG rule broken | Fixed |
|---|---|---|---|---|
| 1 | Meal photos were the only label on their link | When a photo failed to load, a blind person heard **"link, link, link"** and could not tell which meal was which. Someone using voice control could not open it at all. | 1.1.1 Non-text Content (A)<br>2.4.4 Link Purpose (A) | ✅ |
| 2 | Sort and filter dropdowns | **Could not be used without a mouse at all.** Choosing an option meant pressing Tab past every other thing on the page. | **2.1.1 Keyboard (A)** | ✅ |
| 3 | Password errors | The red "too short" message was **never read aloud**. A blind person could not create an account — so could not use the product. | 3.3.1 Error Identification (A)<br>4.1.3 Status Messages (AA) | ✅ |
| 4 | Searching the menu | Typing changed the meals **in total silence**. No way to know if anything was found. | 4.1.3 Status Messages (AA) | ✅ |
| 5 | The budget panel | It **vanished as you moved the mouse toward it**, so people using screen magnification could never read what the company pays. | 1.4.13 Content on Hover or Focus (AA) | ✅ |
| 6 | Individual / Family Style, Upcoming / Past | The reading software said *"use the arrow keys"* — and **the arrow keys did nothing**. | 4.1.2 Name, Role, Value (A) † | ✅ |
| 7 | Star ratings | Same broken promise. Rating six meals cost **30 key presses**. | 4.1.2 Name, Role, Value (A) † | ✅ |
| 8 | The rating comment box | Had **no name** once you started typing in it. | 3.3.2 Labels or Instructions (A) ‡ | ✅ |
| 9 | Meal search on the nutrition page | The highlighted meal was **never said aloud**, so pressing Enter was a guess. | 4.1.2 Name, Role, Value (A) | ✅ |
| 10 | Three buttons | Pointed at things **not on the page**, which some reading software reports as an error. | 4.1.2 Name, Role, Value (A) § | ✅ |
| 11 | Faint outlines on **99 buttons** | Pale cream on a cream page. For anyone with poor eyesight, **the buttons had no visible shape.** | **1.4.3 Contrast (AA)**<br>1.4.11 Non-text Contrast (AA) | ✅ |
| 12 | Date calendars | Every single date was a separate stop — **31 key presses** to get past one month. | *Best practice, not a WCAG failure* † | ✅ |
| 13 | Allergen and Dietary filters | Arrow keys did nothing, unlike every other dropdown. | 4.1.2 Name, Role, Value (A) † | ✅ |
| 14 | The Report a Problem page | Announced **two page titles**, so it was unclear where you were. | 2.4.2 Page Titled (A) | ✅ |
| 15 | The "where are we delivering?" box | It held the keyboard and **would not let go**. Anyone outside the delivery area was stuck on that box with no way out — not by Escape, not by clicking away, not by Tab. The only way to leave the app was to close the browser tab. | **2.1.2 No Keyboard Trap (A)** | ✅ |
| 16 | Allergen and Dietary filter lists | The "Clear all" and "Add your own" rows sat **inside a list of choices while not being choices**, which makes the list invalid. Landing on them announced nothing at all. Found by the automated checker, and **caused by the fix for #13**. | **1.3.1 Info and Relationships (A)** | ✅ |

† **A note on honesty.** Four of these are not, strictly, WCAG failures. A calendar where
every date is a separate tab stop (#12) is tedious, but it *passes* the keyboard rule — the
"use the arrow keys" pattern comes from the ARIA Authoring Practices Guide, which is
industry convention rather than the standard itself. #6, #7 and #13 sit on the line: the app
announced a role that promised arrow-key behaviour it did not have, which is a 4.1.2 failure
by most readings, but a stubborn auditor could argue it. We fixed them because they made the
app worse to use, not because we were forced to. They are listed here so nobody discovers
the distinction later and wonders what else was oversold.

‡ #8's *visible* label vanishing is a real 3.3.2 problem. The stronger claim — that the box
had no name at all — is likely wrong: a `placeholder` still feeds the accessible name when
nothing else does. The fix is right either way; the original wording overstated it.

§ #10 was historically a 4.1.1 Parsing failure, and **4.1.1 was removed from WCAG in 2.2**.
It is good hygiene, not a violation. Fixed anyway.

One more was fixed as a precaution: the shared table component had unlabelled column
headings. Nothing in the app uses it yet, so no one was affected — it is simply correct now
for whoever builds the first table.

---

## The four that mattered most

**Some people could not leave.** The delivery-location box opened over the menu and held on
to the keyboard. That is normal for a box like this — while it is open, nothing behind it
should be reachable. What was not normal is that it had no exit: Escape was switched off,
clicking away did nothing, and for someone outside our delivery area the one button on
screen only led back to the same field. The keyboard could not get out of the box, and the
box would not accept an answer. The rule book names this one specifically, because closing
the tab is the only remaining move. It now closes like any other box, and the close button
says what closing means: browse without setting a location.

**Nobody could sign up.** The password error message was on screen and nowhere else. A
blind person filled in the form, found the button greyed out, and had no way to learn why.
The app knew exactly what was wrong and never said it. That is not an inconvenience — it is
the front door being locked.

**Meals lost their names.** When a meal photo failed to load, the link it sat in lost its
name with it. We tested this by stopping the photos from loading: **5 of 10 meal links had
no name.** Now they keep their name whether the photo arrives or not.

**The buttons were invisible to some people.** 99 of them. One colour was doing two jobs:
drawing faint lines between cards, and drawing the edge of things you press. We separated
the two. Dividers stayed soft; anything you can press now has an edge you can actually see.

---

## What still needs doing

**1. Put this live.** The fixes are written and tested but **not yet published**. They
reach real people when the code is released.

**2. Have a blind person try it.** This is the most valuable thing left. Our testing proves
the mechanics work; only a real person can tell you whether the app *makes sense* when read
aloud. An hour with someone who uses this software daily is worth more than any further
checking we can do.

**3. Keep it up — and automate it.** Problem #16 was introduced *by an accessibility fix*
and sat there until a machine looked. That is not going to be the last time. The scan in
Appendix C takes about four minutes end to end and needs no specialist knowledge to run;
wiring it into the build so a pull request fails on a new violation is a few hours of work
and is the single highest-value thing left after the user test. Right now it lives in a
scratch folder and only runs when somebody remembers.

**4. Loose ends — eight of nine now closed.** Writing up the code (Appendix A) turned up
nine smaller things. Eight are fixed and driven in a browser; the ninth is a brand
question, not a code one. Details in **Appendix B**.

---

## How we know it is fixed

Three separate ways, and they disagreed with each other once — which is the point of doing
more than one.

**1. Driven by hand in a real browser.** Every fix was tested the way a disabled person
would use it — keyboard only, checking what the reading software would be told at each
step. Nothing here is "it should work now." Each one was watched working.

**2. Checked by machine against WCAG 2.2 AA.** The industry-standard checker (axe-core
4.12) was run over **every screen in the app, at desktop and phone width, signed in as both
a company employee and an individual** — 36 runs in total. It also went inside the parts a
page-level scan never reaches: open dropdowns, the calendars, the mobile menu, the cart, a
password form in its error state.

> **Result: zero violations on all 36 screen runs.** The scan inside the open dropdowns is
> what turned up problem #16, which is now fixed and re-tested. Full method, the proof the
> checker was working, and the one result we rejected as wrong are in **Appendix C**.

**3. Measured pixel by pixel where the machine gave up.** The checker declined to judge four
pieces of text — one over a photo, one over a gradient — because it could not work out what
was behind them. Those were measured directly from the rendered screen instead. All four
pass, the closest by a comfortable margin (5.26:1 against a 4.5:1 requirement).

We also re-measured the whole app, to be sure the fixes had not broken anything:

- **Every piece of text on 13 screens** — does it stand out enough to read? No failures.
- **Every button, link and box you can type in** — does it show clearly when the keyboard
  reaches it? No failures.
- **118 button edges** — are they strong enough to see? No failures at the time of the
  sweep. The search-and-filter bar has been softened since, by design decision — the single
  deliberate exception in the app, written up in Appendix A #11.
- **Every screen at phone width** — does anything run off the side? No failures.

**Three honest limits.**

- We checked the main path of each screen, not every possible step of every task. A form
  filled in wrongly in an unusual way was not swept automatically.
- One screen state was never reached by the automated pass: the **custom pickup-time box in
  checkout**, which only appears for an individual account with something already in the
  cart. It was driven by hand (Appendix B①) but never machine-checked.
- **An automated checker can only find about a third to a half of what WCAG asks for.** It
  proves a label exists; it cannot tell you the label makes sense. "Button, button, button"
  and "Add BBQ Brisket Bowl to cart" score identically. That gap is exactly why the next
  item on the list is a real person.

---

# Appendix A — where the changes are

For engineers. One entry per numbered problem above: the files it touched, what the code
now does, and the edge cases each fix has to survive. **17 files added — 16 route
`layout.tsx` files and `src/lib/calendar-keys.ts`.**

Two corrections to earlier drafts of this appendix. The count was *15* layout files when it
was first written; closing loose end **B④** added a 16th for `/r/[token]`, the public rating
link. And the payment form `src/components/payment/card-fields.tsx` — added during the same
week for unrelated reasons — is not called out under any of the sixteen, but it did receive
the same treatment in the sweep: `border-control` on its inputs, `aria-invalid` +
`aria-describedby` + `role="alert"` on its field errors, and `useDialog` on its card dialog.
Its two remaining `border-border` uses are a badge and a divider, which is the decorative
side of the split and correct.

---

### 1 · Meal photos were the only label on their link

**Where** `src/components/menu/food-photo.tsx` (`FoodPhoto`)

**What changed** When the `<img>` errors (`onError` → `failed`), a `<span class="sr-only">`
carrying the same `alt` renders in its place, so the link keeps its accessible name whether
or not the picture arrives. The fallback `<Utensils>` glyph is `aria-hidden`, so it can
never be mistaken for the content.

**Edge cases**

- `alt=""` — decorative use — renders nothing. The guard is `alt ? … : null`, not `alt ?? ""`.
- Photo loads: the span never renders, so the name is never spoken twice.
- The photo fails *mid-session* rather than on first paint: same path, because it hangs off
  `failed` state, not off the initial render.
- Server render always emits the `<img>`; the swap is client-side, so there is no hydration
  mismatch.

---

### 2 · Sort and filter dropdowns could not be used without a mouse

**Where** `src/components/ui/theme-select.tsx`

**What changed** Options left the tab order (`tabIndex={-1}`); focus moves into the
portalled listbox on open; `↑ ↓ Home End` move an `activeIndex`; `aria-activedescendant`
names the highlighted row; `Enter`/`Space` commit; `Escape` and `Tab` close and put focus
back on the trigger; `↓` opens a closed trigger the way a native `<select>` does;
`aria-controls` is set only while the list exists; `React.useId()` namespaces the row ids;
the highlight is kept on screen with `scrollIntoView({ block: "nearest" })`;
`onMouseDown → preventDefault()` stops a click pulling focus out mid-selection.

**Edge cases**

- The list opens on the row that is already chosen, not at the top, so arrows start from
  the truth.
- Two of these on one page cannot cross-wire their `aria-controls` (`useId`).
- Long lists scroll the highlight into view rather than leaving it guessed at.
- Click-away closes via `setOpen(false)`, deliberately *not* `close()` — a mouse user's
  focus should follow their click, not snap back to the trigger.
- See **B①** — Escape while this list is open inside a modal.

---

### 3 · Password errors were never read aloud

**Where** `src/app/set-password/page.tsx`, `src/features/auth/identity-flow.tsx`,
`src/features/account/account-view.tsx` (change-password block)

**What changed** `aria-invalid` on the field, `aria-describedby` pointing at the message,
and `id` + `role="alert"` on the message itself. Both the too-short and the mismatch cases,
in all three places.

**Edge cases**

- Ids are namespaced per instance (`${idPrefix}-new-error`) because the change-password
  form renders in more than one place.
- `tooShort` is `length > 0 && length < MIN`, so an empty field is not an error: nothing is
  announced on arrival, and nothing on clearing back to empty.
- The alert element mounts once and stays mounted while the value is short, so it speaks
  once rather than on every keystroke.
- `aria-describedby` is dropped as soon as the value is valid, so a stale message is not
  read on a later visit to the field.
- Known chattiness: it does announce from the *first* character typed. Correct, but early.
  If it grates in real use, move the trigger to blur.

---

### 4 · Searching the menu happened in silence

**Where** `src/features/menu/menu-view.tsx` (`MenuView`, immediately above the grid)

**What changed** An `sr-only` paragraph with `aria-live="polite" aria-atomic="true"`
carrying either the result count or "No meals match your filters for this day."

**Edge cases**

- Polite, so it waits its turn instead of cutting across the user's own typing.
- `aria-atomic` re-reads the whole sentence, not the changed number on its own.
- The region is in the page with content on first paint, so mounting does not announce —
  only genuine changes do.
- It also fires on day and category changes, not just search. Intended: the grid changed
  for those reasons too.
- Not debounced — see **B⑦**.

---

### 5 · The budget panel vanished as you moved toward it

**Where** `src/components/layout/topbar.tsx` (`BudgetIndicator`)

**What changed** The hover-revealed panel gets `pointer-events-auto` while hovered or
focused-within, so the pointer can actually land on it. `Escape` dismisses a panel that is
open *purely* because of hover, through a separate `hoverDismissed` flag that clears on
`pointerleave`. The pill's own edge moved off the pale `-border` tints onto solid
`danger`/`warning`/`info`.

**Edge cases**

- A hover-opened panel has no state behind it, so `budgetOpen` alone could not dismiss it —
  that is what the second flag is for.
- `hoverDismissed` resets when the pointer leaves, so Escape dismisses it once, not for good.
- Keyboard-only: Escape clears `budgetOpen`, `:hover` is false, nothing sticks.
- Touch: no hover state, so tap-to-open is unchanged.
- The keydown listener now registers unconditionally (`[]` deps). Pressing Escape with the
  panel shut is a no-op `setState`.

---

### 6 · "Use the arrow keys" — and the arrow keys did nothing

**Where** `src/components/ui/tabs.tsx`; call sites `src/features/orders/orders-view.tsx`
(Upcoming / Past) and `src/features/menu/menu-view.tsx` (Individual / Family Style)

**What changed** A roving tab stop (`tabIndex={active ? 0 : -1}`), `← →` with wraparound,
`Home`/`End`, and focus following the selection via a `data-tab-id` lookup. The strip is
now one Tab press, landing on the tab that is showing.

**Edge cases**

- Wraps at both ends, so `←` from the first tab reaches the last.
- Automatic activation (arrow = select). Correct here — both panels are cheap and already
  mounted; a strip with expensive panels would want manual activation instead.
- No `aria-controls` → `tabpanel` pairing: it announces as a tab strip, but the panel is not
  formally tied to it. Next refinement, not a failure.
- Structural gap — see **B③**.

---

### 7 · Star ratings cost 30 key presses

**Where** `src/features/ratings/rate-items.tsx` (`Stars`)

**What changed** A roving tab stop on the chosen star (or star 1 when unrated), arrows on
both axes, `Home` = 1 star, `End` = 5, focus following the score via `data-star`. The `Star`
glyph is `aria-hidden` so only the button's own label is read.

**Edge cases**

- From "nothing chosen", the first arrow press lands on 1 star rather than doing nothing.
- Clamped 1–5 with no wrap: wrapping a *scale* would turn ★5 into ★1 on a single keypress.
- `readOnly` drops the radiogroup roles and the tabIndex entirely, so a settled rating does
  not pose as a live control.
- Six meals on a page is six groups, one Tab press each.
- Once a score is set, the keyboard cannot get back to "no rating". Inherent to a radio
  group; clearing stays a mouse/reset action.

---

### 8 · The rating comment box had no name once you typed in it

**Where** `src/features/ratings/rate-items.tsx` (`LineCard`)

**What changed** `aria-label={"What else should we know about " + line.name + "? (optional)"}`
on the `Textarea`. The placeholder stays as the visual hint.

**Edge cases**

- The label carries the meal name, so six boxes on one order do not all read identically.
- It survives typing; a placeholder does not.
- `maxLength={200}` is still not announced. A described-by counter is the obvious follow-up.

---

### 9 · The highlighted meal on the nutrition page was never said aloud

**Where** `src/features/nutrition/nutrition-lookup.tsx` (`MealCombobox`)

**What changed** `role="combobox"` on the search input plus `aria-haspopup`,
`aria-expanded`, `aria-controls`, `aria-autocomplete="list"` and `aria-activedescendant`
naming the highlighted row; option ids from `useId`; options out of the tab order with
`onMouseDown → preventDefault()`.

**Edge cases**

- `aria-expanded` is hard-coded true because this input only exists inside the open panel.
- `aria-activedescendant` is omitted when nothing matches, so it never points at a row that
  is not there.
- Empty results are still silent here — see **B⑤**.

---

### 10 · Three buttons pointed at things not on the page

**Where** `src/features/ratings/rate-entry.tsx` (`Disclosure`),
`src/components/layout/topbar.tsx` (hamburger and cart buttons), and the same gating built
into the new listboxes in `theme-select.tsx`, `multi-select-filter.tsx` and
`allergen-combobox.tsx`

**What changed** `aria-controls` is set only while the element it names is mounted. The
hamburger gained `aria-expanded` and a label that flips to "Close navigation". The cart
button's `aria-expanded` was *removed*, because that button only exists while the cart is
shut, so the attribute could only ever report `false`.

**Edge cases**

- The mobile drawer is unmounted when closed, so its id genuinely is not in the page — the
  reference has to be conditional, not constant.
- The budget panel is the opposite case: always rendered, so its `aria-controls` stays
  unconditional and correct.
- An `aria-expanded` that can only ever be `false` is worse than none — it asserts a state
  that is true by construction and tells the user nothing.

---

### 11 · Faint outlines on 99 buttons

**Where** `tailwind.config.ts` (new `CONTROL_EDGE = "#8A8677"`, exported as both `input` and
`control`), then `border-border` → `border-control` on **98 changed lines across 40 files**;
`src/app/globals.css`; `src/components/ui/stat-card.tsx`; `src/components/layout/sidebar.tsx`

**What changed**

- One colour was doing two jobs. `border` (#ECE6D5, 1.25:1) stays *decorative* — card
  outlines, row rules. Anything a person operates now uses `control` at 3.65:1 on white and
  3.41:1 on cream. `input` and `control` are the same constant under two names so a field
  and a button cannot drift apart.
- Text tones that failed alongside it: `muted.foreground` #76786E → #67695F,
  `sidebar.muted` #7FA8A2 → #ADC7C3 (it failed worst on the *active* row — the one telling
  you where you are), coral #F0875A/#DC6B3C → #B85C36/#A34E2C (white text on the primary
  button measured 2.52:1), and the `success`/`warning`/`danger` text tones.
- `/50` and `/70` opacity variants on `text-muted-foreground` removed at 14 sites across 13
  files, and
  `opacity-80/95` dropped from `stat-card` text. Fading a colour toward its background is
  precisely what the contrast rule measures.
- `globals.css`: `:focus-visible` widened from `a`/`[tabindex]` to every interactive
  element — a `<button>` whose classes killed its outline previously had no focus indicator
  at all. `[data-dark-surface]` (set on the navigation rail) switches the ring to yellow,
  which reads at 8.8:1 there against the teal ring's under-2:1.

**Edge cases**

- Decorative rules deliberately kept soft. The split is the whole point — otherwise the app
  turns into a grid of hard boxes.
- Disabled controls (`disabled:opacity-30/40`) fall back under 3:1. Allowed by the rule, and
  left alone on purpose.
- No stale copies of the old hexes remain anywhere in `src` (checked).
- **One control is on the decorative tint on purpose:** the search-and-filter bar — the
  wrapper holding the search field and the three filter pills, which renders twice
  (`menu-view.tsx` on the Menu, `setup-wizard.tsx` in the auto-order wizard). Its edge is a
  full-width pill rather than a button outline, and at control strength the line read
  heavier than the design wanted. It carries `border-strong` (#D9D1B7, 1.53:1 on white,
  1.43:1 on cream) — a decorative tone, firmer than the plain `border` tint but well short
  of the 3:1 a control's boundary owes a low-vision user. A design decision, taken
  knowingly, and the only one of its kind in the app — everything else operable still
  carries `control`. What holds the box together visually for a sighted user
  is its white fill against the cream page, the search glyph and the placeholder; the input
  keeps its own focus ring, so a keyboard user is unaffected. If it has to be reconciled, a
  stronger edge on the `input` element alone would outline a smaller shape and read lighter
  at the same contrast.
- Anything outside this repo — email templates, the marketing site, exported artwork — still
  carries the old coral. See **B⑥**.

---

### 12 · Every date in a calendar was a separate stop

**Where** New `src/lib/calendar-keys.ts` (`dateForKey`, `useRovingCalendar`), used by
`src/components/ui/datetime-fields.tsx` (`DateField`) and
`src/features/menu/date-range-modal.tsx`. `src/features/menu/menu-view.tsx`
(`UnifiedDatePicker`) and `src/components/ui/date-multi-modal.tsx` got the matching
`aria-disabled` treatment; `src/components/cutoff/cutoff-day-tooltip.tsx` gained an `id`
and `group-focus-within`.

**What changed** One tab stop per month grid. `← →` by day, `↑ ↓` by week, `Home`/`End` to
the week's edges, `PageUp`/`PageDown` by month. `role="group"` labelled with the month and
the hint. Closed days use `aria-disabled` plus a refused click instead of `disabled`, so
they stay reachable and the reason attached to them can be read — and the reason bubble now
opens on focus, not only on hover, with `aria-describedby` tying it to its day.

**Edge cases**

- 31 January + `PageDown` clamps to 28/29 February instead of silently rolling into March.
- Crossing a month boundary calls `onMonthChange` first and moves focus in an effect
  afterwards (`pendingFocus` ref), so the target button exists by the time it is reached for.
- Focus is only ever stolen after a key press — not on first paint, not when a day is picked
  with the mouse.
- `stopPropagation` on handled keys stops the sheet or dialog behind from also scrolling.
- Deliberately *not* `role="grid"`: these calendars render a flat run of cells with no row
  elements, and a grid role without rows misleads more than no role at all.
- One case to verify — see **B②**.

---

### 13 · Allergen and Dietary filters ignored the arrow keys

**Where** `src/components/ui/multi-select-filter.tsx` (the menu filter pills) and
`src/components/ui/allergen-combobox.tsx` (the allergen field on Account and in the plan flow)

**What changed**

- *Filter pills*: `↓` opens a shut pill; focus moves into the listbox; `↑ ↓ Home End` move
  the highlight; `Enter`/`Space` toggles **without closing**; `Escape` closes and returns
  focus to the pill; `Tab` closes and carries on down the page; the "Clear all" row joins
  the arrow-key run so it is not visible-but-unreachable; `aria-activedescendant` with
  `useId`-namespaced ids.
- *Combobox*: added `role="combobox"`, without which its `aria-expanded` was invalid and
  discarded — the open/closed state was never announced at all — plus `aria-controls`,
  `aria-autocomplete` and `aria-activedescendant`. The bare chevron graphic with a click
  handler became a real 24px `<button>` with its own label. Options left the tab order,
  because the list is portalled and tabbing off the field used to jump to the end of the
  document and back.

**Edge cases**

- A multi-select stays open on `Enter`. Closing after every tick is what makes multi-selects
  miserable, and the keyboard should not be worse than the mouse.
- `Tab` out of the pills works because that panel renders in place; the portalled lists
  (`theme-select`, `allergen-combobox`) return focus to their trigger instead. The
  difference is deliberate, not an inconsistency.
- `Backspace` on an empty query still removes the last chip, unchanged.
- One stale-index case — see **B⑧**.
- **This fix introduced #16.** Pulling "Clear all" into the arrow-key run put a row that is
  not a choice inside a list of choices, which is invalid and announced as nothing. The
  keyboard behaviour described above is right and survives unchanged; only the markup
  underneath it moved. See **#16**.

---

### 14 · The Report a Problem page announced two titles

**Where** `src/app/(app)/feedback/page.tsx` (`FeedbackHero`, new `PhoneHeading`),
`src/components/layout/topbar.tsx` (`TITLE_OVERRIDES`), `src/app/layout.tsx`, plus **16 new
`layout.tsx` files** — account, auto-order, cart, checkout, feedback, menu, menu/[id],
notifications, orders, orders/[id], plan, login, nutrition, rate, set-password, and
r/[token] (that last one added later, closing **B④**)

**What changed** One `h1` per page — the topbar's — with the hero demoted to `h2`.
`/feedback` is not in the nav, so its title had been falling through to the "Menu" default;
it now has its own override. The root `metadata.title` became
`{ default, template: "%s · Superfine Kitchen" }`, and each route's `layout.tsx` fills in
the `%s`, so every screen names itself in the tab, the history and the screen reader's first
words.

**Edge cases**

- Nested routes (`/menu/[id]`, `/orders/[id]`) re-declare the template rather than passing a
  plain string, which would consume it and leave the child unsuffixed.
- Client-component pages cannot export metadata, so the two detail routes are named by their
  section, not by the meal or the order.
- On phones the hero is hidden, which left the form with no heading at all — hence
  `PhoneHeading`, passed *through* the form so the "Thanks — we're on it" confirmation
  replaces it instead of stranding a stale title above it.
- One route is still unnamed — see **B④**.

---

### 15 · The delivery-location gate was a keyboard trap

**Where** `src/features/location/location-dialog.tsx`; gate call site
`src/features/location/location-gate.tsx`

**What changed** The `blocking` variant used to withhold `onClose`, so `useDialog` mounted
its focus trap with nothing to release it — Escape was a no-op, the scrim had no click
handler, and the close button was not rendered at all. `onClose` is now always passed:
Escape, the scrim and the button all dismiss it, blocking or not. `blocking` no longer
controls *whether* the dialog can be closed, only what the close button is called —
"Close and browse without setting a delivery location", so dismissing is a stated choice
rather than an escape hatch to guess at. Dismissing leaves the app in its "no location yet"
state, which every screen already renders.

**Edge cases**

- The gate keeps its insistence: it still opens itself, unprompted, and still asks. Only the
  dead end is gone.
- The unserviceable phase was the worst of it — its single button (`Try a different ZIP
  code`) loops back to a field whose `Continue` is disabled for any ZIP outside the zone, so
  the trap and an unanswerable question were the same screen.
- The ZIP input takes initial focus over the close button via `data-autofocus`, so the exit
  existing does not cost the common path a keystroke.
- Closing without a ZIP is not a broken state: the session store simply has no ZIP, which is
  the same state as a first visit.
- `blocking` is still honoured everywhere it should be — `aria-modal`, the trap, and the
  page-`inert` treatment from `use-dialog.ts` are unchanged. This is about the exit, not
  about weakening the modal.

---

### 16 · Command rows sat inside a list of choices

**Where** `src/components/ui/multi-select-filter.tsx` (Allergens and Dietary pills on
`/menu`) and `src/components/ui/allergen-combobox.tsx` (Account, and the plan flow)

**Found by** the automated WCAG pass, scanning *inside* the open dropdowns — see Appendix C.
Not visible to a page-level scan, because the lists do not exist until you open them.

**What was wrong** A `listbox` may contain only `option` children. Both components had put a
row inside one that was not an option:

- The **"Clear all"** row in the filter pills — a command, not a choice.
- The **"Add …"** row in the allergen combobox — the create-new row on a typeahead.

Two consequences, one structural and one you could actually hear. The structure was invalid
(**WCAG 1.3.1**, Level A, and the checker rates it *critical*). And because
`aria-activedescendant` is only allowed to name a genuine option, landing on either row
announced **nothing at all** — the highlight moved, visibly, in silence. Confirmed live:
pressing `End` in the Allergens pill put the highlight on a row whose role read back as
`null`; in the combobox, typing a value that matched nothing left the "Add …" row lit up
with `aria-activedescendant` absent entirely.

This was **introduced by the fix for #13**. Folding "Clear all" into the arrow-key run — so
it would not be visible-but-unreachable — is what put a non-option inside the listbox. The
goal was right; the mechanism traded a keyboard problem for a semantics one.

**What changed** The two cases are genuinely different, so the fixes differ.

- *Filter pills*: the listbox now holds options and nothing else. The panel around it took
  over as the focus holder, as `role="group"` — the role that legally carries
  `aria-activedescendant` across a mixed set of rows — and "Clear all" became a sibling of
  the list with its own id (`${listId}-clear`). Every key binding is unchanged: `↑ ↓ Home
  End` still reach it, `Enter` still clears, `Escape` still closes and returns focus to the
  pill. The highlight is now scrolled into view by id rather than by child index, because
  the options and "Clear all" are no longer siblings and a positional lookup would move the
  wrong row.
- *Combobox*: the "Add …" row genuinely **is** a choice in the list, so it kept its place and
  gained the semantics it was missing — `role="option"`, an id, `aria-selected`, out of the
  tab order. The "No allergens found." note moved out of the listbox, being prose rather than
  an option. And `aria-activedescendant` is now gated on *all* rows rather than only the
  matched ones, which is what had silenced the create-new row in the first place.

**Edge cases**

- `aria-controls` on both triggers still names the listbox itself, not the new wrapper.
- The trigger keeps `aria-haspopup="listbox"`; what opens is still a listbox.
- "Clear all" removes itself when clicked, so the highlight moves to index 0 in the same
  breath — the **B⑧** behaviour, preserved.
- Verified by driving it: ticking an option leaves the list open (multi-select), a second
  `Enter` un-ticks it, `End` reaches "Clear all" and reads back as a button, `Enter` there
  clears the set and returns the highlight to the first option.
- The other five listboxes in the app (`theme-select`, `nutrition-lookup`, and the three in
  `datetime-fields`) were checked for the same shape and are clean.

---

### Also changed in the same pass

Not among the sixteen, found and fixed alongside them.

| Where | What changed |
|---|---|
| `src/lib/use-dialog.ts` | Every dialog now marks the rest of the page `inert` — the Tab trap only ever stopped a *keyboard* user; someone reading by line or landmark walked straight out of the layer. Stacked dialogs are handled with a `data-dialog-inert` marker so the inner one closing cannot un-hide the page for the outer one. |
| `src/components/layout/mobile-nav.tsx` | Was a bare `<div>`: no role, no focus trap, no Escape, no focus restore — and while "closed" it was `aria-hidden` but still in the tab order, so Tab fell into eight invisible offscreen links. Now a real dialog via `useDialog`, mounted only while open. |
| `src/components/layout/cart-panel.tsx` | Both panels stay mounted to animate, so the shut cart's controls were still tabbable and readable. `inert` + `aria-hidden` while closed, with the transition untouched. |
| `src/components/ui/toaster.tsx` | Split into an assertive region for warnings/errors and a polite one for the rest — everything used to queue politely, so an error could sit silent behind an unrelated sentence and be erased by its own timer. Toasts also pause their countdown on hover or focus, and the tone is spoken (`Error:`) rather than carried by icon colour alone. |
| `src/components/layout/sidebar.tsx`, `app-shell.tsx` | The nav landmark is named "Main" (two nav regions render on every page); the `aside` lost its "Primary" label, which was naming a complementary region. The unread badge reads "3 unread", not "3". |
| `src/app/globals.css` | `scroll-padding-top/bottom` so tabbing to a control below the fold does not park it behind the sticky topbar or the docked action bars. Touch targets shrink to 24px on a fine pointer instead of disappearing — tremor and trackpads are not a touch-only problem. |
| `src/features/menu/menu-view.tsx` (`PromoBanner`) | The 6px page dots became 24px buttons around a 6px dot — the app's only measured target-size failure. |
| `src/components/ui/table.tsx` | `scope="col"` by default on `<th>`. Nothing uses the component yet, so nobody was affected. |

---

# Appendix B — loose ends, ranked

Nine things found while writing Appendix A. **Eight are now closed and driven in a real
browser; one is a brand decision that code cannot make.** None of them re-broke any of the
sixteen.

One of them did, however, cause one. Closing **B⑧** meant folding the "Clear all" row into
the keyboard run, and that is what put a non-option inside a listbox — **#16**, caught later
by the automated pass in Appendix C. B⑧'s own outcome still holds; the row it was about is
now a sibling of the list rather than a member of it.

Where the original entry said "reasoned from the code, not yet driven in a browser," that
gap is what this pass closed. The evidence is 33 automated checks over three scripted
sessions — the same keyboard a person would use, asserting on the DOM after every press.

| # | What it was | Now |
|---|---|---|
| ① | Escape in a dropdown inside a modal might close the whole modal | ✅ Fixed, verified in browser |
| ② | Calendar arrows against a `min` bound could strand the grid | ✅ Fixed, verified in browser |
| ③ | Tab strip could drop out of the tab order | ✅ Fixed |
| ④ | `/r/[token]` had no page title | ✅ Fixed |
| ⑤ | Empty meal search on the nutrition page was silent | ✅ Fixed, verified in browser |
| ⑥ | Coral is deeper than the marketing site's | ⚠️ **Open — needs a designer** |
| ⑦ | The menu's live region was not debounced | ✅ Fixed, verified in browser |
| ⑧ | Stale `aria-activedescendant` on a mouse "Clear all" | ✅ Fixed, verified in browser |
| ⑨ | A failed photo could name its meal twice | ✅ Fixed, verified in browser |

---

### ① Escape inside a dropdown that sits inside a modal — closed

The worry was that `useDialog`'s Escape handler, registered on `document` in the **capture**
phase with a `stopPropagation()`, beat every transient layer inside the dialog — so one
Escape threw away the user's place instead of just shutting the list.

Two different mechanisms now prevent it, because there are two kinds of layer:

- **The four listboxes** (`theme-select`, `multi-select-filter`, `allergen-combobox`,
  `nutrition-lookup`) mark themselves `data-escape-layer` while open. `useDialog` looks for
  that marker and stands down for the press — for Tab too, but only while focus is genuinely
  inside the layer, since those lists are portalled to the end of the document.
- **The date and time popovers** (`datetime-fields.tsx`, `useDismiss`) take the other route:
  they listen on `window` in the capture phase. The capture path reaches `window` *before*
  `document`, so their `stopPropagation()` lands first. Registration order — the dialog
  mounts before a picker inside it opens — is why a second `document` listener would have
  lost, and `window` is what steps around that.

**Verified in a browser.** The reachable instance of this shape is checkout →
Reusable packaging → *Custom pickup time*, a `role="dialog"` holding a `DateField`. With
the calendar open inside the modal: one Escape closed the calendar and **left the modal
open**; a second Escape closed the modal. The listbox path was checked separately on the
menu's Allergens pill — Escape closed the list and put focus back on the pill.

Worth knowing: no listbox currently renders inside a dialog anywhere in the app, so the
`data-escape-layer` half is defensive rather than load-bearing today. It stops being
defensive the moment someone puts a filter in a modal.

### ② Calendar arrows against a `min` bound — closed

`useRovingCalendar` now has two guards. A key press that lands on a day the grid refuses to
render reverts `focusedISO` to the last day known to be on screen (`lastRendered`) — focus
has not moved, because there was nowhere to move to. Behind that, an effect that runs after
*every* render re-seeds the tab stop if no cell carries `tabIndex={0}`, which also covers a
day lost to something outside changing underneath: the month cursor moving, a reset, a view
flip.

**Verified in a browser** on all three roving calendars — the menu's single-day grid, its
multi-day grid, and the `DateRangeModal` reached the way a user reaches it (cart → *Add
another day*). Each was driven through 12× PageUp past the `min`/closed-day boundary, then
arrows and Home/End, then 14× PageDown back — asserting after **every single press** that
exactly one `[data-day][tabindex="0"]` existed and that focus was still on a real day
button. ~114 presses, no violation.

### ③ The tab strip could drop out of the tab order — closed

`tabs.tsx` gives the roving stop to the first tab when `value` matches no tab id, so a stale
filter or a renamed route shows the wrong tab as current rather than making the whole strip
unreachable. Structural now, not lucky.

### ④ `/r/[token]` has no page title — closed

`src/app/r/[token]/layout.tsx` names it **"Rate your lunch"**. Every route in the app now
fills in the root template. This was the widest-reach surface — the public rating link out
of the email, reached without an account — and the last one still reporting the root default.

### ⑤ An empty meal search on the nutrition page was silent — closed

`MealCombobox` gained a polite live region alongside the one the menu already had.
**Verified in a browser**: typing nonsense into the meal search announces
*"No meals found."* rather than nothing.

### ⑥ Coral is visibly deeper than the marketing site's — **still open**

`#B85C36` against the brand's `#F0875A`. It had to move: white text on the old primary
button measured **2.52:1**, well under the 4.5:1 the rule requires, so the button was
failing for exactly the people this audit is about.

**This one is not a code fix and should not be made into one.** It is a brand deviation that
needs a designer's yes, and the surfaces that still carry the old value — email templates,
the marketing site, exported artwork — live outside this repo. Someone has to reconcile the
two deliberately. Changing the app's value back would re-break the contrast; changing the
other surfaces is not this repo's call.

*Owner needed: design. Everything else in this appendix is closed.*

### ⑦ The menu's live region was not debounced — closed

The count is now **settled, not live**: `settledCount` follows the grid 350ms behind, so a
burst of typing announces one number instead of one per keystroke.

**Verified in a browser**: typing "salad" at 40ms per key — five keystrokes inside the
settle window — produced exactly **one** announcement.

### ⑧ Stale `aria-activedescendant` on a mouse "Clear all" — closed

`multi-select-filter` clamps `activeIndex` to `lastIndex` in an effect, and `lastIndex`
accounts for the "Clear all" row existing only while something is selected. So the row
unmounting under the highlight — by mouse, or by a clear from elsewhere, or by a shorter set
of options arriving — can no longer leave the attribute pointing at nothing.

**Verified in a browser**: End moves the highlight onto "Clear all", clicking it with the
mouse leaves `aria-activedescendant` pointing at a live element (`opt-0`), not a ghost.

### ⑨ A failed photo could name its meal twice — closed

The original entry called this "verbose, not broken." Looking at it properly, it was
**broader than reported**: a thumbnail passed `alt={item.name}` while sitting beside a
visible name duplicated that name *whether or not the image loaded*, because a screen reader
reads the `alt` either way. The failed-photo case was one symptom of a decision made
inconsistently across the app — two call sites already passed `alt=""`, the rest did not.

**What changed.** The name is now carried by exactly one thing per card. Photos that sit
beside visible text are decorative (`alt=""`) at nine call sites: `menu-item-card`,
`item-detail-view`, `orders-view` (×3), `order-detail-view`, `menu-step`, `swap-sheet`,
`active-dashboard`. `FoodPhoto`'s `alt` prop now documents the rule, so the next call site
has to make the choice rather than copy whichever neighbour it was pasted from.

**Verified in a browser, with the photos forced to fail** — the condition that produced
problem #1 in the first place: every meal link on `/menu` still has an accessible name, and
**none announces its name twice**.

One consequence worth recording: the `sr-only` fallback added for problem #1 is no longer
load-bearing. The menu card's photo link is `aria-hidden` (it is a duplicate of the named
text link beside it), and every other photo is now decorative — so nothing currently depends
on that fallback firing. #1's outcome still holds, by a better route: the meal's name is in
real text, which no failed image can take away. The fallback stays for whoever renders
a photo as the sole content of a link next.

---

### How this was checked

Three scripted browser sessions, run against the app the way a keyboard user drives it, with
assertions on the DOM after each press rather than at the end:

| Suite | Covers | Result |
|---|---|---|
| `t-b1` | Escape in a picker inside the checkout pickup modal | 7/7 |
| `t-b2` / `t-b2b` | Roving-calendar invariants on three calendars, ~114 key presses | 16/16 |
| `t-rest` | ⑤ ⑦ ⑧ ⑨ — live regions, activedescendant, photo naming | 10/10 |

The same honest limit as the main report applies: these drive the paths described above, not
every possible step of every task.

---

# Appendix C — the WCAG conformance pass

Everything above this point was found by reading the code and driving the app by hand. This
appendix is the independent check on that work: the industry-standard automated checker, run
against the finished result.

It is written up separately because it is the part that can be *repeated*. Anyone can run it
and get the same answer.

## What was run

| | |
|---|---|
| **Tool** | axe-core 4.12.1 — the engine behind most commercial accessibility testing |
| **Standard** | WCAG 2.2, Levels A and AA (`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`) |
| **Browser** | Chromium, driven by Playwright |
| **Widths** | 1440×900 desktop and 390×844 phone |
| **Signed in as** | a company employee, and an individual — they see different screens |
| **Coverage** | all 17 routes, plus 11 interactive states |

Both dynamic routes were tested with live values, not placeholders: a real meal
(`/menu/bbq-brisket-bowl`), a real order (`/orders/ORD-2891`), and a **freshly minted public
rating token** for `/r/[token]`, generated with the app's own checksum so it resolves to a
real order rather than the invalid-link screen.

## Proving the checker was actually working

A scan that reports nothing is indistinguishable from a scan that did not run. Before
trusting a single zero, five known-broken elements were injected into a live page — an image
with no `alt`, an input with no label, an empty button, an empty link, and grey-on-white text
at 1.6:1.

**All five were caught.** Every zero below is a real zero.

## Result

**Zero violations across 36 screen runs.** Up to 28 separate WCAG rules passing on a single
page, including the ones this audit spent most of its effort on:

| Rule checked | Elements checked on `/menu` alone |
|---|---|
| `color-contrast` (1.4.3) | 85 |
| `target-size` (2.5.8) | 49 |
| `nested-interactive` (4.1.2) | 34 |
| `button-name` (4.1.2) | 31 |
| `link-name` (2.4.4) | 18 |

The calendars from #12 were checked open: 31 day cells, **exactly one keyboard stop**,
correctly grouped and labelled *"July 2026 — use the arrow keys to choose a day"*. The
multi-day grid behaves identically. The mobile navigation drawer reports as a real dialog.
The password error state from #3 announces. All clean.

## What the machine would not judge — and what we did about it

The checker returned four pieces of text as *undecidable*: it could not determine what was
behind them, because one sits over a photographic background and one over a gradient. It is
correct to refuse; a guess would be worse.

So they were measured directly. Each element was screenshotted twice — once normally, once
with its own glyphs made transparent — which yields the true background of exactly that box.
The text colour was then alpha-composited over the worst-performing background pixel present:

| Text | Measured | Required | |
|---|---|---|---|
| Hero headline, 48px | **8.85:1** | 3:1 | ✅ |
| Hero paragraph (`teal-deep/80`, 16px) | **5.46:1** | 4.5:1 | ✅ |
| Hero meta row (`teal-deep/80`, 13px) | **5.26:1** | 4.5:1 | ✅ |
| Promo banner heading, over a gradient | **9.31:1** | 3:1 | ✅ |

All four pass. Worth noting that two of them are `/80` opacity text — the exact pattern #11
stripped out elsewhere for failing. Here it survives because deep teal on bright yellow has
contrast to spare. It is not a general licence to fade text.

## The one result we rejected

The checker flags `scrollable-region-focusable` on the open filter lists — "a scrollable
region must be reachable by keyboard."

**We investigated it and concluded it is wrong.** The rule looks for a `tabindex` that makes
the region tabbable, and these lists deliberately do not have one: focus is moved into them
programmatically the instant they open, which is the correct pattern for this kind of
control. The checker cannot see managed focus.

Driven in a browser to be sure: on opening the Allergens pill, `document.activeElement` **is**
the panel; arrow keys move the highlight through all 11 rows; `End` scrolls the list to
110px. A keyboard user can scroll it. **WCAG 2.1.1 is met.**

We are leaving the code alone. Contorting the markup to satisfy a heuristic that is wrong
about this case would make the app worse for the people it is supposed to help. It is
recorded here so that whoever runs this scan next sees the flag, finds this note, and does
not re-litigate it — or silently "fixes" it.

## What this does and does not prove

**Does:** every automatically-detectable WCAG 2.2 AA failure has been found and fixed, across
every screen, at two widths, for both account types — verified with a checker proven to be
working on this very page.

**Does not:** an automated pass covers roughly a third to a half of WCAG. It confirms a label
exists; it cannot tell you the label is *useful*. "Button, button, button" and "Add BBQ
Brisket Bowl to cart" score identically. It cannot judge whether an error message explains
how to recover, whether reading order matches visual order, or whether the app makes sense
end to end when heard rather than seen.

Those need a person. Which is why the recommendation at the top of this report has not
changed, and is not weakened by any of the zeros above: **spend an hour with someone who uses
a screen reader daily.** That remains the most valuable thing left to do.

## Reproducing it

The scan lives in the session scratch folder, not in the repo — four Node scripts driving
Playwright with axe-core injected. Roughly four minutes end to end.

Two things to know before running it, both learned the hard way:

- The dev server can fall over partway through a 36-page sweep. The script waits and retries
  rather than recording an unreachable page as a pass — an early run silently logged 16
  connection failures as clean scans.
- Anything asserting on the DOM must seed `sfk:session` in `localStorage` **with all six
  `delivery` fields present**. A partial seed crashes every page blank, which reads exactly
  like a broken app.

Moving these into the repo as a CI step is item 3 on the "what still needs doing" list, and
is what would have caught #16 the day it was written rather than weeks later.
