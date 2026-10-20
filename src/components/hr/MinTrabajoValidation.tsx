import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2, ShieldCheck, TriangleAlert, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fmtCOP, type LiquidacionCalc, type LiquidacionInput } from "@/lib/liquidacion";
import {
  compareLiquidacion,
  hasManualOverrides,
  toMinTrabajoPayload,
  type MinTrabajoValues,
} from "@/lib/mintrabajo-compare";
import { validateWithMinTrabajo } from "@/lib/mintrabajo.functions";

const ARL_CLASSES = ["I", "II", "III", "IV", "V"] as const;

interface Props {
  input: LiquidacionInput;
  calc: LiquidacionCalc;
}

/** Valida la liquidación contra la calculadora laboral pública del MinTrabajo. */
export function MinTrabajoValidation({ input, calc }: Props) {
  const validate = useServerFn(validateWithMinTrabajo);
  const [claseRiesgo, setClaseRiesgo] = useState("1");
  const [dosOMas, setDosOMas] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ext, setExt] = useState<MinTrabajoValues | null>(null);

  const payload = toMinTrabajoPayload(input, {
    claseRiesgo: Number(claseRiesgo),
    dosOMasTrabajadores: dosOMas,
  });
  const payloadKey = JSON.stringify(payload);

  // El resultado deja de ser válido en cuanto cambian los datos enviados o lo calculado.
  useEffect(() => {
    setExt(null);
    setError(null);
  }, [payloadKey, calc.total]);

  const canRun = Boolean(input.fechaIngreso && input.fechaHasta && input.salario > 0);

  async function run() {
    setLoading(true);
    setError(null);
    setExt(null);
    try {
      const res = await validate({ data: payload });
      if (res.error) setError(res.error);
      else setExt(res.result);
    } catch {
      setError("No se pudo validar con el MinTrabajo. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  const comparison = ext ? compareLiquidacion(calc, ext) : null;

  return (
    <div className="rounded-xl border bg-surface p-6 shadow-panel">
      <div className="flex items-center gap-2">
        <ShieldCheck className="size-4 text-muted-foreground" />
        <p className="text-xs tracking-wide text-muted-foreground uppercase">
          Validación con MinTrabajo
        </p>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Calcula con la calculadora laboral del Ministerio del Trabajo y compara. Solo se envían
        fechas, salario y opciones; nunca nombre ni cédula.
      </p>

      <div className="mt-3 flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="mt-arl">Clase de riesgo ARL</Label>
          <Select value={claseRiesgo} onValueChange={setClaseRiesgo}>
            <SelectTrigger id="mt-arl" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ARL_CLASSES.map((c, idx) => (
                <SelectItem key={c} value={String(idx + 1)}>
                  Clase {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 pb-2">
          <Checkbox id="mt-dos" checked={dosOMas} onCheckedChange={(v) => setDosOMas(v === true)} />
          <Label htmlFor="mt-dos">Empleador con 2 o más trabajadores</Label>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          disabled={loading || !canRun}
          onClick={() => void run()}
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ShieldCheck className="size-4" />
          )}
          Validar con MinTrabajo
        </Button>
      </div>

      {error && (
        <p className="mt-3 flex items-start gap-2 text-sm text-destructive" role="alert">
          <XCircle className="mt-0.5 size-4 shrink-0" /> {error}
        </p>
      )}

      {comparison && (
        <div className="mt-4 space-y-3">
          {hasManualOverrides(input) && (
            <p className="flex items-start gap-2 text-[12px] text-warning-foreground">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              Esta liquidación tiene días, divisores o valor de cesantías modificados a mano; se
              esperan diferencias frente al MinTrabajo.
            </p>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Concepto</TableHead>
                <TableHead className="text-right">App</TableHead>
                <TableHead className="text-right">MinTrabajo</TableHead>
                <TableHead className="text-right">Diferencia</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparison.rows.map((r) => (
                <TableRow key={r.key} className={r.key === "total" ? "font-semibold" : undefined}>
                  <TableCell>{r.label}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtCOP(r.app)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtCOP(r.mintrabajo)}</TableCell>
                  <TableCell
                    className={`text-right tabular-nums ${r.ok ? "text-success" : "text-destructive"}`}
                  >
                    <span className="inline-flex items-center justify-end gap-1">
                      {r.ok ? (
                        <CheckCircle2 className="size-3.5" />
                      ) : (
                        <XCircle className="size-3.5" />
                      )}
                      {fmtCOP(r.diff)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="text-[11px] text-muted-foreground">
            {comparison.allOk
              ? "Los valores coinciden con el MinTrabajo."
              : "Hay diferencias. El MinTrabajo cuenta los días en base 30/360 y usa su propio auxilio de transporte."}
          </p>
        </div>
      )}
    </div>
  );
}
