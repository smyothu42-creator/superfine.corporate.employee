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
  const trigger = React.useRef<HTMLButtonElement>(null);
  const menu = React.useRef<HTMLDivElement>(null);

  /**
   * Opening a menu has to put the user *in* it.
   *
   * The list was reachable by mouse and by Escape, but not by keyboard in the
   * one direction that matters: pressing Enter on "More options" left focus on
   * the trigger with a menu hanging open behind it, and the only way in was to
   * Tab — which walked into the next notification's controls instead, because
   * the menu is positioned, not ordered. Land on the first item, the way every
   * other layer in this app already does.
   */
  React.useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, [open]);

  // Escape closes, and so does a press anywhere else — a menu that can only be
  // dismissed by choosing something from it is a trap.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // Hand focus back to what opened it. Without this the menu unmounts under
      // the user's focus and drops them on <body> — back at the top of the page,
      // having lost the row they were working on.
      close();
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

  /**
   * Shut the menu and put focus back where it came from.
   *
   * Guarded on the trigger still being in the document, because "Remove" takes
   * the whole row — and its trigger — away with it. Focusing a detached node is
   * a silent no-op that leaves the user on <body>, so in that case we let the
   * list's own live region do the talking rather than pretend.
   */
  function close() {
    setOpen(false);
    const el = trigger.current;
    if (el && el.isConnected) el.focus();
  }

  /** Up/Down between the items, Home/End to the ends — what `role="menu"` promises. */
  function onMenuKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const items = Array.from(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    if (!items.length) return;

    // Tab out of an open menu closes it rather than leaving it hanging over the
    // list while focus moves on somewhere else.
    if (e.key === "Tab") {
      setOpen(false);
      return;
    }

    const from = items.indexOf(document.activeElement as HTMLElement);
    let to: number;
    switch (e.key) {
      case "ArrowDown":
        to = (from + 1) % items.length;
        break;
      case "ArrowUp":
        to = (from - 1 + items.length) % items.length;
        break;
      case "Home":
        to = 0;
        break;
      case "End":
        to = items.length - 1;
        break;
      default:
        return;
    }
    e.preventDefault();
    items[to]?.focus();
  }

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        ref={trigger}
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
          ref={menu}
          role="menu"
          aria-label={`Actions for "${title}"`}
          onKeyDown={onMenuKeyDown}
          className="absolute right-0 top-full z-40 mt-1 w-44 overflow-hidden rounded-xl border border-border bg-card py-1 shadow-lg"
        >
          <MenuItem
            icon={read ? Undo2 : Check}
            label={read ? "Mark as unread" : "Mark as read"}
            onClick={() => {
              onToggleRead();
              close();
            }}
          />
          <MenuItem
            icon={Trash2}
            label="Remove"
            tone="danger"
            onClick={() => {
              onRemove();
              close();
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
      // The menu owns focus while it is open — arrows move between items, and
      // Tab is a way *out* rather than a way through. Without this, Tab walked
      // the two items one at a time before escaping.
      tabIndex={-1}
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
