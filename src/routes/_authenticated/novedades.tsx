import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";

import {
  IncapacityDialog,
  LeaveDialog,
  LicenseDialog,
  NoveltyRowActions,
  TerminationDialog,
  VacationDialog,
} from "@/components/hr/NoveltyDialogs";

import { useFilters } from "@/components/layout/filters-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  useEmployees,
  useIncapacities,
  useLeaves,
  useLicenses,
  useTerminations,
  useVacations,
} from "@/lib/data";
import {
  INCAPACITY_LABELS,
  LEAVE_LABELS,
  LICENSE_LABELS,
  TERMINATION_LABELS,
  daysInclusive,
  fmtDate,
  incapacityStatus,
  licenseStatus,
  vacationStatus,
} from "@/lib/hr";


export const Route = createFileRoute("/_authenticated/novedades")({
  head: () => ({
    meta: [
      { title: "Novedades · imperiorrhco" },
      {
        name: "description",
        content:
          "Registro histórico de incapacidades, permisos, vacaciones y retiros del personal del Grupo El Imperio.",
      },
      { property: "og:title", content: "Novedades · imperiorrhco" },
      {
        property: "og:description",
        content: "Incapacidades, permisos y retiros registrados del personal.",
      },
    ],
  }),
  component: NoveltiesPage,
});

function NoveltiesPage() {
  const { filters } = useFilters();
  const { data: employees = [] } = useEmployees();
  const { data: incapacities = [] } = useIncapacities();
  const { data: leaves = [] } = useLeaves();
  const { data: terminations = [] } = useTerminations();
  const { data: licenses = [] } = useLicenses();
  const { data: vacations = [] } = useVacations();
  const [incOpen, setIncOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [termOpen, setTermOpen] = useState(false);
  const [licOpen, setLicOpen] = useState(false);
  const [vacOpen, setVacOpen] = useState(false);


  const byId = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);
  const term = filters.search.trim().toLowerCase();

  const matches = (employeeId: string) => {
    const emp = byId.get(employeeId);
    if (!emp) return false;
    if (filters.companyId !== "all" && emp.company_id !== filters.companyId) return false;
    if (!term) return true;
    return (
      emp.full_name.toLowerCase().includes(term) || emp.cedula.toLowerCase().includes(term)
    );
  };

  const name = (employeeId: string) => byId.get(employeeId)?.full_name ?? "—";

  const EmployeeLink = ({ employeeId }: { employeeId: string }) => (
    <Link
      to="/empleados/$id"
      params={{ id: employeeId }}
      className="font-medium underline-offset-4 hover:underline"
    >
      {name(employeeId)}
    </Link>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Novedades</h1>
          <p className="text-sm text-muted-foreground">
            Histórico completo de incapacidades, permisos y retiros.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="success" className="gap-2" onClick={() => setIncOpen(true)}>
            <Plus className="size-4" /> Incapacidad
          </Button>
          <Button variant="outline" onClick={() => setLeaveOpen(true)}>
            Permiso
          </Button>
          <Button variant="outline" onClick={() => setVacOpen(true)}>
            Vacaciones
          </Button>
          <Button variant="outline" onClick={() => setLicOpen(true)}>
            Licencia
          </Button>
          <Button variant="outline" onClick={() => setTermOpen(true)}>
            Retiro
          </Button>
        </div>
      </div>

      <Tabs defaultValue="incapacidades">
        <TabsList>
          <TabsTrigger value="incapacidades">Incapacidades</TabsTrigger>
          <TabsTrigger value="permisos">Permisos y vacaciones</TabsTrigger>
          <TabsTrigger value="vacaciones">Vacaciones</TabsTrigger>
          <TabsTrigger value="licencias">Licencias</TabsTrigger>
          <TabsTrigger value="retiros">Retiros</TabsTrigger>
        </TabsList>


        <TabsContent value="incapacidades">
          <div className="overflow-hidden rounded-xl border bg-surface shadow-panel">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Desde</TableHead>
                  <TableHead>Hasta</TableHead>
                  <TableHead>Días</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incapacities.filter((i) => matches(i.employee_id)).map((i) => (
                  <TableRow key={i.id}>
                    <TableCell>
                      <EmployeeLink employeeId={i.employee_id} />
                    </TableCell>
                    <TableCell>{INCAPACITY_LABELS[i.type] ?? i.type}</TableCell>
                    <TableCell className="numeric">{fmtDate(i.start_date)}</TableCell>
                    <TableCell className="numeric">{fmtDate(i.end_date)}</TableCell>
                    <TableCell className="numeric">
                      {daysInclusive(i.start_date, i.end_date)}
                    </TableCell>
                    <TableCell>{incapacityStatus(i)}</TableCell>
                    <TableCell>
                      <NoveltyRowActions
                        kind="incapacity"
                        record={i}
                        summary={`${INCAPACITY_LABELS[i.type] ?? i.type} · ${fmtDate(i.start_date)} → ${fmtDate(i.end_date)}`}
                      />
                    </TableCell>
                  </TableRow>
                ))}

              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="permisos">
          <div className="overflow-hidden rounded-xl border bg-surface shadow-panel">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Desde</TableHead>
                  <TableHead>Hasta</TableHead>
                  <TableHead>Días</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaves.filter((l) => matches(l.employee_id)).map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>
                      <EmployeeLink employeeId={l.employee_id} />
                    </TableCell>
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

              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="vacaciones">
          <div className="overflow-hidden rounded-xl border bg-surface shadow-panel">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Año</TableHead>
                  <TableHead>Desde</TableHead>
                  <TableHead>Hasta</TableHead>
                  <TableHead>Días</TableHead>
                  <TableHead>Destino</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vacations.filter((v) => matches(v.employee_id)).map((v) => {
                  const estado = vacationStatus(v);
                  return (
                    <TableRow key={v.id}>
                      <TableCell>
                        <EmployeeLink employeeId={v.employee_id} />
                      </TableCell>
                      <TableCell className="numeric">{v.year}</TableCell>
                      <TableCell className="numeric">{fmtDate(v.start_date)}</TableCell>
                      <TableCell className="numeric">{fmtDate(v.end_date)}</TableCell>
                      <TableCell className="numeric">{v.days}</TableCell>
                      <TableCell>{v.destination ?? "—"}</TableCell>
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
                {vacations.filter((v) => matches(v.employee_id)).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                      Aún no hay períodos de vacaciones registrados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="licencias">
          <div className="overflow-hidden rounded-xl border bg-surface shadow-panel">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Desde</TableHead>
                  <TableHead>Hasta</TableHead>
                  <TableHead>Días</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {licenses.filter((l) => matches(l.employee_id)).map((l) => {
                  const estado = licenseStatus(l);
                  return (
                    <TableRow key={l.id}>
                      <TableCell>
                        <EmployeeLink employeeId={l.employee_id} />
                      </TableCell>
                      <TableCell>{LICENSE_LABELS[l.type] ?? l.type}</TableCell>
                      <TableCell className="numeric">{fmtDate(l.start_date)}</TableCell>
                      <TableCell className="numeric">{fmtDate(l.end_date)}</TableCell>
                      <TableCell className="numeric">{l.days}</TableCell>
                      <TableCell>{l.reason}</TableCell>
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
                {licenses.filter((l) => matches(l.employee_id)).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                      Aún no hay licencias registradas.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>


        <TabsContent value="retiros">
          <div className="overflow-hidden rounded-xl border bg-surface shadow-panel">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Fecha de salida</TableHead>
                  <TableHead>Liquidación</TableHead>
                  <TableHead>Detalle</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {terminations.filter((t) => matches(t.employee_id)).map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <EmployeeLink employeeId={t.employee_id} />
                    </TableCell>
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

              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <IncapacityDialog open={incOpen} onOpenChange={setIncOpen} />
      <LeaveDialog open={leaveOpen} onOpenChange={setLeaveOpen} />
      <TerminationDialog open={termOpen} onOpenChange={setTermOpen} />
      <LicenseDialog open={licOpen} onOpenChange={setLicOpen} />
      <VacationDialog open={vacOpen} onOpenChange={setVacOpen} />

    </div>
  );
}
