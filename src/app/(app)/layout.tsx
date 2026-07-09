import { AppShell } from "@/components/layout/app-shell";
import { AuthGuard } from "@/components/auth/auth-guard";

/**
 * The app is for signed-in corporate employees. Sign in with the company email
 * and password and every screen below is already priced against the company's
 * program — nothing about identity is asked again at checkout.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <AppShell>{children}</AppShell>
    </AuthGuard>
  );
}
