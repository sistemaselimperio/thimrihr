import { createServerFn } from "@tanstack/react-start";

import type { Json } from "@/integrations/supabase/types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PNG_PREFIX = "data:image/png;base64,";
const MAX_FIRMA_CHARS = 500_000;

function parseToken(input: unknown): string {
  const token = (input as { token?: unknown } | null)?.token;
  if (typeof token !== "string" || !UUID_RE.test(token)) throw new Error("Enlace inválido");
  return token.toLowerCase();
}

export interface SharedLiquidacionView {
  /** Tipo de documento (clave del registro de documentos especiales). */
  kind: string;
  employeeName: string;
  /** Lo que guardó `share.pack` del documento; lo interpreta su propia vista. */
  data: Json;
  firma: string | null;
  signedAt: string | null;
  logoUrl: string | null;
}

/** Lectura pública (sin sesión) de un documento compartido para firmar, por token. */
export const getSharedLiquidacion = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string }) => ({ token: parseToken(input) }))
  .handler(async ({ data }): Promise<SharedLiquidacionView | null> => {
    const { appDbAdmin: supabaseAdmin } = await import("@/integrations/supabase/app.server");
    const { data: row, error } = await supabaseAdmin
      .from("shared_liquidaciones")
      .select("kind, employee_name, data, logo_path, firma, signed_at")
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
      kind: row.kind,
      employeeName: row.employee_name,
      data: row.data,
      firma: row.firma,
      signedAt: row.signed_at,
      logoUrl,
    };
  });

/** Guarda la firma del trabajador (una sola vez) en un documento compartido. */
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
