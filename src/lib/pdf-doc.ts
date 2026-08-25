/** Genera y descarga directamente un PDF (sin ventanas nuevas ni popups). */

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
