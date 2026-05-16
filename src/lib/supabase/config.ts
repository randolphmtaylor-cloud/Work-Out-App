export function getSupabasePublicEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return {
    url,
    anonKey,
    isConfigured:
      Boolean(url) &&
      Boolean(anonKey) &&
      !url?.includes("placeholder") &&
      !anonKey?.includes("placeholder"),
  };
}

export function assertSupabasePublicEnv() {
  const env = getSupabasePublicEnv();

  if (!env.isConfigured || !env.url || !env.anonKey) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  return {
    url: env.url,
    anonKey: env.anonKey,
  };
}
