import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DNL_MESES,
  quincenaDe,
  type DiasNoLaboradosInput,
  type Quincena,
} from "@/lib/dias-no-laborados";
import type { Company } from "@/lib/hr";

const SIN_LOGO = "none";

type TextKey = Exclude<keyof DiasNoLaboradosInput, "empresaId" | "quincena" | "quincenaMes">;

interface Props {
  value: DiasNoLaboradosInput;
  onChange: (next: DiasNoLaboradosInput) => void;
  companies: readonly Company[];
}

export function DiasNoLaboradosForm({ value, onChange, companies }: Props) {
  const set = <K extends keyof DiasNoLaboradosInput>(key: K, v: DiasNoLaboradosInput[K]) =>
    onChange({ ...value, [key]: v });

  /* Al elegir el primer día se sugiere la quincena y el mes en que cae. */
  const setDesde = (desde: string) => {
    const q = quincenaDe(desde);
    onChange({
      ...value,
      desde,
      ...(q.quincena ? { quincena: q.quincena, quincenaMes: q.mes } : {}),
    });
  };

  const field = (key: TextKey, label: string, type = "text") => (
    <div className="space-y-1">
      <Label htmlFor={`dnl-${key}`} className="text-xs">
        {label}
      </Label>
      <Input
        id={`dnl-${key}`}
        type={type}
        value={value[key]}
        onChange={(e) => (key === "desde" ? setDesde(e.target.value) : set(key, e.target.value))}
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
        <Label htmlFor="dnl-empresa" className="text-xs">
          Logo (empresa)
        </Label>
        <Select
          value={value.empresaId ?? SIN_LOGO}
          onValueChange={(v) => set("empresaId", v === SIN_LOGO ? null : v)}
        >
          <SelectTrigger id="dnl-empresa">
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
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="dnl-quincena" className="text-xs">
            Quincena
          </Label>
          <Select value={value.quincena} onValueChange={(v) => set("quincena", v as Quincena)}>
            <SelectTrigger id="dnl-quincena">
              <SelectValue placeholder="Elige" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="primera">Primera</SelectItem>
              <SelectItem value="segunda">Segunda</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="dnl-mes" className="text-xs">
            Del mes de
          </Label>
          <Select value={value.quincenaMes} onValueChange={(v) => set("quincenaMes", v)}>
            <SelectTrigger id="dnl-mes">
              <SelectValue placeholder="Elige" />
            </SelectTrigger>
            <SelectContent>
              {DNL_MESES.map((m, k) => (
                <SelectItem key={m} value={String(k + 1)}>
                  {m[0]!.toUpperCase() + m.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
