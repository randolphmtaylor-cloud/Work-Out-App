import { createBrowserClient } from "@supabase/ssr";
import { assertSupabasePublicEnv } from "@/lib/supabase/config";

export function createClient() {
  const { url, anonKey } = assertSupabasePublicEnv();

  return createBrowserClient(url, anonKey);
}
