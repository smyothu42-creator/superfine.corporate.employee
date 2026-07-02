"use client";

import * as React from "react";
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
  type LucideIcon,
} from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { AllergenCombobox } from "@/components/ui/allergen-combobox";
import { Avatar } from "@/components/ui/avatar";
import { StatCard } from "@/components/ui/stat-card";
import { dietaryPreferences, allergenOptions } from "@/data/menu";
import { program, addresses } from "@/data/program";
import { me } from "@/data/me";
import { toast } from "@/store/use-toast-store";
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
  const [dietary, setDietary] = React.useState<string[]>(me.dietary);
  const [allergens, setAllergens] = React.useState<string[]>(me.allergens);
  const [utensils, setUtensils] = React.useState(me.utensils);
  const [prefs, setPrefs] = React.useState(me.notifications);

  function toggleDiet(d: string) {
    setDietary((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  }
  function setPref<K extends keyof typeof prefs>(k: K, v: (typeof prefs)[K]) {
    setPrefs((p) => ({ ...p, [k]: v }));
  }

  return (
    <div className="space-y-5">
      {/* Profile header */}
      <Card>
        <CardBody className="flex flex-wrap items-center gap-4">
          <Avatar name={me.name} className="size-14 bg-yellow text-lg text-teal-deep" />
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-xl font-semibold tracking-tight">{me.name}</h2>
            <p className="text-[13px] text-muted-foreground">
              {me.role} · {me.company}
            </p>
            <p className="text-2xs text-muted-foreground">{me.email}</p>
          </div>
          <Badge tone="success">Signed in via company email</Badge>
        </CardBody>
      </Card>

      {/* Subsidy snapshot */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label="Daily subsidy"
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
        <StatCard
          label="Order cutoff"
          value={program.individualSoftCutoff.split(" ").slice(0, 2).join(" ")}
          sub="Day before delivery"
          icon={<CalendarClock className="size-4" />}
        />
      </div>

      {/* Dietary & allergens (editable) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dietary preferences</CardTitle>
          <span className="text-2xs text-muted-foreground">Used to tag &amp; filter your menu</span>
        </CardHeader>
        <CardBody className="space-y-4">
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
            <span className="text-overline mb-2 block">Allergens to avoid</span>
            <AllergenCombobox
              value={allergens}
              onValueChange={setAllergens}
              options={[...allergenOptions]}
              placeholder="Search allergens (e.g. Shellfish)"
              aria-label="Search and add allergens to avoid"
            />
          </div>
          <div className="flex items-center gap-2.5 py-1">
            <ToggleSwitch checked={utensils} onCheckedChange={setUtensils} aria-label="Include utensils" />
            <span className="text-[13px] font-medium">Include utensils by default</span>
          </div>
        </CardBody>
      </Card>

      {/* Meal program policy (read-only) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your company meal program</CardTitle>
          <Badge tone="neutral">Read-only</Badge>
        </CardHeader>
        <CardBody className="space-y-0">
          <PolicyRow label="Company" value={program.company} />
          <PolicyRow label="Subsidy model" value={program.subsidyModel} />
          <PolicyRow label="Service days" value={program.serviceDays} />
          <PolicyRow label="Individual order cutoff" value={program.individualSoftCutoff} />
          <PolicyRow label="Family-style cutoff" value={program.familyCutoff} />
          <PolicyRow label="Hard cutoff" value={program.individualHardCutoff} />
          <PolicyRow label="Change / cancel window" value={program.changeWindow} />
          <PolicyRow label="Delivery windows" value={program.deliveryWindows.join(" · ")} />
          <PolicyRow label="Utensils" value={program.utensilsPolicy} />
        </CardBody>
      </Card>

      {/* Permissions (read-only) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your permissions</CardTitle>
          <span className="flex items-center gap-1 text-2xs text-muted-foreground">
            <ShieldCheck className="size-3.5" /> Granted by SFK
          </span>
        </CardHeader>
        <CardBody className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <PermissionTile label="Invoice to company" on={me.permissions.payLater} />
          <PermissionTile label="Flexible delivery window" on={me.permissions.flexibleDelivery} />
        </CardBody>
      </Card>

      {/* Addresses (view-only) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Delivery addresses</CardTitle>
          {me.permissions.editAddress ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toast.info("Edit delivery address", "Address editing is a demo action.")}
            >
              <Pencil className="size-4" /> Edit delivery address
            </Button>
          ) : (
            <Badge tone="neutral">Company-set</Badge>
          )}
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
            desc="If you haven't ordered and auto-order is off"
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

function PermissionTile({ label, on }: { label: string; on: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl border p-3 text-[13px] font-medium",
        on ? "border-success-border bg-success-bg text-success" : "border-border bg-muted text-muted-foreground",
      )}
    >
      <span className={cn("flex size-5 items-center justify-center rounded-full", on ? "bg-success text-white" : "bg-border text-muted-foreground")}>
        {on ? <Check className="size-3.5" /> : <X className="size-3.5" />}
      </span>
      {label}
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
