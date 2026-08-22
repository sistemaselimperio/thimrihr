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

export interface DocumentTemplate {
  id: string;
  name: string;
  category: string;
  description: string | null;
  file_path: string | null;
}

async function selectAll<T>(table: string, order: string, ascending = true): Promise<T[]> {
  const { data, error } = await supabase
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
};

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
  const { error } = await supabase.from(table).upsert(row);
  if (error) throw new Error(error.message);
}

export async function insertRow(table: string, row: Record<string, unknown>) {
  const { error } = await supabase.from(table).insert(row);
  if (error) throw new Error(error.message);
}

export async function updateRow(table: string, id: string, row: Record<string, unknown>) {
  const { error } = await supabase.from(table).update(row).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteRow(table: string, id: string) {
  const { error } = await supabase.from(table).delete().eq("id", id);
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
