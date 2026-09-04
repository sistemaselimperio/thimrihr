import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Download, FileDown, Paperclip, Pencil, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { EmployeeDialog } from "@/components/hr/EmployeeDialog";
import {
  IncapacityDialog,
  LeaveDialog,
  LicenseDialog,
  VacationDialog,
  NoveltyRowActions,
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
  useLicenses,
  useVacations,
  useOverrides,
  useTerminations,
} from "@/lib/data";
import { downloadSheet } from "@/lib/excel";
import {
  INCAPACITY_LABELS,
  LEAVE_LABELS,
  LICENSE_LABELS,
  TERMINATION_LABELS,
  buildQuincenas,
  buildVacationSummary,
  daysInclusive,
  fmtDate,
  incapacityStatus,
  CONTRACT_TYPE_LABELS,
  isFixedTerm,
  licenseStatus,
  recalcEntitlement,
  vacationStatus,
} from "@/lib/hr";


export const Route = createFileRoute("/_authenticated/empleados/$id")({
  head: () => ({
    meta: [
      { title: "Ficha de empleado · imperiorrhco" },
      {
        name: "description",
        content:
          "Hoja de vida laboral: datos, novedades, quincenas trabajadas y saldo de vacaciones del empleado.",
      },
      { property: "og:title", content: "Ficha de empleado · imperiorrhco" },
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
  const { data: licenses = [] } = useLicenses();
  const { data: vacationRecords = [] } = useVacations();

  const [year, setYear] = useState(new Date().getFullYear());
  const [editOpen, setEditOpen] = useState(false);
  const [incOpen, setIncOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [termOpen, setTermOpen] = useState(false);
  const [licOpen, setLicOpen] = useState(false);
  const [vacOpen, setVacOpen] = useState(false);
  const [recalcing, setRecalcing] = useState(false);
  const currentYear = new Date().getFullYear();

  const employee = employees.find((e) => e.id === id);
  const myIncapacities = incapacities.filter((i) => i.employee_id === id);
  const myLeaves = leaves.filter((l) => l.employee_id === id);
  const myTerminations = terminations.filter((t) => t.employee_id === id);
  const myEntitlements = entitlements.filter((v) => v.employee_id === id);
  const myOverrides = overrides.filter((o) => o.employee_id === id);
  const myLicenses = licenses.filter((l) => l.employee_id === id);
  const myVacations = vacationRecords.filter((v) => v.employee_id === id);

  const quincenas = useMemo(
    () =>
      employee
        ? buildQuincenas(
            employee,
            myIncapacities,
            myLeaves,
            myOverrides,
            year,
            myLicenses,
            myVacations,
          )
        : [],
    [employee, myIncapacities, myLeaves, myOverrides, year, myLicenses, myVacations],
  );


  const vacations = useMemo(
    () =>
      employee
        ? buildVacationSummary(employee, myEntitlements, myLeaves, myVacations)
        : null,
    [employee, myEntitlements, myLeaves, myVacations],
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

  const saveEntitlementSilent = async (yearValue: number, days: number) => {
    const existing = myEntitlements.find((v) => v.year === yearValue);
    await upsertRow("vacation_entitlements", {
      ...(existing ? { id: existing.id } : {}),
      employee_id: emp.id,
      year: yearValue,
      entitled_days: days,
    });
    await qc.invalidateQueries({ queryKey: qk.entitlements });
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

  const recalcCurrentYear = async () => {
    setRecalcing(true);
    try {
      const years = (vacations?.rows ?? []).map((r) => r.year);
      const targets = years.length ? years : [currentYear];
      let changed = 0;
      const detail: string[] = [];
      for (const y of targets) {
        const result = recalcEntitlement(emp, myLeaves, y);
        if (result.error) continue;
        detail.push(`${y}: ${result.entitled}`);
        const previous = myEntitlements.find((e) => e.year === y)?.entitled_days ?? null;
        if (previous !== null && Number(previous) === result.entitled) continue;
        await saveEntitlementSilent(y, result.entitled);
        changed++;
      }
      if (!detail.length) {
        toast.error("No se pudo recalcular: revisa la fecha de ingreso.");
        return;
      }
      if (changed === 0) {
        toast.success(`Derecho ya era correcto (${detail.join(" · ")})`);
        return;
      }
      toast.success(`Derecho recalculado — ${detail.join(" · ")} días`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al recalcular");
    } finally {
      setRecalcing(false);
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
          [
            "Tipo de contrato",
            CONTRACT_TYPE_LABELS[
              emp.contract_type ?? (emp.contract_end_date ? "fijo" : "indefinido")
            ] ?? "",
          ],
          ["Fin contrato", isFixedTerm(emp) ? fmtDate(emp.contract_end_date) : "—"],
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

      <div className="space-y-4 rounded-xl border bg-surface p-5 shadow-panel">
        <div className="space-y-3">
          <h2 className="font-display text-xs font-bold tracking-wide uppercase">
            Datos personales
          </h2>
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <Field label="Cédula" value={emp.cedula} />
            <Field label="Nombres" value={emp.first_name ?? "—"} />
            <Field label="Apellidos" value={emp.last_name ?? "—"} />
            <Field label="Email" value={emp.email ?? "—"} />
            <Field label="Celular" value={emp.phone ?? "—"} />
            <Field label="Teléfono" value={emp.landline ?? "—"} />
            <Field label="N° Carpeta" value={emp.folder_number ?? "—"} />
          </div>
        </div>

        <div className="space-y-3 border-t pt-4">
          <h2 className="font-display text-xs font-bold tracking-wide uppercase">
            Información laboral
          </h2>
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <Field
              label="Empresa"
              value={
                emp.company_id
                  ? (companies.find((c) => c.id === emp.company_id)?.name ?? "—")
                  : "—"
              }
            />
            <Field label="Cargo" value={emp.position} />
            <Field label="Lugar de trabajo" value={emp.work_location ?? "—"} />
            <Field label="Municipio" value={emp.municipality ?? "—"} />
            <Field label="Horario" value={emp.work_schedule ?? "—"} />
            <Field label="Fecha de ingreso" value={fmtDate(emp.hire_date)} />
            <Field
              label="Tipo de contrato"
              value={
                CONTRACT_TYPE_LABELS[
                  emp.contract_type ?? (emp.contract_end_date ? "fijo" : "indefinido")
                ] ?? "—"
              }
            />
            <Field
              label="Fin de contrato"
              value={
                isFixedTerm(emp) ? fmtDate(emp.contract_end_date) : "— (sin fecha límite)"
              }
            />
            <Field label="Fecha de salida" value={emp.exit_date ? fmtDate(emp.exit_date) : "—"} />
            <Field label="Estado" value={emp.status === "activo" ? "Activo" : "Retirado"} />
          </div>
        </div>

        <div className="space-y-3 border-t pt-4">
          <h2 className="font-display text-xs font-bold tracking-wide uppercase">
            Información adicional
          </h2>
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <Field
              label={`Vacaciones ${year}`}
              value={
                vacations
                  ? `${vacations.rows.find((r) => r.year === year)?.entitled ?? 0} derecho | ${
                      vacations.rows.find((r) => r.year === year)?.used ?? 0
                    } usadas`
                  : "—"
              }
            />
            <Field
              label="Vacaciones disponibles"
              value={vacations ? `${vacations.available} días` : "—"}
            />
            <Field label="Incapacidades" value={`${myIncapacities.length} registradas`} />
            <Field label="Permisos" value={`${myLeaves.length} registrados`} />
          </div>
        </div>

        {emp.notes && (
          <div className="border-t pt-4">
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
          <TabsTrigger value="licencias">Licencias</TabsTrigger>
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
                  <TableHead className="text-right">Acciones</TableHead>
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
                    <TableCell>
                      <NoveltyRowActions
                        kind="incapacity"
                        record={i}
                        summary={`${INCAPACITY_LABELS[i.type] ?? i.type} · ${fmtDate(i.start_date)} → ${fmtDate(i.end_date)}`}
                      />
                    </TableCell>
                  </TableRow>
                ))}

                {myIncapacities.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
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
                  <TableHead className="text-right">Acciones</TableHead>
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
                    <TableCell>
                      <NoveltyRowActions
                        kind="leave"
                        record={l}
                        summary={`${LEAVE_LABELS[l.type] ?? l.type} · ${fmtDate(l.start_date)} · ${l.days} días`}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {myLeaves.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                      Sin permisos registrados.
                    </TableCell>
                  </TableRow>
                )}

              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="licencias" className="space-y-3">
          <Button variant="success" className="gap-2" onClick={() => setLicOpen(true)}>
            <Plus className="size-4" /> Agregar licencia
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
                  <TableHead>Observaciones</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myLicenses.map((l) => {
                  const estado = licenseStatus(l);
                  return (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">
                        {LICENSE_LABELS[l.type] ?? l.type}
                      </TableCell>
                      <TableCell className="numeric">{fmtDate(l.start_date)}</TableCell>
                      <TableCell className="numeric">{fmtDate(l.end_date)}</TableCell>
                      <TableCell className="numeric">{l.days}</TableCell>
                      <TableCell>{l.reason}</TableCell>
                      <TableCell className="text-muted-foreground">{l.notes ?? "—"}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            estado === "Activa"
                              ? "bg-success/20 text-success-foreground"
                              : estado === "Próxima"
                                ? "bg-warning/20 text-warning-foreground"
                                : "bg-retired text-retired-foreground"
                          }
                        >
                          {estado}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <NoveltyRowActions
                          kind="license"
                          record={l}
                          summary={`${LICENSE_LABELS[l.type] ?? l.type} · ${fmtDate(l.start_date)} → ${fmtDate(l.end_date)}`}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
                {myLicenses.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                      Sin licencias registradas.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>


        <TabsContent value="vacaciones" className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            {(vacations?.rows ?? []).map((r) => (
              <div key={r.year} className="rounded-xl border bg-surface p-4 shadow-panel">
                <p className="text-xs text-muted-foreground uppercase">
                  Año {r.year}
                  {r.from && r.to ? ` (${fmtDate(r.from)} — ${fmtDate(r.to)})` : ""}
                </p>
                <dl className="mt-2 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Derecho acumulado</dt>
                    <dd className="numeric font-semibold">{r.entitled} días</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Tomados</dt>
                    <dd className="numeric font-semibold">{r.used} días</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Disponibles {r.year}</dt>
                    <dd
                      className={`numeric font-semibold ${
                        (r.availableYear ?? 0) < 0 ? "text-danger" : "text-success"
                      }`}
                    >
                      {r.availableYear ?? 0} días
                      {(r.availableYear ?? 0) < 0 ? " (DEBE)" : ""}
                    </dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>

          <div className="panel-success rounded-xl p-4">
            <p className="text-xs text-muted-foreground uppercase">Total disponible</p>
            <p className="numeric font-display text-3xl font-bold">
              {(vacations?.available ?? 0) < 0
                ? `Debe ${Math.abs(vacations?.available ?? 0)} días`
                : `${vacations?.available ?? 0} días`}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {(vacations?.rows ?? [])
                .map((r) => `${r.year}: ${r.availableYear ?? 0}`)
                .join(" + ") || "Sin años registrados"}
            </p>
          </div>

          {(vacations?.owed ?? 0) > 0 && (
            <p className="rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm">
              ⚠️ Nota: debe {vacations?.owed} días de vacaciones de años con saldo negativo.
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Mínimo acumulable por ley: <strong>7 días</strong>
              {vacations?.rows.find((r) => r.year === year)
                ? ` · ${year}: permisos ${vacations.rows.find((r) => r.year === year)?.usedLeaves ?? 0} · vacaciones ${vacations.rows.find((r) => r.year === year)?.usedPeriods ?? 0}`
                : ""}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="gap-2"
                disabled={recalcing}
                title="Calcula basado en días laborales reales"
                onClick={() => void recalcCurrentYear()}
              >
                <RefreshCw className={`size-4 ${recalcing ? "animate-spin" : ""}`} />
                {recalcing ? "Calculando derecho…" : "Recalcular derecho"}
              </Button>
              <Button variant="success" className="gap-2" onClick={() => setVacOpen(true)}>
                <Plus className="size-4" /> Agregar período de vacaciones
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Fórmula: (días laborales × 15) ÷ 360, año por año. Se excluyen domingos, festivos
            colombianos y los permisos con descuento de vacaciones. El año de ingreso se prorratea
            desde la fecha de ingreso y el año en curso hasta hoy.
          </p>



          <div className="overflow-hidden rounded-xl border bg-surface shadow-panel">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Año</TableHead>
                  <TableHead>Desde</TableHead>
                  <TableHead>Hasta</TableHead>
                  <TableHead>Días</TableHead>
                  <TableHead>Destino</TableHead>
                  <TableHead>Observaciones</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myVacations.map((v) => {
                  const estado = vacationStatus(v);
                  return (
                    <TableRow key={v.id}>
                      <TableCell className="numeric font-medium">{v.year}</TableCell>
                      <TableCell className="numeric">{fmtDate(v.start_date)}</TableCell>
                      <TableCell className="numeric">{fmtDate(v.end_date)}</TableCell>
                      <TableCell className="numeric">{v.days}</TableCell>
                      <TableCell>{v.destination ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{v.notes ?? "—"}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            estado === "En curso"
                              ? "bg-primary/20 text-primary"
                              : estado === "Programada"
                                ? "bg-warning/20 text-warning-foreground"
                                : "bg-retired text-retired-foreground"
                          }
                        >
                          {estado}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <NoveltyRowActions
                          kind="vacation"
                          record={v}
                          summary={`Vacaciones ${fmtDate(v.start_date)} → ${fmtDate(v.end_date)}`}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
                {myVacations.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                      Sin períodos de vacaciones registrados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
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
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myTerminations.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>{TERMINATION_LABELS[t.type] ?? t.type}</TableCell>
                    <TableCell className="numeric">{fmtDate(t.exit_date)}</TableCell>
                    <TableCell>{t.settlement_paid ? "Pagada" : "Pendiente"}</TableCell>
                    <TableCell>{t.reason ?? "—"}</TableCell>
                    <TableCell>
                      <NoveltyRowActions
                        kind="termination"
                        record={t}
                        summary={`${TERMINATION_LABELS[t.type] ?? t.type} · ${fmtDate(t.exit_date)}`}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {myTerminations.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
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
      <LicenseDialog open={licOpen} onOpenChange={setLicOpen} employeeId={emp.id} />
      <VacationDialog open={vacOpen} onOpenChange={setVacOpen} employeeId={emp.id} />

      <TerminationDialog open={termOpen} onOpenChange={setTermOpen} employeeId={emp.id} />
    </div>
  );
}
