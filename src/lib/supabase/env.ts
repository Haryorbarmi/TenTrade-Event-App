// Public Supabase settings. Safe for the browser: access is limited by RLS.
export function supabaseUrl(): string {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!value) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL. Copy .env.example to .env.local and fill it in.");
  return value;
}

export function supabaseAnonKey(): string {
  const value = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!value) throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY. Copy .env.example to .env.local and fill it in.");
  return value;
}
