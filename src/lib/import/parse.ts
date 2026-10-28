import 'server-only';
import Papa from 'papaparse';
import ExcelJS from 'exceljs';

export interface ParsedSpreadsheet {
  headers: string[];
  rows: Record<string, string>[];
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_ROW_COUNT = 5000;

export async function parseSpreadsheet(
  buffer: Buffer,
  filename: string
): Promise<ParsedSpreadsheet> {
  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    throw new Error('File size exceeds the 5 MB limit.');
  }

  const lowerName = filename.toLowerCase();

  if (lowerName.endsWith('.csv')) {
    let csvText = buffer.toString('utf-8');
    // Strip UTF-8 BOM if present
    if (csvText.charCodeAt(0) === 0xfeff) {
      csvText = csvText.slice(1);
    }

    const parsed = Papa.parse<Record<string, string>>(csvText, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (h) => h.trim(),
      transform: (val) => (typeof val === 'string' ? val.trim() : String(val ?? '').trim()),
    });

    if (parsed.errors && parsed.errors.length > 0 && parsed.data.length === 0) {
      throw new Error(`CSV parsing error: ${parsed.errors[0]?.message}`);
    }

    const headers = parsed.meta.fields?.filter(Boolean) || [];
    const rows = parsed.data.slice(0, MAX_ROW_COUNT);

    return { headers, rows };
  }

  if (lowerName.endsWith('.xlsx')) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error('Spreadsheet has no worksheets.');
    }

    const headers: string[] = [];
    const rows: Record<string, string>[] = [];

    // First row as headers
    const firstRow = worksheet.getRow(1);
    firstRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const headerVal = cell.text?.trim() || `Column_${colNumber}`;
      headers[colNumber - 1] = headerVal;
    });

    // Clean empty slots in headers
    for (let i = 0; i < headers.length; i++) {
      if (!headers[i]) headers[i] = `Column_${i + 1}`;
    }

    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return; // header row
      if (rows.length >= MAX_ROW_COUNT) return;

      const rowObj: Record<string, string> = {};
      let hasData = false;

      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        const header = headers[colNumber - 1];
        if (!header) return;

        let cellStr = '';
        if (cell.type === ExcelJS.ValueType.Number) {
          // Format number without scientific notation
          cellStr = Number(cell.value).toLocaleString('fullwide', { useGrouping: false });
        } else if (cell.text !== undefined && cell.text !== null) {
          cellStr = cell.text.trim();
        } else if (cell.value !== undefined && cell.value !== null) {
          cellStr = String(cell.value).trim();
        }

        if (cellStr) hasData = true;
        rowObj[header] = cellStr;
      });

      if (hasData) {
        // ensure missing columns exist as empty strings
        for (const h of headers) {
          if (!rowObj[h]) rowObj[h] = '';
        }
        rows.push(rowObj);
      }
    });

    return { headers, rows };
  }

  throw new Error('Unsupported file format. Please upload a .csv or .xlsx file.');
}
