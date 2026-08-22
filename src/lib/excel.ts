import * as XLSX from "xlsx";

export type Cell = string | number | null;

export interface SheetBlock {
  title?: string;
  header?: string[];
  rows: Cell[][];
}

/** Genera y descarga un .xlsx a partir de bloques (secciones) de datos. */
export function downloadSheet(fileName: string, sheetName: string, blocks: SheetBlock[]) {
  const aoa: Cell[][] = [];
  blocks.forEach((block, index) => {
    if (index > 0) aoa.push([]);
    if (block.title) aoa.push([block.title]);
    if (block.header) aoa.push(block.header);
    if (block.rows.length === 0) aoa.push(["Sin registros"]);
    else block.rows.forEach((r) => aoa.push(r));
  });

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const widths = new Map<number, number>();
  aoa.forEach((row) =>
    row.forEach((cell, i) => {
      const len = String(cell ?? "").length + 2;
      widths.set(i, Math.min(46, Math.max(widths.get(i) ?? 10, len)));
    }),
  );
  ws["!cols"] = [...widths.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, w]) => ({ wch: w }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, fileName);
}

export function downloadText(fileName: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
