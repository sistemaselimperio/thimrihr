// Connection settings for the app's own Supabase project (fmlrfgwkgxmcuboqqckn).
// Lovable injects VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY at build time pointing to its
// managed Cloud project, so the app must NOT rely on those variables. The publishable key is a
// public client key (safe to ship in the browser bundle); access is enforced by RLS.
// Override with VITE_APP_DB_URL / VITE_APP_DB_PUBLISHABLE_KEY (client) or APP_DB_URL (server).

const DEFAULT_APP_DB_URL = "https://fmlrfgwkgxmcuboqqckn.supabase.co";
const DEFAULT_APP_DB_PUBLISHABLE_KEY = "sb_publishable_u5HTXEh6uDNyJnjap0GroQ_8DsvZQFE";

function readClientEnv(name: string): string | undefined {
  const value = (import.meta.env as Record<string, string | undefined>)[name];
  return value && value.trim() ? value.trim() : undefined;
}

export const APP_DB_URL = readClientEnv("VITE_APP_DB_URL") ?? DEFAULT_APP_DB_URL;

export const APP_DB_PUBLISHABLE_KEY =
  readClientEnv("VITE_APP_DB_PUBLISHABLE_KEY") ?? DEFAULT_APP_DB_PUBLISHABLE_KEY;

export function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

/** New Supabase API keys are opaque strings, not bearer JWTs: send them only as `apikey`. */
export function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    if (
      isNewSupabaseApiKey(supabaseKey) &&
      headers.get("Authorization") === `Bearer ${supabaseKey}`
    ) {
      headers.delete("Authorization");
    }

    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}
