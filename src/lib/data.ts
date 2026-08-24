import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  Company,
  Employee,
  Incapacity,
  Leave,
  PayrollPeriodOverride,
  Termination,
  VacationEntitlement,
} from "./hr";

/*
 * Capa de acceso genérica: las tablas se pasan por nombre, por lo que se usa un
 * cliente sin tipar para los helpers CRUD. Los tipos de dominio viven en hr.ts.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
const db = supabase as any;

export interface DocumentTemplate {
  id: string;
  name: string;
  category: string;
  description: string | null;
  file_path: string | null;
  body: string;
  company_id: string | null;
  created_at?: string;
}

export interface GeneratedDocument {
  id: string;
  template_id: string | null;
  template_name: string;
  employee_id: string | null;
  employee_name: string;
  company_name: string | null;
  content: string;
  created_at: string;
}


async function selectAll<T>(table: string, order: string, ascending = true): Promise<T[]> {
  const { data, error } = await db
    .from(table)
    .select("*")
    .order(order, { ascending });
  if (error) throw new Error(error.message);
  return (data ?? []) as T[];
}

export const qk = {
  companies: ["companies"] as const,
  employees: ["employees"] as const,
  incapacities: ["incapacities"] as const,
  leaves: ["leaves"] as const,
  terminations: ["terminations"] as const,
  entitlements: ["vacation_entitlements"] as const,
  overrides: ["payroll_periods"] as const,
  templates: ["document_templates"] as const,
  generated: ["generated_documents"] as const,
  imports: ["import_batches"] as const,
};

export interface ImportBatch {
  id: string;
  file_name: string;
  total_rows: number;
  created_count: number;
  updated_count: number;
  error_count: number;
  created_at: string;
}

export function useImportBatches() {
  return useQuery({
    queryKey: qk.imports,
    queryFn: () => selectAll<ImportBatch>("import_batches", "created_at", false),
  });
}

export function useCompanies() {
  return useQuery({
    queryKey: qk.companies,
    queryFn: () => selectAll<Company>("companies", "name"),
    staleTime: 5 * 60_000,
  });
}

export function useEmployees() {
  return useQuery({
    queryKey: qk.employees,
    queryFn: () => selectAll<Employee>("employees", "full_name"),
  });
}

export function useIncapacities() {
  return useQuery({
    queryKey: qk.incapacities,
    queryFn: () => selectAll<Incapacity>("incapacities", "start_date", false),
  });
}

export function useLeaves() {
  return useQuery({
    queryKey: qk.leaves,
    queryFn: () => selectAll<Leave>("leaves", "start_date", false),
  });
}

export function useTerminations() {
  return useQuery({
    queryKey: qk.terminations,
    queryFn: () => selectAll<Termination>("terminations", "exit_date", false),
  });
}

export function useEntitlements() {
  return useQuery({
    queryKey: qk.entitlements,
    queryFn: () => selectAll<VacationEntitlement>("vacation_entitlements", "year"),
  });
}

export function useOverrides() {
  return useQuery({
    queryKey: qk.overrides,
    queryFn: () => selectAll<PayrollPeriodOverride>("payroll_periods", "period_key"),
  });
}

export function useTemplates() {
  return useQuery({
    queryKey: qk.templates,
    queryFn: () => selectAll<DocumentTemplate>("document_templates", "name"),
  });
}

export function useGeneratedDocuments() {
  return useQuery({
    queryKey: qk.generated,
    queryFn: () => selectAll<GeneratedDocument>("generated_documents", "created_at", false),
  });
}

/** Mutación genérica de tabla con invalidación de la caché correspondiente. */
export function useTableMutation<TVars>(
  table: string,
  keys: readonly unknown[][],
  run: (vars: TVars) => Promise<void>,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSuccess: () => {
      keys.forEach((key) => void qc.invalidateQueries({ queryKey: key }));
    },
  });
}

export async function upsertRow(table: string, row: Record<string, unknown>) {
  const { error } = await db.from(table).upsert(row);
  if (error) throw new Error(error.message);
}

export async function insertRow(table: string, row: Record<string, unknown>) {
  const { error } = await db.from(table).insert(row);
  if (error) throw new Error(error.message);
}

export async function updateRow(table: string, id: string, row: Record<string, unknown>) {
  const { error } = await db.from(table).update(row).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteRow(table: string, id: string) {
  const { error } = await db.from(table).delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function uploadFile(bucket: string, file: File, prefix: string) {
  const safe = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `${prefix}/${Date.now()}_${safe}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file);
  if (error) throw new Error(error.message);
  return path;
}

export async function openFile(bucket: string, path: string) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
  if (error) throw new Error(error.message);
  window.open(data.signedUrl, "_blank", "noopener");
}
