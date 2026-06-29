"use client";

import * as React from "react";
import {
  CheckCircle2,
  Bell,
  Truck,
  Pencil,
  Sparkles,
} from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { useNotificationsStore } from "@/store/use-notifications-store";
import { cn } from "@/lib/utils";
import type { NotificationType } from "@/data/types";

const ICON: Record<NotificationType, React.ComponentType<{ className?: string }>> = {
  confirmation: CheckCircle2,
  reminder: Bell,
  arrival: Truck,
  change: Pencil,
  special: Sparkles,
};

const TONE: Record<NotificationType, string> = {
  confirmation: "bg-success-bg text-success",
  reminder: "bg-warning-bg text-warning",
  arrival: "bg-info-bg text-info",
  change: "bg-teal-wash text-teal",
  special: "bg-yellow-wash text-teal-deep",
};

export function NotificationsView() {
  const items = useNotificationsStore((s) => s.items);
  const markRead = useNotificationsStore((s) => s.markRead);

  return (
    <div className="space-y-4">
      <Card>
        <CardBody className="divide-y divide-border p-0">
          {items.map((n) => {
            const Icon = ICON[n.type];
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => markRead(n.id)}
                className={cn(
                  "flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/40",
                  !n.read && "bg-teal-wash/40",
                )}
              >
                <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", TONE[n.type])}>
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold">{n.title}</span>
                    {!n.read ? <span className="size-2 shrink-0 rounded-full bg-coral" /> : null}
                  </span>
                  <span className="mt-0.5 block text-[13px] text-muted-foreground">{n.body}</span>
                  <span className="mt-0.5 block text-2xs text-muted-foreground">{n.time}</span>
                </span>
              </button>
            );
          })}
        </CardBody>
      </Card>
    </div>
  );
}
