// Server middleware that validates the bearer token against the app's own Supabase project
// and exposes a user-scoped client (RLS applies). Use instead of "./auth-middleware",
// which validates against Lovable Cloud.
import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";

import { APP_DB_PUBLISHABLE_KEY, APP_DB_URL, createSupabaseFetch } from "./app-config";
import type { Database } from "./types";

export const requireAppAuth = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const url = process.env["APP_DB_URL"]?.trim() || APP_DB_URL;

  const request = getRequest();
  const authHeader = request?.headers?.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Unauthorized: No bearer token provided");
  }

  const token = authHeader.slice("Bearer ".length);
  if (token.split(".").length !== 3) {
    throw new Error("Unauthorized: Invalid token");
  }

  const supabase = createClient<Database>(url, APP_DB_PUBLISHABLE_KEY, {
    global: {
      fetch: createSupabaseFetch(APP_DB_PUBLISHABLE_KEY),
      headers: { Authorization: `Bearer ${token}` },
    },
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims?.sub) {
    throw new Error("Unauthorized: Invalid token");
  }

  return next({
    context: {
      supabase,
      userId: data.claims.sub,
      claims: data.claims,
    },
  });
});
