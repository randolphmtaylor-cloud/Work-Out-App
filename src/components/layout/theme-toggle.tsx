"use client";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="w-8 h-8" />;

  const cycle = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  const label =
    theme === "dark" ? "Dark mode" : theme === "light" ? "Light mode" : "System theme";

  return (
    <button
      onClick={cycle}
      title={label}
      aria-label={`Switch theme (currently ${label})`}
      className={cn(
        "flex items-center justify-center w-8 h-8 rounded-lg transition-colors",
        "text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100",
        "dark:text-zinc-500 dark:hover:text-zinc-200 dark:hover:bg-zinc-800",
        className
      )}
    >
      {theme === "dark" ? (
        <Moon className="w-4 h-4" />
      ) : theme === "light" ? (
        <Sun className="w-4 h-4" />
      ) : (
        <Monitor className="w-4 h-4" />
      )}
    </button>
  );
}
