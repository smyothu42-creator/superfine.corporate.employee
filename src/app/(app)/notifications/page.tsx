import { NotificationsView } from "@/features/notifications/notifications-view";

export default function NotificationsPage() {
  // Full-bleed white content well (the topbar keeps its own colour). Negative
  // margins cancel the shell's padding so the white reaches every edge, then the
  // padding is re-added inside.
  return (
    <div className="-mx-4 -mt-6 -mb-24 min-h-[calc(100vh-4rem)] bg-card px-4 py-6 pb-24 sm:-mx-6 sm:px-6 lg:-mx-8 lg:-mb-6 lg:px-8 lg:pb-6">
      <NotificationsView />
    </div>
  );
}
