import { normalizeName, normalizeRegNo, normalizeEmail, validateName, validateRegNo, validateEmail } from './normalize';

export interface ColumnMapping {
  nameColumn: string;
  regNoColumn: string;
  emailColumn?: string;
}

export interface ValidatedRow {
  rowIndex: number;
  rawName: string;
  rawRegNo: string;
  rawEmail?: string;
  normalizedName: string;
  normalizedRegNo: string;
  normalizedEmail?: string;
  status: 'valid' | 'warning' | 'error' | 'already_issued';
  errors: string[];
  warnings: string[];
  isDuplicateInFile?: boolean;
  duplicateRowIndexes?: number[];
  alreadyIssuedCertId?: string;
  excluded?: boolean;
}

export interface ImportValidationReport {
  summary: {
    total: number;
    valid: number;
    warnings: number;
    errors: number;
    alreadyIssued: number;
    newToIssue: number;
  };
  rows: ValidatedRow[];
}

export function validateImportBatch(
  rawRows: Record<string, string>[],
  mapping: ColumnMapping,
  existingRegNos: Map<string, string> // Map of normalized reg_no -> certificate_id
): ImportValidationReport {
  const validatedRows: ValidatedRow[] = [];
  const regNoOccurrences = new Map<string, number[]>();

  // Pass 1: normalize and check single-row validity
  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i]!;
    const rawName = row[mapping.nameColumn] || '';
    const rawRegNo = row[mapping.regNoColumn] || '';
    const rawEmail = mapping.emailColumn ? row[mapping.emailColumn] || '' : '';

    const normalizedName = normalizeName(rawName);
    const normalizedRegNo = normalizeRegNo(rawRegNo);
    const normalizedEmail = rawEmail ? normalizeEmail(rawEmail) : undefined;

    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate registration number (required & unique per event)
    const regNoError = validateRegNo(normalizedRegNo);
    if (regNoError) {
      errors.push(regNoError);
    } else {
      // Track occurrence for duplicate detection in file
      const currentList = regNoOccurrences.get(normalizedRegNo) || [];
      currentList.push(i);
      regNoOccurrences.set(normalizedRegNo, currentList);
    }

    // Validate name
    const nameVal = validateName(normalizedName);
    errors.push(...nameVal.errors);
    warnings.push(...nameVal.warnings);

    // Validate email if present (optional metadata)
    if (normalizedEmail) {
      const emailError = validateEmail(normalizedEmail);
      if (emailError) {
        warnings.push(`Email warning: ${emailError}`);
      }
    }

    validatedRows.push({
      rowIndex: i,
      rawName,
      rawRegNo,
      rawEmail: rawEmail || undefined,
      normalizedName,
      normalizedRegNo,
      normalizedEmail,
      status: errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'valid',
      errors,
      warnings,
      excluded: false,
    });
  }

  // Pass 2: check duplicates within file & already issued
  let totalValid = 0;
  let totalWarnings = 0;
  let totalErrors = 0;
  let totalAlreadyIssued = 0;
  let totalNewToIssue = 0;

  for (let i = 0; i < validatedRows.length; i++) {
    const row = validatedRows[i]!;

    if (row.normalizedRegNo) {
      const occurrences = regNoOccurrences.get(row.normalizedRegNo);
      if (occurrences && occurrences.length > 1) {
        row.isDuplicateInFile = true;
        row.duplicateRowIndexes = occurrences.filter((idx) => idx !== i);
        row.errors.push(`Duplicate registration number in file (also in row ${row.duplicateRowIndexes.map(r => r + 1).join(', ')})`);
        row.status = 'error';
      }

      // Check if already issued in DB
      const existingCertId = existingRegNos.get(row.normalizedRegNo);
      if (existingCertId) {
        row.alreadyIssuedCertId = existingCertId;
        if (row.status !== 'error') {
          row.status = 'already_issued';
        }
      }
    }

    // Count summaries
    if (row.status === 'error') {
      totalErrors++;
    } else if (row.status === 'already_issued') {
      totalAlreadyIssued++;
      if (row.warnings.length > 0) totalWarnings++;
    } else if (row.status === 'warning') {
      totalWarnings++;
      totalNewToIssue++;
    } else {
      totalValid++;
      totalNewToIssue++;
    }
  }

  return {
    summary: {
      total: validatedRows.length,
      valid: totalValid,
      warnings: totalWarnings,
      errors: totalErrors,
      alreadyIssued: totalAlreadyIssued,
      newToIssue: totalNewToIssue,
    },
    rows: validatedRows,
  };
}
