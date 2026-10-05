import { createServerFn } from "@tanstack/react-start";

import type { LiquidacionCalc, LiquidacionInput } from "./liquidacion";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PNG_PREFIX = "data:image/png;base64,";
const MAX_FIRMA_CHARS = 500_000;

function parseToken(input: unknown): string {
  const token = (input as { token?: unknown } | null)?.token;
  if (typeof token !== "string" || !UUID_RE.test(token)) throw new Error("Enlace inválido");
  return token.toLowerCase();
}

export interface SharedLiquidacionView {
  employeeName: string;
  data: { input: LiquidacionInput; calc: LiquidacionCalc };
  firma: string | null;
  signedAt: string | null;
  logoUrl: string | null;
}

/** Lectura pública (sin sesión) de una liquidación compartida, por token. */
export const getSharedLiquidacion = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string }) => ({ token: parseToken(input) }))
  .handler(async ({ data }): Promise<SharedLiquidacionView | null> => {
    const { appDbAdmin: supabaseAdmin } = await import("@/integrations/supabase/app.server");
    const { data: row, error } = await supabaseAdmin
      .from("shared_liquidaciones")
      .select("employee_name, data, logo_path, firma, signed_at")
      .eq("token", data.token)
      .maybeSingle();
    if (error) console.error("[getSharedLiquidacion] query failed:", error.code, error.message);
    else if (!row) console.error("[getSharedLiquidacion] no row for token");
    if (error || !row) return null;

    let logoUrl: string | null = null;
    if (row.logo_path && !row.logo_path.endsWith(".pdf")) {
      const { data: signed } = await supabaseAdmin.storage
        .from("logos")
        .createSignedUrl(row.logo_path, 3600);
      logoUrl = signed?.signedUrl ?? null;
    }

    return {
      employeeName: row.employee_name,
      data: row.data as unknown as SharedLiquidacionView["data"],
      firma: row.firma,
      signedAt: row.signed_at,
      logoUrl,
    };
  });

/** Guarda la firma del trabajador (una sola vez) en una liquidación compartida. */
export const signSharedLiquidacion = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string; firma: string }) => {
    const token = parseToken(input);
    const firma = (input as { firma?: unknown }).firma;
    if (
      typeof firma !== "string" ||
      !firma.startsWith(PNG_PREFIX) ||
      firma.length > MAX_FIRMA_CHARS
    )
      throw new Error("Firma inválida");
    return { token, firma };
  })
  .handler(async ({ data }): Promise<{ ok: boolean; reason?: "already_signed" | "not_found" }> => {
    const { appDbAdmin: supabaseAdmin } = await import("@/integrations/supabase/app.server");
    const { data: updated, error } = await supabaseAdmin
      .from("shared_liquidaciones")
      .update({ firma: data.firma, signed_at: new Date().toISOString() })
      .eq("token", data.token)
      .is("signed_at", null)
      .select("id");
    if (error) throw new Error("No se pudo guardar la firma");
    if (updated && updated.length > 0) return { ok: true };

    const { data: row } = await supabaseAdmin
      .from("shared_liquidaciones")
      .select("signed_at")
      .eq("token", data.token)
      .maybeSingle();
    return { ok: false, reason: row ? "already_signed" : "not_found" };
  });
