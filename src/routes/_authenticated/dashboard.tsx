import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Activity,
  BriefcaseBusiness,
  CalendarClock,
  DoorOpen,
  Palmtree,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";

import { MiniCalendar } from "@/components/hr/MiniCalendar";
import { RenewContractDialog } from "@/components/hr/RenewContractDialog";
import { useFilters } from "@/components/layout/filters-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useCompanies,
  useEmployees,
  useIncapacities,
  useLeaves,
} from "@/lib/data";
import { buildAlerts } from "@/lib/filters";
import {
  currentPeriodKey,
  fmtDate,
  periodBounds,
  periodLabelLong,
  INCAPACITY_LABELS,
  type Employee,
} from "@/lib/hr";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Principal · imperiorrhco" },
      {
        name: "description",
        content:
          "Panel de control de Recursos Humanos: alertas de contratos por vencer, incapacidades activas y salidas próximas.",
      },
      { property: "og:title", content: "Principal · imperiorrhco" },
      {
        property: "og:description",
        content: "Alertas de contratos, incapacidades y salidas del Grupo El Imperio.",
      },
    ],
  }),
  component: Dashboard,
});

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Users;
  label: string;
  value: number | string;
  tone: string;
}) {
  return (
    <div className="rounded-xl border bg-surface p-4 shadow-panel">
      <div className="flex items-center justify-between">
        <p className="text-xs tracking-wide text-muted-foreground uppercase">{label}</p>
        <span className={`flex size-8 items-center justify-center rounded-md ${tone}`}>
          <Icon className="size-4" />
        </span>
      </div>
      <p className="numeric mt-3 font-display text-3xl font-bold">{value}</p>
    </div>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const { patch } = useFilters();
  const [renew, setRenew] = useState<Employee | null>(null);
  const [showIngresos, setShowIngresos] = useState(false);
  const { data: employees = [] } = useEmployees();
  const { data: companies = [] } = useCompanies();
  const { data: incapacities = [] } = useIncapacities();
  const { data: leaves = [] } = useLeaves();

  const alerts = useMemo(() => buildAlerts(employees, incapacities), [employees, incapacities]);
  const active = employees.filter((e) => e.status === "activo").length;
  const retired = employees.length - active;

  const companyMap = useMemo(
    () => new Map(companies.map((c) => [c.id, c.name])),
    [companies],
  );

  const currentPeriod = useMemo(() => currentPeriodKey(), []);
  const { start: periodStart, end: periodEnd } = useMemo(
    () => periodBounds(currentPeriod),
    [currentPeriod],
  );
  const currentHires = useMemo(() => {
    return employees
      .filter(
        (e) =>
          e.status === "activo" &&
          e.hire_date >= periodStart &&
          e.hire_date <= periodEnd,
      )
      .sort((a, b) => a.hire_date.localeCompare(b.hire_date));
  }, [employees, periodStart, periodEnd]);

  const pickDay = (day: string) => {
    patch({ day, status: "todos" });
    void navigate({ to: "/empleados" });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Principal</h1>
        <p className="text-sm text-muted-foreground">
          Estado general del personal y alertas que requieren tu atención.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              icon={Users}
              label="Activos"
              value={active}
              tone="bg-success/15 text-success-foreground"
            />
            <Stat
              icon={UserMinus}
              label="Retirados"
              value={retired}
              tone="bg-retired text-retired-foreground"
            />
            <Stat
              icon={BriefcaseBusiness}
              label="Empresas"
              value={companies.length}
              tone="bg-brand-light/20 text-brand"
            />
            <Stat
              icon={Activity}
              label="Incapacidades hoy"
              value={alerts.activeIncapacities.length}
              tone="bg-danger/15 text-danger-foreground"
            />
          </div>

          <section className="panel-danger rounded-xl p-4">
            <header className="flex items-center gap-2">
              <CalendarClock className="size-4" />
              <h2 className="font-display text-sm font-bold">
                Contratos por vencer (próximos 40 días)
              </h2>
              <Badge className="ml-auto bg-danger text-danger-foreground">
                {alerts.expiring.length}
              </Badge>
            </header>
            <ul className="mt-3 divide-y divide-border/60">
              {alerts.expiring.map(({ employee, days }) => (
                <li key={employee.id} className="flex items-center gap-3 py-2 text-sm">
                  <button
                    className="font-medium underline-offset-4 hover:underline"
                    onClick={() =>
                      void navigate({
                        to: "/empleados/$id",
                        params: { id: employee.id },
                      })
                    }
                  >
                    {employee.full_name}
                  </button>
                  <span className="text-muted-foreground">{employee.position}</span>
                  <span className="numeric ml-auto">{fmtDate(employee.contract_end_date)}</span>
                  <Badge variant="outline" className="numeric">
                    {days} d
                  </Badge>
                  <Button size="sm" variant="outline" onClick={() => setRenew(employee)}>
                    Renovar
                  </Button>
                </li>
              ))}
              {alerts.expiring.length === 0 && (
                <li className="py-2 text-sm text-muted-foreground">
                  Sin contratos por vencer en la ventana de alerta.
                </li>
              )}
            </ul>
          </section>

          <section className="panel-info rounded-xl p-4">
            <header className="flex flex-wrap items-center gap-2">
              <UserPlus className="size-4" />
              <h2 className="font-display text-sm font-bold">Ingresos esta quincena</h2>
              <Badge className="ml-auto bg-brand text-brand-foreground">{currentHires.length}</Badge>
            </header>
            <p className="mt-1 text-xs text-muted-foreground">
              Quincena: {fmtDate(periodStart)} — {fmtDate(periodEnd)}
            </p>
            <ul className="mt-3 divide-y divide-border/60">
              {currentHires.slice(0, 3).map((employee) => (
                <li key={employee.id} className="flex flex-col gap-0.5 py-2 text-sm">
                  <div className="flex items-center justify-between">
                    <button
                      className="font-medium underline-offset-4 hover:underline text-left"
                      onClick={() =>
                        void navigate({
                          to: "/empleados/$id",
                          params: { id: employee.id },
                        })
                      }
                    >
                      {employee.full_name}
                    </button>
                    <span className="numeric text-muted-foreground">{fmtDate(employee.hire_date)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {employee.cedula} · {employee.position} · {companyMap.get(employee.company_id ?? "") ?? "—"}
                  </div>
                </li>
              ))}
              {currentHires.length === 0 && (
                <li className="py-2 text-sm text-muted-foreground">Sin ingresos en esta quincena.</li>
              )}
            </ul>
            {currentHires.length > 3 && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full"
                onClick={() => setShowIngresos(true)}
              >
                Ver {currentHires.length - 3} más
              </Button>
            )}
          </section>

          <section className="panel-warning rounded-xl p-4">
            <header className="flex items-center gap-2">
              <Activity className="size-4" />
              <h2 className="font-display text-sm font-bold">Incapacidades activas hoy</h2>
              <Badge className="ml-auto bg-warning text-warning-foreground">
                {alerts.activeIncapacities.length}
              </Badge>
            </header>
            <ul className="mt-3 divide-y divide-border/60">
              {alerts.activeIncapacities.map(({ employee, incapacity }) => (
                <li key={incapacity.id} className="flex items-center gap-3 py-2 text-sm">
                  <button
                    className="font-medium underline-offset-4 hover:underline"
                    onClick={() =>
                      void navigate({ to: "/empleados/$id", params: { id: employee.id } })
                    }
                  >
                    {employee.full_name}
                  </button>
                  <span className="text-muted-foreground">
                    {INCAPACITY_LABELS[incapacity.type] ?? incapacity.type}
                  </span>
                  <span className="numeric ml-auto">
                    {fmtDate(incapacity.start_date)} → {fmtDate(incapacity.end_date)}
                  </span>
                </li>
              ))}
              {alerts.activeIncapacities.length === 0 && (
                <li className="py-2 text-sm text-muted-foreground">
                  Nadie está incapacitado hoy.
                </li>
              )}
            </ul>
          </section>

          <section className="panel-success rounded-xl p-4">
            <header className="flex items-center gap-2">
              <DoorOpen className="size-4" />
              <h2 className="font-display text-sm font-bold">Salidas próximas (30 días)</h2>
              <Badge className="ml-auto bg-success text-success-foreground">
                {alerts.upcomingExits.length}
              </Badge>
            </header>
            <ul className="mt-3 divide-y divide-border/60">
              {alerts.upcomingExits.map(({ employee, days }) => (
                <li key={employee.id} className="flex items-center gap-3 py-2 text-sm">
                  <span className="font-medium">{employee.full_name}</span>
                  <span className="numeric ml-auto">{fmtDate(employee.exit_date)}</span>
                  <Badge variant="outline" className="numeric">
                    {days} d
                  </Badge>
                </li>
              ))}
              {alerts.upcomingExits.length === 0 && (
                <li className="py-2 text-sm text-muted-foreground">Sin salidas programadas.</li>
              )}
            </ul>
          </section>
        </div>

        <div className="space-y-4">
          <MiniCalendar
            employees={employees}
            incapacities={incapacities}
            leaves={leaves}
            selected={null}
            onPickDay={pickDay}
          />
          <div className="rounded-xl border bg-surface p-4 text-sm shadow-panel">
            <p className="font-display text-sm font-bold">Novedades del mes</p>
            <ul className="mt-2 space-y-1 text-muted-foreground">
              <li className="flex justify-between">
                <span>Incapacidades registradas</span>
                <strong className="numeric text-foreground">{incapacities.length}</strong>
              </li>
              <li className="flex justify-between">
                <span>Permisos registrados</span>
                <strong className="numeric text-foreground">{leaves.length}</strong>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {currentHires.length > 0 && (
        <Dialog open={showIngresos} onOpenChange={setShowIngresos}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Ingresos esta quincena</DialogTitle>
              <DialogDescription>
                {periodLabelLong(currentPeriod)} · Quincena: {fmtDate(periodStart)} — {fmtDate(periodEnd)}
              </DialogDescription>
            </DialogHeader>
            <ul className="max-h-[60vh] divide-y divide-border/60 overflow-auto">
              {currentHires.map((employee) => (
                <li key={employee.id} className="flex flex-col gap-1 py-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{employee.full_name}</span>
                    <span className="numeric text-muted-foreground">
                      {fmtDate(employee.hire_date)}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Cédula: {employee.cedula} · Cargo: {employee.position}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Empresa: {companyMap.get(employee.company_id ?? "") ?? "—"}
                  </div>
                  <div className="mt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowIngresos(false);
                        void navigate({
                          to: "/empleados/$id",
                          params: { id: employee.id },
                        });
                      }}
                    >
                      Ver perfil
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setShowIngresos(false)}>
                Cerrar
              </Button>
              <Button
                onClick={() => {
                  setShowIngresos(false);
                  void navigate({ to: "/empleados" });
                }}
              >
                Ir a empleados
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {renew && (
        <RenewContractDialog
          open={Boolean(renew)}
          onOpenChange={(v) => !v && setRenew(null)}
          employee={renew}
        />
      )}
    </div>
  );
}
