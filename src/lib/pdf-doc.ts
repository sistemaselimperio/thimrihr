/** Genera y descarga directamente un PDF (sin ventanas nuevas ni popups). */

import {
  constanciaLine,
  fmtCiudadFecha,
  fmtCOP,
  fmtTasa,
  fmtFechaLarga,
  pazYSalvoLine,
  type LiquidacionCalc,
  type LiquidacionInput,
} from "./liquidacion";
import { docBlocks, tableColumnWeights } from "./documents";
import {
  fmtIngreso,
  fmtNum,
  mesNombre,
  type NominaCalc,
  type NominaInput,
} from "./nomina";

function slug(text: string): string {
  return (
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 80) || "documento"
  );
}

const MONTHS = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

export function pdfFileName(title: string): string {
  const d = new Date();
  const stamp = `${d.getDate()}${MONTHS[d.getMonth()]}${d.getFullYear()}`;
  return `${slug(title)}_${stamp}.pdf`;
}

async function loadImage(url: string): Promise<{ data: string; w: number; h: number } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const data = await new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result));
      fr.onerror = () => reject(new Error("read error"));
      fr.readAsDataURL(blob);
    });
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("image error"));
      el.src = data;
    });
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (data.startsWith("data:image/png") || data.startsWith("data:image/jpeg")) {
      return { data, w, h };
    }
    /* jsPDF solo entiende PNG/JPEG: otros formatos (webp, svg…) se pasan a PNG sin recortar. */
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")?.drawImage(img, 0, 0, w, h);
    return { data: canvas.toDataURL("image/png"), w, h };
  } catch {
    return null;
  }
}

/** Crea el PDF y lo descarga directamente a la carpeta de Descargas. */
export async function downloadDocumentPdf(opts: {
  title: string;
  text: string;
  logoUrl?: string | null;
  fileName?: string;
}): Promise<boolean> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "letter" });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 20;
  const marginTop = 20;
  const marginBottom = 20;
  const maxW = pageW - marginX * 2;
  let y = marginTop;

  if (opts.logoUrl) {
    const img = await loadImage(opts.logoUrl);
    if (img) {
      const scale = Math.min(maxW / img.w, 24 / img.h);
      const w = img.w * scale;
      const h = img.h * scale;
      const fmt = img.data.startsWith("data:image/png") ? "PNG" : "JPEG";
      doc.addImage(img.data, fmt, marginX, y, w, h);
      y += h + 10;
    }
  }

  doc.setFont("times", "normal");
  doc.setFontSize(12);
  const lineH = 6.2;

  const writeText = (text: string) => {
    for (const para of text.split("\n")) {
      const lines = para.length ? doc.splitTextToSize(para, maxW) : [""];
      for (const line of lines) {
        if (y > pageH - marginBottom) {
          doc.addPage();
          y = marginTop;
        }
        doc.text(line, marginX, y);
        y += lineH;
      }
    }
  };

  /* Tabla: etiquetas (columnas pares) en negrilla; la última celda de cada fila ocupa el resto. */
  const writeTable = (rows: string[][]) => {
    const weights = tableColumnWeights(rows);
    const total = weights.reduce((a, w) => a + w, 0);
    const widths = weights.map((w) => (w / total) * maxW);
    const pad = 1.8;
    const cellLineH = 4.8;
    doc.setFontSize(10.5);
    doc.setLineWidth(0.2);
    y -= 4;
    for (const row of rows) {
      const cells = row.map((txt, k) => {
        const w =
          k === row.length - 1 ? widths.slice(k).reduce((a, b) => a + b, 0) : widths[k]!;
        doc.setFont("times", k % 2 === 0 ? "bold" : "normal");
        const lines = doc.splitTextToSize(txt, w - pad * 2) as string[];
        return { lines, w, bold: k % 2 === 0 };
      });
      const h = Math.max(...cells.map((c) => c.lines.length)) * cellLineH + pad * 2;
      if (y + h > pageH - marginBottom) {
        doc.addPage();
        y = marginTop;
      }
      let x = marginX;
      for (const c of cells) {
        doc.rect(x, y, c.w, h);
        doc.setFont("times", c.bold ? "bold" : "normal");
        doc.text(c.lines, x + pad, y + pad + 3.4);
        x += c.w;
      }
      y += h;
    }
    doc.setFont("times", "normal");
    doc.setFontSize(12);
    y += lineH;
  };

  for (const block of docBlocks(opts.text)) {
    if (block.type === "table") writeTable(block.rows);
    else writeText(block.text);
  }

  doc.save(opts.fileName ?? pdfFileName(opts.title));
  return true;
}

/** Liquidación con el formato del Excel de referencia (sin colores de fondo). */
export async function downloadLiquidacionPdf(opts: {
  input: LiquidacionInput;
  calc: LiquidacionCalc;
  logoUrl?: string | null;
  /** Firma del trabajador (PNG data URL). */
  firma?: string | null;
  fileName?: string;
}): Promise<boolean> {
  const { input: i, calc: c } = opts;
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "letter" });

  const pageW = doc.internal.pageSize.getWidth();
  const mx = 18;
  const right = pageW - mx;
  const innerW = right - mx;
  let y = 18;

  doc.setDrawColor(0);
  doc.setTextColor(0);
  doc.setLineWidth(0.2);

  /* Logo + título: el título se centra en el espacio libre a la derecha del logo. */
  let logoRight = mx;
  if (opts.logoUrl) {
    const img = await loadImage(opts.logoUrl);
    if (img) {
      /* Se respeta la proporción original: cabe completo en una caja de 80 x 30 mm. */
      const scale = Math.min(80 / img.w, 30 / img.h);
      const w = img.w * scale;
      const h = img.h * scale;
      const fmt = img.data.startsWith("data:image/png") ? "PNG" : "JPEG";
      doc.addImage(img.data, fmt, mx, y + (30 - h) / 2, w, h);
      logoRight = mx + w + 6;
    }
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  const titleX = logoRight > mx ? (logoRight + right) / 2 : pageW / 2;
  doc.text("LIQUIDACIÓN", titleX, y + 17, { align: "center" });
  y += 36;

  /* Cuadrícula del encabezado: 4 columnas */
  const cols = [44, 50, 44, innerW - 138];
  const xs = [mx, mx + cols[0]!, mx + cols[0]! + cols[1]!, mx + cols[0]! + cols[1]! + cols[2]!];
  const rowH = 7;
  doc.setFontSize(8);
  const cellText = (txt: string, x: number, w: number, top: number, bold: boolean) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    const fit = doc.splitTextToSize(txt, w - 3)[0] ?? "";
    doc.text(fit, x + 1.5, top + 4.6);
  };
  const row = (cells: [string, string, string, string] | [string, string], span = false) => {
    doc.rect(mx, y, innerW, rowH);
    if (span) {
      doc.line(xs[1]!, y, xs[1]!, y + rowH);
      cellText(cells[0], xs[0]!, cols[0]!, y, true);
      cellText(cells[1], xs[1]!, cols[1]! + cols[2]! + cols[3]!, y, false);
    } else {
      for (let k = 1; k < 4; k++) doc.line(xs[k]!, y, xs[k]!, y + rowH);
      for (let k = 0; k < 4; k++) cellText(cells[k] ?? "", xs[k]!, cols[k]!, y, k % 2 === 0);
    }
    y += rowH;
  };
  row(["CIUDAD Y FECHA", fmtCiudadFecha(i.ciudad, i.fecha), "DEPENDENCIA", i.dependencia.toUpperCase()]);
  row(["NOMBRE DEL TRABAJADOR", i.nombre.toUpperCase(), "CÉDULA", `${i.cedula} DE ${i.ciudad.toUpperCase()}`]);
  row(["CARGO", i.cargo.toUpperCase()], true);
  row(["FECHA DE INGRESO", fmtFechaLarga(i.fechaIngreso), "HASTA", fmtFechaLarga(i.fechaHasta)]);
  row(["NÚMERO DÍAS SERVICIO", String(i.diasServicio), "SALARIO BÁSICO MENSUAL $", fmtCOP(i.salario)]);
  row(["", "", "AUXILIO DE TRANSPORTE $", fmtCOP(i.auxilio)]);
  y += 6;

  /* Conceptos */
  doc.setFontSize(9);
  const concept = (n: number, title: string, formula: string, result: number) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${n} ${title}`, mx, y);
    doc.text(fmtCOP(result), right, y, { align: "right" });
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.text(formula, mx, y);
    y += 3;
    doc.line(mx, y, right, y);
    y += 4.5;
  };
  concept(
    1,
    "CESANTÍAS",
    `No. días trabajados ${i.diasCesantias}/${i.divCesantias} x salario básico mensual ${fmtCOP(c.base)} = ${fmtCOP(c.cesantias)}`,
    c.cesantias,
  );
  concept(
    2,
    "INTERESES CESANTÍAS",
    `Valor cesantías ${fmtCOP(c.valorCesantias)} x No. días trabajados ${i.diasIntereses}/${i.divIntereses} x ${fmtTasa(i.tasaIntereses)} = ${fmtCOP(c.intereses)}`,
    c.intereses,
  );
  concept(
    3,
    "PRIMA DE SERVICIOS",
    `No. días trabajados ${i.diasPrima}/${i.divPrima} x salario básico mensual ${fmtCOP(c.base)} = ${fmtCOP(c.prima)}`,
    c.prima,
  );
  concept(
    4,
    "VACACIONES",
    `No. días trabajados ${i.diasVacaciones}/${i.divVacaciones} x salario (sin auxilio) ${fmtCOP(i.salario)} = ${fmtCOP(c.vacaciones)}`,
    c.vacaciones,
  );

  /* Total */
  y += 2;
  doc.setLineWidth(0.5);
  doc.line(mx, y, right, y);
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("TOTAL LIQUIDACIÓN $", mx, y);
  doc.text(fmtCOP(c.total), right, y, { align: "right" });
  y += 3;
  doc.line(mx, y, right, y);
  doc.setLineWidth(0.2);
  y += 7;

  /* Firmas fijas al pie. Si la nota no cabe con letra normal, se achica (hasta 6.5 pt)
     para que todo quede en una hoja; si aun así no cabe, la nota sale completa y la
     constancia con las firmas pasa a la hoja siguiente. */
  const pageH = doc.internal.pageSize.getHeight();
  let sigY = pageH - 20;
  const sigTop = sigY - 25;
  const bottom = pageH - 18;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const lineH = 4.5;
  const paz = doc.splitTextToSize(pazYSalvoLine(i), innerW) as string[];
  const cons = doc.splitTextToSize(constanciaLine(i), innerW) as string[];
  const constanciaH = 6 + paz.length * lineH + 4 + cons.length * lineH;

  const obs = i.observaciones?.trim();
  const noteLayout = (size: number) => {
    doc.setFontSize(size);
    const lines = obs ? (doc.splitTextToSize(obs, innerW) as string[]) : [];
    const lh = size * 0.5;
    return { size, lines, lh, h: lines.length ? 5 + lines.length * lh + 4 : 0 };
  };
  const space = sigTop - y - 5 - constanciaH;
  let note = noteLayout(9);
  for (const size of [8.5, 8, 7.5, 7, 6.5]) {
    if (note.h <= space) break;
    note = noteLayout(size);
  }
  const fitsOnePage = note.h <= space;
  if (!fitsOnePage) note = noteLayout(9);
  doc.setFontSize(9);

  if (note.lines.length) {
    doc.setFont("helvetica", "bold");
    doc.text("NOTA", mx, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(note.size);
    for (const line of note.lines) {
      if (y > bottom) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, mx, y);
      y += note.lh;
    }
    doc.setFontSize(9);
    y += 4;
  }

  if (!fitsOnePage) {
    /* Bloque de constancia + firmas: si no cabe en la hoja actual (o seguimos en la
       primera), va a una hoja nueva. */
    const onFirstPage = doc.getNumberOfPages() === 1;
    if (onFirstPage || y + 5 + constanciaH + 50 > bottom) {
      doc.addPage();
      y = 20;
    }
    sigY = y + 5 + constanciaH + 40;
  }
  y += 5;

  /* Constancia */
  doc.setFont("helvetica", "bold");
  doc.text("HAGO CONSTAR", mx, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.text(paz, mx, y);
  y += paz.length * lineH + 4;
  doc.text(cons, mx, y);

  /* Misma línea: [firma + huella del trabajador] a la izquierda, firma del empleador a la derecha. */
  y = sigY;
  const huellaW = 28;
  const sigW = 60;
  const xHuella = mx + sigW + 4;
  const xEmp = right - sigW;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  if (opts.firma) {
    const h = 18;
    doc.addImage(opts.firma, "PNG", mx, y - h - 1, Math.min(sigW, (h * 600) / 220), h);
  }
  doc.line(mx, y, mx + sigW, y);
  doc.text("FIRMA DEL TRABAJADOR", mx, y + 4.5);
  doc.text(`No. CÉDULA: ${i.cedula || "____________________"}`, mx, y + 10);
  doc.line(xEmp, y, xEmp + sigW, y);
  doc.text("FIRMA DEL EMPLEADOR", xEmp, y + 4.5);
  doc.rect(xHuella, y - 22, huellaW, 28);
  doc.text(["HUELLA DEL", "TRABAJADOR"], xHuella + huellaW / 2, y + 10, { align: "center" });

  doc.save(opts.fileName ?? pdfFileName(`Liquidacion ${i.nombre}`));
  return true;
}

/** Recibo de pago mensual de nómina con el formato del Excel de referencia (hoja horizontal). */
export async function downloadNominaPdf(opts: {
  input: NominaInput;
  calc: NominaCalc;
  logoUrl?: string | null;
  fileName?: string;
}): Promise<boolean> {
  const { input: i, calc: c } = opts;
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "letter", orientation: "landscape" });

  const pageW = doc.internal.pageSize.getWidth();
  const mx = 12;
  let y = 14;
  const mes = mesNombre(i.mes);

  doc.setDrawColor(0);
  doc.setTextColor(0);
  doc.setLineWidth(0.2);

  if (opts.logoUrl) {
    const img = await loadImage(opts.logoUrl);
    if (img) {
      const scale = Math.min(90 / img.w, 24 / img.h);
      const w = img.w * scale;
      const h = img.h * scale;
      const fmt = img.data.startsWith("data:image/png") ? "PNG" : "JPEG";
      doc.addImage(img.data, fmt, mx, y, w, h);
    }
  }
  y += 34;

  /* Encabezado: nombre, mes y año a la izquierda; cédula e ingreso a la derecha. */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  const valX = mx + 26;
  const rightX = mx + 130;
  const value = (txt: string, x: number, top: number) => {
    doc.setFont("helvetica", "normal");
    doc.text(txt, x, top);
    doc.setFont("helvetica", "bold");
  };
  doc.text("NOMINA:", mx, y);
  value(i.nombre.toUpperCase(), valX, y);
  doc.text(`C.C. ${i.cedula} DE ${i.expedicion.toUpperCase()}`, rightX, y);
  y += 6;
  doc.text("MES:", mx, y);
  value(mes, valX, y);
  doc.text(`INGRESO: ${fmtIngreso(i.fechaIngreso)}`, rightX, y);
  y += 6;
  doc.text("AÑO:", mx, y);
  value(String(i.anio), valX, y);
  y += 9;

  doc.setFontSize(12);
  doc.text("RECIBO DE PAGO MENSUAL DE NOMINA", pageW / 2, y, { align: "center" });
  y += 6;
  doc.text(`MES DE ${mes} DE ${i.anio}`, pageW / 2, y, { align: "center" });
  y += 6;

  /* Tabla */
  const widths = [22, 34, 21, 13, 21, 19, 21, 18, 18, 18, 20, 0];
  widths[11] = pageW - mx * 2 - widths.reduce((a, b) => a + b, 0);
  const xs = widths.map((_, k) => mx + widths.slice(0, k).reduce((a, b) => a + b, 0));
  const span = (from: number, to: number) => ({
    x: xs[from]!,
    w: widths.slice(from, to + 1).reduce((a, b) => a + b, 0),
  });
  const box = (x: number, w: number, top: number, h: number, txt: string, size: number, bold = true) => {
    doc.rect(x, top, w, h);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    const fit = (doc.splitTextToSize(txt, w - 1.5) as string[])[0] ?? "";
    doc.text(fit, x + w / 2, top + h / 2 + size * 0.13, { align: "center" });
  };

  const h1 = 7;
  const dev = span(4, 6);
  const ded = span(7, 10);
  box(dev.x, dev.w, y, h1, "DEVENGADO", 10);
  box(ded.x, ded.w, y, h1, "DEDUCCIONES", 10);
  y += h1;

  const headers = [
    "CÉDULA", "NOMBRE", "SALARIO", "N° DÍAS", "DEVENGADO", "AUX.TRASP", "TOTAL DEV",
    "SALUD", "PENSIÓN", "O. DEDUC", "TOTAL DED", "NETO PAGO",
  ];
  const h2 = 7;
  headers.forEach((t, k) => box(xs[k]!, widths[k]!, y, h2, t, 7.5));
  y += h2;

  const h3 = 14;
  const values: [string, number, boolean][] = [
    [i.cedula, 6.5, false],
    [i.nombre, 6.5, false],
    [fmtNum(i.salario), 9, false],
    [String(i.dias), 9, false],
    [fmtNum(c.devengado), 9, false],
    [fmtNum(c.auxTransporte), 9, false],
    [fmtNum(c.totalDevengado), 9, false],
    [fmtNum(c.salud), 9, false],
    [fmtNum(c.pension), 9, false],
    [fmtNum(i.otrasDeducciones), 9, false],
    [fmtNum(c.totalDeducciones), 9, false],
    [fmtNum(c.neto), 10, true],
  ];
  values.forEach(([t, size, bold], k) => box(xs[k]!, widths[k]!, y, h3, t, size, bold));
  y += h3;

  /* Firma del trabajador debajo de la tabla. */
  y += 28;
  const sigW = 70;
  doc.setLineWidth(0.2);
  doc.line(mx, y, mx + sigW, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("FIRMA", mx, y + 4.5);
  doc.text(`C.C. ${i.cedula}`, mx, y + 10);

  doc.save(opts.fileName ?? pdfFileName(`Nomina ${i.nombre} ${mes} ${i.anio}`));
  return true;
}
