/**
 * Normalize an email address.
 * Trim, lowercase.
 * Returns the normalized value.
 */
export function normalizeEmail(input: string): string {
  return input.trim().toLowerCase();
}

/**
 * Validate an email address.
 * Returns null if valid, or an error message string.
 */
export function validateEmail(email: string): string | null {
  if (!email) {
    return 'Email address is required.';
  }

  const normalized = normalizeEmail(email);

  // Basic email validation regex
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(normalized)) {
    return 'Invalid email address format.';
  }

  return null;
}

/**
 * Normalize a registration number.
 * Trim and uppercase (canonical format, e.g. "12409260").
 */
export function normalizeRegNo(input: string): string {
  return input.trim().toUpperCase();
}

/**
 * Validate a registration number.
 * Must be between 4 and 20 characters, alphanumeric with optional dash/underscore.
 */
export function validateRegNo(regNo: string): string | null {
  if (!regNo || !regNo.trim()) {
    return 'Registration number is required.';
  }

  const normalized = normalizeRegNo(regNo);
  if (normalized.length < 4 || normalized.length > 20) {
    return 'Registration number must be between 4 and 20 characters.';
  }

  if (!/^[A-Z0-9_-]+$/.test(normalized)) {
    return 'Registration number contains invalid characters (letters, numbers, dash, underscore only).';
  }

  return null;
}

/**
 * Normalize a name (non-destructive).
 * Trim, collapse internal whitespace, Unicode NFC.
 * Does NOT change casing or spelling.
 */
export function normalizeName(input: string): string {
  return input.trim().replace(/\s+/g, ' ').normalize('NFC');
}

/**
 * Validate a name for import.
 * Returns { errors: string[], warnings: string[] }
 */
export function validateName(name: string): {
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!name || !name.trim()) {
    errors.push('Name is blank.');
    return { errors, warnings };
  }

  const normalized = normalizeName(name);

  // Warnings (admin decides)
  if (normalized === normalized.toUpperCase() && normalized.length > 1) {
    warnings.push('Name is all uppercase.');
  }
  if (normalized === normalized.toLowerCase() && normalized.length > 1) {
    warnings.push('Name is all lowercase.');
  }
  if (/\d/.test(normalized)) {
    warnings.push('Name contains digits.');
  }
  if (/[^a-zA-Z\s\u00C0-\u024F\u0300-\u036F'.\-]/.test(normalized)) {
    warnings.push('Name contains unusual symbols.');
  }

  const tokens = normalized.split(' ');
  if (tokens.length >= 5) {
    warnings.push('Name has 5 or more parts.');
  }
  if (normalized.length < 2) {
    warnings.push('Name is very short (under 2 characters).');
  }
  if (normalized.length > 60) {
    warnings.push('Name is very long (over 60 characters).');
  }

  return { errors, warnings };
}
