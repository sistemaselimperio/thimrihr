import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Check, ChevronsUpDown, Loader2, Pencil, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  deleteRow,
  insertRow,
  qk,
  updateRow,
  uploadFile,
  useEmployees,
  useEntitlements,
  useLeaves,
} from "@/lib/data";
import {
  buildVacationSummary,
  daysInclusive,
  validateVacationLeave,
  LICENSE_DEFAULT_DAYS,
  LICENSE_LABELS,
  type Employee,
  type Incapacity,
  type Leave,
  type License,
  type Termination,
} from "@/lib/hr";


function EmployeePicker({
  value,
  onChange,
  employees,
}: {
  value: string;
  onChange: (id: string) => void;
  employees: Employee[];
}) {
  const [open, setOpen] = useState(false);
  const selected = employees.find((e) => e.id === value);

  return (
    <div className="space-y-1.5">
      <Label>
        Empleado <span className="text-danger-foreground">*</span>
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            {selected ? (
              <span className="truncate">
                {selected.full_name} — {selected.cedula}
              </span>
            ) : (
              <span className="text-muted-foreground">Buscar por nombre o cédula</span>
            )}
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <Command>
            <CommandInput placeholder="Escribe nombre o cédula..." />
            <CommandList>
              <CommandEmpty>No se encontró empleado.</CommandEmpty>
              <CommandGroup>
                {employees.map((e) => (
                  <CommandItem
                    key={e.id}
                    value={`${e.full_name} ${e.cedula} ${e.id}`}
                    onSelect={() => {
                      onChange(e.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 size-4",
                        value === e.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="flex-1 truncate">
                      {e.full_name} — {e.cedula}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

/* ------------------------------------------------------------ incapacidades */

export function IncapacityDialog({
  open,
  onOpenChange,
  employeeId,
  record,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId?: string;
  record?: Incapacity;
}) {
  const qc = useQueryClient();
  const { data: employees = [] } = useEmployees();
  const [form, setForm] = useState({
    employee_id: employeeId ?? "",
    type: "general",
    start_date: "",
    end_date: "",
    notes: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [removeFile, setRemoveFile] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        employee_id: record?.employee_id ?? employeeId ?? "",
        type: record?.type ?? "general",
        start_date: record?.start_date ?? "",
        end_date: record?.end_date ?? "",
        notes: record?.notes ?? "",
      });
      setFile(null);
      setRemoveFile(false);
    }
  }, [open, employeeId, record]);

  const days =
    form.start_date && form.end_date && form.end_date >= form.start_date
      ? daysInclusive(form.start_date, form.end_date)
      : 0;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.employee_id) {
      toast.error("Selecciona un empleado");
      return;
    }
    if (form.start_date && form.end_date && form.end_date < form.start_date) {
      toast.error("La fecha final no puede ser anterior a la inicial");
      return;
    }
    if (days <= 0) {
      toast.error("Revisa las fechas de la incapacidad");
      return;
    }
    setBusy(true);
    try {
      let certificate_path: string | null = record?.certificate_path ?? null;
      if (removeFile) certificate_path = null;
      if (file) certificate_path = await uploadFile("certificados", file, form.employee_id);

      const payload = {
        employee_id: form.employee_id,
        type: form.type,
        start_date: form.start_date,
        end_date: form.end_date,
        certificate_path,
        notes: form.notes.trim() || null,
      };

      if (record) await updateRow("incapacities", record.id, payload);
      else await insertRow("incapacities", payload);

      await qc.invalidateQueries({ queryKey: qk.incapacities });
      onOpenChange(false);
      toast.success(record ? "Cambios guardados" : "Novedad registrada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{record ? "Editar incapacidad" : "Registrar incapacidad"}</DialogTitle>
          <DialogDescription>
            Los días se descuentan automáticamente de la quincena correspondiente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void submit(e)} className="space-y-4">
          {!employeeId && !record && (
            <EmployeePicker
              value={form.employee_id}
              onChange={(v) => setForm((p) => ({ ...p, employee_id: v }))}
              employees={employees}
            />
          )}

          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select
              value={form.type}
              onValueChange={(v) => setForm((p) => ({ ...p, type: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">Incapacidad general</SelectItem>
                <SelectItem value="laboral">Accidente laboral</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="inc_start">
                Desde <span className="text-danger-foreground">*</span>
              </Label>
              <Input
                id="inc_start"
                type="date"
                required
                value={form.start_date}
                onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inc_end">
                Hasta <span className="text-danger-foreground">*</span>
              </Label>
              <Input
                id="inc_end"
                type="date"
                required
                value={form.end_date}
                onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))}
              />
            </div>
          </div>

          <p className="rounded-md bg-surface-2 px-3 py-2 text-sm">
            Duración calculada: <strong className="numeric">{days}</strong> días
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="inc_file" className="flex items-center gap-2">
              <Upload className="size-4" /> Certificado (PDF o imagen)
            </Label>
            {record?.certificate_path && !removeFile && (
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Checkbox
                  checked={removeFile}
                  onCheckedChange={(v) => setRemoveFile(v === true)}
                />
                Certificado ya adjunto — marcar para eliminarlo
              </label>
            )}
            {removeFile && (
              <p className="text-xs text-danger-foreground">
                El certificado actual se eliminará al guardar.
              </p>
            )}
            <Input
              id="inc_file"
              type="file"
              accept="application/pdf,image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="inc_notes">Observaciones</Label>
            <Textarea
              id="inc_notes"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="success" disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              {record ? "Guardar cambios" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ----------------------------------------------------------------- permisos */

export function LeaveDialog({
  open,
  onOpenChange,
  employeeId,
  record,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId?: string;
  record?: Leave;
}) {
  const qc = useQueryClient();
  const { data: employees = [] } = useEmployees();
  const { data: leaves = [] } = useLeaves();
  const { data: entitlements = [] } = useEntitlements();
  const [form, setForm] = useState({
    employee_id: employeeId ?? "",
    type: "sin_pago",
    start_date: "",
    end_date: "",
    days: "",
    reason: "",
    notes: "",
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open)
      setForm({
        employee_id: record?.employee_id ?? employeeId ?? "",
        type: record?.type ?? "sin_pago",
        start_date: record?.start_date ?? "",
        end_date: record?.end_date ?? "",
        days: record ? String(record.days) : "",
        reason: record?.reason ?? "",
        notes: record?.notes ?? "",
      });
  }, [open, employeeId, record]);

  const spanDays =
    form.start_date && form.end_date && form.end_date >= form.start_date
      ? daysInclusive(form.start_date, form.end_date)
      : 0;
  const requested = form.days ? Number(form.days) : spanDays;

  const summary = useMemo(() => {
    const emp = employees.find((e) => e.id === form.employee_id);
    if (!emp) return null;
    return buildVacationSummary(
      emp,
      entitlements.filter((x) => x.employee_id === emp.id),
      // al editar, el permiso actual no debe contarse dos veces
      leaves.filter((l) => l.employee_id === emp.id && l.id !== record?.id),
    );
  }, [employees, entitlements, leaves, form.employee_id, record?.id]);

  const validation =
    form.type === "vacaciones" && summary
      ? validateVacationLeave(requested, summary.available)
      : { blocked: false, message: null, level: null as "error" | "warning" | null };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.employee_id) {
      toast.error("Selecciona un empleado");
      return;
    }
    if (form.start_date && form.end_date && form.end_date < form.start_date) {
      toast.error("La fecha final no puede ser anterior a la inicial");
      return;
    }
    if (requested <= 0) {
      toast.error("Revisa las fechas del permiso");
      return;
    }
    if (!form.reason.trim()) {
      toast.error("El motivo es obligatorio");
      return;
    }
    if (validation.blocked) {
      toast.error(validation.message ?? "Permiso no permitido");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        employee_id: form.employee_id,
        type: form.type,
        start_date: form.start_date,
        end_date: form.end_date,
        days: requested,
        reason: form.reason.trim(),
        notes: form.notes.trim() || null,
      };
      if (record) await updateRow("leaves", record.id, payload);
      else await insertRow("leaves", payload);
      await qc.invalidateQueries({ queryKey: qk.leaves });
      onOpenChange(false);
      toast.success(record ? "Cambios guardados" : "Novedad registrada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{record ? "Editar permiso" : "Registrar permiso"}</DialogTitle>
          <DialogDescription>
            Los permisos sin pago y los descuentos de vacaciones restan días de la quincena.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void submit(e)} className="space-y-4">
          {!employeeId && !record && (
            <EmployeePicker
              value={form.employee_id}
              onChange={(v) => setForm((p) => ({ ...p, employee_id: v }))}
              employees={employees}
            />
          )}

          <div className="space-y-1.5">
            <Label>Tipo de permiso</Label>
            <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sin_pago">Permiso sin pago</SelectItem>
                <SelectItem value="vacaciones">Permiso con descuento de vacaciones</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="lv_start">
                Desde <span className="text-danger-foreground">*</span>
              </Label>
              <Input
                id="lv_start"
                type="date"
                required
                value={form.start_date}
                onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lv_end">
                Hasta <span className="text-danger-foreground">*</span>
              </Label>
              <Input
                id="lv_end"
                type="date"
                required
                value={form.end_date}
                onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lv_days">Días a descontar</Label>
            <Input
              id="lv_days"
              type="number"
              min="0.5"
              step="0.5"
              placeholder={String(spanDays)}
              value={form.days}
              onChange={(e) => setForm((p) => ({ ...p, days: e.target.value }))}
            />
            <p className="text-[11px] text-muted-foreground">
              Vacío = {spanDays} días (rango completo). Usa 0.5 para medio día.
            </p>
          </div>

          {form.type === "vacaciones" && summary && (
            <div className="rounded-md bg-surface-2 px-3 py-2 text-sm">
              Disponibles: <strong className="numeric">{summary.available}</strong> días · a
              descontar <strong className="numeric">{requested}</strong>
            </div>
          )}

          {validation.message && (
            <div
              className={[
                "flex items-start gap-2 rounded-md px-3 py-2 text-sm",
                validation.level === "error" ? "panel-danger" : "panel-warning",
              ].join(" ")}
            >
              <AlertTriangle className="mt-0.5 size-4" />
              <span>{validation.message}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="lv_reason">
              Motivo <span className="text-danger-foreground">*</span>
            </Label>
            <Input
              id="lv_reason"
              required
              value={form.reason}
              onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lv_notes">Observaciones</Label>
            <Textarea
              id="lv_notes"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="success" disabled={busy || validation.blocked}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              {record ? "Guardar cambios" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ retiros */

export function TerminationDialog({
  open,
  onOpenChange,
  employeeId,
  record,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId?: string;
  record?: Termination;
}) {
  const qc = useQueryClient();
  const { data: employees = [] } = useEmployees();
  const [form, setForm] = useState({
    employee_id: employeeId ?? "",
    type: "renuncia",
    exit_date: "",
    reason: "",
    settlement_paid: false,
    notes: "",
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open)
      setForm({
        employee_id: record?.employee_id ?? employeeId ?? "",
        type: record?.type ?? "renuncia",
        exit_date: record?.exit_date ?? "",
        reason: record?.reason ?? "",
        settlement_paid: record?.settlement_paid ?? false,
        notes: record?.notes ?? "",
      });
  }, [open, employeeId, record]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.employee_id) {
      toast.error("Selecciona un empleado");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        employee_id: form.employee_id,
        type: form.type,
        exit_date: form.exit_date,
        reason: form.reason.trim() || null,
        settlement_paid: form.settlement_paid,
        notes: form.notes.trim() || null,
      };
      if (record) await updateRow("terminations", record.id, payload);
      else await insertRow("terminations", payload);

      await updateRow("employees", form.employee_id, {
        status: "retirado",
        exit_date: form.exit_date,
      });
      await Promise.all([
        qc.invalidateQueries({ queryKey: qk.terminations }),
        qc.invalidateQueries({ queryKey: qk.employees }),
      ]);
      onOpenChange(false);
      toast.success(record ? "Cambios guardados" : "Novedad registrada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{record ? "Editar retiro" : "Registrar retiro"}</DialogTitle>
          <DialogDescription>
            El empleado se marca como retirado y conserva todo su histórico.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void submit(e)} className="space-y-4">
          {!employeeId && !record && (
            <EmployeePicker
              value={form.employee_id}
              onChange={(v) => setForm((p) => ({ ...p, employee_id: v }))}
              employees={employees.filter((e) => e.status === "activo")}
            />
          )}

          <div className="space-y-1.5">
            <Label>Motivo de salida</Label>
            <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vencimiento">Vencimiento de término</SelectItem>
                <SelectItem value="renuncia">Renuncia</SelectItem>
                <SelectItem value="justa_causa">Justa causa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tm_exit">
              Fecha de salida <span className="text-danger-foreground">*</span>
            </Label>
            <Input
              id="tm_exit"
              type="date"
              required
              value={form.exit_date}
              onChange={(e) => setForm((p) => ({ ...p, exit_date: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tm_reason">Detalle</Label>
            <Textarea
              id="tm_reason"
              rows={2}
              value={form.reason}
              onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={form.settlement_paid}
              onCheckedChange={(v) => setForm((p) => ({ ...p, settlement_paid: v === true }))}
            />
            Liquidación pagada
          </label>

          <div className="space-y-1.5">
            <Label htmlFor="tm_notes">Observaciones</Label>
            <Textarea
              id="tm_notes"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="danger" disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              {record ? "Guardar cambios" : "Registrar retiro"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------------------------------------------------------- licencias */

export function LicenseDialog({
  open,
  onOpenChange,
  employeeId,
  record,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId?: string;
  record?: License;
}) {
  const qc = useQueryClient();
  const { data: employees = [] } = useEmployees();
  const [form, setForm] = useState({
    employee_id: employeeId ?? "",
    type: "maternidad",
    start_date: "",
    end_date: "",
    reason: "",
    notes: "",
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open)
      setForm({
        employee_id: record?.employee_id ?? employeeId ?? "",
        type: record?.type ?? "maternidad",
        start_date: record?.start_date ?? "",
        end_date: record?.end_date ?? "",
        reason: record?.reason ?? "",
        notes: record?.notes ?? "",
      });
  }, [open, employeeId, record]);

  const days =
    form.start_date && form.end_date && form.end_date >= form.start_date
      ? daysInclusive(form.start_date, form.end_date)
      : 0;

  const legalDays = LICENSE_DEFAULT_DAYS[form.type] ?? null;
  const paid = form.type !== "no_remunerada";

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.employee_id) {
      toast.error("Selecciona un empleado");
      return;
    }
    if (!form.type) {
      toast.error("El tipo de licencia es obligatorio");
      return;
    }
    if (form.end_date < form.start_date) {
      toast.error("La fecha final no puede ser anterior a la inicial");
      return;
    }
    if (days <= 0) {
      toast.error("Revisa las fechas de la licencia");
      return;
    }
    if (!form.reason.trim()) {
      toast.error("El motivo es obligatorio");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        employee_id: form.employee_id,
        type: form.type,
        start_date: form.start_date,
        end_date: form.end_date,
        days,
        reason: form.reason.trim(),
        notes: form.notes.trim() || null,
      };
      if (record) await updateRow("licenses", record.id, payload);
      else await insertRow("licenses", payload);
      await qc.invalidateQueries({ queryKey: qk.licenses });
      onOpenChange(false);
      toast.success(record ? "Cambios guardados" : "Licencia registrada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{record ? "Editar licencia" : "Agregar nueva licencia"}</DialogTitle>
          <DialogDescription>
            Las licencias remuneradas no descuentan días de la quincena; la licencia no
            remunerada sí.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void submit(e)} className="space-y-4">
          {!employeeId && !record && (
            <EmployeePicker
              value={form.employee_id}
              onChange={(v) => setForm((p) => ({ ...p, employee_id: v }))}
              employees={employees}
            />
          )}

          <div className="space-y-1.5">
            <Label>
              Tipo de licencia <span className="text-danger-foreground">*</span>
            </Label>
            <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(LICENSE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {paid ? "Remunerada — no descuenta días" : "Sin remuneración — descuenta días"}
              {legalDays ? ` · Duración legal sugerida: ${legalDays} días` : ""}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="lic_start">
                Fecha de inicio <span className="text-danger-foreground">*</span>
              </Label>
              <Input
                id="lic_start"
                type="date"
                required
                value={form.start_date}
                onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lic_end">
                Fecha de fin <span className="text-danger-foreground">*</span>
              </Label>
              <Input
                id="lic_end"
                type="date"
                required
                value={form.end_date}
                onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))}
              />
            </div>
          </div>

          <p className="rounded-md bg-surface-2 px-3 py-2 text-sm">
            Duración calculada: <strong className="numeric">{days}</strong> días
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="lic_reason">
              Motivo <span className="text-danger-foreground">*</span>
            </Label>
            <Textarea
              id="lic_reason"
              rows={2}
              required
              placeholder="Ej: Nacimiento de hijo"
              value={form.reason}
              onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lic_notes">Observaciones (opcional)</Label>
            <Textarea
              id="lic_notes"
              rows={2}
              placeholder="Parentesco, tipo de calamidad o aprobación"
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="success" disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              {record ? "Guardar cambios" : "Guardar licencia"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


/* -------------------------------------------------- editar / eliminar filas */

type NoveltyKind = "incapacity" | "leave" | "termination" | "license";

const TABLE_BY_KIND: Record<NoveltyKind, string> = {
  incapacity: "incapacities",
  leave: "leaves",
  termination: "terminations",
  license: "licenses",
};

const KEYS_BY_KIND: Record<NoveltyKind, readonly unknown[][]> = {
  incapacity: [qk.incapacities as unknown as unknown[]],
  leave: [qk.leaves as unknown as unknown[]],
  termination: [qk.terminations as unknown as unknown[], qk.employees as unknown as unknown[]],
  license: [qk.licenses as unknown as unknown[]],
};

/** Botones [Editar] [Eliminar] para una novedad (incapacidad, permiso, retiro o licencia). */
export function NoveltyRowActions({
  kind,
  record,
  summary,
}: {
  kind: NoveltyKind;
  record: Incapacity | Leave | Termination | License;

  /** Texto corto que describe la novedad en la confirmación de borrado. */
  summary: string;
}) {
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    setBusy(true);
    try {
      await deleteRow(TABLE_BY_KIND[kind], record.id);
      await Promise.all(
        KEYS_BY_KIND[kind].map((key) => qc.invalidateQueries({ queryKey: key })),
      );
      toast.success("Novedad eliminada");
      setConfirmOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex justify-end gap-1">
      <Button variant="outline" size="sm" className="gap-1" onClick={() => setEditOpen(true)}>
        <Pencil className="size-3.5" /> Editar
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="gap-1 text-danger-foreground"
        onClick={() => setConfirmOpen(true)}
      >
        <Trash2 className="size-3.5" /> Eliminar
      </Button>

      {kind === "incapacity" && (
        <IncapacityDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          record={record as Incapacity}
        />
      )}
      {kind === "leave" && (
        <LeaveDialog open={editOpen} onOpenChange={setEditOpen} record={record as Leave} />
      )}
      {kind === "termination" && (
        <TerminationDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          record={record as Termination}
        />
      )}
      {kind === "license" && (
        <LicenseDialog open={editOpen} onOpenChange={setEditOpen} record={record as License} />
      )}


      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-danger-foreground" /> Eliminar novedad
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Seguro que quieres eliminar esta novedad? {summary}. Esta acción no se puede
              deshacer y los cálculos se recalcularán.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                void remove();
              }}
            >
              {busy && <Loader2 className="size-4 animate-spin" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
