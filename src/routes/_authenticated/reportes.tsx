import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useCompanies,
  useEmployees,
  useEntitlements,
  useIncapacities,
  useLeaves,
  useOverrides,
} from "@/lib/data";
import { downloadSheet } from "@/lib/excel";
import {
  buildQuincenas,
  buildVacationSummary,
  currentPeriodKey,
  fmtDate,
  periodBounds,
  periodKeysOfYear,
  periodLabel,
  periodLabelLong,
  periodYear,
  todayISO,
} from "@/lib/hr";

export const Route = createFileRoute("/_authenticated/reportes")({
  head: () => ({
    meta: [
      { title: "Reportes de nómina · RRHH El Imperio" },
      {
        name: "description",
        content:
          "Reporte quincenal de días trabajados, novedades y saldos de vacaciones, exportable a Excel por empresa.",
      },
      { property: "og:title", content: "Reportes de nómina · RRHH El Imperio" },
      {
        property: "og:description",
        content: "Días trabajados por quincena y saldos de vacaciones, exportables a Excel.",
      },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const { data: employees = [] } = useEmployees();
  const { data: companies = [] } = useCompanies();
  const { data: incapacities = [] } = useIncapacities();
  const { data: leaves = [] } = useLeaves();
  const { data: overrides = [] } = useOverrides();
  const { data: entitlements = [] } = useEntitlements();

  const [periodKey, setPeriodKey] = useState(currentPeriodKey());
  const [companyId, setCompanyId] = useState("all");

  const today = todayISO();
  const periodOptions = useMemo(() => {
    const year = new Date().getFullYear();
    return [...periodKeysOfYear(year - 1), ...periodKeysOfYear(year)]
      .filter((k) => periodBounds(k).start <= today)
      .reverse();
  }, [today]);

  const bounds = periodBounds(periodKey);

  const rows = useMemo(() => {
    return employees
      .filter((e) => (companyId === "all" ? true : e.company_id === companyId))
      .filter((e) => e.hire_date <= bounds.end)
      .filter((e) => !e.exit_date || e.exit_date >= bounds.start)
      .map((e) => {
        const quincenas = buildQuincenas(
          e,
          incapacities.filter((i) => i.employee_id === e.id),
          leaves.filter((l) => l.employee_id === e.id),
          overrides.filter((o) => o.employee_id === e.id),
          periodYear(periodKey),
        );
        const row = quincenas.find((q) => q.periodKey === periodKey);
        const vacations = buildVacationSummary(
          e,
          entitlements.filter((v) => v.employee_id === e.id),
          leaves.filter((l) => l.employee_id === e.id),
        );
        return { employee: e, row, vacations };
      })
      .filter((r) => r.row);
  }, [employees, companyId, bounds, incapacities, leaves, overrides, entitlements, periodKey]);

  const totals = rows.reduce(
    (acc, r) => {
      acc.base += r.row?.baseDays ?? 0;
      acc.worked += r.row?.workedDays ?? 0;
      acc.leave += r.row?.leaveDays ?? 0;
      acc.inc += r.row?.incapacityDays ?? 0;
      acc.vac += r.row?.vacationDays ?? 0;
      return acc;
    },
    { base: 0, worked: 0, leave: 0, inc: 0, vac: 0 },
  );

  const companyName = (id: string | null) =>
    id ? (companies.find((c) => c.id === id)?.name ?? "") : "";

  const vacationLeaveRows = useMemo(() => {
    const byId = new Map(rows.map((r) => [r.employee.id, r.employee]));
    return leaves
      .filter((l) => l.type === "vacaciones")
      .filter((l) => l.start_date <= bounds.end && l.end_date >= bounds.start)
      .filter((l) => byId.has(l.employee_id))
      .sort((a, b) => a.start_date.localeCompare(b.start_date))
      .map((l) => {
        const e = byId.get(l.employee_id)!;
        const fechas =
          l.start_date === l.end_date
            ? fmtDate(l.start_date)
            : `${fmtDate(l.start_date)} a ${fmtDate(l.end_date)}`;
        return [
          e.cedula,
          e.full_name,
          companyName(e.company_id),
          e.position ?? "",
          fechas,
          Number(l.days),
        ];
      });
  }, [rows, leaves, bounds, companies]);


  const exportReport = () => {
    downloadSheet(`Nomina_${periodKey}.xlsx`, periodLabel(periodKey), [
      {
        title: `REPORTE DE NÓMINA — ${periodLabelLong(periodKey)} (${fmtDate(bounds.start)} a ${fmtDate(bounds.end)})`,
        header: [
          "Cédula",
          "Nombre",
          "Empresa",
          "Cargo",
          "Días base",
          "Permisos",
          "Incapacidad",
          "Vacaciones",
          "Días trabajados",
          "Estado",
        ],
        rows: rows.map(({ employee, row }) => [
          employee.cedula,
          employee.full_name,
          companyName(employee.company_id),
          employee.position,
          row?.baseDays ?? 0,
          row?.leaveDays ?? 0,
          row?.incapacityDays ?? 0,
          row?.vacationDays ?? 0,
          row?.workedDays ?? 0,
          employee.status === "activo" ? "Activo" : "Retirado",
        ]),
      },
      {
        title: "TOTALES",
        header: ["Días base", "Permisos", "Incapacidad", "Vacaciones", "Días trabajados"],
        rows: [
          [
            Math.round(totals.base * 10) / 10,
            Math.round(totals.leave * 10) / 10,
            Math.round(totals.inc * 10) / 10,
            Math.round(totals.vac * 10) / 10,
            Math.round(totals.worked * 10) / 10,
          ],
        ],
      },
      {
        title: "PERMISO POR DESCUENTO DE VACACIONES",
        header: ["Cédula", "Nombre", "Empresa", "Cargo", "Fecha", "Días"],
        rows: vacationLeaveRows,
      },
    ]);
    toast.success("Reporte de nómina exportado");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Reportes de nómina</h1>
          <p className="text-sm text-muted-foreground">
            Días trabajados por quincena, calculados desde las novedades registradas.
          </p>
        </div>
        <Button variant="success" className="gap-2" onClick={exportReport}>
          <FileSpreadsheet className="size-4" /> Exportar a Excel
        </Button>
      </div>

      <div className="flex flex-wrap gap-4 rounded-xl border bg-surface p-4 shadow-panel">
        <div className="space-y-1.5">
          <Label className="text-xs">Quincena</Label>
          <Select value={periodKey} onValueChange={setPeriodKey}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {periodOptions.map((k) => (
                <SelectItem key={k} value={k}>
                  {periodLabelLong(k)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Empresa</Label>
          <Select value={companyId} onValueChange={setCompanyId}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las empresas</SelectItem>
              {companies.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto self-end text-sm text-muted-foreground">
          {fmtDate(bounds.start)} → {fmtDate(bounds.end)} · {rows.length} empleados
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-surface shadow-panel">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Base</TableHead>
              <TableHead>Permisos</TableHead>
              <TableHead>Incapacidad</TableHead>
              <TableHead>Vacaciones</TableHead>
              <TableHead>Trabajados</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ employee, row }) => (
              <TableRow key={employee.id}>
                <TableCell className="font-medium">{employee.full_name}</TableCell>
                <TableCell>{companyName(employee.company_id) || "—"}</TableCell>
                <TableCell className="numeric">{row?.baseDays}</TableCell>
                <TableCell className="numeric">{row?.leaveDays}</TableCell>
                <TableCell className="numeric">{row?.incapacityDays}</TableCell>
                <TableCell className="numeric">{row?.vacationDays}</TableCell>
                <TableCell className="numeric font-semibold">{row?.workedDays}</TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  No hay empleados en esta quincena.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
