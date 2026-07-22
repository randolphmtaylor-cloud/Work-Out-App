import { Sidebar, BottomNav } from "@/components/layout/sidebar";
import { getAuthStatus } from "@/lib/auth/user";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const authStatus = await getAuthStatus();

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Sidebar initialAuthStatus={authStatus} />
      <main className="min-w-0 flex-1 pb-[calc(5.75rem+env(safe-area-inset-bottom))] md:pb-0">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
