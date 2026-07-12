import { NotificationsView } from "@/features/notifications/notifications-view";

export default function NotificationsPage() {
  // Full-bleed white content well (the topbar keeps its own colour). Negative
  // margins cancel the shell's padding so the white reaches every edge, then the
  // padding is re-added inside.
  return (
    <div className="-mb-tab-bar pb-tab-bar -mx-4 -mt-6 min-h-[calc(100dvh-4rem)] bg-card px-4 py-6 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <NotificationsView />
    </div>
  );
}
