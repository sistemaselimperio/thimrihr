import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { CompanyLogos } from "@/components/hr/CompanyLogos";
import { ImportEmployees } from "@/components/hr/ImportEmployees";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useCompanies, useEmployees, useTemplates } from "@/lib/data";
import {
  CONTRACT_ALERT_DAYS,
  EXIT_ALERT_DAYS,
  MAX_VACATION_LEAVE_DAYS,
  VACATION_MIN_RESERVE,
} from "@/lib/hr";

export const Route = createFileRoute("/_authenticated/configuracion")({
  head: () => ({
    meta: [
      { title: "Configuración · imperiorrhco" },
      {
        name: "description",
        content:
          "Empresas del grupo, plantillas de documentos y reglas automáticas de alertas y vacaciones.",
      },
      { property: "og:title", content: "Configuración · imperiorrhco" },
      {
        property: "og:description",
        content: "Empresas, plantillas y reglas de alertas del sistema.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { data: companies = [] } = useCompanies();
  const { data: employees = [] } = useEmployees();
  const { data: templates = [] } = useTemplates();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  const rules = [
    { rule: "Alerta de vencimiento de contrato", value: `${CONTRACT_ALERT_DAYS} días antes` },
    { rule: "Alerta de salida próxima", value: `${EXIT_ALERT_DAYS} días antes` },
    {
      rule: "Máximo de permiso con descuento de vacaciones",
      value: `${MAX_VACATION_LEAVE_DAYS} días`,
    },
    { rule: "Días de vacaciones que deben reservarse", value: `${VACATION_MIN_RESERVE} días` },
    { rule: "Días base por quincena", value: "15 días (ajustables por empleado)" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Configuración</h1>
        <p className="text-sm text-muted-foreground">
          Empresas, plantillas y reglas automáticas del sistema.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-surface p-4 shadow-panel">
          <p className="text-xs text-muted-foreground uppercase">Sesión</p>
          <p className="mt-1 text-sm font-medium">{email ?? "—"}</p>
        </div>
        <div className="rounded-xl border bg-surface p-4 shadow-panel">
          <p className="text-xs text-muted-foreground uppercase">Empleados registrados</p>
          <p className="numeric font-display text-2xl font-bold">{employees.length}</p>
        </div>
        <div className="rounded-xl border bg-surface p-4 shadow-panel">
          <p className="text-xs text-muted-foreground uppercase">Plantillas disponibles</p>
          <p className="numeric font-display text-2xl font-bold">{templates.length}</p>
        </div>
      </div>

      <section className="space-y-2">
        <h2 className="font-display text-sm font-bold">Empresas del grupo</h2>
        <div className="overflow-hidden rounded-xl border bg-surface shadow-panel">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>Activos</TableHead>
                <TableHead>Retirados</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map((c) => {
                const list = employees.filter((e) => e.company_id === c.id);
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="numeric">
                      {list.filter((e) => e.status === "activo").length}
                    </TableCell>
                    <TableCell className="numeric">
                      {list.filter((e) => e.status !== "activo").length}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </section>

      <CompanyLogos companies={companies} />

      <ImportEmployees companies={companies} />





      <section className="space-y-2">
        <h2 className="font-display text-sm font-bold">Plantillas de documentos</h2>
        <div className="overflow-hidden rounded-xl border bg-surface shadow-panel">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Descripción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell>{t.category}</TableCell>
                  <TableCell className="text-muted-foreground">{t.description ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-sm font-bold">Reglas automáticas</h2>
        <div className="overflow-hidden rounded-xl border bg-surface shadow-panel">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Regla</TableHead>
                <TableHead>Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((r) => (
                <TableRow key={r.rule}>
                  <TableCell>{r.rule}</TableCell>
                  <TableCell className="font-medium">{r.value}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
