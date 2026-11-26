// Browser/SSR Supabase client for the app's own Supabase project.
// Use this instead of "./client" (Lovable-generated, points to Lovable Cloud).
import { createClient } from "@supabase/supabase-js";

import { APP_DB_PUBLISHABLE_KEY, APP_DB_URL, createSupabaseFetch } from "./app-config";
import { brokeredPreviewStorage } from "./previewAuthStorage";
import type { Database } from "./types";

function createAppClient() {
  return createClient<Database>(APP_DB_URL, APP_DB_PUBLISHABLE_KEY, {
    global: {
      fetch: createSupabaseFetch(APP_DB_PUBLISHABLE_KEY),
    },
    auth: {
      storage: brokeredPreviewStorage(),
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

let _supabase: ReturnType<typeof createAppClient> | undefined;

export const supabase = new Proxy({} as ReturnType<typeof createAppClient>, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createAppClient();
    return Reflect.get(_supabase, prop, receiver);
  },
});
