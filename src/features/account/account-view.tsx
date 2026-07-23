"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  X,
  Wallet,
  CalendarClock,
  MapPin,
  ShieldCheck,
  Utensils,
  Sprout,
  Leaf,
  Salad,
  WheatOff,
  NutOff,
  MilkOff,
  Pencil,
  Plus,
  Trash2,
  CalendarOff,
  KeyRound,
  Bell,
  ChevronRight,
  ArrowLeft,
  Phone,
  Mail,
  CreditCard,
  type LucideIcon,
  LogOut,
} from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { AllergenCombobox } from "@/components/ui/allergen-combobox";
import { DateMultiModal } from "@/components/ui/date-multi-modal";
import { Input, Textarea, Label } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { StatCard } from "@/components/ui/stat-card";
import { useProfileStore } from "@/store/use-profile-store";
import {
  useSessionStore,
  isSubsidized,
  type DeliveryDetails,
} from "@/store/use-session-store";
import { confirm } from "@/store/use-confirm-store";
import { useSignOut } from "@/features/auth/use-sign-out";
import {
  useAddressesStore,
  type SavedAddress,
  type AddressInput,
} from "@/store/use-addresses-store";
import { useDefaultAddressStore } from "@/store/use-default-address-store";
import { useCardsStore, type SavedCard } from "@/store/use-cards-store";
import { CardFormDialog, SavedCardRow, SecurityNote } from "@/components/payment/card-fields";
import { brandLabel } from "@/lib/card";
import { dietaryPreferences, allergenOptions } from "@/data/menu";
import { program, addresses } from "@/data/program";
import { me } from "@/data/me";
import { toast } from "@/store/use-toast-store";
import { useOOOStore } from "@/store/use-ooo-store";
import { useDialog } from "@/lib/use-dialog";
import { useRoving } from "@/lib/roving";
import { formatCurrency, cn } from "@/lib/utils";

const dietaryIcons: Record<string, LucideIcon> = {
  Vegan: Sprout,
  Vegetarian: Leaf,
  Halal: Salad,
  "Gluten-Free": WheatOff,
  "Nut-Free": NutOff,
  "Dairy-Free": MilkOff,
};

type SectionId =
  | "dietary"
  | "program"
  | "permissions"
  | "addresses"
  | "payment"
  | "password"
  | "notifications"
  | "delete";

/** Group order for the phone list; sections render under these in this order.
 *  "Personal" rather than "Delivery": the group holds the two things that are
 *  the person's own rather than the contract's — where their food goes and what
 *  pays for it — and a heading naming only one of them leaves the wallet filed
 *  under a label it has nothing to do with. */
const sectionGroups = ["Preferences", "Company", "Personal", "Security"] as const;

export function AccountView() {
  // Shared with the menu, which seeds its filters from these — so a preference
  // saved here shows up pre-applied the next time the menu is opened.
  const dietary = useProfileStore((s) => s.dietary);
  const allergens = useProfileStore((s) => s.allergens);
  const setDietary = useProfileStore((s) => s.setDietary);
  const setAllergens = useProfileStore((s) => s.setAllergens);
  const [prefs, setPrefs] = React.useState(me.notifications);
  // Which company site the employee treats as their default. The addresses
  // themselves are contract-locked, but the default among them is theirs to set.
  const defaultAddressId = useDefaultAddressStore((s) => s.defaultId);
  const setDefaultAddress = useDefaultAddressStore((s) => s.setDefault);
  // An individual has no company program, no allowance and no company-set
  // addresses — those whole cards are corporate furniture and are omitted rather
  // than shown empty.
  const account = useSessionStore((s) => s.account);
  const corporate = isSubsidized(account);
  const delivery = useSessionStore((s) => s.delivery);
  const setAccountName = useSessionStore((s) => s.setAccountName);
  const setAccountPhone = useSessionStore((s) => s.setAccountPhone);
  const name = account?.name ?? me.name;
  const email = account?.email ?? me.email;
  const phone = account?.phone ?? me.phone;

  /**
   * One edit mode for the whole identity card, opened by the Edit button in its
   * corner. Name and phone were two separately-pencilled fields, which put two
   * near-invisible icons on one card and made changing both a two-step ritual —
   * open one, save it, find the other. Now they open together and save together.
   * Guests have no account to edit, so the button is hidden for them.
   */
  const [editingProfile, setEditingProfile] = React.useState(false);
  const [nameDraft, setNameDraft] = React.useState("");
  const [phoneDraft, setPhoneDraft] = React.useState("");

  function startEditProfile() {
    setNameDraft(name);
    setPhoneDraft(phone);
    setEditingProfile(true);
  }
  function saveProfile() {
    const nextName = nameDraft.trim();
    if (!nextName) return;
    setAccountName(nextName);
    setAccountPhone(phoneDraft.trim());
    setEditingProfile(false);
    toast.success("Profile updated", "Your details have been saved.");
  }

  function toggleDiet(d: string) {
    setDietary(dietary.includes(d) ? dietary.filter((x) => x !== d) : [...dietary, d]);
  }
  function setPref<K extends keyof typeof prefs>(k: K, v: (typeof prefs)[K]) {
    setPrefs((p) => ({ ...p, [k]: v }));
  }

  // One selection model for both widths: `null` is "general information" (the
  // identity card + program tiles), a section id is that section on its own.
  // The phone reaches it through a settings list and a back link, the desktop
  // through the rail — but only ever one panel is on screen either way.
  const [openSection, setOpenSection] = React.useState<SectionId | null>(null);

  // Sign out is the one settings entry that isn't a section — it does its thing
  // and leaves, so it sits below the groups rather than inside `rows`, which is
  // keyed by `SectionId` and drives which panel is on screen.
  const handleSignOut = useSignOut();

  const rows: { id: SectionId; group: string; label: string; icon: LucideIcon }[] = [
    { id: "dietary", group: "Preferences", label: "Dietary preferences", icon: Leaf },
    { id: "notifications", group: "Preferences", label: "Notifications", icon: Bell },
    ...(corporate
      ? ([
          { id: "program", group: "Company", label: "Meal program", icon: Wallet },
          { id: "permissions", group: "Company", label: "Permissions", icon: ShieldCheck },
        ] as const)
      : []),
    { id: "addresses", group: "Personal", label: "Delivery addresses", icon: MapPin },
    { id: "payment", group: "Personal", label: "Payment method", icon: CreditCard },
    { id: "password", group: "Security", label: "Change password", icon: KeyRound },
    { id: "delete", group: "Security", label: "Delete account", icon: Trash2 },
  ];
  const openRow = rows.find((r) => r.id === openSection);

  /**
   * Arrow keys down the settings rails and across the dietary chips.
   *
   * The two rails keep every one of their own Tab stops (`rove: false`). They
   * are marked up as navigation, and a keyboard user who has learned to Tab to
   * "Payment method" should not find that press has been taken away from them
   * — the arrows are an addition here, not a replacement. The chips are the
   * other case: one question, one answer, so one stop.
   */
  const desktopRailRoving = useRoving({ orientation: "vertical", rove: false });
  const phoneRailRoving = useRoving({ orientation: "vertical", rove: false });
  const dietRoving = useRoving();
  // Desktop always has a section on show — there's no list screen to fall back
  // to — so an unset selection resolves to the first one. The phone keeps `null`
  // meaning "the settings list".
  const desktopSection = openSection ?? rows[0].id;

  return (
    <div className="space-y-6">
      {/* Phone back link out of a section. Mirrors the inline ArrowLeft
          drill-down used by the item and order detail screens. */}
      {openRow ? (
        <button
          type="button"
          onClick={() => setOpenSection(null)}
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary hover:underline lg:hidden"
        >
          <ArrowLeft className="size-4" /> Account
        </button>
      ) : null}

      {/* Identity + program tiles head the page at both widths. On the phone
          they're the top of the settings list, so a drill-down hides them. */}
      <div className={cn("space-y-5", openSection ? "hidden lg:block" : null)}>
      {/* Profile header — identity up top, then contact details grouped into a
          labelled list so email and phone read at a glance and phone edits in
          place. Job role is intentionally not shown: it's not a setting anyone
          acts on here. */}
      <Card>
        <CardBody className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <Avatar name={name} className="size-14 shrink-0 bg-yellow text-lg text-teal-deep" />
            {/* A floor under the name column so it never squeezes to one word
                per line — but a smaller one on phones, where a 13rem basis
                pushed the Edit button onto its own row under the avatar
                instead of leaving it in the corner where it belongs. */}
            <div className="min-w-0 flex-1 basis-32 sm:basis-52">
              {editingProfile ? (
                <Input
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveProfile();
                    if (e.key === "Escape") setEditingProfile(false);
                  }}
                  aria-label="Your name"
                  // The one identity field in the app that never told the
                  // browser what it holds, so it alone couldn't be autofilled.
                  autoComplete="name"
                  autoFocus
                  className="h-9 max-w-[16rem]"
                />
              ) : (
                <h2 className="font-display text-xl font-semibold tracking-tight">{name}</h2>
              )}
              <p className="mt-0.5 text-[13px] text-muted-foreground">
                {corporate ? account?.company ?? me.company : "Individual account"}
              </p>
            </div>
            {/* The card's corner: out-of-office (corporate only — it pauses
                company auto-orders) and the one Edit button that opens both
                editable fields at once. */}
            <div className="ml-auto flex flex-wrap items-center gap-2">
              {corporate ? <OOOHeaderButton /> : null}
              {account ? (
                editingProfile ? (
                  <>
                    <Button size="sm" variant="ghost" onClick={() => setEditingProfile(false)}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={saveProfile} disabled={!nameDraft.trim()}>
                      Save
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" size="sm" onClick={startEditProfile}>
                    <Pencil className="size-4" /> Edit
                  </Button>
                )
              ) : null}
            </div>
          </div>

          {/* Contact details, side by side rather than stacked: two short facts
              that belong to the same person read as a pair, and stacking them
              spent a full row each on a card that is mostly whitespace. They
              fall back to stacked on phones, where two columns would break the
              email across three lines. */}
          <div className="grid divide-y divide-border overflow-hidden rounded-xl border border-border sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            <ContactRow icon={Mail} label="Email" hint="Used to sign in">
              <span className="break-all">{email}</span>
            </ContactRow>
            <ContactRow icon={Phone} label="Phone">
              {editingProfile ? (
                <Input
                  value={phoneDraft}
                  onChange={(e) => setPhoneDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveProfile();
                    if (e.key === "Escape") setEditingProfile(false);
                  }}
                  aria-label="Phone number"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  className="h-9 max-w-[14rem]"
                />
              ) : phone ? (
                phone
              ) : (
                <span className="text-muted-foreground">Not set</span>
              )}
            </ContactRow>
          </div>
        </CardBody>
      </Card>

      {/* Program snapshot — the allowance and meals-per-day tiles are corporate
          program details; individuals just see the cutoff times that apply to
          everyone. */}
      <div
        className={cn(
          // Two-up on phones too (was stacked): pairs the subsidy + meals tiles
          // on one row and the two cutoff tiles on the next. Tablet/desktop
          // unchanged.
          "grid grid-cols-2 gap-3 sm:grid-cols-2",
          corporate ? "lg:grid-cols-4" : "lg:grid-cols-2",
        )}
      >
        {corporate ? (
          <>
            <StatCard
              label="Company pays / day"
              value={formatCurrency(program.subsidyPerDay)}
              sub="Resets every service day"
              icon={<Wallet className="size-4" />}
              tone="teal"
            />
            <StatCard
              label="Meals / day"
              value={program.mealsPerDay}
              sub={program.serviceDays}
              icon={<Utensils className="size-4" />}
            />
          </>
        ) : null}
        <StatCard
          label="Individual cutoff"
          value={program.individualSoftCutoff.split(" ").slice(0, 2).join(" ")}
          sub="Day before delivery"
          icon={<CalendarClock className="size-4" />}
        />
        <StatCard
          label="Family-style cutoff"
          value={program.familyCutoff.split(" ").slice(0, 2).join(" ")}
          sub="Before delivery"
          icon={<CalendarClock className="size-4" />}
        />
      </div>
      </div>

      {/* Desktop: rail and section share one card, split by the rail's right
          border, so the page reads as a single settings panel. On the phone
          this wrapper is inert — the list and the section are separate cards
          there, because they're separate screens. */}
      <div className="lg:grid lg:grid-cols-[15.5rem_minmax(0,1fr)] lg:overflow-hidden lg:rounded-2xl lg:border lg:border-border lg:bg-card lg:shadow-card">
      {/* pt-5 rather than a flat p-3: the section header alongside is py-4 with
          a taller line box, so its title lands ~20px down. Matching that keeps
          the rail's first overline on the same optical line. */}
      <nav
        aria-label="Account sections"
        className="hidden px-3 pb-3 pt-5 lg:block lg:border-r lg:border-border"
        {...desktopRailRoving.props}
      >
        {sectionGroups.map((group, i) => {
          const inGroup = rows.filter((r) => r.group === group);
          if (!inGroup.length) return null;
          return (
            <div key={group} className={i > 0 ? "mt-4" : undefined}>
              <h2 className="text-overline mb-1 px-3">{group}</h2>
              {inGroup.map((r) => (
                <RailItem
                  key={r.id}
                  active={desktopSection === r.id}
                  onClick={() => setOpenSection(r.id)}
                  icon={r.icon}
                  label={r.label}
                />
              ))}
            </div>
          );
        })}
        {/* Same slot on both widths: last thing in the list, under its own
            heading, so it never reads as one more panel to open. */}
        <div className="mt-4">
          <h2 className="text-overline mb-1 px-3">Session</h2>
          <RailItem active={false} onClick={handleSignOut} icon={LogOut} label="Sign out" />
        </div>
      </nav>

      <div className="min-w-0 space-y-5">
      {/* The phone's counterpart to the rail. */}
      {openSection ? null : (
        <nav aria-label="Account settings" className="space-y-5 lg:hidden" {...phoneRailRoving.props}>
          {sectionGroups.map((group) => {
            const inGroup = rows.filter((r) => r.group === group);
            if (!inGroup.length) return null;
            return (
              <div key={group}>
                <h2 className="text-overline mb-2 px-1">{group}</h2>
                <Card className="overflow-hidden">
                  <div className="divide-y divide-border">
                    {inGroup.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setOpenSection(r.id)}
                        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted active:bg-muted"
                      >
                        <r.icon className="size-4 shrink-0 text-primary" />
                        <span className="min-w-0 flex-1 text-[13px] font-semibold">{r.label}</span>
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                </Card>
              </div>
            );
          })}
          <div>
            <h2 className="text-overline mb-2 px-1">Session</h2>
            <Card className="overflow-hidden">
              <button
                type="button"
                onClick={handleSignOut}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted active:bg-muted"
              >
                <LogOut className="size-4 shrink-0 text-primary" />
                <span className="min-w-0 flex-1 text-[13px] font-semibold">Sign out</span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </button>
            </Card>
          </div>
        </nav>
      )}

      {/* Dietary & allergens (editable) */}
      <SectionPanel open={openSection === "dietary"} desktopOpen={desktopSection === "dietary"}>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dietary preferences</CardTitle>
          <span className="text-2xs text-muted-foreground">Used to tag &amp; filter your menu</span>
        </CardHeader>
        {/* Two sections, not two stacked blocks. They answer opposite questions
            — what to show me, what to keep away from me — and read as one long
            list when they share a surface, which is how an allergen ends up
            skimmed past. Each gets its own bordered panel and heading. */}
        <CardBody className="space-y-4">
          <section
            aria-labelledby="dietary-tags-heading"
            className="rounded-xl border border-border bg-muted/30 p-4"
          >
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <div>
                <h3 id="dietary-tags-heading" className="text-sm font-semibold text-foreground">
                  Dietary tags
                </h3>
                <p className="mt-0.5 text-2xs text-muted-foreground">
                  Highlights meals that match how you eat.
                </p>
              </div>
              <span className="shrink-0 text-2xs font-medium text-muted-foreground">
                {dietary.length ? `${dietary.length} selected` : "None selected"}
              </span>
            </div>
            <div
              className="flex flex-wrap gap-2"
              role="toolbar"
              aria-label="Dietary tags"
              {...dietRoving.props}
            >
              {dietaryPreferences.map((d) => {
                const on = dietary.includes(d);
                const Icon = dietaryIcons[d] ?? Leaf;
                return (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleDiet(d)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-colors",
                      on
                        ? "border-primary bg-teal-wash text-teal-deep"
                        : "border-control bg-card text-muted-foreground hover:border-primary hover:text-foreground",
                    )}
                  >
                    <Icon className={cn("size-3.5 shrink-0", on ? "text-primary" : "text-muted-foreground")} />
                    {d}
                    {on ? <Check className="size-3.5 shrink-0 text-primary" /> : null}
                  </button>
                );
              })}
            </div>
          </section>

          <section
            aria-labelledby="allergens-heading"
            className="rounded-xl border border-border bg-muted/30 p-4"
          >
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <div>
                <h3 id="allergens-heading" className="text-sm font-semibold text-foreground">
                  Allergens to avoid
                </h3>
                <p className="mt-0.5 text-2xs text-muted-foreground">
                  Hides meals containing these, everywhere on your menu.
                </p>
              </div>
              <span className="shrink-0 text-2xs font-medium text-muted-foreground">
                {allergens.length ? `${allergens.length} selected` : "None selected"}
              </span>
            </div>
            <AllergenCombobox
              value={allergens}
              onValueChange={setAllergens}
              options={[...allergenOptions]}
              placeholder="Search allergens (e.g. Shellfish)"
              aria-label="Search and add allergens to avoid"
              separateChips
            />
          </section>
        </CardBody>
      </Card>
      </SectionPanel>

      {/* Meal program policy (read-only). Corporate contract terms only — an
          individual isn't on a company program, so this whole card is omitted
          for them (their cutoff info lives in the tiles above). */}
      <SectionPanel open={openSection === "program"} desktopOpen={desktopSection === "program"}>
      {corporate ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your company meal program</CardTitle>
            <Badge tone="neutral">Read-only</Badge>
          </CardHeader>
          <CardBody className="space-y-0">
            <PolicyRow label="Company" value={account?.company ?? program.company} />
            <PolicyRow label="Subsidy model" value={program.subsidyModel} />
            <PolicyRow label="Service days" value={program.serviceDays} />
            <PolicyRow label="Individual order cutoff" value={program.individualSoftCutoff} />
            <PolicyRow label="Family-style cutoff" value={program.familyCutoff} />
            <PolicyRow label="Hard cutoff" value={program.individualHardCutoff} />
            <PolicyRow label="Change / cancel window" value={program.changeWindow} />
            <PolicyRow label="Delivery windows" value={program.deliveryWindows.join(" · ")} />
          </CardBody>
        </Card>
      ) : null}
      </SectionPanel>

      {/* Permissions (read-only) — SFK grants these against a company, so the
          card is corporate-only. */}
      <SectionPanel open={openSection === "permissions"} desktopOpen={desktopSection === "permissions"}>
      {corporate ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your permissions</CardTitle>
            <span className="flex items-center gap-1 text-2xs text-muted-foreground">
              <ShieldCheck className="size-3.5" /> Granted by SFK
            </span>
          </CardHeader>
          <CardBody className="space-y-0">
            <PermissionRow label="Invoice to company" on={me.permissions.payLater} />
            <PermissionRow label="Flexible delivery window" on={me.permissions.flexibleDelivery} />
          </CardBody>
        </Card>
      ) : null}
      </SectionPanel>

      {/* Delivery addresses. A corporate employee sees the contract-locked
          company sites (view-only); an individual owns an address book they can
          add to, edit, and set a default in. */}
      <SectionPanel open={openSection === "addresses"} desktopOpen={desktopSection === "addresses"}>
      {corporate ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Delivery addresses</CardTitle>
            <Badge tone="neutral">Company-set</Badge>
          </CardHeader>
          <CardBody className="space-y-3">
            <p className="text-2xs text-muted-foreground">
              Your company sets these sites. Pick the one you want as your default.
            </p>
            <div className="divide-y divide-border [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">
              {addresses.map((a) => {
                const isDefault = a.id === defaultAddressId;
                return (
                  <div key={a.id} className="flex items-start gap-3 py-3">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1 text-[13px]">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{a.name}</span>
                        {isDefault ? <Badge tone="success">Default</Badge> : null}
                      </div>
                      <div className="text-muted-foreground">{a.address}</div>
                      {!isDefault ? (
                        <button
                          type="button"
                          onClick={() => {
                            setDefaultAddress(a.id);
                            toast.success("Default updated", `${a.name} is now your default site.`);
                          }}
                          className="-ml-2 mt-2 rounded-lg px-2 py-1.5 text-[13px] font-semibold text-primary hover:bg-teal-wash"
                        >
                          Set as default
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>
      ) : (
        <IndividualAddressBook seed={delivery} />
      )}
      </SectionPanel>

      {/* Payment method — the same card checkout charges, kept here so it can be
          replaced or dropped between orders rather than only while one is being
          placed. */}
      <SectionPanel open={openSection === "payment"} desktopOpen={desktopSection === "payment"}>
        <PaymentMethodsCard corporate={corporate} />
      </SectionPanel>

      {/* Password — change the sign-in password (both account types). */}
      <SectionPanel open={openSection === "password"} desktopOpen={desktopSection === "password"}>
        <ChangePasswordCard onDone={() => setOpenSection(null)} />
      </SectionPanel>

      {/* Notification preferences */}
      <SectionPanel open={openSection === "notifications"} desktopOpen={desktopSection === "notifications"}>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notification preferences</CardTitle>
        </CardHeader>
        <CardBody className="divide-y divide-border [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">
          <PrefRow
            label="Order confirmations"
            desc="When an order is placed or confirmed"
            on={prefs.orderConfirmation}
            onChange={(v) => setPref("orderConfirmation", v)}
          />
          <PrefRow
            label="Daily reminder"
            desc="A nudge to order before the daily cutoff"
            on={prefs.dailyReminder}
            onChange={(v) => setPref("dailyReminder", v)}
          />
          <PrefRow
            label="Arrival alert"
            desc="A heads-up the day before delivery"
            on={prefs.arrivalAlert}
            onChange={(v) => setPref("arrivalAlert", v)}
          />
          <PrefRow
            label="Weekly specials"
            desc="New and seasonal menu items"
            on={prefs.weeklySpecials}
            onChange={(v) => setPref("weeklySpecials", v)}
          />
        </CardBody>
      </Card>
      </SectionPanel>

      {/* Delete account — the last, most destructive action on the page. */}
      <SectionPanel open={openSection === "delete"} desktopOpen={desktopSection === "delete"}>
        <DeleteAccountCard />
      </SectionPanel>
      </div>
      </div>
    </div>
  );
}

/** One account section. The two widths select independently: the phone shows a
 *  section only after it's tapped (nothing selected means the settings list),
 *  while the desktop always has one open. Children stay mounted either way —
 *  hiding is CSS, so a half-filled address form survives a trip to another
 *  section and back. */
function SectionPanel({
  open,
  desktopOpen,
  children,
}: {
  open: boolean;
  desktopOpen: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        open ? "block" : "hidden",
        desktopOpen ? "lg:block" : "lg:hidden",
        // On desktop the section sits *inside* the shared settings card, so its
        // own card chrome would draw a box in a box. Each section's root is a
        // <Card>, so strip the border/radius/shadow off that direct child —
        // `lg:` utilities are emitted after the base ones, so these win.
        "lg:[&>*]:rounded-none lg:[&>*]:border-0 lg:[&>*]:shadow-none",
        // The parent's `space-y-5` still counts the `lg:hidden` mobile nav as a
        // preceding sibling (its selector keys off the `hidden` *attribute*, not
        // `display:none`), so it hands this a phantom 20px top margin on desktop
        // that the rail alongside doesn't get. Drop it so both start flush.
        // `!` because space-y's `> :not([hidden]) ~ :not([hidden])` outranks a
        // plain utility on specificity.
        "lg:!mt-0",
      )}
    >
      {children}
    </div>
  );
}

/** A row in the desktop section rail. */
function RailItem({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold transition-colors",
        active
          ? "bg-teal-wash text-teal-deep"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon
        className={cn("size-4 shrink-0", active ? "text-primary" : "text-muted-foreground")}
      />
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </button>
  );
}

/** Compact "Set out of office" button for the profile header — reuses the OOO
 *  store + date picker so it stays in sync with the Availability section. */
function OOOHeaderButton() {
  const { active, dates, set } = useOOOStore();
  const [picker, setPicker] = React.useState(false);

  return (
    <>
      {/* When away, the day count rides inside the button as a filled pill —
          replacing the separate status line + date chips that used to sit
          under it. One control carries both the action and the state. */}
      <Button variant="outline" size="sm" onClick={() => setPicker(true)}>
        <CalendarOff className="size-4" /> {active ? "Edit out of office" : "Set out of office"}
        {active ? (
          <span className="-mr-1 ml-0.5 rounded-full bg-danger px-2 py-0.5 text-2xs font-semibold text-white">
            {dates.length} day{dates.length > 1 ? "s" : ""}
          </span>
        ) : null}
      </Button>
      {picker ? (
        <DateMultiModal
          title="Out of office"
          subtitle="Tap the days you'll be away."
          initialDates={dates}
          allowClear={active}
          emptyApplyLabel="Clear out of office"
          onClose={() => setPicker(false)}
          onApply={(picked) => {
            setPicker(false);
            set(picked);
            toast.success(
              picked.length ? "Out of office set" : "Out of office cleared",
              picked.length
                ? `Auto-orders paused for ${picked.length} day${picked.length > 1 ? "s" : ""}.`
                : "You're marked as in office again.",
            );
          }}
        />
      ) : null}
    </>
  );
}


/** One-line "123 Main St, Apt 2, San Francisco 94105" from a saved address. */
function formatAddress(a: SavedAddress | AddressInput) {
  const line1 = [a.street, a.apt].filter(Boolean).join(", ");
  const line2 = [a.city, a.zip].filter(Boolean).join(" ");
  return [line1, line2].filter(Boolean).join(" · ");
}

/**
 * An individual's personal address book: list, add, edit, delete, and choose a
 * default. Backed by {@link useAddressesStore}. Corporate employees never see
 * this — their delivery sites are contract-locked and shown read-only.
 */
function IndividualAddressBook({ seed }: { seed: DeliveryDetails }) {
  const list = useAddressesStore((s) => s.addresses);
  const add = useAddressesStore((s) => s.add);
  const update = useAddressesStore((s) => s.update);
  const remove = useAddressesStore((s) => s.remove);
  const setDefault = useAddressesStore((s) => s.setDefault);

  // null = closed; "new" = adding; a SavedAddress = editing that one.
  const [editing, setEditing] = React.useState<"new" | SavedAddress | null>(null);

  // Prefill the first "Add" with whatever checkout already captured, so the
  // address they've given us once isn't re-typed here.
  const seedInput: Partial<AddressInput> | undefined =
    list.length === 0 && seed.street
      ? { label: "Home", ...seed }
      : undefined;

  async function handleRemove(a: SavedAddress) {
    const ok = await confirm({
      title: `Delete ${a.label || "this address"}?`,
      description: `${formatAddress(a)} will be removed from your address book.`,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (ok) {
      remove(a.id);
      toast.success("Address removed", `${a.label || "Address"} was deleted.`);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Delivery addresses</CardTitle>
        {list.length > 0 ? (
          <Button variant="ghost" size="sm" onClick={() => setEditing("new")}>
            <Plus className="size-4" /> Add address
          </Button>
        ) : null}
      </CardHeader>
      <CardBody className="divide-y divide-border [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">
        {list.length === 0 ? (
          <div className="py-6 text-center">
            <MapPin className="mx-auto size-6 text-muted-foreground" />
            <p className="mt-2 text-[13px] text-muted-foreground">No saved addresses yet.</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setEditing("new")}>
              <Plus className="size-4" /> Add your first address
            </Button>
          </div>
        ) : (
          list.map((a) => (
            <div key={a.id} className="flex items-start gap-3 py-3">
              <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
              <div className="min-w-0 flex-1 text-[13px]">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{a.label || "Address"}</span>
                  {a.isDefault ? <Badge tone="success">Default</Badge> : null}
                </div>
                <div className="text-muted-foreground">{formatAddress(a)}</div>
                {a.phone ? (
                  <div className="mt-0.5 text-2xs text-muted-foreground">{a.phone}</div>
                ) : null}
                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                  {!a.isDefault ? (
                    <button
                      type="button"
                      onClick={() => setDefault(a.id)}
                      className="-ml-2 rounded-lg px-2 py-1.5 text-[13px] font-semibold text-primary hover:bg-teal-wash"
                    >
                      Set as default
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setEditing(a)}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[13px] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <Pencil className="size-3.5" /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(a)}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[13px] font-semibold text-danger hover:bg-danger-bg"
                  >
                    <Trash2 className="size-3.5" /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </CardBody>

      {editing ? (
        <AddressFormModal
          title={editing === "new" ? "Add delivery address" : "Edit delivery address"}
          submitLabel={editing === "new" ? "Add address" : "Save changes"}
          initial={editing === "new" ? seedInput : editing}
          onClose={() => setEditing(null)}
          onSave={(input) => {
            if (editing === "new") {
              add(input);
              toast.success("Address added", `${input.label} was saved to your address book.`);
            } else {
              update(editing.id, input);
              toast.success("Address updated", `${input.label} was updated.`);
            }
            setEditing(null);
          }}
        />
      ) : null}
    </Card>
  );
}

/** Add/edit form for a single delivery address, in a bottom-sheet modal that
 *  matches the app's other pickers. Street, city, ZIP and phone are required. */
function AddressFormModal({
  title,
  submitLabel,
  initial,
  onClose,
  onSave,
}: {
  title: string;
  submitLabel: string;
  initial?: Partial<AddressInput>;
  onClose: () => void;
  onSave: (input: AddressInput) => void;
}) {
  const [form, setForm] = React.useState<AddressInput>(() => ({
    label: initial?.label ?? "",
    street: initial?.street ?? "",
    apt: initial?.apt ?? "",
    city: initial?.city ?? "",
    zip: initial?.zip ?? "",
    phone: initial?.phone ?? "",
    instructions: initial?.instructions ?? "",
  }));

  function set<K extends keyof AddressInput>(k: K, v: AddressInput[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const valid =
    form.label.trim() &&
    form.street.trim() &&
    form.city.trim() &&
    form.zip.trim() &&
    form.phone.trim();

  // Mounted only while it's up, so it's open for its whole life.
  const dialog = useDialog({ open: true, onClose });

  function submit() {
    if (!valid) return;
    onSave({
      label: form.label.trim(),
      street: form.street.trim(),
      apt: form.apt.trim(),
      city: form.city.trim(),
      zip: form.zip.trim(),
      phone: form.phone.trim(),
      instructions: form.instructions.trim(),
    });
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-teal-deep/50" onClick={onClose} />
      {/* The dialog is the sheet, not the box that also holds the scrim, so the
          trap ends where the panel does. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        {...dialog.props}
        className="relative z-10 flex max-h-[90dvh] w-full flex-col rounded-t-3xl border border-border bg-card shadow-raised sm:max-w-md sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border p-5">
          <h2 className="font-display text-lg font-semibold tracking-tight">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full border border-control bg-card touch-target p-1.5 text-foreground hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <div>
            <Label htmlFor="addr-label">Address name</Label>
            <Input
              id="addr-label"
              value={form.label}
              onChange={(e) => set("label", e.target.value)}
              placeholder="e.g. Home or Work"
              autoComplete="off"
            />
          </div>
          <div>
            <Label htmlFor="addr-street">Street address</Label>
            <Input
              id="addr-street"
              value={form.street}
              onChange={(e) => set("street", e.target.value)}
              placeholder="123 Market St"
              autoComplete="address-line1"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="addr-apt">
                Apt / suite{" "}
                <span className="font-normal normal-case text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="addr-apt"
                value={form.apt}
                onChange={(e) => set("apt", e.target.value)}
                placeholder="Apt 4B"
                autoComplete="address-line2"
              />
            </div>
            <div>
              <Label htmlFor="addr-city">City</Label>
              <Input
                id="addr-city"
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
                placeholder="San Francisco"
                autoComplete="address-level2"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="addr-zip">ZIP code</Label>
              <Input
                id="addr-zip"
                value={form.zip}
                onChange={(e) => set("zip", e.target.value)}
                placeholder="94105"
                inputMode="numeric"
                autoComplete="postal-code"
              />
            </div>
            <div>
              <Label htmlFor="addr-phone">Phone</Label>
              <Input
                id="addr-phone"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="(415) 555-0100"
                inputMode="tel"
                autoComplete="tel"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="addr-instructions">
              Delivery instructions{" "}
              <span className="font-normal normal-case text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="addr-instructions"
              value={form.instructions}
              onChange={(e) => set("instructions", e.target.value)}
              placeholder="Gate code, buzzer, where to leave it…"
              maxLength={300}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border p-5">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!valid} onClick={submit}>
            {submitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * The card on file — one card, the one every order is charged to, plus the form
 * that sets it and the control that forgets it. Backed by {@link useCardsStore},
 * so the card set here is the card checkout charges, and vice versa.
 *
 * One card, not a list. Every order is charged the same way at the same cutoff,
 * so a list only ever asked which of these is the real one. Adding a card when
 * there's already one *replaces* it, which is the same outcome as picking it
 * from a list, minus the list — and it's stated on the button, so nobody
 * discovers it by losing a card they meant to keep.
 *
 * The form is a dialog, the same one checkout raises — never a panel that
 * unfolds under the card row. A form growing beneath the card you're replacing
 * puts the old card and the half-typed new one on screen together, at exactly
 * the moment it matters which is which, and it pushes the rest of the page down
 * to do it.
 */
function PaymentMethodsCard({ corporate }: { corporate: boolean }) {
  const card = useCardsStore((s) => s.card);
  const removeCard = useCardsStore((s) => s.remove);

  const [formOpen, setFormOpen] = React.useState(false);

  async function handleRemove(saved: SavedCard) {
    const ok = await confirm({
      title: `Remove this ${brandLabel(saved.brand)}?`,
      description: `The card ending ${saved.last4} will be removed, and your next order will ask for a new one. Orders already placed aren't affected.`,
      confirmLabel: "Remove",
      tone: "danger",
    });
    if (ok) {
      removeCard();
      toast.success("Card removed", `${brandLabel(saved.brand)} ending ${saved.last4} was removed.`);
    }
  }

  return (
    <Card>
      {/* No action in the header: changing the card acts on the card, so it lives on the
          card's own row next to Remove, where what it affects is unambiguous. */}
      <CardHeader>
        <CardTitle className="text-base">Payment method</CardTitle>
      </CardHeader>
      <CardBody className="space-y-4">
        <p className="text-2xs text-muted-foreground">
          {corporate
            ? "Anything your company allowance doesn't cover is charged to this card."
            : "The card your orders are charged to. Nothing is charged until 24 hours before delivery."}
        </p>

        {card ? (
          <SavedCardRow
            card={card}
            onReplace={() => setFormOpen(true)}
            onRemove={() => handleRemove(card)}
          />
        ) : (
          <Button variant="outline" block onClick={() => setFormOpen(true)}>
            <Plus className="size-4" /> Add a card
          </Button>
        )}

        <SecurityNote />
      </CardBody>

      {formOpen ? (
        <CardFormDialog
          idPrefix="acct-card"
          replacing={card}
          onClose={() => setFormOpen(false)}
        />
      ) : null}
    </Card>
  );
}

/** Long enough to matter, short enough nobody writes it on a sticky note. */
const MIN_PASSWORD = 8;

/**
 * "Password" card — a signed-in user (individual or corporate) changing the
 * password they log in with. Opens a modal that asks for the current password
 * and a new one, twice.
 */
/**
 * Password section — the section *is* the form. Picking "Change password" from
 * the rail or the phone list already committed the user to changing it, so a
 * panel holding nothing but a second button to open a dialog is a step that
 * asks for a click and gives nothing back.
 */
function ChangePasswordCard({ onDone }: { onDone?: () => void }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="text-base">Change password</CardTitle>
        <span className="text-2xs text-muted-foreground">
          Update the password you use to sign in
        </span>
      </CardHeader>
      <ChangePasswordForm idPrefix="cp" onDone={() => onDone?.()} />
    </Card>
  );
}

/**
 * The password fields themselves. `idPrefix` namespaces the label/input pairs
 * so a second instance on the page can never steal the first one's labels.
 */
function ChangePasswordForm({
  idPrefix,
  onDone,
  onCancel,
  className,
}: {
  idPrefix: string;
  onDone: () => void;
  onCancel?: () => void;
  className?: string;
}) {
  const [current, setCurrent] = React.useState("");
  const [next, setNext] = React.useState("");
  const [confirmPw, setConfirmPw] = React.useState("");

  const tooShort = next.length > 0 && next.length < MIN_PASSWORD;
  const mismatch = confirmPw.length > 0 && confirmPw !== next;
  const ready = current.trim().length > 0 && next.length >= MIN_PASSWORD && confirmPw === next;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setCurrent("");
    setNext("");
    setConfirmPw("");
    toast.success("Password changed", "Use your new password next time you sign in.");
    onDone();
  }

  return (
    <form onSubmit={submit} className={cn("flex min-h-0 flex-col", className)}>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
        <div>
          <Label htmlFor={`${idPrefix}-current`}>Current password</Label>
          <Input
            id={`${idPrefix}-current`}
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </div>
        <div>
          <Label htmlFor={`${idPrefix}-new`}>New password</Label>
          <Input
            id={`${idPrefix}-new`}
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            placeholder={`At least ${MIN_PASSWORD} characters`}
            autoComplete="new-password"
            /* Points the field at its own error text, so the reason is spoken
               and not only painted red. */
            aria-invalid={tooShort || undefined}
            aria-describedby={tooShort ? `${idPrefix}-new-error` : undefined}
          />
          {tooShort ? (
            <p id={`${idPrefix}-new-error`} role="alert" className="mt-1.5 text-2xs font-medium text-danger">
              At least {MIN_PASSWORD} characters.
            </p>
          ) : null}
        </div>
        <div>
          <Label htmlFor={`${idPrefix}-confirm`}>Confirm new password</Label>
          <Input
            id={`${idPrefix}-confirm`}
            type="password"
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
            placeholder="Type it again"
            autoComplete="new-password"
            aria-invalid={mismatch || undefined}
            aria-describedby={mismatch ? `${idPrefix}-confirm-error` : undefined}
          />
          {mismatch ? (
            <p id={`${idPrefix}-confirm-error`} role="alert" className="mt-1.5 text-2xs font-medium text-danger">
              Both passwords must match.
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-border p-5">
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" disabled={!ready}>
          Change password
        </Button>
      </div>
    </form>
  );
}

/**
 * "Delete account" card — the last, most destructive action on the page. Opens a
 * modal that requires the account password before the account is removed.
 */
function DeleteAccountCard() {
  const [open, setOpen] = React.useState(false);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Delete account</CardTitle>
      </CardHeader>
      <CardBody className="space-y-3">
        <p className="text-[13px] text-muted-foreground">
          Permanently delete your account and all associated data — your profile, saved addresses and
          preferences. This can&apos;t be undone.
        </p>
        {/* Plain, like every other button on the page. This one only opens the
            dialog — the paragraph above already says what's at stake, and red on
            a control that does nothing yet spends the alarm before there's
            anything to be alarmed about. The confirm inside the dialog, which
            does delete, keeps it. */}
        <Button variant="ghost" onClick={() => setOpen(true)}>
          <Trash2 className="size-4" /> Delete account
        </Button>
      </CardBody>
      {open ? <DeleteAccountModal onClose={() => setOpen(false)} /> : null}
    </Card>
  );
}

/** Confirm deletion by re-entering the account password, then sign out. */
function DeleteAccountModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const signOut = useSessionStore((s) => s.signOut);
  const [password, setPassword] = React.useState("");
  const ready = password.trim().length > 0;

  // Mounted only while it's up, so it's open for its whole life.
  const dialog = useDialog({ open: true, onClose });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    signOut();
    toast.success("Account deleted", "Your account and its data have been removed.");
    onClose();
    router.push("/login");
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-teal-deep/50" onClick={onClose} />
      {/* The panel is a div wrapping the form rather than being the form: the
          dialog ref is a div ref, and the sheet's own chrome — sizing, rounding,
          the scrim it sits over — belongs to the layer, not to the submission.
          The form fills it, so the rendered result is unchanged. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Delete account"
        {...dialog.props}
        className="relative z-10 flex max-h-[90dvh] w-full flex-col rounded-t-3xl border border-border bg-card shadow-raised sm:max-w-md sm:rounded-3xl"
      >
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-3 border-b border-border p-5">
            <h2 className="font-display text-lg font-semibold tracking-tight">Delete account</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-full border border-control bg-card touch-target p-1.5 text-foreground hover:bg-muted"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            <p className="rounded-xl border border-danger/30 bg-danger-bg px-4 py-3 text-[13px] font-medium text-danger">
              This permanently deletes your account and all its data — your profile, saved addresses and
              preferences. This can&apos;t be undone.
            </p>
            <div>
              <Label htmlFor="del-password">Enter your password to confirm</Label>
              {/* `data-autofocus` rather than `autoFocus`: React fires the latter
                  on mount, before the dialog's focus effect runs, so the panel
                  would focus straight over it and land on the close button. */}
              <Input
                id="del-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                data-autofocus
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border p-5">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" disabled={!ready}>
              <Trash2 className="size-4" /> Delete account
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/** A labelled contact line (Email / Phone) in the identity card. */
function ContactRow({
  icon: Icon,
  label,
  hint,
  children,
}: {
  icon: LucideIcon;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
          {hint ? <span className="ml-1.5 normal-case tracking-normal">· {hint}</span> : null}
        </p>
        <div className="mt-0.5 text-[13px] font-medium text-foreground">{children}</div>
      </div>
    </div>
  );
}

function PolicyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-2.5 text-[13px] last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function PermissionRow({ label, on }: { label: string; on: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-2.5 text-[13px] last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("flex items-center gap-1.5 font-medium", on ? "text-success" : "text-muted-foreground")}>
        <span className={cn("flex size-5 items-center justify-center rounded-full", on ? "bg-success text-white" : "bg-border text-muted-foreground")}>
          {on ? <Check className="size-3.5" /> : <X className="size-3.5" />}
        </span>
        {on ? "Granted" : "Not granted"}
      </span>
    </div>
  );
}

function PrefRow({
  label,
  desc,
  on,
  onChange,
}: {
  label: string;
  desc: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <span>
        <span className="block text-[13px] font-medium">{label}</span>
        <span className="block text-2xs text-muted-foreground">{desc}</span>
      </span>
      <ToggleSwitch checked={on} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}

