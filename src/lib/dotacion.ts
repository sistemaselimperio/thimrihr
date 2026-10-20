/** Formato de entrega de elementos de protección personal y dotación de trabajo (SG-SST). */

import type { Employee } from "./hr";

export const DOTACION_CODIGO = "SGSST-F-001";
export const DOTACION_FECHA_FORMATO = "04/03/2026";
export const DOTACION_VERSION = "002";

export const DOTACION_TITULO =
  "FORMATO ENTREGA DE ELEMENTOS DE PROTECCIÓN PERSONAL Y DOTACIÓN DE TRABAJO";

export type DotacionSeccion = "dotacion";

export const DOTACION_SECCIONES: { key: DotacionSeccion; titulo: string }[] = [
  { key: "dotacion", titulo: "DOTACION ENTREGADA" },
];

export interface DotacionItem {
  /** Única entre secciones: "seccion:etiqueta_normalizada". */
  key: string;
  label: string;
  seccion: DotacionSeccion;
  /** Columna del formato: 0 = izquierda, 1 = derecha. */
  col: 0 | 1;
}

/* Etiquetas tal cual aparecen en el formato, en orden: [columna izquierda, columna derecha]. */
const CATALOGO: Record<DotacionSeccion, [string[], string[]]> = {
  dotacion: [
    [
      "Camiseta Tipo Polo",
      "Overol",
      "Antifluido",
      "Bota Impermeables sin Puntera",
      "Guantes Hilo y PVC",
      "Guantes Dieléctricos",
      "Camisa reflectiva",
      "Tapabocas Prehormado",
      "Camisa oxford",
      "Delantal de Carnaza",
    ],
    [
      "Protector Auditivo Tipo Orejera",
      "Bota de Cuero con Puntera Dieléctrica",
      "Botas Impermeables con Puntera Acero",
      "Gafas de Seguridad",
      "Guantes en Carnaza",
      "Guantes para Soldador",
      "Careta para Soldar",
      "Respirador Contra Gases y Vapores",
      "Barbuquejo",
      "Poncho en PVC con Capucha",
    ],
  ],
};

function itemKey(seccion: DotacionSeccion, label: string): string {
  const slug = label
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return `${seccion}:${slug}`;
}

export const DOTACION_ITEMS: DotacionItem[] = DOTACION_SECCIONES.flatMap(({ key: seccion }) =>
  CATALOGO[seccion].flatMap((labels, col) =>
    labels.map((label) => ({ key: itemKey(seccion, label), label, seccion, col: col as 0 | 1 })),
  ),
);

/** Filas de una sección: pares [izquierda, derecha] en el orden del formato. */
export function dotacionFilas(
  seccion: DotacionSeccion,
): [DotacionItem | undefined, DotacionItem | undefined][] {
  const of = (col: 0 | 1) =>
    DOTACION_ITEMS.filter((it) => it.seccion === seccion && it.col === col);
  const [l, r] = [of(0), of(1)];
  return Array.from({ length: Math.max(l.length, r.length) }, (_, k) => [l[k], r[k]]);
}

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
  return i.entregados.length ? null : "Marca al menos un elemento entregado.";
}

/** "2026-04-30" →{ dd: "30", mm: "4", aaaa: "2026" } */
export function dotacionFechaPartes(iso: string): { dd: string; mm: string; aaaa: string } {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return { dd: "", mm: "", aaaa: "" };
  return { dd: String(Number(d)), mm: String(Number(m)), aaaa: y };
}

export function dotacionText(i: DotacionInput): string {
  const f = dotacionFechaPartes(i.fecha);
  const secciones = DOTACION_SECCIONES.flatMap(({ key, titulo }) => {
    const items = DOTACION_ITEMS.filter(
      (it) => it.seccion === key && i.entregados.includes(it.key),
    );
    return items.length ? ["", `${titulo}:`, ...items.map((it) => `- ${it.label}`)] : [];
  });
  return [
    DOTACION_TITULO,
    `FECHA: ${f.dd}/${f.mm}/${f.aaaa}`,
    "",
    `NOMBRE: ${i.nombre.toUpperCase()}`,
    `C.C. ${i.cedula}`,
    `CARGO: ${i.cargo}`,
    `PROCESO: ${i.proceso}`,
    ...(secciones.length ? secciones : ["", "(sin elementos entregados)"]),
  ].join("\n");
}
