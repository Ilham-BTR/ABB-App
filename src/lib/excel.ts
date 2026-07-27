// Util ekspor & impor Excel (.xlsx) memakai exceljs.
// exceljs di-dynamic-import agar tidak membebani bundle utama.

type Cell = string | number | null | undefined;

export async function exportXlsx(
  filename: string,
  sheetName: string,
  headers: string[],
  rows: Cell[][]
) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName);

  ws.addRow(headers);
  ws.getRow(1).font = { bold: true };
  rows.forEach((r) => ws.addRow(r));

  // Lebar kolom otomatis (perkiraan dari panjang teks).
  ws.columns.forEach((col, i) => {
    const maxLen = Math.max(
      headers[i]?.length ?? 10,
      ...rows.map((r) => String(r[i] ?? "").length)
    );
    col.width = Math.min(Math.max(maxLen + 2, 10), 40);
  });

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Ubah nilai sel exceljs jadi string yang bersih (tangani Date, formula, rich text).
function cellToString(v: unknown): string {
  if (v == null) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if ("result" in o) return String(o.result ?? "");
    if ("text" in o) return String(o.text ?? "");
    if ("richText" in o && Array.isArray(o.richText))
      return (o.richText as { text?: string }[]).map((t) => t.text ?? "").join("");
    return "";
  }
  return String(v).trim();
}

// Baca SEMUA sheet .xlsx (setiap kolom), untuk memilih sheet & kolom via header.
export async function readAllSheets(
  file: File
): Promise<{ name: string; rows: string[][] }[]> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  return wb.worksheets.map((ws) => {
    const colCount = Math.max(ws.columnCount, 1);
    const rows: string[][] = [];
    ws.eachRow((row) => {
      const values: string[] = [];
      for (let c = 1; c <= colCount; c++)
        values.push(cellToString(row.getCell(c).value));
      rows.push(values);
    });
    return { name: ws.name, rows };
  });
}

// Baca .xlsx jadi array baris (array of string per kolom), tanpa header.
export async function readXlsx(file: File): Promise<string[][]> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  const ws = wb.worksheets[0];
  if (!ws) return [];

  const rows: string[][] = [];
  ws.eachRow((row) => {
    const values: string[] = [];
    // row.values index mulai dari 1; ambil kolom 1..6.
    for (let c = 1; c <= 6; c++) {
      const v = row.getCell(c).value;
      values.push(v == null ? "" : String(v).trim());
    }
    rows.push(values);
  });
  return rows;
}
