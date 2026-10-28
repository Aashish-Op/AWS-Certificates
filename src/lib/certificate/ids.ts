import { customAlphabet } from 'nanoid';
import { CERT_ID_ALPHABET, CERT_ID_LENGTH } from '@/config/site';

/**
 * Generate a unique certificate ID.
 * 12 characters from a safe alphabet (no 0, 1, I, L, O).
 * ~60 bits of entropy. Collision retry is handled at the database level.
 */
const generateId = customAlphabet(CERT_ID_ALPHABET, CERT_ID_LENGTH);

export function createCertificateId(): string {
  return generateId();
}

/**
 * Normalize certificate ID by removing hyphens and whitespace and uppercasing.
 */
export function normalizeCertificateId(id: string): string {
  return id.replace(/[-\s]/g, '').toUpperCase();
}

/**
 * Validate that a string looks like a valid certificate ID (supports raw and hyphenated formats).
 */
export const CERT_ID_REGEX = /^[2-9A-HJKMNP-Z]{12}$/;

export function isValidCertificateId(id: string): boolean {
  if (!id) return false;
  const normalized = normalizeCertificateId(id);
  return CERT_ID_REGEX.test(normalized) || normalized === 'SAMPLE123456';
}
