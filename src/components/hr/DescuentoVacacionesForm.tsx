import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DescuentoVacacionesInput } from "@/lib/descuento-vacaciones";
import type { Company } from "@/lib/hr";

const SIN_LOGO = "none";

type TextKey = Exclude<keyof DescuentoVacacionesInput, "empresaId">;

interface Props {
  value: DescuentoVacacionesInput;
  onChange: (next: DescuentoVacacionesInput) => void;
  companies: readonly Company[];
}

export function DescuentoVacacionesForm({ value, onChange, companies }: Props) {
  const set = <K extends keyof DescuentoVacacionesInput>(key: K, v: DescuentoVacacionesInput[K]) =>
    onChange({ ...value, [key]: v });

  const field = (key: TextKey, label: string, type = "text") => (
    <div className="space-y-1">
      <Label htmlFor={`dv-${key}`} className="text-xs">
        {label}
      </Label>
      <Input
        id={`dv-${key}`}
        type={type}
        value={value[key]}
        onChange={(e) => set(key, e.target.value)}
      />
    </div>
  );

  const section = (title: string) => (
    <p className="pt-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
      {title}
    </p>
  );

  return (
    <div className="space-y-3">
      {section("Carta")}
      <div className="space-y-1">
        <Label htmlFor="dv-empresa" className="text-xs">
          Logo (empresa)
        </Label>
        <Select
          value={value.empresaId ?? SIN_LOGO}
          onValueChange={(v) => set("empresaId", v === SIN_LOGO ? null : v)}
        >
          <SelectTrigger id="dv-empresa">
            <SelectValue placeholder="Elige la empresa" />
          </SelectTrigger>
          <SelectContent>
            {companies.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
                {!c.logo_path && " (sin logo)"}
              </SelectItem>
            ))}
            <SelectItem value={SIN_LOGO}>Sin logo</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {field("fecha", "Fecha", "date")}

      {section("Empleador (destinatario)")}
      {field("empleador", "Señores")}
      <div className="grid grid-cols-2 gap-3">
        {field("empleadorNit", "NIT")}
        {field("empresaNombre", "Empresa")}
      </div>
      {field("direccion", "Dirección")}

      {section("Trabajador")}
      {field("nombre", "Nombre")}
      <div className="grid grid-cols-2 gap-3">
        {field("cedula", "Cédula")}
        {field("cedulaLugar", "Expedida en")}
      </div>

      {section("Días no laborados")}
      <div className="grid grid-cols-2 gap-3">
        {field("desde", "Del", "date")}
        {field("hasta", "Al", "date")}
      </div>
      {field("dias", "Días de vacaciones a descontar", "number")}
    </div>
  );
}
