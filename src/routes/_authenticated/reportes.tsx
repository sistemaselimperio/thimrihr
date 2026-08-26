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
  useIncapacities,
  useLeaves,
  useOverrides,
  useTerminations,
} from "@/lib/data";
import { downloadWorkbook, type Cell, type SheetBlock } from "@/lib/excel";
import {
  INCAPACITY_LABELS,
  TERMINATION_LABELS,
  buildQuincenas,
  currentPeriodKey,
  fmtDate,
  monthLong,
  overlapDays,
  periodBounds,
  periodKeysOfYear,
  periodLabelLong,
  periodYear,
  todayISO,
  type Employee,
} from "@/lib/hr";

export const Route = createFileRoute("/_authenticated/reportes")({
  head: () => ({
    meta: [
      { title: "Reportes de nómina · imperiorrhco" },
      {
        name: "description",
        content:
          "Reporte quincenal de novedades por empresa: ingresos, retiros, permisos e incapacidades, exportable a Excel con una pestaña por empresa.",
      },
      { property: "og:title", content: "Reportes de nómina · imperiorrhco" },
      {
        property: "og:description",
        content: "Novedades y días trabajados por quincena, exportables a Excel por empresa.",
      },
    ],
  }),
  component: ReportsPage,
});

type StatusFilter = "activo" | "retirado" | "todos";

const NOVELTY_HEADER = [
  "Cédula",
  "Nombre",
  "Empresa",
  "Cargo",
  "Fecha(s) de novedad",
  "Días",
  "Días trabajados",
];

function dateRange(start: string, end: string) {
  return start === end ? fmtDate(start) : `${fmtDate(start)} a ${fmtDate(end)}`;
}

function ReportsPage() {
  const { data: employees = [] } = useEmployees();
  const { data: companies = [] } = useCompanies();
  const { data: incapacities = [] } = useIncapacities();
  const { data: leaves = [] } = useLeaves();
  const { data: overrides = [] } = useOverrides();
  const { data: terminations = [] } = useTerminations();

  const [periodKey, setPeriodKey] = useState(currentPeriodKey());
  const [companyId, setCompanyId] = useState<string>("all");
  const [status, setStatus] = useState<StatusFilter>("todos");

  const today = todayISO();
  const periodOptions = useMemo(() => {
    const year = new Date().getFullYear();
    return [...periodKeysOfYear(year - 1), ...periodKeysOfYear(year)]
      .filter((k) => periodBounds(k).start <= today)
      .reverse();
  }, [today]);

  const bounds = periodBounds(periodKey);

  const selectedCompanies = useMemo(
    () => (companyId === "all" ? companies : companies.filter((c) => c.id === companyId)),
    [companies, companyId],
  );

  const companyName = (id: string | null) =>
    id ? (companies.find((c) => c.id === id)?.name ?? "") : "";

  /** Empleados del período que pasan los filtros, con su fila de quincena. */
  const rows = useMemo(() => {
    const allowed = new Set(selectedCompanies.map((c) => c.id));
    return employees
      .filter((e) => (e.company_id ? allowed.has(e.company_id) : false))
      .filter((e) => (status === "todos" ? true : e.status === status))
      .filter((e) => !e.hire_date || e.hire_date <= bounds.end)
      .filter((e) => !e.exit_date || e.exit_date >= bounds.start)
      .map((e) => {
        const quincenas = buildQuincenas(
          e,
          incapacities.filter((i) => i.employee_id === e.id),
          leaves.filter((l) => l.employee_id === e.id),
          overrides.filter((o) => o.employee_id === e.id),
          periodYear(periodKey),
        );
        return {
          employee: e,
          row: quincenas.find((q) => q.periodKey === periodKey),
          firstPeriodKey: quincenas[0]?.periodKey ?? null,
        };
      })
      .filter((r) => r.row);

  }, [employees, selectedCompanies, status, bounds, incapacities, leaves, overrides, periodKey]);

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

  const buildCompanyBlocks = (companyId: string): SheetBlock[] => {
    const list = rows.filter((r) => r.employee.company_id === companyId);
    const byId = new Map(list.map((r) => [r.employee.id, r]));
    const worked = (e: Employee) => byId.get(e.id)?.row?.workedDays ?? 0;
    const base = (e: Employee): Cell[] => [
      e.cedula,
      e.full_name,
      companyName(e.company_id),
      e.position ?? "",
    ];

    const ingresos = list
      .filter(({ employee }) => employee.hire_date && employee.hire_date >= bounds.start && employee.hire_date <= bounds.end)
      .sort((a, b) => (a.employee.hire_date ?? "").localeCompare(b.employee.hire_date ?? ""))
      .map(({ employee }): Cell[] => [
        ...base(employee),
        fmtDate(employee.hire_date),
        "",
        worked(employee),
      ]);

    // Empleados cuya primera quincena liquidada es la seleccionada.
    const primeraQuincena = list
      .filter(({ firstPeriodKey }) => firstPeriodKey === periodKey)
      .sort((a, b) => a.employee.full_name.localeCompare(b.employee.full_name))
      .map(({ employee, row }): Cell[] => [
        ...base(employee),
        employee.hire_date ? `Ingreso ${fmtDate(employee.hire_date)}` : periodLabelLong(periodKey),
        row?.baseDays ?? 0,
        worked(employee),
      ]);


    const retiros = terminations
      .filter((t) => byId.has(t.employee_id))
      .filter((t) => t.exit_date >= bounds.start && t.exit_date <= bounds.end)
      .sort((a, b) => a.exit_date.localeCompare(b.exit_date))
      .map((t): Cell[] => {
        const e = byId.get(t.employee_id)!.employee;
        return [
          ...base(e),
          `${fmtDate(t.exit_date)} · ${TERMINATION_LABELS[t.type] ?? t.type}`,
          "",
          worked(e),
        ];
      });

    const leaveRows = (type: string) =>
      leaves
        .filter((l) => l.type === type)
        .filter((l) => byId.has(l.employee_id))
        .filter((l) => l.start_date <= bounds.end && l.end_date >= bounds.start)
        .sort((a, b) => a.start_date.localeCompare(b.start_date))
        .map((l): Cell[] => {
          const e = byId.get(l.employee_id)!.employee;
          return [
            ...base(e),
            dateRange(l.start_date, l.end_date),
            Number(l.days),
            worked(e),
          ];
        });

    const incapacidades = incapacities
      .filter((i) => byId.has(i.employee_id))
      .filter((i) => i.start_date <= bounds.end && i.end_date >= bounds.start)
      .sort((a, b) => a.start_date.localeCompare(b.start_date))
      .map((i): Cell[] => {
        const e = byId.get(i.employee_id)!.employee;
        return [
          ...base(e),
          `${dateRange(i.start_date, i.end_date)} · ${INCAPACITY_LABELS[i.type] ?? i.type}`,
          overlapDays(i.start_date, i.end_date, bounds.start, bounds.end),
          worked(e),
        ];
      });

    const descuentos = overrides
      .filter((o) => o.period_key === periodKey && byId.has(o.employee_id))
      .map((o): Cell[] => {
        const e = byId.get(o.employee_id)!.employee;
        return [
          ...base(e),
          periodLabelLong(periodKey),
          Number(o.base_days),
          worked(e),
        ];
      });

    // Solo empleados con alguna novedad en la quincena seleccionada.
    const conNovedad = new Set<string>();
    list.forEach(({ employee: e, firstPeriodKey }) => {
      if (e.hire_date && e.hire_date >= bounds.start && e.hire_date <= bounds.end)
        conNovedad.add(e.id);
      if (firstPeriodKey === periodKey) conNovedad.add(e.id);
    });

    terminations
      .filter((t) => byId.has(t.employee_id) && t.exit_date >= bounds.start && t.exit_date <= bounds.end)
      .forEach((t) => conNovedad.add(t.employee_id));
    leaves
      .filter((l) => byId.has(l.employee_id) && l.start_date <= bounds.end && l.end_date >= bounds.start)
      .forEach((l) => conNovedad.add(l.employee_id));
    incapacities
      .filter((i) => byId.has(i.employee_id) && i.start_date <= bounds.end && i.end_date >= bounds.start)
      .forEach((i) => conNovedad.add(i.employee_id));
    overrides
      .filter((o) => o.period_key === periodKey && byId.has(o.employee_id))
      .forEach((o) => conNovedad.add(o.employee_id));

    const resumen = list
      .filter(({ employee }) => conNovedad.has(employee.id))
      .sort((a, b) => a.employee.full_name.localeCompare(b.employee.full_name))
      .map(({ employee, row }): Cell[] => [
        employee.cedula,
        employee.full_name,
        companyName(employee.company_id),
        employee.position ?? "",
        row?.baseDays ?? 0,
        row?.leaveDays ?? 0,
        row?.incapacityDays ?? 0,
        row?.vacationDays ?? 0,
        row?.workedDays ?? 0,
        employee.status === "activo" ? "Activo" : "Retirado",
      ]);


    return [
      {
        title: `${companyName(companyId)} — ${periodLabelLong(periodKey)} (${fmtDate(bounds.start)} a ${fmtDate(bounds.end)})`,
        rows: [],
      },
      {
        title: "EMPLEADOS CON NOVEDADES EN LA QUINCENA",
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
        rows: resumen,
      },
      { title: "1. INGRESOS", header: NOVELTY_HEADER, rows: ingresos },
      { title: "2. RETIROS", header: NOVELTY_HEADER, rows: retiros },
      {
        title: "3. PERMISO POR DESCUENTO DE VACACIONES",
        header: NOVELTY_HEADER,
        rows: leaveRows("vacaciones"),
      },
      {
        title: "4. PERMISO POR DESCUENTO DE DÍAS NO LABORADOS",
        header: NOVELTY_HEADER,
        rows: leaveRows("sin_pago"),
      },
      {
        title: "5. OTRAS NOVEDADES (INCAPACIDADES)",
        header: NOVELTY_HEADER,
        rows: incapacidades,
      },
      {
        title: "6. DESCUENTOS ESPECIALES (AJUSTE DE DÍAS BASE)",
        header: [...NOVELTY_HEADER.slice(0, 5), "Días base ajustados", "Días trabajados"],
        rows: descuentos,
      },
    ];
  };

  const exportReport = () => {
    if (selectedCompanies.length === 0) {
      toast.error("Selecciona al menos una empresa");
      return;
    }
    const [year, month, q] = periodKey.split("-");
    const fileName = `Reporte_Novedades_Quincena_${q === "Q1" ? 1 : 2}_${monthLong(Number(month) - 1)}_${year}.xlsx`;
    downloadWorkbook(
      fileName,
      selectedCompanies.map((c) => ({ name: c.name, blocks: buildCompanyBlocks(c.id) })),
    );
    toast.success(`Reporte generado (${selectedCompanies.length} pestañas)`);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Reportes de nómina</h1>
          <p className="text-sm text-muted-foreground">
            Novedades y días trabajados por quincena, con una pestaña de Excel por empresa.
          </p>
        </div>
        <Button variant="success" className="gap-2" onClick={exportReport}>
          <FileSpreadsheet className="size-4" /> Generar reporte
        </Button>
      </div>

      <div className="grid gap-5 rounded-xl border bg-surface p-4 shadow-panel md:grid-cols-3">
        <div className="space-y-1.5">
          <Label className="text-xs">1. Quincena</Label>
          <Select value={periodKey} onValueChange={setPeriodKey}>
            <SelectTrigger className="w-full">
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
          <Label className="text-xs">2. Empresa</Label>
          <Select value={companyId} onValueChange={setCompanyId}>
            <SelectTrigger className="w-full">
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

        <div className="space-y-1.5">
          <Label className="text-xs">3. Estado</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="activo">Activos</SelectItem>
              <SelectItem value="retirado">Retirados</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <span>
          {fmtDate(bounds.start)} → {fmtDate(bounds.end)} · {rows.length} empleados ·{" "}
          {selectedCompanies.length} pestaña{selectedCompanies.length === 1 ? "" : "s"}
        </span>
        <span className="ml-auto">
          Días trabajados totales: <strong>{Math.round(totals.worked * 10) / 10}</strong>
        </span>
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
                  No hay empleados con los filtros seleccionados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
