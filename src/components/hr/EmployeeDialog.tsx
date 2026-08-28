import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { qk, updateRow, useCompanies, useEmployees } from "@/lib/data";
import { supabase } from "@/integrations/supabase/client";
import { useCelebration } from "@/components/hr/Celebration";
import { useNavigate } from "@tanstack/react-router";
import type { Employee } from "@/lib/hr";

type Form = {
  folder_number: string;
  cedula: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  landline: string;
  company_id: string;
  position: string;
  work_location: string;
  municipality: string;
  work_schedule: string;
  hire_date: string;
  contract_type: string;
  contract_end_date: string;
  exit_date: string;
  status: string;
  notes: string;
};

const blank: Form = {
  folder_number: "",
  cedula: "",
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  landline: "",
  company_id: "",
  position: "",
  work_location: "",
  municipality: "",
  work_schedule: "",
  hire_date: "",
  contract_type: "fijo",
  contract_end_date: "",
  exit_date: "",
  status: "activo",
  notes: "",
};

const NAME_RE = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' ]{2,}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?\d{6,15}$/;

/** Divide un nombre completo en nombres y apellidos (2 últimas palabras = apellidos). */
function splitName(full: string) {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { first: full.trim(), last: "" };
  if (parts.length === 2) return { first: parts[0], last: parts[1] };
  if (parts.length === 3) return { first: parts[0], last: parts.slice(1).join(" ") };
  return { first: parts.slice(0, parts.length - 2).join(" "), last: parts.slice(-2).join(" ") };
}

type Errors = Partial<Record<keyof Form, string>>;

export function EmployeeDialog({
  open,
  onOpenChange,
  employee,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: Employee | null;
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const celebrate = useCelebration();
  const { data: companies = [] } = useCompanies();
  const { data: employees = [] } = useEmployees();
  const [form, setForm] = useState<Form>(blank);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (!employee) {
      setForm(blank);
      return;
    }
    const fallback = splitName(employee.full_name);
    setForm({
      folder_number: employee.folder_number ?? "",
      cedula: employee.cedula,
      first_name: employee.first_name ?? fallback.first,
      last_name: employee.last_name ?? fallback.last,
      email: employee.email ?? "",
      phone: employee.phone ?? "",
      landline: employee.landline ?? "",
      company_id: employee.company_id ?? "",
      position: employee.position ?? "",
      work_location: employee.work_location ?? "",
      municipality: employee.municipality ?? "",
      work_schedule: employee.work_schedule ?? "",
      hire_date: employee.hire_date ?? "",
      contract_type:
        employee.contract_type ?? (employee.contract_end_date ? "fijo" : "indefinido"),
      contract_end_date: employee.contract_end_date ?? "",
      exit_date: employee.exit_date ?? "",
      status: employee.status,
      notes: employee.notes ?? "",
    });
  }, [open, employee]);

  const set = (patch: Partial<Form>) => {
    setForm((prev) => ({ ...prev, ...patch }));
    setErrors((prev) => {
      const next = { ...prev };
      (Object.keys(patch) as (keyof Form)[]).forEach((k) => delete next[k]);
      return next;
    });
  };

  const cedulasUsadas = useMemo(
    () =>
      new Set(
        employees.filter((e) => e.id !== employee?.id).map((e) => e.cedula.trim()),
      ),
    [employees, employee?.id],
  );

  const validate = (): Errors => {
    const e: Errors = {};
    const cedula = form.cedula.trim();
    if (!cedula) e.cedula = "La cédula es obligatoria";
    else if (!/^\d{5,15}$/.test(cedula)) e.cedula = "Solo números, sin guiones ni espacios";
    else if (!employee && cedulasUsadas.has(cedula)) e.cedula = "Ya existe un empleado con esta cédula";

    if (!NAME_RE.test(form.first_name.trim()))
      e.first_name = "Mínimo 2 caracteres, solo letras";
    if (!NAME_RE.test(form.last_name.trim())) e.last_name = "Mínimo 2 caracteres, solo letras";
    if (form.email.trim() && !EMAIL_RE.test(form.email.trim()))
      e.email = "Correo no válido (ej: usuario@dominio.com)";
    if (!form.phone.trim()) e.phone = "El celular es obligatorio";
    else if (!PHONE_RE.test(form.phone.replace(/[\s-]/g, "")))
      e.phone = "Solo números (puede incluir +57)";
    if (form.landline.trim() && !PHONE_RE.test(form.landline.replace(/[\s-]/g, "")))
      e.landline = "Solo números";

    if (!form.company_id) e.company_id = "Selecciona la empresa";
    if (!form.position.trim()) e.position = "El cargo es obligatorio";
    if (!form.hire_date) e.hire_date = "La fecha de ingreso es obligatoria";

    if (form.contract_type === "fijo") {
      if (!form.contract_end_date) e.contract_end_date = "Obligatoria en contratos a término fijo";
      else if (form.hire_date && form.contract_end_date <= form.hire_date)
        e.contract_end_date = "Debe ser posterior a la fecha de ingreso";
    }
    if (form.exit_date && form.hire_date && form.exit_date < form.hire_date)
      e.exit_date = "Debe ser posterior a la fecha de ingreso";
    if (form.status === "retirado" && !form.exit_date)
      e.exit_date = "Ingresa la fecha de salida para marcar como retirado";

    if (form.work_schedule.trim() && !/\d\s*(:\d{2})?\s*(am|pm)?\s*[-–a]\s*\d/i.test(form.work_schedule.trim()))
      e.work_schedule = "Formato: 6:00am - 4:00pm";

    return e;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const found = validate();
    if (Object.keys(found).length > 0) {
      setErrors(found);
      toast.error("Revisa los campos marcados en rojo");
      return;
    }
    setBusy(true);
    try {
      const first = form.first_name.trim();
      const last = form.last_name.trim();
      const full_name = `${first} ${last}`.trim();
      const row = {
        folder_number: form.folder_number.trim() || null,
        cedula: form.cedula.trim(),
        first_name: first,
        last_name: last,
        full_name,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        landline: form.landline.trim() || null,
        company_id: form.company_id,
        position: form.position.trim(),
        work_location: form.work_location.trim() || null,
        municipality: form.municipality.trim() || null,
        work_schedule: form.work_schedule.trim() || null,
        hire_date: form.hire_date,
        contract_type: form.contract_type,
        contract_end_date:
          form.contract_type === "indefinido" ? null : form.contract_end_date || null,
        exit_date: form.exit_date || null,
        status: form.exit_date ? "retirado" : form.status,
        notes: form.notes.trim() || null,
      };
      const companyName =
        companies.find((c) => c.id === form.company_id)?.name ?? "Sin empresa";
      let newId: string | null = null;
      if (employee) {
        await updateRow("employees", employee.id, row);
      } else {
        const { data, error } = await (supabase as any)
          .from("employees")
          .insert(row)
          .select("id")
          .single();
        if (error) throw new Error(error.message);
        newId = (data as { id: string } | null)?.id ?? null;
      }
      await qc.invalidateQueries({ queryKey: qk.employees });
      onOpenChange(false);
      celebrate({
        title: employee
          ? "¡Cambios guardados exitosamente!"
          : "¡Empleado creado exitosamente!",
        details: [
          { label: "Empleado", value: full_name },
          { label: "Cédula", value: row.cedula },
          { label: "Cargo", value: row.position || "Sin cargo" },
          { label: "Empresa", value: companyName },
        ],
        actionLabel: employee ? "Volver al perfil" : "Continuar a perfil",
        intensity: employee ? "normal" : "high",
        onDone: () => {
          const id = employee?.id ?? newId;
          if (id) void navigate({ to: "/empleados/$id", params: { id } });
        },
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  };

  const err = (field: keyof Form) =>
    errors[field] ? (
      <p className="text-[11px] font-medium text-destructive">{errors[field]}</p>
    ) : null;

  const cls = (field: keyof Form) => (errors[field] ? "border-destructive" : undefined);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{employee ? "Editar empleado" : "Nuevo empleado"}</DialogTitle>
          <DialogDescription>
            {employee ? (
              <>
                {employee.full_name} — los campos marcados con{" "}
                <span className="text-destructive">*</span> son obligatorios.
              </>
            ) : (
              <>
                Los campos marcados con <span className="text-destructive">*</span> son
                obligatorios.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void submit(e)} className="grid gap-4 sm:grid-cols-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:col-span-2">
            Datos personales
          </h3>

          <div className="space-y-1.5">
            <Label htmlFor="folder_number">N° Carpeta</Label>
            <Input
              id="folder_number"
              placeholder="Ej: TRN-2024-0001"
              value={form.folder_number}
              onChange={(e) => set({ folder_number: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cedula">
              Cédula <span className="text-destructive">*</span>
            </Label>
            <Input
              id="cedula"
              inputMode="numeric"
              readOnly={Boolean(employee)}
              className={employee ? "bg-muted" : cls("cedula")}
              value={form.cedula}
              onChange={(e) => set({ cedula: e.target.value })}
            />
            {employee ? (
              <p className="text-[11px] text-muted-foreground">
                La cédula es el identificador único y no se puede modificar.
              </p>
            ) : (
              err("cedula")
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="first_name">
              Nombres <span className="text-destructive">*</span>
            </Label>
            <Input
              id="first_name"
              className={cls("first_name")}
              value={form.first_name}
              onChange={(e) => set({ first_name: e.target.value })}
            />
            {err("first_name")}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="last_name">
              Apellidos <span className="text-destructive">*</span>
            </Label>
            <Input
              id="last_name"
              className={cls("last_name")}
              value={form.last_name}
              onChange={(e) => set({ last_name: e.target.value })}
            />
            {err("last_name")}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              className={cls("email")}
              placeholder="usuario@dominio.com"
              value={form.email}
              onChange={(e) => set({ email: e.target.value })}
            />
            {err("email")}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone">
              Celular <span className="text-destructive">*</span>
            </Label>
            <Input
              id="phone"
              className={cls("phone")}
              placeholder="3144051618"
              value={form.phone}
              onChange={(e) => set({ phone: e.target.value })}
            />
            {err("phone")}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="landline">Teléfono</Label>
            <Input
              id="landline"
              className={cls("landline")}
              placeholder="8762345"
              value={form.landline}
              onChange={(e) => set({ landline: e.target.value })}
            />
            {err("landline")}
          </div>

          <h3 className="mt-2 border-t pt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:col-span-2">
            Información laboral
          </h3>

          <div className="space-y-1.5">
            <Label>
              Empresa <span className="text-destructive">*</span>
            </Label>
            <Select value={form.company_id} onValueChange={(v) => set({ company_id: v })}>
              <SelectTrigger className={cls("company_id")}>
                <SelectValue placeholder="Seleccionar empresa" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {err("company_id")}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="position">
              Cargo <span className="text-destructive">*</span>
            </Label>
            <Input
              id="position"
              className={cls("position")}
              value={form.position}
              onChange={(e) => set({ position: e.target.value })}
            />
            {err("position")}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="work_location">Lugar de trabajo</Label>
            <Input
              id="work_location"
              value={form.work_location}
              onChange={(e) => set({ work_location: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="municipality">Municipio</Label>
            <Input
              id="municipality"
              placeholder="Chiquinquirá, Boyacá"
              value={form.municipality}
              onChange={(e) => set({ municipality: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="work_schedule">Horario</Label>
            <Input
              id="work_schedule"
              className={cls("work_schedule")}
              placeholder="6:00am - 4:00pm"
              value={form.work_schedule}
              onChange={(e) => set({ work_schedule: e.target.value })}
            />
            {err("work_schedule") ?? (
              <p className="text-[11px] text-muted-foreground">Formato: HH:MM - HH:MM</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="hire_date">
              Fecha de ingreso <span className="text-destructive">*</span>
            </Label>
            <Input
              id="hire_date"
              type="date"
              className={cls("hire_date")}
              value={form.hire_date}
              onChange={(e) => set({ hire_date: e.target.value })}
            />
            {err("hire_date")}
          </div>

          <div className="space-y-1.5">
            <Label>
              Tipo de contrato <span className="text-destructive">*</span>
            </Label>
            <Select
              value={form.contract_type}
              onValueChange={(v) =>
                set({
                  contract_type: v,
                  contract_end_date: v === "indefinido" ? "" : form.contract_end_date,
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fijo">Término fijo</SelectItem>
                <SelectItem value="indefinido">Indefinido</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contract_end_date">
              Fin de contrato
              {form.contract_type === "fijo" && <span className="text-destructive"> *</span>}
            </Label>
            <Input
              id="contract_end_date"
              type="date"
              disabled={form.contract_type === "indefinido"}
              className={cls("contract_end_date")}
              value={form.contract_type === "indefinido" ? "" : form.contract_end_date}
              onChange={(e) => set({ contract_end_date: e.target.value })}
            />
            {err("contract_end_date") ?? (
              <p className="text-[11px] text-muted-foreground">
                {form.contract_type === "indefinido"
                  ? "— Sin fecha límite (contrato indefinido)."
                  : "Obligatoria para contratos a término fijo."}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="exit_date">Fecha de salida</Label>
            <Input
              id="exit_date"
              type="date"
              className={cls("exit_date")}
              value={form.exit_date}
              onChange={(e) =>
                set({
                  exit_date: e.target.value,
                  status: e.target.value ? "retirado" : form.status,
                })
              }
            />
            {err("exit_date") ?? (
              <p className="text-[11px] text-muted-foreground">
                Déjala vacía mientras el empleado siga activo.
              </p>
            )}
          </div>

          <h3 className="mt-2 border-t pt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:col-span-2">
            Información adicional
          </h3>

          <div className="space-y-1.5">
            <Label>Estado</Label>
            <Select
              value={form.status}
              onValueChange={(v) =>
                set({ status: v, exit_date: v === "activo" ? "" : form.exit_date })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="activo">Activo</SelectItem>
                <SelectItem value="retirado">Retirado</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Si registras fecha de salida, el estado pasa a Retirado automáticamente.
            </p>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="notes">Observaciones</Label>
            <Textarea
              id="notes"
              rows={3}
              maxLength={500}
              value={form.notes}
              onChange={(e) => set({ notes: e.target.value })}
            />
            <p className="text-[11px] text-muted-foreground">
              {form.notes.length}/500 caracteres
            </p>
          </div>

          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="success" disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              {employee ? "Guardar cambios" : "Crear empleado"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
