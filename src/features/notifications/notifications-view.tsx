"use client";

import * as React from "react";
import {
  CheckCircle2,
  Bell,
  Truck,
  Pencil,
  Sparkles,
  MoreHorizontal,
  Check,
  Undo2,
  Trash2,
} from "lucide-react";
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

  return (
    <div className="divide-y divide-border/60">
      {items.map((n) => (
        <NotificationRow
          key={n.id}
          id={n.id}
          type={n.type}
          title={n.title}
          body={n.body}
          time={n.time}
          read={n.read}
        />
      ))}
    </div>
  );
}

/**
 * One notification: the row you tap to read it, and a ⋯ menu for everything else
 * it can do.
 *
 * The two are siblings, not nested — a button inside a button is invalid, and
 * the inner one swallows the tap meant for the row. Tapping the row still marks
 * it read, which is what a tap means in a feed; the menu holds the actions that
 * *aren't* "I've seen this", including the undo for having seen it.
 */
function NotificationRow({
  id,
  type,
  title,
  body,
  time,
  read,
}: {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  time: string;
  read: boolean;
}) {
  const markRead = useNotificationsStore((s) => s.markRead);
  const markUnread = useNotificationsStore((s) => s.markUnread);
  const remove = useNotificationsStore((s) => s.remove);
  const Icon = ICON[type];

  return (
    <div className="flex items-start gap-3 py-4">
      <button
        type="button"
        onClick={() => markRead(id)}
        className="flex min-w-0 flex-1 items-start gap-3 text-left"
      >
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", TONE[type])}>
          <Icon className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className={cn("text-[13px]", read ? "font-medium" : "font-semibold")}>{title}</span>
            {!read ? <span className="size-2 shrink-0 rounded-full bg-coral" /> : null}
          </span>
          <span className="mt-0.5 block text-[13px] text-muted-foreground">{body}</span>
          <span className="mt-0.5 block text-2xs text-muted-foreground">{time}</span>
        </span>
      </button>

      <RowMenu
        title={title}
        read={read}
        onToggleRead={() => (read ? markUnread(id) : markRead(id))}
        onRemove={() => remove(id)}
      />
    </div>
  );
}

/**
 * The ⋯ menu. Always visible rather than revealed on hover: a phone has no
 * hover, and an action that only exists for mouse users isn't an action.
 */
function RowMenu({
  title,
  read,
  onToggleRead,
  onRemove,
}: {
  title: string;
  read: boolean;
  onToggleRead: () => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  // Escape closes, and so does a press anywhere else — a menu that can only be
  // dismissed by choosing something from it is a trap.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        // Named after the notification it acts on: a screen-reader user meeting
        // ten identical "More options" buttons has no idea which is which.
        aria-label={`More options for "${title}"`}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "touch-target rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
          open && "bg-muted text-foreground",
        )}
      >
        <MoreHorizontal className="size-4" />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-1 w-44 overflow-hidden rounded-xl border border-border bg-card py-1 shadow-lg"
        >
          <MenuItem
            icon={read ? Undo2 : Check}
            label={read ? "Mark as unread" : "Mark as read"}
            onClick={() => {
              onToggleRead();
              setOpen(false);
            }}
          />
          <MenuItem
            icon={Trash2}
            label="Remove"
            tone="danger"
            onClick={() => {
              onRemove();
              setOpen(false);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  tone?: "danger";
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] font-medium transition-colors hover:bg-muted",
        tone === "danger" ? "text-danger" : "text-foreground",
      )}
    >
      <Icon className="size-3.5 shrink-0" />
      {label}
    </button>
  );
}
