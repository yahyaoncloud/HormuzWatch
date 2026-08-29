import { type SupabaseClient, createClient } from "@supabase/supabase-js";
import { env } from "@/environments/environment";

// ── Client factory (not cached — always uses current env) ──────────
// createClient is cheap (no network), so we build a fresh instance each
// time. This ensures .env changes take effect immediately after restart.

let _client: SupabaseClient | undefined;
let _clientUrl = "";

function getClient(): SupabaseClient {
  if (!env.supabase.url || !env.supabase.anonKey) {
    throw new Error(
      "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env"
    );
  }
  // Recreate if URL changed (handles .env edits between dev restarts)
  if (!_client || _clientUrl !== env.supabase.url) {
    _clientUrl = env.supabase.url;
    _client = createClient(env.supabase.url, env.supabase.anonKey, {
      auth: { autoRefreshToken: true, persistSession: true },
    });
  }
  return _client;
}

/** True when Supabase is available (env vars are set). */
export function isSupabaseAvailable(): boolean {
  return !!(env.supabase.url && env.supabase.anonKey);
}

/** Returns the Supabase client. Throws if not configured. */
export { getClient as getSupabase };

// ── Auth helpers ───────────────────────────────────────────────────

export async function getSession() {
  const { data } = await getClient().auth.getSession();
  return data.session;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await getClient().auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await getClient().auth.signOut();
  if (error) throw error;
}

export async function signUp(email: string, password: string) {
  const { data, error } = await getClient().auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export function onAuthStateChange(
  callback: (event: string, session: import("@supabase/supabase-js").Session | null) => void
) {
  return getClient().auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
}
