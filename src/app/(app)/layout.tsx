import { AppShell } from "@/components/layout/app-shell";
import { AccessGate } from "@/components/auth/access-gate";

/**
 * Anyone with a delivery ZIP can browse, fill a cart and reach checkout — an
 * account is only required for the screens that are *about* an account, and for
 * placing the order itself. Corporate employees who signed in arrive with their
 * subsidy, address and prices already resolved.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AccessGate>
      <AppShell>{children}</AppShell>
    </AccessGate>
  );
}
