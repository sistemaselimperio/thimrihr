import { useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Check, Download, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { qk, useEmployees, useImportBatches } from "@/lib/data";
import { downloadSheet } from "@/lib/excel";
import { fmtDate, type Company, type Employee } from "@/lib/hr";
import {
  parseEmployeeWorkbook,
  type ImportIssue,
  type ParseResult,
  type ParsedEmployeeRow,
} from "@/lib/import-employees";

const MAX_SIZE = 10 * 1024 * 1024;

/* eslint-disable @typescript-eslint/no-explicit-any */
const db = supabase as any;

function norm(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/** Relaciona el nombre de la pestaña del Excel con una empresa registrada. */
function matchCompany(sheet: string, companies: Company[]): string | null {
  const tokens = norm(sheet);
  let best: { id: string; score: number } | null = null;
  companies.forEach((c) => {
    const ct = norm(c.name);
    const score = tokens.filter((t) => ct.some((w) => w.startsWith(t) || t.startsWith(w))).length;
    if (score > 0 && (!best || score > best.score)) best = { id: c.id, score };
  });
  return best ? best.id : null;
}

export function ImportEmployees({ companies }: { companies: Company[] }) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: employees = [] } = useEmployees();
  const { data: batches = [] } = useImportBatches();
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [reading, setReading] = useState(false);
  const [importing, setImporting] = useState(false);

  const existing = useMemo(
    () => new Map(employees.map((e) => [e.cedula, e as Employee])),
    [employees],
  );

  const summary = useMemo(() => {
    if (!result) return null;
    let creates = 0;
    result.rows.forEach((r) => {
      if (!existing.has(r.cedula)) creates++;
    });
    return { creates, updates: result.rows.length - creates };
  }, [result, existing]);

  const pick = async (selected: File | null) => {
    setResult(null);
    setFile(selected);
    if (!selected) return;
    if (selected.size > MAX_SIZE) {
      toast.error("El archivo supera los 10 MB");
      setFile(null);
      return;
    }
    setReading(true);
    try {
      const parsed = await parseEmployeeWorkbook(selected);
      if (parsed.rows.length === 0) {
        toast.error("No se encontraron filas con la columna Cédula");
      }
      setResult(parsed);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo leer el archivo");
    } finally {
      setReading(false);
    }
  };

  const runImport = async () => {
    if (!result || !file) return;
    setImporting(true);
    let created = 0;
    let updated = 0;
    const failures: ImportIssue[] = [];

    const payload = (row: ParsedEmployeeRow) => {
      const companyId = matchCompany(row.sheet, companies);
      const body: Record<string, unknown> = {
        full_name: row.full_name,
        first_name: row.first_name,
        last_name: row.last_name,
        position: row.position ?? "Sin cargo",
        work_location: row.work_location,
        municipality: row.municipality,
        phone: row.phone,
        landline: row.landline,
        email: row.email,
        contract_end_date: row.contract_end_date,
        exit_date: row.exit_date,
        status: row.status,
        folder_number: row.folder_number,
      };
      if (companyId) body.company_id = companyId;
      if (row.hire_date) body.hire_date = row.hire_date;
      return body;
    };

    for (const row of result.rows) {
      const current = existing.get(row.cedula);
      try {
        if (current) {
          const { error } = await db.from("employees").update(payload(row)).eq("id", current.id);
          if (error) throw new Error(error.message);
          updated++;
        } else {
          const body = payload(row);
          const { error } = await db.from("employees").insert({
            ...body,
            cedula: row.cedula,
            hire_date: row.hire_date ?? new Date().toISOString().slice(0, 10),
          });
          if (error) throw new Error(error.message);
          created++;
        }
      } catch (error) {
        failures.push({
          sheet: row.sheet,
          rowNumber: row.rowNumber,
          message: error instanceof Error ? error.message : "Error desconocido",
        });
      }
    }

    const errors = [...result.issues, ...failures];
    try {
      await db.from("import_batches").insert({
        file_name: file.name,
        total_rows: result.rows.length,
        created_count: created,
        updated_count: updated,
        error_count: errors.length,
        errors: errors.slice(0, 200),
      });
    } catch {
      /* el historial es informativo, no bloquea la importación */
    }

    await qc.invalidateQueries({ queryKey: qk.employees });
    await qc.invalidateQueries({ queryKey: qk.imports });
    setImporting(false);
    setResult(null);
    setFile(null);
    if (inputRef.current) inputRef.current.value = "";
    toast.success(
      `${created + updated} empleados importados (${created} nuevos, ${updated} actualizados)`,
    );
    if (failures.length) toast.error(`${failures.length} filas no se pudieron guardar`);
  };

  const exportBackup = () => {
    const stamp = new Date().toISOString().slice(0, 10);
    downloadSheet(`Lista_empleados_backup_${stamp}.xlsx`, "Empleados", [
      {
        title: "RESPALDO DE EMPLEADOS",
        header: [
          "N° Carpeta",
          "Cédula",
          "Apellidos",
          "Nombres",
          "Cargo",
          "Lugar de Trabajo",
          "Municipio",
          "Celular",
          "Teléfono",
          "Email",
          "Fecha de Ingreso",
          "Fin de Contrato",
          "Fecha de Salida",
          "Estado",
        ],
        rows: employees.map((e) => [
          e.folder_number ?? "",
          e.cedula,
          e.last_name ?? "",
          e.first_name ?? e.full_name,
          e.position,
          e.work_location ?? "",
          e.municipality ?? "",
          e.phone ?? "",
          e.landline ?? "",
          e.email ?? "",
          e.hire_date ? fmtDate(e.hire_date) : "",
          e.contract_end_date ? fmtDate(e.contract_end_date) : "",
          e.exit_date ? fmtDate(e.exit_date) : "",
          e.status === "activo" ? "Activo" : "Retirado",
        ]),
      },
    ]);
    toast.success("Respaldo exportado");
  };

  return (
    <section className="space-y-3">
      <h2 className="font-display text-sm font-bold">Importar datos</h2>

      <div className="space-y-4 rounded-xl border bg-surface p-5 shadow-panel">
        <div>
          <p className="font-display text-sm font-bold">IMPORTAR DATOS DE EMPLEADOS</p>
          <p className="text-sm text-muted-foreground">
            Sube tu archivo Excel con datos de empleados.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => void pick(e.target.files?.[0] ?? null)}
          />
          <Button variant="outline" className="gap-2" onClick={() => inputRef.current?.click()}>
            <FileSpreadsheet className="size-4" /> Seleccionar archivo
          </Button>
          <Button
            variant="success"
            className="gap-2"
            disabled={!result || result.rows.length === 0 || importing}
            onClick={() => void runImport()}
          >
            {importing ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            Importar ahora
          </Button>
          <Button variant="ghost" className="gap-2" onClick={exportBackup}>
            <Download className="size-4" /> Exportar datos a Excel
          </Button>
        </div>

        <div className="space-y-1 text-xs text-muted-foreground">
          <p>Formatos permitidos: .xlsx, .xls, .csv — Tamaño máximo: 10 MB</p>
          <p>La columna «Cédula» es obligatoria y es la clave única de cada empleado.</p>
        </div>

        {file && (
          <p className="text-sm">
            Archivo: <span className="font-medium">{file.name}</span>
            {reading && " · leyendo…"}
          </p>
        )}

        {result && (
          <div className="space-y-3 rounded-lg border bg-background/60 p-4">
            <p className="text-sm font-medium">
              ✓ {result.rows.length} empleados encontrados
              {summary && ` (${summary.creates} nuevos · ${summary.updates} se actualizarán)`}
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              {result.detected.map((d) => (
                <span
                  key={d}
                  className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5"
                >
                  <Check className="size-3 text-success" /> {d}
                </span>
              ))}
              {result.missing.map((d) => (
                <span
                  key={d}
                  className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-muted-foreground"
                >
                  <AlertTriangle className="size-3" /> {d} sin detectar
                </span>
              ))}
            </div>
            {result.sheets.length > 1 && (
              <p className="text-xs text-muted-foreground">
                Pestañas leídas: {result.sheets.join(", ")} (la empresa se asigna según la pestaña)
              </p>
            )}

            {result.issues.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-warning-foreground">
                  Advertencias encontradas ({result.issues.length}):
                </p>
                <ul className="max-h-40 space-y-1 overflow-y-auto text-xs text-muted-foreground">
                  {result.issues.slice(0, 50).map((i, index) => (
                    <li key={`${i.sheet}-${i.rowNumber}-${index}`}>
                      {i.sheet} · fila {i.rowNumber}: {i.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setResult(null);
                  setFile(null);
                  if (inputRef.current) inputRef.current.value = "";
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="success"
                size="sm"
                disabled={importing}
                onClick={() => void runImport()}
              >
                Importar ahora
              </Button>
            </div>
          </div>
        )}
      </div>

      {batches.length > 0 && (
        <div className="overflow-hidden rounded-xl border bg-surface shadow-panel">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Archivo</TableHead>
                <TableHead>Filas</TableHead>
                <TableHead>Nuevos</TableHead>
                <TableHead>Actualizados</TableHead>
                <TableHead>Errores</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="numeric text-xs">
                    {new Date(b.created_at).toLocaleString("es-CO")}
                  </TableCell>
                  <TableCell className="font-medium">{b.file_name}</TableCell>
                  <TableCell className="numeric">{b.total_rows}</TableCell>
                  <TableCell className="numeric">{b.created_count}</TableCell>
                  <TableCell className="numeric">{b.updated_count}</TableCell>
                  <TableCell className="numeric">{b.error_count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
