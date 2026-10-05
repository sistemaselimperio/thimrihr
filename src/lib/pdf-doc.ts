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
    const dims = await new Promise<{ w: number; h: number }>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => reject(new Error("image error"));
      img.src = data;
    });
    return { data, ...dims };
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
      const h = 24;
      const w = Math.min(maxW, (img.w / img.h) * h);
      const fmt = img.data.startsWith("data:image/png") ? "PNG" : "JPEG";
      doc.addImage(img.data, fmt, marginX, y, w, h);
      y += h + 10;
    }
  }

  doc.setFont("times", "normal");
  doc.setFontSize(12);
  const lineH = 6.2;

  for (const para of opts.text.split("\n")) {
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

  /* Logo + título */
  if (opts.logoUrl) {
    const img = await loadImage(opts.logoUrl);
    if (img) {
      const h = 30;
      const w = Math.min(80, (img.w / img.h) * h);
      const fmt = img.data.startsWith("data:image/png") ? "PNG" : "JPEG";
      doc.addImage(img.data, fmt, mx, y, w, h);
    }
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("LIQUIDACIÓN", pageW / 2, y + 17, { align: "center" });
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

  /* Firmas fijas al pie para que todo quepa en una sola hoja. */
  const sigY = doc.internal.pageSize.getHeight() - 30;
  const sigTop = sigY - 25;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const lineH = 4.5;
  const paz = doc.splitTextToSize(pazYSalvoLine(i), innerW) as string[];
  const cons = doc.splitTextToSize(constanciaLine(i), innerW) as string[];
  const constanciaH = 6 + paz.length * lineH + 4 + cons.length * lineH;

  /* Nota: se recorta si no caben en el espacio libre. */
  const obs = i.observaciones?.trim();
  if (obs) {
    let lines = doc.splitTextToSize(obs, innerW) as string[];
    const maxLines = Math.max(1, Math.floor((sigTop - y - constanciaH - 14) / lineH));
    if (lines.length > maxLines) {
      lines = lines.slice(0, maxLines);
      lines[maxLines - 1] = `${lines[maxLines - 1]!.replace(/\s*\S*$/, "")}…`;
    }
    doc.setFont("helvetica", "bold");
    doc.text("NOTA", mx, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.text(lines, mx, y);
    y += lines.length * lineH + 4;
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
