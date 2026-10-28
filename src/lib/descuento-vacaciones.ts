/** Carta de autorización de descuento de días de vacaciones. */

import type { Carta } from "./carta";
import type { Employee } from "./hr";

export const DV_ASUNTO = "ASUNTO: AUTORIZACIÓN DESCUENTO DIAS DE VACACIONES";
export const DV_SALUDO = "Cordial saludo";
export const DV_AGRADECIMIENTO = "Gracias por su colaboración";
export const DV_DESPEDIDA = "Atentamente,";
/** Final del párrafo, en negrita en el formato. */
export const DV_CIERRE = "VACACIONES.";

/* Datos del empleador tal cual aparecen en el formato; editables en el formulario. */
const DV_EMPLEADOR = {
  empleador: "FABIAN LEONARDO PAEZ LANCHEROS",
  empleadorNit: "74439231-1",
  empresaNombre: "Comercializadora El Imperio",
  direccion: "CRA. 12 Nº 10-03",
};

const MESES = [
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

export interface DescuentoVacacionesInput {
  /** ISO: fecha de la carta. */
  fecha: string;
  /** Empresa cuyo logo lleva la carta; por defecto la del empleado. */
  empresaId: string | null;
  empleador: string;
  empleadorNit: string;
  empresaNombre: string;
  direccion: string;
  nombre: string;
  cedula: string;
  /** Lugar de expedición de la cédula. */
  cedulaLugar: string;
  /** ISO: primer día no laborado. */
  desde: string;
  /** ISO: último día no laborado. */
  hasta: string;
  dias: string;
}

export function isDescuentoVacaciones(t: {
  category?: string | null;
  name?: string | null;
}): boolean {
  return (
    t.category === "descuento_vacaciones" ||
    /descuento.*vacaciones|vacaciones.*descuento/i.test(t.name ?? "")
  );
}

function todayLocalISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function descuentoVacacionesDefaults(employee: Employee): DescuentoVacacionesInput {
  return {
    fecha: todayLocalISO(),
    ...DV_EMPLEADOR,
    empresaId: employee.company_id,
    nombre: employee.full_name,
    cedula: employee.cedula,
    cedulaLugar: "",
    desde: "",
    hasta: "",
    dias: "",
  };
}

export function validateDescuentoVacaciones(i: DescuentoVacacionesInput): string | null {
  if (!i.nombre.trim()) return "Escribe el nombre del trabajador.";
  if (!i.cedula.trim()) return "Escribe la cédula del trabajador.";
  if (!i.desde.trim() || !i.hasta.trim()) return "Indica las fechas de los días no laborados.";
  if (i.hasta < i.desde) return "La fecha final no puede ser anterior a la inicial.";
  if (!/^\d+$/.test(i.dias.trim()) || Number(i.dias) <= 0)
    return "Indica cuántos días de vacaciones se descuentan.";
  return null;
}

function partes(iso: string): { d: number; mes: string; y: string } | null {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return null;
  return { d: Number(d), mes: MESES[Number(m) - 1] ?? "", y };
}

/** "Chiquinquirá, 2 de octubre de 2026" */
export function dvFechaCarta(iso: string): string {
  const p = partes(iso);
  return `Chiquinquirá, ${p ? `${p.d} de ${p.mes} de ${p.y}` : "___________________"}`;
}

/* "del 13 de octubre al 15 de octubre de 2026"; con ambos años si el periodo cruza de año. */
function periodo(desde: string, hasta: string): string {
  const a = partes(desde);
  const b = partes(hasta);
  const dia = (p: typeof a) => (p ? `${p.d} de ${p.mes}` : "_______ de ______________");
  const anioA = a && b && a.y !== b.y ? ` de ${a.y}` : "";
  return `del ${dia(a)}${anioA} al ${dia(b)} ${b ? `de ${b.y}` : "202_"}`;
}

const blank = (v: string, line: string) => v.trim() || line;

/** Párrafo de autorización del formato con los datos llenos. */
export function descuentoVacacionesCuerpo(i: DescuentoVacacionesInput): string {
  return (
    `Yo ${blank(i.nombre.toUpperCase(), "________________________________________________")} ` +
    `identificado con número de cédula ${blank(i.cedula, "___________________")} ` +
    `de ${blank(i.cedulaLugar, "_____________")} autorizo al empleador ${i.empleador} ` +
    `con NIT. ${i.empleadorNit} a descontar los días no laborados que son ` +
    `${periodo(i.desde, i.hasta)} por el tiempo que corresponde a ${blank(i.dias, "_____")} ` +
    `días de mis ${DV_CIERRE}`
  );
}

/** Líneas del destinatario: "Señores:" + empleador, empresa, dirección y ciudad. */
export function dvDestinatario(i: DescuentoVacacionesInput): string[] {
  return ["Señores:", i.empleador, i.empresaNombre, i.direccion].filter((l) => l.trim());
}

export function descuentoVacacionesText(i: DescuentoVacacionesInput): string {
  return [
    dvFechaCarta(i.fecha),
    "",
    ...dvDestinatario(i),
    "",
    DV_ASUNTO,
    "",
    DV_SALUDO,
    "",
    descuentoVacacionesCuerpo(i),
    "",
    DV_AGRADECIMIENTO,
    "",
    DV_DESPEDIDA,
    "",
    "______________________________",
    `C.C. ${i.cedula}`,
  ].join("\n");
}

/** La carta en el modelo común de vista y PDF. */
export function dvCarta(i: DescuentoVacacionesInput): Carta {
  const cuerpo = descuentoVacacionesCuerpo(i);
  const [senores, empleador, ...resto] = dvDestinatario(i);
  return {
    fechaLinea: dvFechaCarta(i.fecha),
    destinatario: [
      { text: senores ?? "" },
      ...(empleador ? [{ text: empleador, bold: true }] : []),
      ...resto.map((text) => ({ text })),
    ],
    asunto: DV_ASUNTO,
    saludo: DV_SALUDO,
    cuerpo: [{ text: cuerpo.slice(0, -DV_CIERRE.length) }, { text: DV_CIERRE, bold: true }],
    agradecimiento: DV_AGRADECIMIENTO,
    despedida: DV_DESPEDIDA,
    pieFirma: [{ text: `C.C. ${i.cedula}` }],
  };
}
