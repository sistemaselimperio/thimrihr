/** Carta de autorización de descuento por días no laborados. */

import type { Carta, CartaSegmento } from "./carta";
import type { Employee } from "./hr";

export const DNL_ASUNTO = "ASUNTO: AUTORIZACIÓN DESCUENTO POR DIAS NO LABORADOS";
const DNL_CIUDAD = "Chiquinquirá";

/* Datos del empleador tal cual aparecen en el formato; editables en el formulario. */
const DNL_EMPLEADOR = {
  empleador: "FABIAN LEONARDO PAEZ LANCHEROS",
  empleadorNit: "74.439.231",
  empresaNombre: "Comercializadora El Imperio",
};

export const DNL_MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

export type Quincena = "primera" | "segunda";

export interface DiasNoLaboradosInput {
  /** ISO: fecha de la carta. */
  fecha: string;
  /** Empresa cuyo logo lleva la carta; por defecto la del empleado. */
  empresaId: string | null;
  empleador: string;
  empleadorNit: string;
  empresaNombre: string;
  nombre: string;
  cedula: string;
  /** Lugar de expedición de la cédula. */
  cedulaLugar: string;
  /** ISO: primer día no laborado. */
  desde: string;
  /** ISO: último día no laborado. */
  hasta: string;
  /** Quincena en la que se descuenta. */
  quincena: Quincena | "";
  /** Mes de esa quincena: "1".."12". */
  quincenaMes: string;
}

export function isDiasNoLaborados(t: { category?: string | null; name?: string | null }): boolean {
  return t.category === "dias_no_laborados" || /d[ií]as?\s+no\s+laborados?/i.test(t.name ?? "");
}

function todayLocalISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function partes(iso: string): { d: number; m: number; y: string } | null {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return null;
  return { d: Number(d), m: Number(m), y };
}

const mesNombre = (m: number | string) => DNL_MESES[Number(m) - 1] ?? "";

/** Quincena y mes ("1".."12") en que cae una fecha ISO. */
export function quincenaDe(iso: string): { quincena: Quincena | ""; mes: string } {
  const p = partes(iso);
  if (!p) return { quincena: "", mes: "" };
  return { quincena: p.d <= 15 ? "primera" : "segunda", mes: String(p.m) };
}

export function diasNoLaboradosDefaults(employee: Employee): DiasNoLaboradosInput {
  const fecha = todayLocalISO();
  const q = quincenaDe(fecha);
  return {
    fecha,
    empresaId: employee.company_id,
    ...DNL_EMPLEADOR,
    nombre: employee.full_name,
    cedula: employee.cedula,
    cedulaLugar: "",
    desde: "",
    hasta: "",
    quincena: q.quincena,
    quincenaMes: q.mes,
  };
}

export function validateDiasNoLaborados(i: DiasNoLaboradosInput): string | null {
  if (!i.nombre.trim()) return "Escribe el nombre del trabajador.";
  if (!i.cedula.trim()) return "Escribe la cédula del trabajador.";
  if (!i.desde.trim() || !i.hasta.trim()) return "Indica las fechas de los días no laborados.";
  if (i.hasta < i.desde) return "La fecha final no puede ser anterior a la inicial.";
  if (!i.quincena || !i.quincenaMes) return "Indica la quincena y el mes del descuento.";
  return null;
}

/** "Chiquinquirá, 2 de octubre de 2026" */
function fechaLinea(iso: string): string {
  const p = partes(iso);
  return `${DNL_CIUDAD}, ${p ? `${p.d} de ${mesNombre(p.m)} de ${p.y}` : "_______________________"}`;
}

/* "del 5 al 6 de octubre de 2026"; con ambos meses (y años) si el periodo los cruza. */
function periodo(desde: string, hasta: string): string {
  const a = partes(desde);
  const b = partes(hasta);
  if (!a || !b) return "del ______ al ______ de _______________ de 202_";
  const mesA = a.m !== b.m || a.y !== b.y ? ` de ${mesNombre(a.m)}` : "";
  const anioA = a.y !== b.y ? ` de ${a.y}` : "";
  return `del ${a.d}${mesA}${anioA} al ${b.d} de ${mesNombre(b.m)} de ${b.y}`;
}

const blank = (v: string, line: string) => v.trim() || line;

/** Párrafo del formato con los datos llenos; "NO" va en negrita. */
export function diasNoLaboradosCuerpo(i: DiasNoLaboradosInput): CartaSegmento[] {
  return [
    {
      text:
        `Yo ${blank(i.nombre.toUpperCase(), "____________________________________")} ` +
        `identificado con cedula número ${blank(i.cedula, "___________________")} ` +
        `de ${blank(i.cedulaLugar, "___________________")} autoriza al empleador ${i.empleador} ` +
        `con NIT. ${i.empleadorNit}, descontar, el día `,
    },
    { text: "NO", bold: true },
    {
      text:
        ` laborado que es ${periodo(i.desde, i.hasta)} correspondiente a la ` +
        `${blank(i.quincena, "____________")} quincena del mes de ` +
        `${blank(mesNombre(i.quincenaMes), "_____________")}.`,
    },
  ];
}

export function diasNoLaboradosCarta(i: DiasNoLaboradosInput): Carta {
  return {
    fechaLinea: fechaLinea(i.fecha),
    destinatario: [
      { text: "Señores" },
      { text: i.empleador, bold: true },
      { text: i.empresaNombre },
      { text: DNL_CIUDAD },
    ].filter((l) => l.text.trim()),
    asunto: DNL_ASUNTO,
    saludo: "Cordial saludo",
    cuerpo: diasNoLaboradosCuerpo(i),
    agradecimiento: "Gracias por su colaboración",
    despedida: "Atentamente",
    pieFirma: [{ text: "C.C", bold: true }, { text: `. ${i.cedula}` }],
  };
}

const plain = (segs: CartaSegmento[]) => segs.map((s) => s.text).join("");

export function diasNoLaboradosText(i: DiasNoLaboradosInput): string {
  const c = diasNoLaboradosCarta(i);
  return [
    c.fechaLinea,
    "",
    ...c.destinatario.map((l) => l.text),
    "",
    c.asunto,
    "",
    c.saludo,
    "",
    plain(c.cuerpo),
    "",
    c.agradecimiento,
    "",
    c.despedida,
    "",
    "______________________________________",
    plain(c.pieFirma),
  ].join("\n");
}
