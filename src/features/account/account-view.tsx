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
  type LucideIcon,
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
import {
  useAddressesStore,
  type SavedAddress,
  type AddressInput,
} from "@/store/use-addresses-store";
import { dietaryPreferences, allergenOptions } from "@/data/menu";
import { program, addresses } from "@/data/program";
import { me } from "@/data/me";
import { toast } from "@/store/use-toast-store";
import { useOOOStore } from "@/store/use-ooo-store";
import { fromISODate, formatShort } from "@/lib/dates";
import { formatCurrency, cn } from "@/lib/utils";

const dietaryIcons: Record<string, LucideIcon> = {
  Vegan: Sprout,
  Vegetarian: Leaf,
  Halal: Salad,
  "Gluten-Free": WheatOff,
  "Nut-Free": NutOff,
  "Dairy-Free": MilkOff,
};

export function AccountView() {
  // Shared with the menu, which seeds its filters from these — so a preference
  // saved here shows up pre-applied the next time the menu is opened.
  const dietary = useProfileStore((s) => s.dietary);
  const allergens = useProfileStore((s) => s.allergens);
  const setDietary = useProfileStore((s) => s.setDietary);
  const setAllergens = useProfileStore((s) => s.setAllergens);
  const [prefs, setPrefs] = React.useState(me.notifications);
  // An individual has no company program, no allowance and no company-set
  // addresses — those whole cards are corporate furniture and are omitted rather
  // than shown empty.
  const account = useSessionStore((s) => s.account);
  const corporate = isSubsidized(account);
  const delivery = useSessionStore((s) => s.delivery);
  const setAccountName = useSessionStore((s) => s.setAccountName);
  const name = account?.name ?? me.name;

  // Inline name editing — available to any signed-in account (individual or
  // corporate). Guests have no account to rename, so the pencil is hidden.
  const [editingName, setEditingName] = React.useState(false);
  const [nameDraft, setNameDraft] = React.useState("");

  function startEditName() {
    setNameDraft(name);
    setEditingName(true);
  }
  function saveName() {
    const v = nameDraft.trim();
    if (!v) return;
    setAccountName(v);
    setEditingName(false);
    toast.success("Name updated", "Your name has been saved.");
  }

  function toggleDiet(d: string) {
    setDietary(dietary.includes(d) ? dietary.filter((x) => x !== d) : [...dietary, d]);
  }
  function setPref<K extends keyof typeof prefs>(k: K, v: (typeof prefs)[K]) {
    setPrefs((p) => ({ ...p, [k]: v }));
  }

  return (
    <div className="space-y-5">
      {/* Profile header */}
      <Card>
        <CardBody className="flex flex-wrap items-center gap-4">
          <Avatar name={name} className="size-14 shrink-0 bg-yellow text-lg text-teal-deep" />
          {/* basis-52 keeps the name/role column readable: without a floor,
              flex-1 lets the out-of-office button squeeze it to one word per
              line on phones — the button wraps to its own row instead. */}
          <div className="min-w-0 flex-1 basis-52">
            {editingName ? (
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveName();
                    if (e.key === "Escape") setEditingName(false);
                  }}
                  aria-label="Your name"
                  autoFocus
                  className="h-9 max-w-[16rem]"
                />
                <Button size="sm" onClick={saveName} disabled={!nameDraft.trim()}>
                  Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingName(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <h2 className="font-display text-xl font-semibold tracking-tight">{name}</h2>
                {account ? (
                  <button
                    type="button"
                    onClick={startEditName}
                    aria-label="Edit name"
                    className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Pencil className="size-4" />
                  </button>
                ) : null}
              </div>
            )}
            <p className="text-[13px] text-muted-foreground">
              {corporate ? `${me.role} · ${account?.company ?? me.company}` : "Individual account"}
            </p>
            <p className="text-[13px] text-muted-foreground">{account?.email ?? me.email}</p>
          </div>
          {/* Out-of-office pauses company auto-orders — a corporate-only concept. */}
          {corporate ? <OOOHeaderButton /> : null}
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

      {/* Dietary & allergens (editable) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dietary preferences</CardTitle>
          <span className="text-2xs text-muted-foreground">Used to tag &amp; filter your menu</span>
        </CardHeader>
        <CardBody className="space-y-6">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-overline">Dietary tags</span>
              <span className="text-2xs font-medium text-muted-foreground">
                {dietary.length ? `${dietary.length} selected` : "None selected"}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
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
                        : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
                    )}
                  >
                    <Icon className={cn("size-3.5 shrink-0", on ? "text-primary" : "text-muted-foreground")} />
                    {d}
                    {on ? <Check className="size-3.5 shrink-0 text-primary" /> : null}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-overline">Allergens to avoid</span>
              <span className="text-2xs font-medium text-muted-foreground">
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
          </div>
        </CardBody>
      </Card>

      {/* Meal program policy (read-only). Corporate contract terms only — an
          individual isn't on a company program, so this whole card is omitted
          for them (their cutoff info lives in the tiles above). */}
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

      {/* Permissions (read-only) — SFK grants these against a company, so the
          card is corporate-only. */}
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

      {/* Delivery addresses. A corporate employee sees the contract-locked
          company sites (view-only); an individual owns an address book they can
          add to, edit, and set a default in. */}
      {corporate ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Delivery addresses</CardTitle>
            <Badge tone="neutral">Company-set</Badge>
          </CardHeader>
          <CardBody className="divide-y divide-border [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">
            {addresses.map((a) => (
              <div key={a.id} className="flex items-start gap-3 py-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1 text-[13px]">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{a.name}</span>
                    {a.id === me.defaultAddressId ? <Badge tone="success">Default</Badge> : null}
                  </div>
                  <div className="text-muted-foreground">{a.address}</div>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      ) : (
        <IndividualAddressBook seed={delivery} />
      )}

      {/* Password — change the sign-in password (both account types). */}
      <ChangePasswordCard />

      {/* Notification preferences */}
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

      {/* Delete account — the last, most destructive action on the page. */}
      <DeleteAccountCard />
    </div>
  );
}

/** Compact "Set out of office" button for the profile header — reuses the OOO
 *  store + date picker so it stays in sync with the Availability section. */
function OOOHeaderButton() {
  const { active, dates, set } = useOOOStore();
  const [picker, setPicker] = React.useState(false);

  return (
    <>
      <div className="flex flex-col items-end gap-1.5">
        <Button variant="outline" size="sm" onClick={() => setPicker(true)}>
          <CalendarOff className="size-4" /> {active ? "Edit out of office" : "Set out of office"}
        </Button>
        {active ? <OutOfOfficeDates dates={dates} /> : null}
      </div>
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

/** Clean, compact summary of the out-of-office days: a count line plus a row of
 *  date chips (capped, with a "+N" overflow) so long ranges never wrap messily. */
function OutOfOfficeDates({ dates }: { dates: string[] }) {
  const MAX = 4;
  const sorted = [...dates].sort();
  const shown = sorted.slice(0, MAX);
  const extra = sorted.length - shown.length;

  return (
    <div className="flex flex-col items-end gap-1">
      <span className="text-2xs font-semibold uppercase tracking-wide text-danger">
        Away · {dates.length} day{dates.length > 1 ? "s" : ""}
      </span>
      <div className="flex flex-wrap justify-end gap-1">
        {shown.map((d) => (
          <span
            key={d}
            className="rounded-full border border-danger-border bg-danger-bg px-2 py-0.5 text-2xs font-semibold text-danger"
          >
            {formatShort(fromISODate(d))}
          </span>
        ))}
        {extra > 0 ? (
          <span className="rounded-full border border-border px-2 py-0.5 text-2xs font-semibold text-muted-foreground">
            +{extra}
          </span>
        ) : null}
      </div>
    </div>
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
            <MapPin className="mx-auto size-6 text-muted-foreground/50" />
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

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

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
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="absolute inset-0 bg-teal-deep/50" onClick={onClose} />
      <div className="relative z-10 flex max-h-[90dvh] w-full flex-col rounded-t-3xl border border-border bg-card shadow-raised sm:max-w-md sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3 border-b border-border p-5">
          <h2 className="font-display text-lg font-semibold tracking-tight">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full border border-border bg-card touch-target p-1.5 text-foreground hover:bg-muted"
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

/** Long enough to matter, short enough nobody writes it on a sticky note. */
const MIN_PASSWORD = 8;

/**
 * "Password" card — a signed-in user (individual or corporate) changing the
 * password they log in with. Opens a modal that asks for the current password
 * and a new one, twice.
 */
function ChangePasswordCard() {
  const [open, setOpen] = React.useState(false);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Password</CardTitle>
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
          <KeyRound className="size-4" /> Change password
        </Button>
      </CardHeader>
      <CardBody>
        <p className="text-[13px] text-muted-foreground">
          Update the password you use to sign in.
        </p>
      </CardBody>
      {open ? <ChangePasswordModal onClose={() => setOpen(false)} /> : null}
    </Card>
  );
}

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = React.useState("");
  const [next, setNext] = React.useState("");
  const [confirmPw, setConfirmPw] = React.useState("");

  const tooShort = next.length > 0 && next.length < MIN_PASSWORD;
  const mismatch = confirmPw.length > 0 && confirmPw !== next;
  const ready = current.trim().length > 0 && next.length >= MIN_PASSWORD && confirmPw === next;

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    toast.success("Password changed", "Use your new password next time you sign in.");
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Change password"
    >
      <div className="absolute inset-0 bg-teal-deep/50" onClick={onClose} />
      <form
        onSubmit={submit}
        className="relative z-10 flex max-h-[90dvh] w-full flex-col rounded-t-3xl border border-border bg-card shadow-raised sm:max-w-md sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border p-5">
          <h2 className="font-display text-lg font-semibold tracking-tight">Change password</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full border border-border bg-card touch-target p-1.5 text-foreground hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <div>
            <Label htmlFor="cp-current">Current password</Label>
            <Input
              id="cp-current"
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
          <div>
            <Label htmlFor="cp-new">New password</Label>
            <Input
              id="cp-new"
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              placeholder={`At least ${MIN_PASSWORD} characters`}
              autoComplete="new-password"
            />
            {tooShort ? (
              <p className="mt-1.5 text-2xs font-medium text-danger">
                At least {MIN_PASSWORD} characters.
              </p>
            ) : null}
          </div>
          <div>
            <Label htmlFor="cp-confirm">Confirm new password</Label>
            <Input
              id="cp-confirm"
              type="password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              placeholder="Type it again"
              autoComplete="new-password"
              aria-invalid={mismatch || undefined}
            />
            {mismatch ? (
              <p className="mt-1.5 text-2xs font-medium text-danger">Both passwords must match.</p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border p-5">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!ready}>
            Change password
          </Button>
        </div>
      </form>
    </div>
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
        <Button variant="ghost" className="text-danger hover:bg-danger-bg" onClick={() => setOpen(true)}>
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

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    signOut();
    toast.success("Account deleted", "Your account and its data have been removed.");
    onClose();
    router.push("/login");
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Delete account"
    >
      <div className="absolute inset-0 bg-teal-deep/50" onClick={onClose} />
      <form
        onSubmit={submit}
        className="relative z-10 flex max-h-[90dvh] w-full flex-col rounded-t-3xl border border-border bg-card shadow-raised sm:max-w-md sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border p-5">
          <h2 className="font-display text-lg font-semibold tracking-tight">Delete account</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full border border-border bg-card touch-target p-1.5 text-foreground hover:bg-muted"
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
            <Input
              id="del-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              autoFocus
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

