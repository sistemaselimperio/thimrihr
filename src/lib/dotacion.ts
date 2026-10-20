/** Formato de entrega de elementos de protección personal y dotación de trabajo (SG-SST). */

import type { Employee } from "./hr";

export const DOTACION_CODIGO = "SGSST-F-001";
export const DOTACION_FECHA_FORMATO = "04/03/2026";
export const DOTACION_VERSION = "002";

export const DOTACION_TITULO =
  "FORMATO ENTREGA DE ELEMENTOS DE PROTECCIÓN PERSONAL Y DOTACIÓN DE TRABAJO";

export interface DotacionItem {
  key: string;
  label: string;
  /** Columna del formato: 0 = izquierda, 1 = derecha. */
  col: 0 | 1;
}

const left = [
  ["overol", "Overol"],
  ["pantalon", "Pantalon"],
  ["antifluido", "Antifluido"],
  ["bota_impermeable_sin_puntera", "Bota Impermeables sin Puntera"],
  ["guantes_hilo_pvc", "Guantes Hilo y PVC"],
  ["guantes_dielectricos", "Guantes Dieléctricos"],
  ["camisa_reflectiva", "Camisa reflectiva"],
  ["chaqueta", "Chaqueta"],
  ["camisa_oxford", "Camisa oxford"],
  ["delantal_carnaza", "Delantal de Carnaza"],
] as const;

const right = [
  ["protector_auditivo", "Protector Auditivo Tipo Orejera"],
  ["bota_cuero_dielectrica", "Bota de Cuero con Puntera Dieléctrica"],
  ["botas_impermeables_puntera_acero", "Botas Impermeables con Puntera Acero"],
  ["gafas_seguridad", "Gafas de Seguridad"],
  ["guantes_carnaza", "Guantes en Carnaza"],
  ["guantes_soldador", "Guantes para Soldador"],
  ["careta_soldar", "Careta para Soldar"],
  ["respirador", "Respirador Contra Gases y Vapores"],
  ["gorra", "Gorra"],
  ["poncho_pvc", "Poncho en PVC con Capucha"],
] as const;

export const DOTACION_ITEMS: DotacionItem[] = [
  ...left.map(([key, label]) => ({ key, label, col: 0 as const })),
  ...right.map(([key, label]) => ({ key, label, col: 1 as const })),
];

export const DOTACION_COMPROMISO = [
  "Me comprometo a utilizar adecuadamente durante la jornada laboral los elementos de proteccion personal recibidos y mantenerlos en buen estado, dando cumplimiento a las normas del SG-SST contribuyen a mi bienestar físico, psicológico y social. Declaro que he recibido información sobre el uso adecuado de los mismos.",
  "Usando los equipos y elementos de proteccion personal (incluyendo ropa de trabajo) estoy cumpliendo con mis deberes como trabajador definidos en la ley a través de la siguiente normatividad: CODIGO SUSTANTIVO DEL TRABAJO; Art. 56 y Art. 58 numeral 7; LEY 9 DE 1979; Art. 88; DECRETO 1295 DE 1994: Art. 22. Soy responsable del uso y cuidado de los EPP mismo so pena de verme inmerso en faltas penales o disciplinarias. El presente compromiso quedará archivado en el area Talento Humano / Seguridad y Salud en el Trabajo, como sistema de verificación y seguimiento del cumplimiento de mis deberes y derechos como empleado.",
  "El presente compromiso aplica para los elementos de protección personal entregados.",
];

export interface DotacionInput {
  /** ISO */
  fecha: string;
  nombre: string;
  cedula: string;
  cargo: string;
  proceso: string;
  /** Claves de DOTACION_ITEMS entregadas. */
  entregados: string[];
}

export function isDotacion(t: { category?: string | null; name?: string | null }): boolean {
  return t.category === "dotacion" || /dotaci[oó]n/i.test(t.name ?? "");
}

function todayLocalISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function dotacionDefaults(employee: Employee): DotacionInput {
  return {
    fecha: todayLocalISO(),
    nombre: employee.full_name,
    cedula: employee.cedula,
    cargo: employee.position,
    proceso: "",
    entregados: [],
  };
}

export function validateDotacion(i: DotacionInput): string | null {
  return i.entregados.length ? null : "Marca al menos un elemento de dotación entregado.";
}

/** "2026-04-30" →{ dd: "30", mm: "4", aaaa: "2026" } */
export function dotacionFechaPartes(iso: string): { dd: string; mm: string; aaaa: string } {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return { dd: "", mm: "", aaaa: "" };
  return { dd: String(Number(d)), mm: String(Number(m)), aaaa: y };
}

export function dotacionText(i: DotacionInput): string {
  const f = dotacionFechaPartes(i.fecha);
  const items = DOTACION_ITEMS.filter((it) => i.entregados.includes(it.key)).map(
    (it) => `- ${it.label}`,
  );
  return [
    DOTACION_TITULO,
    `FECHA: ${f.dd}/${f.mm}/${f.aaaa}`,
    "",
    `NOMBRE: ${i.nombre.toUpperCase()}`,
    `C.C. ${i.cedula}`,
    `CARGO: ${i.cargo}`,
    `PROCESO: ${i.proceso}`,
    "",
    "DOTACIÓN ENTREGADA:",
    ...(items.length ? items : ["(ninguna)"]),
  ].join("\n");
}
