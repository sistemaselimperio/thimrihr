import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { MinTrabajoPayload, MinTrabajoValues } from "./mintrabajo-compare";

type ValidateResult = { result: MinTrabajoValues; error: null } | { result: null; error: string };

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Calcula la liquidación en la calculadora del MinTrabajo (vía microservicio con Puppeteer). */
export const validateWithMinTrabajo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: MinTrabajoPayload): MinTrabajoPayload => {
    if (!ISO.test(input?.fechaInicio) || !ISO.test(input?.fechaFin)) {
      throw new Error("Fechas inválidas");
    }
    const salario = Number(input.salario);
    if (!Number.isFinite(salario) || salario <= 0) throw new Error("Salario inválido");
    const claseRiesgo = Math.round(Number(input.claseRiesgo));
    return {
      fechaInicio: input.fechaInicio,
      fechaFin: input.fechaFin,
      salario,
      auxilioTransporte: Boolean(input.auxilioTransporte),
      claseRiesgo: claseRiesgo >= 1 && claseRiesgo <= 5 ? claseRiesgo : 1,
      dosOMasTrabajadores: input.dosOMasTrabajadores !== false,
    };
  })
  .handler(async ({ data }): Promise<ValidateResult> => {
    const url = process.env["MINTRABAJO_VALIDATOR_URL"];
    const token = process.env["MINTRABAJO_VALIDATOR_TOKEN"]?.trim();
    if (!url || !token) {
      return {
        result: null,
        error:
          "El validador del MinTrabajo no está configurado (faltan MINTRABAJO_VALIDATOR_URL y MINTRABAJO_VALIDATOR_TOKEN).",
      };
    }

    try {
      const res = await fetch(`${url.replace(/\/+$/, "")}/liquidacion`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(60_000),
      });
      const body = (await res.json().catch(() => null)) as {
        ok?: boolean;
        result?: MinTrabajoValues;
        error?: string;
      } | null;
      if (!res.ok || !body?.ok || !body.result) {
        return {
          result: null,
          error: body?.error ?? `El validador respondió con error (${res.status}).`,
        };
      }
      const { cesantias, intereses, prima, vacaciones, total } = body.result;
      return { result: { cesantias, intereses, prima, vacaciones, total }, error: null };
    } catch (err) {
      const timedOut =
        err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
      return {
        result: null,
        error: timedOut
          ? "El validador del MinTrabajo tardó demasiado en responder."
          : "No se pudo contactar al validador del MinTrabajo. Verifica que el servicio esté en línea.",
      };
    }
  });
