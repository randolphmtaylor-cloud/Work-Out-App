import { DEMO_USER_ID } from "@/lib/constants/demo";
import { isDemo } from "@/lib/data";

export type AuthStatus = {
  isLocalMode: boolean;
  isAuthenticated: boolean;
  userId: string | null;
  email: string | null;
  error?: string;
};

type UserIdResult =
  | { userId: string; error?: never }
  | { userId: null; error: string };

export async function getAuthStatus(): Promise<AuthStatus> {
  if (isDemo()) {
    return {
      isLocalMode: true,
      isAuthenticated: true,
      userId: DEMO_USER_ID,
      email: null,
    };
  }

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  return {
    isLocalMode: false,
    isAuthenticated: Boolean(data.user),
    userId: data.user?.id ?? null,
    email: data.user?.email ?? null,
    error: data.user ? undefined : error?.message,
  };
}

export async function getCurrentUserId(): Promise<{ userId: string }>;
export async function getCurrentUserId(options: { requireAuth: true }): Promise<UserIdResult>;
export async function getCurrentUserId(options: { requireAuth?: boolean } = {}): Promise<UserIdResult | { userId: string }> {
  if (isDemo()) return { userId: DEMO_USER_ID };

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (data.user) return { userId: data.user.id };

  if (options.requireAuth) {
    return {
      userId: null,
      error: error?.message ?? "Sign in is required.",
    };
  }

  return { userId: DEMO_USER_ID };
}
