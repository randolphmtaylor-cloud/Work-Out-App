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
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

const NAV_ITEMS = [
  { href: "/dashboard",  label: "Dashboard",      icon: LayoutDashboard },
  { href: "/today",      label: "Today's Workout", icon: Dumbbell },
  { href: "/history",    label: "History",         icon: History },
  { href: "/import",     label: "Import",          icon: Upload },
  { href: "/progress",   label: "Progress",        icon: BarChart2 },
  { href: "/coach",      label: "AI Coach",        icon: MessageSquare },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-56 bg-white border-r border-zinc-200 min-h-screen sticky top-0">
      <div className="flex items-center gap-2 px-5 py-5 border-b border-zinc-100">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <span className="font-semibold text-zinc-900 text-sm">Gym Sessions</span>
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
                  ? "bg-indigo-50 text-indigo-700 font-medium"
                  : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-zinc-100">
        <p className="text-xs text-zinc-400">Demo Mode</p>
        <p className="text-xs text-zinc-400 mt-0.5">Add API keys to unlock AI</p>
      </div>
    </aside>
  );
}

// Mobile bottom nav
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-200 z-50">
      <div className="flex items-center justify-around px-2 py-2">
        {NAV_ITEMS.slice(0, 5).map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-xs transition-colors",
                active ? "text-indigo-600" : "text-zinc-500"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="truncate max-w-[48px] text-center leading-tight">{label.split("'")[0]}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
