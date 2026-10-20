import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DOTACION_SECCIONES, dotacionFilas, type DotacionInput } from "@/lib/dotacion";
import type { Company } from "@/lib/hr";

const SIN_LOGO = "none";

interface Props {
  value: DotacionInput;
  onChange: (next: DotacionInput) => void;
  companies: readonly Company[];
}

export function DotacionForm({ value, onChange, companies }: Props) {
  const set = <K extends keyof DotacionInput>(key: K, v: DotacionInput[K]) =>
    onChange({ ...value, [key]: v });

  const toggle = (key: string, on: boolean) =>
    set("entregados", on ? [...value.entregados, key] : value.entregados.filter((k) => k !== key));

  const text = (id: string, label: string, key: "nombre" | "cedula" | "cargo" | "proceso") => (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <Input id={id} value={value[key]} onChange={(e) => set(key, e.target.value)} />
    </div>
  );

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Datos del funcionario
      </p>
      <div className="space-y-1">
        <Label htmlFor="dot-empresa" className="text-xs">
          Logo (empresa)
        </Label>
        <Select
          value={value.empresaId ?? SIN_LOGO}
          onValueChange={(v) => set("empresaId", v === SIN_LOGO ? null : v)}
        >
          <SelectTrigger id="dot-empresa">
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
      <div className="space-y-1">
        <Label htmlFor="dot-fecha" className="text-xs">
          Fecha de entrega
        </Label>
        <Input
          id="dot-fecha"
          type="date"
          value={value.fecha}
          onChange={(e) => set("fecha", e.target.value)}
        />
      </div>
      {text("dot-nombre", "Nombre", "nombre")}
      <div className="grid grid-cols-2 gap-3">
        {text("dot-cedula", "C.C.", "cedula")}
        {text("dot-cargo", "Cargo", "cargo")}
      </div>
      {text("dot-proceso", "Proceso", "proceso")}

      <p className="text-[11px] text-muted-foreground">
        Marca al menos un elemento en cualquiera de las dos secciones.
      </p>
      {DOTACION_SECCIONES.map((s) => (
        <div key={s.key} className="space-y-2">
          <p className="pt-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {s.titulo}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {dotacionFilas(s.key)
              .flat()
              .map((it) => {
                if (!it) return null;
                const id = `dot-${it.key.replace(":", "-")}`;
                return (
                  <div key={it.key} className="flex items-center gap-2">
                    <Checkbox
                      id={id}
                      checked={value.entregados.includes(it.key)}
                      onCheckedChange={(c) => toggle(it.key, c === true)}
                    />
                    <Label htmlFor={id} className="text-xs font-normal">
                      {it.label}
                    </Label>
                  </div>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}
