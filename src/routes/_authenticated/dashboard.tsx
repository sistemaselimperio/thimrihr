import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Activity,
  BriefcaseBusiness,
  CalendarClock,
  DoorOpen,
  UserMinus,
  Users,
} from "lucide-react";

import { MiniCalendar } from "@/components/hr/MiniCalendar";
import { RenewContractDialog } from "@/components/hr/RenewContractDialog";
import { useFilters } from "@/components/layout/filters-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useCompanies,
  useEmployees,
  useIncapacities,
  useLeaves,
} from "@/lib/data";
import { buildAlerts } from "@/lib/filters";
import { INCAPACITY_LABELS, fmtDate, type Employee } from "@/lib/hr";

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
  const { data: employees = [] } = useEmployees();
  const { data: companies = [] } = useCompanies();
  const { data: incapacities = [] } = useIncapacities();
  const { data: leaves = [] } = useLeaves();

  const alerts = useMemo(() => buildAlerts(employees, incapacities), [employees, incapacities]);
  const active = employees.filter((e) => e.status === "activo").length;
  const retired = employees.length - active;

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
