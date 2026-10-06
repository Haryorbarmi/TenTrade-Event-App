import { createBrowserClient } from "@supabase/ssr";
import { supabaseAnonKey, supabaseUrl } from "./env";

// Browser client for Realtime and reads. Every query is limited by RLS.
export function createClient() {
  return createBrowserClient(supabaseUrl(), supabaseAnonKey());
}
