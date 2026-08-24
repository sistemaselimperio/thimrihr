/** Genera una ventana imprimible (Guardar como PDF) con logo y texto del documento. */

function escapeHtml(text: string): string {
  return text.replace(
    /[<>&]/g,
    (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c] ?? c,
  );
}

export function openPrintableDocument(opts: {
  title: string;
  text: string;
  logoUrl?: string | null;
}) {
  const win = window.open("", "_blank", "noopener,width=840,height=1000");
  if (!win) return false;

  const logo = opts.logoUrl
    ? `<img src="${opts.logoUrl}" alt="Logo" onload="window.print()" onerror="window.print()" />`
    : "";

  win.document.write(`<!doctype html>
<html lang="es"><head><meta charset="utf-8" />
<title>${escapeHtml(opts.title)}</title>
<style>
  @page { size: letter; margin: 22mm 20mm; }
  body { margin: 0; font-family: Georgia, "Times New Roman", serif; color: #111827; }
  .doc { padding: 24px; }
  img { height: 92px; object-fit: contain; display: block; margin-bottom: 26px; }
  pre { font-family: inherit; font-size: 12.5pt; line-height: 1.65; white-space: pre-wrap; margin: 0; }
</style></head>
<body><div class="doc">${logo}<pre>${escapeHtml(opts.text)}</pre></div></body></html>`);
  win.document.close();
  if (!opts.logoUrl) win.print();
  return true;
}

export const AUTENTIC_URL = "https://www.autenticsigna.com/";
