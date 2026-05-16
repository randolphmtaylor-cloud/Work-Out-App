"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle, Loader2, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

function hasSupabaseEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder") &&
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes("placeholder")
  );
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState<"magic" | "password" | "signup" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const redirectTo = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    const callback = new URL("/auth/callback", window.location.origin);
    callback.searchParams.set("next", next);
    return callback.toString();
  }, [next]);

  const requireEmail = () => {
    if (email.trim()) return true;
    setError("Enter your email address first.");
    return false;
  };

  const sendMagicLink = async () => {
    if (!requireEmail()) return;
    setLoading("magic");
    setError(null);
    setMessage(null);

    const supabase = createClient();
    const { error: magicError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo },
    });

    setLoading(null);
    if (magicError) {
      setError(magicError.message);
      return;
    }
    setMessage("Check your email for a magic sign-in link.");
  };

  const signInWithPassword = async () => {
    if (!requireEmail()) return;
    if (!password) {
      setError("Enter your password, or use the magic link option.");
      return;
    }
    setLoading("password");
    setError(null);
    setMessage(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(null);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    router.push(next);
    router.refresh();
  };

  const createAccount = async () => {
    if (!requireEmail()) return;
    if (!password) {
      setError("Choose a password to create an email/password account.");
      return;
    }
    setLoading("signup");
    setError(null);
    setMessage(null);

    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: redirectTo },
    });

    setLoading(null);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    if (data.session) {
      router.push(next);
      router.refresh();
      return;
    }
    setMessage("Account created. Check your email to confirm your address.");
  };

  if (!hasSupabaseEnv()) {
    return (
      <section className="w-full rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
          <AlertCircle className="h-5 w-5" />
        </div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Supabase is not configured</h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable sign in and cloud sync.
        </p>
        <Button asChild className="mt-5 w-full" variant="outline">
          <Link href="/dashboard">Continue in local-only mode</Link>
        </Button>
      </section>
    );
  }

  return (
    <section className="w-full rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-white">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Sign in</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Sync imports and workout history with Supabase.</p>
        </div>
      </div>

      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void signInWithPassword();
        }}
      >
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            placeholder="you@example.com"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            placeholder="Optional for magic link"
          />
        </div>

        {message && (
          <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-900/60 dark:bg-green-950/30 dark:text-green-300">
            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {message}
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="grid gap-2">
          <Button type="submit" className="w-full" disabled={Boolean(loading)}>
            {loading === "password" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Sign In With Password
          </Button>
          <Button type="button" variant="outline" className="w-full" disabled={Boolean(loading)} onClick={sendMagicLink}>
            {loading === "magic" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
            Send Magic Link
          </Button>
          <Button type="button" variant="ghost" className="w-full" disabled={Boolean(loading)} onClick={createAccount}>
            {loading === "signup" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Create Account
          </Button>
        </div>
      </form>
    </section>
  );
}
