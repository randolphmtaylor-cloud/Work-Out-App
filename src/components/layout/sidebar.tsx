"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Dumbbell,
  History,
  Upload,
  BarChart2,
  MessageSquare,
  Settings,
  Zap,
  UserRound,
  Library,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { ThemeToggle } from "./theme-toggle";
import { AuthStatus } from "@/components/auth/auth-status";
import type { AuthStatus as ServerAuthStatus } from "@/lib/auth/user";

const NAV_ITEMS = [
  { href: "/dashboard",  label: "Dashboard",       icon: LayoutDashboard },
  { href: "/today",      label: "Today's Workout",  icon: Dumbbell },
  { href: "/goals",      label: "Goals",            icon: Target },
  { href: "/history",    label: "History",          icon: History },
  { href: "/exercises",  label: "Exercise Library", icon: Library },
  { href: "/import",     label: "Import",           icon: Upload },
  { href: "/progress",   label: "Progress",         icon: BarChart2 },
  { href: "/coach",      label: "AI Coach",         icon: MessageSquare },
  { href: "/settings",   label: "Settings",        icon: Settings },
];

export function Sidebar({ initialAuthStatus }: { initialAuthStatus?: ServerAuthStatus }) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-56 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 min-h-screen sticky top-0">
      <div className="flex items-center gap-2 px-5 py-5 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">Gym Sessions</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                active
                  ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 font-medium"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
        <AuthStatus initialStatus={initialAuthStatus} />
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">Appearance</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">Theme preference</p>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}

// Mobile bottom nav
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary navigation" className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-200 bg-white/95 backdrop-blur md:hidden dark:border-zinc-800 dark:bg-zinc-900/95">
      <div className="grid grid-cols-6 gap-0.5 px-1 pt-1.5 pb-[calc(.375rem+env(safe-area-inset-bottom))]">
        {[
          { href: "/dashboard", label: "Home", icon: LayoutDashboard },
          { href: "/today", label: "Workout", icon: Dumbbell },
          { href: "/goals", label: "Goals", icon: Target },
          { href: "/history", label: "History", icon: History },
          { href: "/exercises", label: "Library", icon: Library },
          { href: "/login", label: "Account", icon: UserRound },
        ].map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex min-h-12 min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg px-0.5 text-[clamp(.625rem,2.5vw,.75rem)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                active
                  ? "text-indigo-600 dark:text-indigo-400"
                  : "text-zinc-500 dark:text-zinc-400"
              )}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span className="w-full text-center leading-tight">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
