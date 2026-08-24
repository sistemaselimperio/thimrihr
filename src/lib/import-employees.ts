import * as XLSX from "xlsx";

/**
 * Lectura y validación de archivos Excel/CSV con datos de empleados.
 * La cédula es la clave única: si existe se actualiza, si no se crea.
 */

export interface ParsedEmployeeRow {
  sheet: string;
  rowNumber: number;
  cedula: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string;
  position: string | null;
  work_location: string | null;
  municipality: string | null;
  phone: string | null;
  landline: string | null;
  email: string | null;
  hire_date: string | null;
  contract_end_date: string | null;
  exit_date: string | null;
  status: "activo" | "retirado";
  folder_number: string | null;
}

export interface ImportIssue {
  rowNumber: number;
  sheet: string;
  message: string;
}

export interface ParseResult {
  rows: ParsedEmployeeRow[];
  issues: ImportIssue[];
  detected: string[];
  missing: string[];
  sheets: string[];
}

const FIELD_ALIASES: Record<keyof typeof FIELD_LABELS, string[]> = {
  folder_number: ["ncarpeta", "carpeta", "nocarpeta", "numerocarpeta"],
  cedula: ["cedula", "cc", "documento", "identificacion", "nodocumento"],
  last_name: ["apellidos", "apellido"],
  first_name: ["nombres", "nombre"],
  position: ["cargo", "puesto"],
  work_location: ["lugardetrabajo", "lugartrabajo", "lugar", "sede"],
  municipality: ["municipio", "ciudad"],
  phone: ["celular", "movil", "telefonocelular"],
  landline: ["telefono", "telefonofijo", "fijo"],
  email: ["email", "correo", "correoelectronico"],
  hire_date: ["fechadeingreso", "fechaingreso", "ingreso"],
  contract_end_date: ["findecontrato", "fincontrato", "vencimientocontrato"],
  exit_date: ["fechadesalida", "fechasalida", "salida", "retiro"],
  status: ["estado", "situacion"],
};

export const FIELD_LABELS = {
  folder_number: "N° Carpeta",
  cedula: "Cédula",
  last_name: "Apellidos",
  first_name: "Nombres",
  position: "Cargo",
  work_location: "Lugar de Trabajo",
  municipality: "Municipio",
  phone: "Celular",
  landline: "Teléfono",
  email: "Email",
  hire_date: "Fecha de Ingreso",
  contract_end_date: "Fin de Contrato",
  exit_date: "Fecha de Salida",
  status: "Estado",
} as const;

export type FieldKey = keyof typeof FIELD_LABELS;

const MONTHS = [
  "ENERO",
  "FEBRERO",
  "MARZO",
  "ABRIL",
  "MAYO",
  "JUNIO",
  "JULIO",
  "AGOSTO",
  "SEPTIEMBRE",
  "OCTUBRE",
  "NOVIEMBRE",
  "DICIEMBRE",
];

function norm(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function txt(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  let s = String(value).trim();
  if (!s || ["nan", "-", "n/a", "na"].includes(s.toLowerCase())) return null;
  if (/^\d+\.0$/.test(s)) s = s.slice(0, -2);
  return s;
}

function monthNumber(token: string): number | null {
  const t = norm(token).toUpperCase();
  if (/^\d+$/.test(t)) {
    const n = Number(t);
    return n >= 1 && n <= 12 ? n : null;
  }
  // Tolera abreviaturas y errores de digitación ("OTUBRE", "SEPT").
  let best: number | null = null;
  let bestScore = 0;
  MONTHS.forEach((m, i) => {
    let score = 0;
    for (let k = 0; k < Math.min(t.length, m.length); k++) if (t[k] === m[k]) score++;
    if (m.startsWith(t.slice(0, 3))) score += 3;
    if (score > bestScore) {
      bestScore = score;
      best = i + 1;
    }
  });
  return bestScore >= 3 ? best : null;
}

/** Convierte fechas de Excel o texto DD/MM/YYYY (y DD/MES/YYYY) a ISO. */
export function parseDate(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(
      value.getDate(),
    ).padStart(2, "0")}`;
  }
  const s = txt(value);
  if (!s) return null;
  const parts = s.split(/[/\-.]/);
  if (parts.length !== 3) return null;
  const day = Number((parts[0] ?? "").replace(/\D/g, ""));
  const month = monthNumber(parts[1] ?? "");
  let year = Number((parts[2] ?? "").replace(/\D/g, ""));
  if (year < 100) year += 2000;
  if (!day || day > 31 || !month || year < 1900 || year > 2100) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function detectHeader(matrix: unknown[][]): { index: number; map: Partial<Record<FieldKey, number>> } | null {
  for (let i = 0; i < matrix.length; i++) {
    const row = matrix[i] ?? [];
    const map: Partial<Record<FieldKey, number>> = {};
    row.forEach((cell, col) => {
      const key = norm(cell);
      if (!key) return;
      (Object.keys(FIELD_ALIASES) as FieldKey[]).forEach((field) => {
        if (map[field] !== undefined) return;
        if (FIELD_ALIASES[field].some((alias) => key === alias || key.startsWith(alias))) {
          map[field] = col;
        }
      });
    });
    if (map.cedula !== undefined) return { index: i, map };
  }
  return null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Lee el archivo y devuelve filas normalizadas + validaciones. */
export async function parseEmployeeWorkbook(file: File): Promise<ParseResult> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { cellDates: true });
  const rows: ParsedEmployeeRow[] = [];
  const issues: ImportIssue[] = [];
  const detected = new Set<FieldKey>();
  const sheetsWithData: string[] = [];
  const seen = new Map<string, number>();

  wb.SheetNames.forEach((sheetName) => {
    const sheet = wb.Sheets[sheetName];
    if (!sheet) return;
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      raw: false,
      blankrows: true,
    });
    const header = detectHeader(matrix);
    if (!header) return;
    sheetsWithData.push(sheetName);
    (Object.keys(header.map) as FieldKey[]).forEach((k) => detected.add(k));

    const at = (row: unknown[], key: FieldKey) => {
      const col = header.map[key];
      return col === undefined ? null : txt(row[col]);
    };

    for (let i = header.index + 1; i < matrix.length; i++) {
      const row = matrix[i] ?? [];
      const rowNumber = i + 1;
      const rawCedula = at(row, "cedula");
      if (!rawCedula) continue;
      // Filas de encabezado repetido o banners de sección.
      if (norm(rawCedula) === "cedula") continue;
      const cedula = rawCedula.replace(/\D/g, "");
      if (!cedula) {
        issues.push({ sheet: sheetName, rowNumber, message: `Cédula inválida: "${rawCedula}"` });
        continue;
      }
      const first = at(row, "first_name");
      const last = at(row, "last_name");
      if (!first && !last) {
        issues.push({ sheet: sheetName, rowNumber, message: "Falta nombre y apellido" });
      }
      const previous = seen.get(cedula);
      if (previous) {
        issues.push({
          sheet: sheetName,
          rowNumber,
          message: `Cédula duplicada (${cedula}), también en la fila ${previous}. Se usará el último registro.`,
        });
      }
      seen.set(cedula, rowNumber);

      const email = at(row, "email");
      if (email && !EMAIL_RE.test(email)) {
        issues.push({ sheet: sheetName, rowNumber, message: `Email inválido: "${email}"` });
      }

      const dateFields: [FieldKey, string | null][] = [
        ["hire_date", at(row, "hire_date")],
        ["contract_end_date", at(row, "contract_end_date")],
        ["exit_date", at(row, "exit_date")],
      ];
      const parsedDates: Partial<Record<FieldKey, string | null>> = {};
      dateFields.forEach(([field, raw]) => {
        const parsed = parseDate(raw);
        parsedDates[field] = parsed;
        if (raw && !parsed) {
          issues.push({
            sheet: sheetName,
            rowNumber,
            message: `Fecha inválida en ${FIELD_LABELS[field]}: "${raw}" (use DD/MM/AAAA)`,
          });
        }
      });

      const estado = (at(row, "status") ?? "").toUpperCase();
      const exit = parsedDates.exit_date ?? null;
      const status: "activo" | "retirado" =
        estado.startsWith("R") || (!estado && exit) ? "retirado" : "activo";

      rows.push({
        sheet: sheetName,
        rowNumber,
        cedula,
        first_name: first,
        last_name: last,
        full_name: [first, last].filter(Boolean).join(" ") || cedula,
        position: at(row, "position"),
        work_location: at(row, "work_location"),
        municipality: at(row, "municipality"),
        phone: at(row, "phone"),
        landline: at(row, "landline"),
        email,
        hire_date: parsedDates.hire_date ?? null,
        contract_end_date: parsedDates.contract_end_date ?? null,
        exit_date: exit,
        status,
        folder_number: at(row, "folder_number"),
      });
    }
  });

  const allFields = Object.keys(FIELD_LABELS) as FieldKey[];
  return {
    rows,
    issues,
    detected: allFields.filter((f) => detected.has(f)).map((f) => FIELD_LABELS[f]),
    missing: allFields.filter((f) => !detected.has(f)).map((f) => FIELD_LABELS[f]),
    sheets: sheetsWithData,
  };
}
