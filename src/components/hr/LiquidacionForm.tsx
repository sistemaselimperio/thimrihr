import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { calendarDaysInclusive, type Company } from "@/lib/hr";
import {
  DEPENDENCIAS,
  calcLiquidacion,
  dependenciaNombre,
  fmtCOP,
  type DependenciaKey,
  type LiquidacionInput,
} from "@/lib/liquidacion";

interface Props {
  value: LiquidacionInput;
  onChange: (next: LiquidacionInput) => void;
  companies: readonly Company[];
}

/** Solo dígitos; vacío = 0. */
function parseNum(raw: string): number {
  const digits = raw.replace(/\D/g, "");
  return digits ? Number(digits) : 0;
}

export function LiquidacionForm({ value, onChange, companies }: Props) {
  const set = <K extends keyof LiquidacionInput>(key: K, v: LiquidacionInput[K]) => {
    /* Los días de servicio se copian a los días de cada concepto (luego se pueden ajustar). */
    if (key === "diasServicio") {
      const dias = v as number;
      onChange({
        ...value,
        diasServicio: dias,
        diasCesantias: dias,
        diasIntereses: dias,
        diasPrima: dias,
        diasVacaciones: dias,
      });
      return;
    }
    onChange({ ...value, [key]: v });
  };

  /* Al cambiar fechas se recalculan los días de servicio y se copian a cada concepto. */
  const setDates = (patch: Partial<Pick<LiquidacionInput, "fechaIngreso" | "fechaHasta">>) => {
    const next = { ...value, ...patch };
    const dias =
      next.fechaIngreso && next.fechaHasta
        ? calendarDaysInclusive(next.fechaIngreso, next.fechaHasta)
        : 0;
    onChange({
      ...next,
      diasServicio: dias,
      diasCesantias: dias,
      diasIntereses: dias,
      diasPrima: dias,
      diasVacaciones: dias,
    });
  };

  const text = (
    id: string,
    label: string,
    key: "ciudad" | "nombre" | "cedula" | "cargo" | "dependencia",
  ) => (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <Input id={id} value={value[key]} onChange={(e) => set(key, e.target.value)} />
    </div>
  );

  const num = (
    id: string,
    label: string,
    key:
      | "diasServicio"
      | "salario"
      | "auxilio"
      | "diasCesantias"
      | "diasIntereses"
      | "diasPrima"
      | "diasVacaciones"
      | "divCesantias"
      | "divIntereses"
      | "divPrima"
      | "divVacaciones",
    required = false,
  ) => (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs">
        {label} {required && <span className="text-danger-foreground">*</span>}
      </Label>
      <Input
        id={id}
        inputMode="numeric"
        value={value[key] ? String(value[key]) : ""}
        placeholder="0"
        onChange={(e) => set(key, parseNum(e.target.value))}
      />
    </div>
  );

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Datos de la liquidación
      </p>
      <div className="grid grid-cols-2 gap-3">
        {text("liq-ciudad", "Ciudad", "ciudad")}
        <div className="space-y-1">
          <Label htmlFor="liq-fecha" className="text-xs">
            Fecha del documento
          </Label>
          <Input
            id="liq-fecha"
            type="date"
            value={value.fecha}
            onChange={(e) => set("fecha", e.target.value)}
          />
        </div>
      </div>
      {text("liq-nombre", "Nombre del trabajador", "nombre")}
      <div className="grid grid-cols-2 gap-3">
        {text("liq-cedula", "Cédula", "cedula")}
        {text("liq-cargo", "Cargo", "cargo")}
      </div>
      <div className="space-y-1">
        <Label htmlFor="liq-dep-key" className="text-xs">
          Dependencia
        </Label>
        <Select
          value={value.dependenciaKey}
          onValueChange={(v) => {
            const key = v as DependenciaKey;
            onChange({
              ...value,
              dependenciaKey: key,
              dependencia: dependenciaNombre(key, companies),
            });
          }}
        >
          <SelectTrigger id="liq-dep-key">
            <SelectValue placeholder="Elige la dependencia" />
          </SelectTrigger>
          <SelectContent>
            {DEPENDENCIAS.map((d) => (
              <SelectItem key={d.key} value={d.key}>
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {text("liq-dep", "Nombre de la dependencia en el documento", "dependencia")}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="liq-ingreso" className="text-xs">
            Fecha de ingreso
          </Label>
          <Input
            id="liq-ingreso"
            type="date"
            value={value.fechaIngreso}
            onChange={(e) => setDates({ fechaIngreso: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="liq-hasta" className="text-xs">
            Hasta
          </Label>
          <Input
            id="liq-hasta"
            type="date"
            value={value.fechaHasta}
            onChange={(e) => setDates({ fechaHasta: e.target.value })}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {num("liq-dias", "Días de servicio", "diasServicio")}
        {num("liq-salario", "Salario básico mensual", "salario", true)}
      </div>
      {num("liq-auxilio", "Auxilio de transporte", "auxilio")}

      <p className="pt-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Días trabajados / divisor por concepto
      </p>
      <div className="grid grid-cols-2 gap-3">
        {num("liq-d-ces", "Cesantías: días", "diasCesantias")}
        {num("liq-v-ces", "Cesantías: divisor", "divCesantias")}
        {num("liq-d-int", "Intereses: días", "diasIntereses")}
        {num("liq-v-int", "Intereses: divisor", "divIntereses")}
        {num("liq-d-pri", "Prima: días", "diasPrima")}
        {num("liq-v-pri", "Prima: divisor", "divPrima")}
        {num("liq-d-vac", "Vacaciones: días", "diasVacaciones")}
        {num("liq-v-vac", "Vacaciones: divisor", "divVacaciones")}
      </div>

      <p className="pt-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Intereses de cesantías
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="liq-val-ces" className="text-xs">
            Valor cesantías
          </Label>
          <Input
            id="liq-val-ces"
            inputMode="numeric"
            value={value.valorCesantias === null ? "" : String(value.valorCesantias)}
            placeholder={fmtCOP(calcLiquidacion(value).cesantias)}
            onChange={(e) =>
              set("valorCesantias", e.target.value.trim() ? parseNum(e.target.value) : null)
            }
          />
          <p className="text-[10px] text-muted-foreground">Vacío = usa las cesantías calculadas.</p>
        </div>
        <div className="space-y-1">
          <Label htmlFor="liq-tasa" className="text-xs">
            Tasa
          </Label>
          <Input
            id="liq-tasa"
            type="number"
            step="0.01"
            min="0"
            value={value.tasaIntereses}
            onChange={(e) => set("tasaIntereses", Number(e.target.value) || 0)}
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="liq-obs" className="text-xs">
          Observaciones
        </Label>
        <Textarea
          id="liq-obs"
          rows={3}
          value={value.observaciones ?? ""}
          placeholder="Opcional. Aparece debajo del total de la liquidación."
          onChange={(e) => set("observaciones", e.target.value)}
        />
      </div>
    </div>
  );
}
