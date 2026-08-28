import { useEffect, useState } from "react";
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
import { qk, updateRow, useCompanies } from "@/lib/data";
import { supabase } from "@/integrations/supabase/client";
import { useCelebration } from "@/components/hr/Celebration";
import { useNavigate } from "@tanstack/react-router";
import type { Employee } from "@/lib/hr";

type Form = {
  full_name: string;
  cedula: string;
  company_id: string;
  position: string;
  hire_date: string;
  contract_type: string;
  contract_end_date: string;
  phone: string;
  work_location: string;
  work_schedule: string;
  status: string;
  notes: string;
};

const blank: Form = {
  full_name: "",
  cedula: "",
  company_id: "",
  position: "",
  hire_date: "",
  contract_type: "fijo",
  contract_end_date: "",
  phone: "",
  work_location: "",
  work_schedule: "",
  status: "activo",
  notes: "",
};

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
  const [form, setForm] = useState<Form>(blank);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(
      employee
        ? {
            full_name: employee.full_name,
            cedula: employee.cedula,
            company_id: employee.company_id ?? "",
            position: employee.position,
            hire_date: employee.hire_date,
            contract_type:
              employee.contract_type ?? (employee.contract_end_date ? "fijo" : "indefinido"),
            contract_end_date: employee.contract_end_date ?? "",
            phone: employee.phone ?? "",
            work_location: employee.work_location ?? "",
            work_schedule: employee.work_schedule ?? "",
            status: employee.status,
            notes: employee.notes ?? "",
          }
        : blank,
    );
  }, [open, employee]);

  const set = (patch: Partial<Form>) => setForm((prev) => ({ ...prev, ...patch }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.company_id) {
      toast.error("Selecciona la empresa del empleado");
      return;
    }
    if (form.contract_type === "fijo" && !form.contract_end_date) {
      toast.error("Si seleccionas Término fijo, debes ingresar la fecha de fin de contrato");
      return;
    }
    setBusy(true);
    try {
      const row = {
        full_name: form.full_name.trim(),
        cedula: form.cedula.trim(),
        company_id: form.company_id,
        position: form.position.trim(),
        hire_date: form.hire_date,
        contract_type: form.contract_type,
        contract_end_date:
          form.contract_type === "indefinido" ? null : form.contract_end_date || null,
        phone: form.phone.trim() || null,
        work_location: form.work_location.trim() || null,
        work_schedule: form.work_schedule.trim() || null,
        status: form.status,
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
          { label: "Empleado", value: row.full_name },
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{employee ? "Editar empleado" : "Nuevo empleado"}</DialogTitle>
          <DialogDescription>
            Los campos marcados con <span className="text-danger-foreground">*</span> son
            obligatorios.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void submit(e)} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="full_name">
              Nombre completo <span className="text-danger-foreground">*</span>
            </Label>
            <Input
              id="full_name"
              required
              value={form.full_name}
              onChange={(e) => set({ full_name: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cedula">
              Cédula <span className="text-danger-foreground">*</span>
            </Label>
            <Input
              id="cedula"
              required
              value={form.cedula}
              onChange={(e) => set({ cedula: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label>
              Empresa <span className="text-danger-foreground">*</span>
            </Label>
            <Select value={form.company_id} onValueChange={(v) => set({ company_id: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="position">
              Cargo <span className="text-danger-foreground">*</span>
            </Label>
            <Input
              id="position"
              required
              value={form.position}
              onChange={(e) => set({ position: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone">Celular</Label>
            <Input id="phone" value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="hire_date">
              Fecha de ingreso <span className="text-danger-foreground">*</span>
            </Label>
            <Input
              id="hire_date"
              type="date"
              required
              value={form.hire_date}
              onChange={(e) => set({ hire_date: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label>
              Tipo de contrato <span className="text-danger-foreground">*</span>
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
              {form.contract_type === "fijo" && (
                <span className="text-danger-foreground"> *</span>
              )}
            </Label>
            <Input
              id="contract_end_date"
              type="date"
              disabled={form.contract_type === "indefinido"}
              required={form.contract_type === "fijo"}
              value={form.contract_type === "indefinido" ? "" : form.contract_end_date}
              onChange={(e) => set({ contract_end_date: e.target.value })}
            />
            <p className="text-[11px] text-muted-foreground">
              {form.contract_type === "indefinido"
                ? "— Sin fecha límite (contrato indefinido)."
                : "Obligatoria para contratos a término fijo."}
            </p>
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
            <Label htmlFor="work_schedule">Horario</Label>
            <Input
              id="work_schedule"
              placeholder="L-V 7:00 a 17:00"
              value={form.work_schedule}
              onChange={(e) => set({ work_schedule: e.target.value })}
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="notes">Observaciones</Label>
            <Textarea
              id="notes"
              rows={3}
              value={form.notes}
              onChange={(e) => set({ notes: e.target.value })}
            />
          </div>

          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="success" disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
