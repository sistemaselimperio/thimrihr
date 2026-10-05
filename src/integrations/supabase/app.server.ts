// Server-side Supabase client for the app's own Supabase project (service role - bypasses RLS).
// Uses APP_DB_* env vars because Lovable reserves the SUPABASE_ prefix for its managed project.
// Load inside server handlers: const { appDbAdmin } = await import("@/integrations/supabase/app.server");
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    // New Supabase API keys are opaque strings, not bearer JWTs.
    if (isNewSupabaseApiKey(supabaseKey) && headers.get("Authorization") === `Bearer ${supabaseKey}`) {
      headers.delete("Authorization");
    }

    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

function createAppDbAdminClient() {
  const url = process.env["APP_DB_URL"];
  const serviceKey = process.env["APP_DB_SERVICE_KEY"];

  if (!url || !serviceKey) {
    const missing = [
      ...(!url ? ["APP_DB_URL"] : []),
      ...(!serviceKey ? ["APP_DB_SERVICE_KEY"] : []),
    ];
    const message = `Missing environment variable(s): ${missing.join(", ")}. Add them as Lovable secrets.`;
    console.error(`[AppDb] ${message}`);
    throw new Error(message);
  }

  return createClient<Database>(url, serviceKey, {
    global: { fetch: createSupabaseFetch(serviceKey) },
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

let _appDbAdmin: ReturnType<typeof createAppDbAdminClient> | undefined;

// SECURITY: server-only. Never import from client code.
export const appDbAdmin = new Proxy({} as ReturnType<typeof createAppDbAdminClient>, {
  get(_, prop, receiver) {
    if (!_appDbAdmin) _appDbAdmin = createAppDbAdminClient();
    return Reflect.get(_appDbAdmin, prop, receiver);
  },
});
