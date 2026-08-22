import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Download, FileDown, Paperclip, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { EmployeeDialog } from "@/components/hr/EmployeeDialog";
import {
  IncapacityDialog,
  LeaveDialog,
  TerminationDialog,
} from "@/components/hr/NoveltyDialogs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  deleteRow,
  openFile,
  qk,
  upsertRow,
  useCompanies,
  useEmployees,
  useEntitlements,
  useIncapacities,
  useLeaves,
  useOverrides,
  useTerminations,
} from "@/lib/data";
import { downloadSheet } from "@/lib/excel";
import {
  INCAPACITY_LABELS,
  LEAVE_LABELS,
  TERMINATION_LABELS,
  buildQuincenas,
  buildVacationSummary,
  daysInclusive,
  fmtDate,
  incapacityStatus,
} from "@/lib/hr";

export const Route = createFileRoute("/_authenticated/empleados/$id")({
  head: () => ({
    meta: [
      { title: "Ficha de empleado · RRHH El Imperio" },
      {
        name: "description",
        content:
          "Hoja de vida laboral: datos, novedades, quincenas trabajadas y saldo de vacaciones del empleado.",
      },
      { property: "og:title", content: "Ficha de empleado · RRHH El Imperio" },
      {
        property: "og:description",
        content: "Novedades, quincenas y vacaciones del empleado.",
      },
    ],
  }),
  component: EmployeeDetail,
});

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="mt-0.5 text-sm font-medium">{value}</p>
    </div>
  );
}

function EmployeeDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { data: employees = [], isLoading } = useEmployees();
  const { data: companies = [] } = useCompanies();
  const { data: incapacities = [] } = useIncapacities();
  const { data: leaves = [] } = useLeaves();
  const { data: terminations = [] } = useTerminations();
  const { data: entitlements = [] } = useEntitlements();
  const { data: overrides = [] } = useOverrides();

  const [year, setYear] = useState(new Date().getFullYear());
  const [editOpen, setEditOpen] = useState(false);
  const [incOpen, setIncOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [termOpen, setTermOpen] = useState(false);

  const employee = employees.find((e) => e.id === id);
  const myIncapacities = incapacities.filter((i) => i.employee_id === id);
  const myLeaves = leaves.filter((l) => l.employee_id === id);
  const myTerminations = terminations.filter((t) => t.employee_id === id);
  const myEntitlements = entitlements.filter((v) => v.employee_id === id);
  const myOverrides = overrides.filter((o) => o.employee_id === id);

  const quincenas = useMemo(
    () =>
      employee
        ? buildQuincenas(employee, myIncapacities, myLeaves, myOverrides, year)
        : [],
    [employee, myIncapacities, myLeaves, myOverrides, year],
  );

  const vacations = useMemo(
    () => (employee ? buildVacationSummary(employee, myEntitlements, myLeaves) : null),
    [employee, myEntitlements, myLeaves],
  );

  if (isLoading) return <p className="text-sm text-muted-foreground">Cargando ficha…</p>;
  if (!employee)
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Este empleado no existe.</p>
        <Button asChild variant="outline">
          <Link to="/empleados">Volver a empleados</Link>
        </Button>
      </div>
    );

  const emp = employee;

  const saveOverride = async (periodKey: string, baseDays: string) => {
    const existing = myOverrides.find((o) => o.period_key === periodKey);
    try {
      if (baseDays === "") {
        if (existing) {
          await deleteRow("payroll_periods", existing.id);
          toast.success("Días base restaurados al cálculo automático");
        }
      } else {
        await upsertRow("payroll_periods", {
          ...(existing ? { id: existing.id } : {}),
          employee_id: emp.id,
          period_key: periodKey,
          base_days: Number(baseDays),
        });
        toast.success("Días base actualizados");
      }
      await qc.invalidateQueries({ queryKey: qk.overrides });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar");
    }
  };

  const saveEntitlement = async (yearValue: number, days: string) => {
    const existing = myEntitlements.find((v) => v.year === yearValue);
    try {
      await upsertRow("vacation_entitlements", {
        ...(existing ? { id: existing.id } : {}),
        employee_id: emp.id,
        year: yearValue,
        entitled_days: Number(days || 0),
      });
      await qc.invalidateQueries({ queryKey: qk.entitlements });
      toast.success("Días de vacaciones actualizados");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar");
    }
  };

  const exportSheet = () => {
    downloadSheet(`Hoja_${emp.cedula}.xlsx`, "Hoja de vida", [
      {
        title: `HOJA LABORAL — ${emp.full_name.toUpperCase()}`,
        header: ["Campo", "Valor"],
        rows: [
          ["Cédula", emp.cedula],
          ["Cargo", emp.position],
          ["Ingreso", fmtDate(emp.hire_date)],
          ["Fin contrato", emp.contract_end_date ? fmtDate(emp.contract_end_date) : "Indefinido"],
          ["Estado", emp.status === "activo" ? "Activo" : "Retirado"],
        ],
      },
      {
        title: `QUINCENAS ${year}`,
        header: ["Quincena", "Base", "Permisos", "Incapacidad", "Vacaciones", "Trabajados"],
        rows: quincenas.map((q) => [
          q.label,
          q.baseDays,
          q.leaveDays,
          q.incapacityDays,
          q.vacationDays,
          q.workedDays,
        ]),
      },
      {
        title: "VACACIONES",
        header: ["Año", "Derecho", "Tomados", "Saldo"],
        rows: (vacations?.rows ?? []).map((r) => [r.year, r.entitled, r.used, r.balance]),
      },
    ]);
    toast.success("Hoja del empleado exportada");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Button asChild variant="ghost" size="sm" className="-ml-2 gap-1">
            <Link to="/empleados">
              <ArrowLeft className="size-4" /> Empleados
            </Link>
          </Button>
          <h1 className="font-display text-2xl font-bold">{emp.full_name}</h1>
          <p className="text-sm text-muted-foreground">
            {emp.position} ·{" "}
            {emp.company_id
              ? (companies.find((c) => c.id === emp.company_id)?.name ?? "Sin empresa")
              : "Sin empresa"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {emp.status === "activo" ? (
            <Badge className="bg-success/20 text-success-foreground">Activo</Badge>
          ) : (
            <Badge className="bg-retired text-retired-foreground">Retirado</Badge>
          )}
          <Button variant="outline" className="gap-2" onClick={exportSheet}>
            <FileDown className="size-4" /> Excel
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" /> Editar
          </Button>
        </div>
      </div>

      <div className="grid gap-4 rounded-xl border bg-surface p-5 shadow-panel sm:grid-cols-3 lg:grid-cols-4">
        <Field label="Cédula" value={emp.cedula} />
        <Field label="Celular" value={emp.phone ?? "—"} />
        <Field label="Ingreso" value={fmtDate(emp.hire_date)} />
        <Field
          label="Fin de contrato"
          value={emp.contract_end_date ? fmtDate(emp.contract_end_date) : "Indefinido"}
        />
        <Field label="Lugar de trabajo" value={emp.work_location ?? "—"} />
        <Field label="Horario" value={emp.work_schedule ?? "—"} />
        <Field label="Fecha de salida" value={emp.exit_date ? fmtDate(emp.exit_date) : "—"} />
        <Field
          label="Vacaciones disponibles"
          value={vacations ? `${vacations.available} días` : "—"}
        />
        {emp.notes && (
          <div className="sm:col-span-3 lg:col-span-4">
            <p className="text-[11px] tracking-wide text-muted-foreground uppercase">
              Observaciones
            </p>
            <p className="mt-0.5 text-sm">{emp.notes}</p>
          </div>
        )}
      </div>

      <Tabs defaultValue="quincenas">
        <TabsList>
          <TabsTrigger value="quincenas">Quincenas</TabsTrigger>
          <TabsTrigger value="incapacidades">Incapacidades</TabsTrigger>
          <TabsTrigger value="permisos">Permisos</TabsTrigger>
          <TabsTrigger value="vacaciones">Vacaciones</TabsTrigger>
          <TabsTrigger value="retiro">Retiro</TabsTrigger>
        </TabsList>

        <TabsContent value="quincenas" className="space-y-3">
          <div className="flex items-center gap-2">
            <Label htmlFor="anio" className="text-xs">
              Año
            </Label>
            <Input
              id="anio"
              type="number"
              className="w-28"
              value={year}
              onChange={(e) => setYear(Number(e.target.value) || year)}
            />
          </div>
          <div className="overflow-hidden rounded-xl border bg-surface shadow-panel">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quincena</TableHead>
                  <TableHead>Rango</TableHead>
                  <TableHead>Días base</TableHead>
                  <TableHead>Permisos</TableHead>
                  <TableHead>Incapacidad</TableHead>
                  <TableHead>Vacaciones</TableHead>
                  <TableHead>Trabajados</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quincenas.map((q) => (
                  <TableRow key={q.periodKey}>
                    <TableCell className="font-medium">{q.label}</TableCell>
                    <TableCell className="numeric text-xs text-muted-foreground">
                      {fmtDate(q.start)} → {fmtDate(q.end)}
                    </TableCell>
                    <TableCell>
                      <Input
                        className="numeric h-8 w-20"
                        type="number"
                        step="0.5"
                        defaultValue={q.baseDaysOverridden ? q.baseDays : ""}
                        placeholder={String(q.baseDays)}
                        onBlur={(e) => void saveOverride(q.periodKey, e.target.value)}
                      />
                    </TableCell>
                    <TableCell className="numeric">{q.leaveDays}</TableCell>
                    <TableCell className="numeric">{q.incapacityDays}</TableCell>
                    <TableCell className="numeric">{q.vacationDays}</TableCell>
                    <TableCell className="numeric font-semibold">{q.workedDays}</TableCell>
                  </TableRow>
                ))}
                {quincenas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                      Sin quincenas para {year}.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="incapacidades" className="space-y-3">
          <Button variant="success" className="gap-2" onClick={() => setIncOpen(true)}>
            <Plus className="size-4" /> Registrar incapacidad
          </Button>
          <div className="overflow-hidden rounded-xl border bg-surface shadow-panel">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Desde</TableHead>
                  <TableHead>Hasta</TableHead>
                  <TableHead>Días</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Certificado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myIncapacities.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell>{INCAPACITY_LABELS[i.type] ?? i.type}</TableCell>
                    <TableCell className="numeric">{fmtDate(i.start_date)}</TableCell>
                    <TableCell className="numeric">{fmtDate(i.end_date)}</TableCell>
                    <TableCell className="numeric">
                      {daysInclusive(i.start_date, i.end_date)}
                    </TableCell>
                    <TableCell>{incapacityStatus(i)}</TableCell>
                    <TableCell>
                      {i.certificate_path ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1"
                          onClick={() => void openFile("certificados", i.certificate_path as string)}
                        >
                          <Paperclip className="size-3.5" /> Ver
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">Sin adjunto</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {myIncapacities.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                      Sin incapacidades registradas.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="permisos" className="space-y-3">
          <Button variant="success" className="gap-2" onClick={() => setLeaveOpen(true)}>
            <Plus className="size-4" /> Registrar permiso
          </Button>
          <div className="overflow-hidden rounded-xl border bg-surface shadow-panel">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Desde</TableHead>
                  <TableHead>Hasta</TableHead>
                  <TableHead>Días</TableHead>
                  <TableHead>Motivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myLeaves.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>{LEAVE_LABELS[l.type] ?? l.type}</TableCell>
                    <TableCell className="numeric">{fmtDate(l.start_date)}</TableCell>
                    <TableCell className="numeric">{fmtDate(l.end_date)}</TableCell>
                    <TableCell className="numeric">{l.days}</TableCell>
                    <TableCell>{l.reason}</TableCell>
                  </TableRow>
                ))}
                {myLeaves.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                      Sin permisos registrados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="vacaciones" className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border bg-surface p-4 shadow-panel">
              <p className="text-xs text-muted-foreground uppercase">Derecho acumulado</p>
              <p className="numeric font-display text-2xl font-bold">
                {vacations?.totalEntitled ?? 0}
              </p>
            </div>
            <div className="rounded-xl border bg-surface p-4 shadow-panel">
              <p className="text-xs text-muted-foreground uppercase">Tomados</p>
              <p className="numeric font-display text-2xl font-bold">{vacations?.totalUsed ?? 0}</p>
            </div>
            <div className="panel-success rounded-xl p-4">
              <p className="text-xs text-muted-foreground uppercase">Disponibles</p>
              <p className="numeric font-display text-2xl font-bold">{vacations?.available ?? 0}</p>
            </div>
          </div>
          <div className="overflow-hidden rounded-xl border bg-surface shadow-panel">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Año</TableHead>
                  <TableHead>Días de derecho</TableHead>
                  <TableHead>Tomados</TableHead>
                  <TableHead>Saldo acumulado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(vacations?.rows ?? []).map((r) => (
                  <TableRow key={r.year}>
                    <TableCell className="numeric font-medium">{r.year}</TableCell>
                    <TableCell>
                      <Input
                        className="numeric h-8 w-24"
                        type="number"
                        step="0.5"
                        defaultValue={r.entitled}
                        onBlur={(e) => void saveEntitlement(r.year, e.target.value)}
                      />
                    </TableCell>
                    <TableCell className="numeric">{r.used}</TableCell>
                    <TableCell className="numeric font-semibold">{r.balance}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="retiro" className="space-y-3">
          {emp.status === "activo" && (
            <Button variant="danger" className="gap-2" onClick={() => setTermOpen(true)}>
              <Download className="size-4" /> Registrar retiro
            </Button>
          )}
          <div className="overflow-hidden rounded-xl border bg-surface shadow-panel">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Liquidación</TableHead>
                  <TableHead>Detalle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myTerminations.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>{TERMINATION_LABELS[t.type] ?? t.type}</TableCell>
                    <TableCell className="numeric">{fmtDate(t.exit_date)}</TableCell>
                    <TableCell>{t.settlement_paid ? "Pagada" : "Pendiente"}</TableCell>
                    <TableCell>{t.reason ?? "—"}</TableCell>
                  </TableRow>
                ))}
                {myTerminations.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                      Sin registros de retiro.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <EmployeeDialog open={editOpen} onOpenChange={setEditOpen} employee={emp} />
      <IncapacityDialog open={incOpen} onOpenChange={setIncOpen} employeeId={emp.id} />
      <LeaveDialog open={leaveOpen} onOpenChange={setLeaveOpen} employeeId={emp.id} />
      <TerminationDialog open={termOpen} onOpenChange={setTermOpen} employeeId={emp.id} />
    </div>
  );
}
