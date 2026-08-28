import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { EmployeeDialog } from "@/components/hr/EmployeeDialog";
import { useFilters } from "@/components/layout/filters-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCompanies, useEmployees, useIncapacities, useLeaves } from "@/lib/data";
import { downloadSheet } from "@/lib/excel";
import { filterEmployees } from "@/lib/filters";
import { fmtDate, type Employee } from "@/lib/hr";

export const Route = createFileRoute("/_authenticated/empleados/")({
  head: () => ({
    meta: [
      { title: "Empleados · imperiorrhco" },
      {
        name: "description",
        content:
          "Base centralizada de empleados activos y retirados de las 5 empresas del Grupo El Imperio, con filtros avanzados.",
      },
      { property: "og:title", content: "Empleados · imperiorrhco" },
      {
        property: "og:description",
        content: "Base de empleados activos y retirados con filtros avanzados.",
      },
    ],
  }),
  component: EmployeesPage,
});

function EmployeesPage() {
  const { filters, patch } = useFilters();
  const { data: employees = [] } = useEmployees();
  const { data: companies = [] } = useCompanies();
  const { data: incapacities = [] } = useIncapacities();
  const { data: leaves = [] } = useLeaves();
  const [editing, setEditing] = useState<Employee | null>(null);
  const [open, setOpen] = useState(false);

  const companyName = useMemo(
    () => new Map(companies.map((c) => [c.id, c.name])),
    [companies],
  );

  const rows = useMemo(
    () => filterEmployees(employees, filters, { incapacities, leaves }),
    [employees, filters, incapacities, leaves],
  );

  const exportRows = () => {
    downloadSheet("Empleados_filtrados.xlsx", "Empleados", [
      {
        title: "EMPLEADOS (SELECCIÓN ACTUAL)",
        header: ["Cédula", "Nombre", "Empresa", "Cargo", "Ingreso", "Tipo de contrato", "Fin contrato", "Estado"],
        rows: rows.map((e) => [
          e.cedula,
          e.full_name,
          e.company_id ? (companyName.get(e.company_id) ?? "") : "",
          e.position,
          fmtDate(e.hire_date),
          CONTRACT_TYPE_LABELS[
            e.contract_type ?? (e.contract_end_date ? "fijo" : "indefinido")
          ] ?? "",
          isFixedTerm(e) ? fmtDate(e.contract_end_date) : "—",
          e.status === "activo" ? "Activo" : "Retirado",
        ]),
      },
    ]);
    toast.success("Selección exportada a Excel");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Empleados</h1>
          <p className="text-sm text-muted-foreground">
            {rows.length} de {employees.length} registros según los filtros activos.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={exportRows}>
            <Download className="size-4" /> Exportar
          </Button>
          <Button
            variant="success"
            className="gap-2"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="size-4" /> Nuevo empleado
          </Button>
        </div>
      </div>

      {filters.status !== "todos" && (
        <button
          className="text-xs text-muted-foreground underline-offset-4 hover:underline"
          onClick={() => patch({ status: "todos" })}
        >
          Mostrando solo {filters.status}s — ver todos
        </button>
      )}

      <div className="overflow-hidden rounded-xl border bg-surface shadow-panel">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Cédula</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Ingreso</TableHead>
              <TableHead>Tipo contrato</TableHead>
              <TableHead>Fin contrato</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((e) => (
              <TableRow key={e.id} className={e.status === "retirado" ? "opacity-70" : undefined}>
                <TableCell className="font-medium">
                  <Link
                    to="/empleados/$id"
                    params={{ id: e.id }}
                    className="underline-offset-4 hover:underline"
                  >
                    {e.full_name}
                  </Link>
                </TableCell>
                <TableCell className="numeric">{e.cedula}</TableCell>
                <TableCell>{e.company_id ? (companyName.get(e.company_id) ?? "—") : "—"}</TableCell>
                <TableCell>{e.position}</TableCell>
                <TableCell className="numeric">{fmtDate(e.hire_date)}</TableCell>
                <TableCell className="numeric">
                  {isFixedTerm(e) ? fmtDate(e.contract_end_date) : "—"}
                </TableCell>
                <TableCell>
                  {e.status === "activo" ? (
                    <Badge className="bg-success/20 text-success-foreground">Activo</Badge>
                  ) : (
                    <Badge className="bg-retired text-retired-foreground">Retirado</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Editar ${e.full_name}`}
                    onClick={() => {
                      setEditing(e);
                      setOpen(true);
                    }}
                  >
                    <Pencil className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                  No hay empleados que cumplan los filtros seleccionados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <EmployeeDialog open={open} onOpenChange={setOpen} employee={editing} />
    </div>
  );
}
