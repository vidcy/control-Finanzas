/**
 * exportToExcel — helper para exportar datos a .xlsx usando SheetJS (xlsx)
 * @param rows        Array de objetos con los datos
 * @param columns     Array de { key, label } para definir columnas y encabezados
 * @param filename    Nombre del archivo sin extensión
 */
export async function exportToExcel<T extends Record<string, any>>(
  rows: T[],
  columns: { key: keyof T; label: string }[],
  filename: string
): Promise<void> {
  const XLSX = await import("xlsx");

  // Build header row
  const header = columns.map((c) => c.label);

  // Build data rows
  const data = rows.map((row) =>
    columns.map((c) => {
      const val = row[c.key];
      if (val === null || val === undefined) return "";
      return val;
    })
  );

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet([header, ...data]);

  // Auto column widths
  ws["!cols"] = columns.map((c) => {
    const maxLen = Math.max(
      c.label.length,
      ...rows.map((r) => String(r[c.key] ?? "").length)
    );
    return { wch: Math.min(maxLen + 2, 40) };
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Datos");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

/** Filter an array of objects by an optional date range on a given date field */
export function filterByDateRange<T extends Record<string, any>>(
  rows: T[],
  dateField: keyof T,
  dateFrom: string,
  dateTo: string
): T[] {
  if (!dateFrom && !dateTo) return rows;
  return rows.filter((row) => {
    const d = new Date(row[dateField]);
    if (isNaN(d.getTime())) return true;
    const day = d.toISOString().slice(0, 10);
    if (dateFrom && day < dateFrom) return false;
    if (dateTo && day > dateTo) return false;
    return true;
  });
}
