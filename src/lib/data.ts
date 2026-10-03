import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { LiquidacionCalc, LiquidacionInput } from "./liquidacion";
import { setHolidayRegistry, type Holiday } from "./holidays";
import { syncHolidays } from "./holidays.functions";
import type {
  Company,
  Employee,
  Incapacity,
  Leave,
  License,
  PayrollPeriodOverride,
  Termination,
  Vacation,
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

export interface SharedLiquidacion {
  id: string;
  token: string;
  employee_id: string | null;
  employee_name: string;
  data: { input: LiquidacionInput; calc: LiquidacionCalc };
  logo_path: string | null;
  firma: string | null;
  signed_at: string | null;
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
  licenses: ["licenses"] as const,
  vacations: ["vacations"] as const,



  incapacities: ["incapacities"] as const,
  leaves: ["leaves"] as const,
  terminations: ["terminations"] as const,
  entitlements: ["vacation_entitlements"] as const,
  overrides: ["payroll_periods"] as const,
  templates: ["document_templates"] as const,
  generated: ["generated_documents"] as const,
  shared: ["shared_liquidaciones"] as const,
  imports: ["import_batches"] as const,
  settings: ["app_settings"] as const,
  holidays: ["holidays"] as const,
};

export const ISLERO_LOGO_KEY = "islero_logo";

export interface StoredLogo {
  path: string;
  name: string;
}

/** Logo único para documentos de isleros / estación de servicio. */
export function useIsleroLogo() {
  return useQuery({
    queryKey: [...qk.settings, ISLERO_LOGO_KEY],
    queryFn: async (): Promise<StoredLogo | null> => {
      const { data, error } = await db
        .from("app_settings")
        .select("value")
        .eq("key", ISLERO_LOGO_KEY)
        .maybeSingle();
      if (error) throw new Error(error.message);
      const value = (data?.value ?? null) as StoredLogo | null;
      return value?.path ? value : null;
    },
  });
}

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

export function useLicenses() {
  return useQuery({
    queryKey: qk.licenses,
    queryFn: () => selectAll<License>("licenses", "start_date", false),
  });
}

export function useVacations() {
  return useQuery({
    queryKey: qk.vacations,
    queryFn: () => selectAll<Vacation>("vacations", "start_date", false),
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

export function useSharedLiquidaciones() {
  return useQuery({
    queryKey: qk.shared,
    queryFn: () => selectAll<SharedLiquidacion>("shared_liquidaciones", "created_at", false),
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

/* ------------------------------------------------------------------ festivos */

export function useHolidays() {
  return useQuery({
    queryKey: qk.holidays,
    queryFn: () => selectAll<Holiday>("holidays", "date"),
    staleTime: 60 * 60_000,
  });
}

/**
 * Carga automática de festivos: si faltan los del año actual (o del próximo),
 * se descargan desde la API pública y se guardan. Mantiene además el registro
 * en memoria que usan los cálculos de días laborales.
 */
export function useHolidaySync() {
  const qc = useQueryClient();
  const { data: holidays, isSuccess } = useHolidays();
  const sync = useServerFn(syncHolidays);
  const asked = useRef(false);

  useEffect(() => {
    setHolidayRegistry((holidays ?? []).map((h) => h.date));
  }, [holidays]);

  useEffect(() => {
    if (!isSuccess || asked.current) return;
    const year = new Date().getFullYear();
    const years = [year, year + 1].filter(
      (y) => !(holidays ?? []).some((h) => Number(h.year) === y),
    );
    if (!years.length) return;
    asked.current = true;
    void sync({ data: { years } })
      .then((res) => {
        void qc.invalidateQueries({ queryKey: qk.holidays });
        if (res?.online) toast.success(`Festivos de ${years.join(" y ")} cargados`);
        else toast.warning("Usando festivos sin conexión");
      })
      .catch(() => toast.warning("No se pudo cargar festivos, usando almacenados"));
  }, [isSuccess, holidays, sync, qc]);

  return holidays ?? [];
}

/** Recarga forzada desde la API. */
export function useReloadHolidays() {
  const qc = useQueryClient();
  const sync = useServerFn(syncHolidays);
  return useMutation({
    mutationFn: async (years: number[]) => sync({ data: { years } }),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: qk.holidays });
      if (res?.online) toast.success("Festivos actualizados desde Internet");
      else toast.warning("Usando festivos sin conexión");
    },
    onError: () => toast.error("No se pudo conectar con el servicio de festivos"),
  });
}
