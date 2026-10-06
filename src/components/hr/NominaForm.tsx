import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MONTHS_LONG } from "@/lib/hr";
import type { NominaInput } from "@/lib/nomina";

interface Props {
  value: NominaInput;
  onChange: (next: NominaInput) => void;
}

/** Solo dígitos; vacío = 0. */
function parseNum(raw: string): number {
  const digits = raw.replace(/\D/g, "");
  return digits ? Number(digits) : 0;
}

export function NominaForm({ value, onChange }: Props) {
  const set = <K extends keyof NominaInput>(key: K, v: NominaInput[K]) =>
    onChange({ ...value, [key]: v });

  const text = (id: string, label: string, key: "nombre" | "cedula" | "expedicion") => (
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
    key: "salario" | "auxilio" | "dias" | "anio" | "otrasDeducciones",
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

  const pct = (id: string, label: string, key: "tasaSalud" | "tasaPension") => (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <Input
        id={id}
        type="number"
        step="0.01"
        min="0"
        value={value[key]}
        onChange={(e) => set(key, Number(e.target.value) || 0)}
      />
    </div>
  );

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Datos de la nómina
      </p>
      {text("nom-nombre", "Nombre del trabajador", "nombre")}
      <div className="grid grid-cols-2 gap-3">
        {text("nom-cedula", "Cédula", "cedula")}
        {text("nom-exp", "Expedida en", "expedicion")}
      </div>
      <div className="space-y-1">
        <Label htmlFor="nom-ingreso" className="text-xs">
          Fecha de ingreso
        </Label>
        <Input
          id="nom-ingreso"
          type="date"
          value={value.fechaIngreso}
          onChange={(e) => set("fechaIngreso", e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="nom-mes" className="text-xs">
            Mes
          </Label>
          <Select value={String(value.mes)} onValueChange={(v) => set("mes", Number(v))}>
            <SelectTrigger id="nom-mes">
              <SelectValue placeholder="Elige el mes" />
            </SelectTrigger>
            <SelectContent>
              {MONTHS_LONG.map((m, idx) => (
                <SelectItem key={m} value={String(idx)}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {num("nom-anio", "Año", "anio")}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {num("nom-salario", "Salario mensual", "salario", true)}
        {num("nom-dias", "N° días", "dias", true)}
      </div>
      {num("nom-auxilio", "Auxilio de transporte mensual", "auxilio")}

      <p className="pt-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Deducciones
      </p>
      <div className="grid grid-cols-2 gap-3">
        {pct("nom-salud", "Salud (tasa)", "tasaSalud")}
        {pct("nom-pension", "Pensión (tasa)", "tasaPension")}
      </div>
      {num("nom-otras", "Otras deducciones", "otrasDeducciones")}
    </div>
  );
}
