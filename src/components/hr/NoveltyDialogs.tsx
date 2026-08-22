import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
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
  type Employee,
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
  return (
    <div className="space-y-1.5">
      <Label>
        Empleado <span className="text-danger-foreground">*</span>
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Seleccionar empleado" />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {employees.map((e) => (
            <SelectItem key={e.id} value={e.id}>
              {e.full_name} — {e.cedula}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/* ------------------------------------------------------------ incapacidades */

export function IncapacityDialog({
  open,
  onOpenChange,
  employeeId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId?: string;
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
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        employee_id: employeeId ?? "",
        type: "general",
        start_date: "",
        end_date: "",
        notes: "",
      });
      setFile(null);
    }
  }, [open, employeeId]);

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
    if (days <= 0) {
      toast.error("Revisa las fechas de la incapacidad");
      return;
    }
    setBusy(true);
    try {
      let certificate_path: string | null = null;
      if (file) certificate_path = await uploadFile("certificados", file, form.employee_id);
      await insertRow("incapacities", {
        employee_id: form.employee_id,
        type: form.type,
        start_date: form.start_date,
        end_date: form.end_date,
        certificate_path,
        notes: form.notes.trim() || null,
      });
      await qc.invalidateQueries({ queryKey: qk.incapacities });
      toast.success(`Incapacidad registrada (${days} días)`);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo registrar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar incapacidad</DialogTitle>
          <DialogDescription>
            Los días se descuentan automáticamente de la quincena correspondiente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void submit(e)} className="space-y-4">
          {!employeeId && (
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
              Guardar
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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId?: string;
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
        employee_id: employeeId ?? "",
        type: "sin_pago",
        start_date: "",
        end_date: "",
        days: "",
        reason: "",
        notes: "",
      });
  }, [open, employeeId]);

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
      leaves.filter((l) => l.employee_id === emp.id),
    );
  }, [employees, entitlements, leaves, form.employee_id]);

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
    if (requested <= 0) {
      toast.error("Revisa las fechas del permiso");
      return;
    }
    if (validation.blocked) {
      toast.error(validation.message ?? "Permiso no permitido");
      return;
    }
    setBusy(true);
    try {
      await insertRow("leaves", {
        employee_id: form.employee_id,
        type: form.type,
        start_date: form.start_date,
        end_date: form.end_date,
        days: requested,
        reason: form.reason.trim(),
        notes: form.notes.trim() || null,
      });
      await qc.invalidateQueries({ queryKey: qk.leaves });
      toast.success(`Permiso registrado (${requested} días)`);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo registrar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar permiso</DialogTitle>
          <DialogDescription>
            Los permisos sin pago y los descuentos de vacaciones restan días de la quincena.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void submit(e)} className="space-y-4">
          {!employeeId && (
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="success" disabled={busy || validation.blocked}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              Guardar
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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId?: string;
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
        employee_id: employeeId ?? "",
        type: "renuncia",
        exit_date: "",
        reason: "",
        settlement_paid: false,
        notes: "",
      });
  }, [open, employeeId]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.employee_id) {
      toast.error("Selecciona un empleado");
      return;
    }
    setBusy(true);
    try {
      await insertRow("terminations", {
        employee_id: form.employee_id,
        type: form.type,
        exit_date: form.exit_date,
        reason: form.reason.trim() || null,
        settlement_paid: form.settlement_paid,
        notes: form.notes.trim() || null,
      });
      await updateRow("employees", form.employee_id, {
        status: "retirado",
        exit_date: form.exit_date,
      });
      await Promise.all([
        qc.invalidateQueries({ queryKey: qk.terminations }),
        qc.invalidateQueries({ queryKey: qk.employees }),
      ]);
      toast.success("Retiro registrado. El empleado pasó a estado retirado.");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo registrar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar retiro</DialogTitle>
          <DialogDescription>
            El empleado se marca como retirado y conserva todo su histórico.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void submit(e)} className="space-y-4">
          {!employeeId && (
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="danger" disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              Registrar retiro
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
