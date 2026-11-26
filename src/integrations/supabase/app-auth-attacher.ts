// Attaches the signed-in user's token (from the app's own Supabase project) to serverFn RPCs.
// Registered as a global `functionMiddleware` in `src/start.ts`.
import { createMiddleware } from "@tanstack/react-start";

import { supabase } from "./app-client";

export const attachAppAuth = createMiddleware({ type: "function" }).client(async ({ next }) => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return next({
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
});
