import { Sidebar, BottomNav } from "@/components/layout/sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-zinc-50">
      <Sidebar />
      <main className="flex-1 min-w-0 pb-20 md:pb-0">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
