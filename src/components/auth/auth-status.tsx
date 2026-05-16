"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, LogOut, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { AuthStatus as ServerAuthStatus } from "@/lib/auth/user";

type AuthState =
  | { status: "local" }
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "signed-in"; email: string | null };

function hasSupabaseEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder") &&
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes("placeholder")
  );
}

function getInitialState(initialStatus?: ServerAuthStatus): AuthState {
  if (initialStatus?.isLocalMode) return { status: "local" };
  if (initialStatus?.isAuthenticated) return { status: "signed-in", email: initialStatus.email };
  if (initialStatus && !initialStatus.isAuthenticated) return { status: "signed-out" };
  return hasSupabaseEnv() ? { status: "loading" } : { status: "local" };
}

export function AuthStatus({ initialStatus }: { initialStatus?: ServerAuthStatus }) {
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState>(getInitialState(initialStatus));

  useEffect(() => {
    if (!hasSupabaseEnv()) return;

    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      setAuthState(data.user ? { status: "signed-in", email: data.user.email ?? null } : { status: "signed-out" });
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthState(session?.user ? { status: "signed-in", email: session.user.email ?? null } : { status: "signed-out" });
      router.refresh();
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setAuthState({ status: "signed-out" });
    router.push("/login");
    router.refresh();
  };

  if (authState.status === "local") {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/60 dark:bg-amber-950/30">
        <p className="text-xs font-medium text-amber-900 dark:text-amber-200">Local-only mode</p>
        <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-300">
          Add Supabase env vars to sync/import logs.
        </p>
      </div>
    );
  }

  if (authState.status === "loading") {
    return <p className="text-xs text-zinc-400 dark:text-zinc-500">Checking account...</p>;
  }

  if (authState.status === "signed-out") {
    return (
      <Button asChild variant="accent" size="sm" className="w-full">
        <Link href="/login">
          <LogIn className="h-3.5 w-3.5" />
          Sign In
        </Link>
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex min-w-0 items-center gap-2">
        <UserRound className="h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400" />
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-zinc-800 dark:text-zinc-200">
            {authState.email ?? "Signed in"}
          </p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">Supabase sync on</p>
        </div>
      </div>
      <Button type="button" variant="outline" size="sm" className="w-full" onClick={signOut}>
        <LogOut className="h-3.5 w-3.5" />
        Sign Out
      </Button>
    </div>
  );
}
