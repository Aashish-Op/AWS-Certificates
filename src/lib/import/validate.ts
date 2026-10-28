import { normalizeName, normalizeEmail, validateName, validateEmail } from './normalize';

export interface ColumnMapping {
  emailColumn: string;
  nameColumn: string;
}

export interface ValidatedRow {
  rowIndex: number;
  rawEmail: string;
  rawName: string;
  normalizedEmail: string;
  normalizedName: string;
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
  existingEmails: Map<string, string> // Map of normalized email -> certificate_id
): ImportValidationReport {
  const validatedRows: ValidatedRow[] = [];
  const emailOccurrences = new Map<string, number[]>();

  // Pass 1: normalize and check single-row validity
  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i]!;
    const rawEmail = row[mapping.emailColumn] || '';
    const rawName = row[mapping.nameColumn] || '';

    const normalizedEmail = normalizeEmail(rawEmail);
    const normalizedName = normalizeName(rawName);

    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate email
    const emailError = validateEmail(normalizedEmail);
    if (emailError) {
      errors.push(emailError);
    } else {
      // Track occurrence for duplicate detection in file
      const currentList = emailOccurrences.get(normalizedEmail) || [];
      currentList.push(i);
      emailOccurrences.set(normalizedEmail, currentList);
    }

    // Validate name
    const nameVal = validateName(normalizedName);
    errors.push(...nameVal.errors);
    warnings.push(...nameVal.warnings);

    validatedRows.push({
      rowIndex: i,
      rawEmail,
      rawName,
      normalizedEmail,
      normalizedName,
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
    const occurrences = emailOccurrences.get(row.normalizedEmail);

    if (occurrences && occurrences.length > 1) {
      row.isDuplicateInFile = true;
      row.duplicateRowIndexes = occurrences.filter((idx) => idx !== i);
      row.errors.push(`Duplicate email in file (also in row ${row.duplicateRowIndexes.map(r => r + 1).join(', ')})`);
      row.status = 'error';
    }

    // Check if already issued in DB
    const existingCertId = existingEmails.get(row.normalizedEmail);
    if (existingCertId) {
      row.alreadyIssuedCertId = existingCertId;
      if (row.status !== 'error') {
        row.status = 'already_issued';
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
