import { describe, it, expect } from 'vitest';
import { createCertificateId, isValidCertificateId, CERT_ID_REGEX } from '@/lib/certificate/ids';
import { formatCertificateId } from '@/config/site';

describe('Certificate IDs', () => {
  it('generates 12-character alphanumeric IDs excluding ambiguous characters', () => {
    const id = createCertificateId();
    expect(id).toHaveLength(12);
    expect(CERT_ID_REGEX.test(id)).toBe(true);
    expect(isValidCertificateId(id)).toBe(true);

    // Assert no 0, 1, I, L, O in generated ID
    expect(id).not.toMatch(/[01ILO]/i);
  });

  it('generates unique non-sequential IDs', () => {
    const ids = new Set();
    for (let i = 0; i < 50; i++) {
      ids.add(createCertificateId());
    }
    expect(ids.size).toBe(50);
  });

  it('formats raw 12-char ID into XXXX-XXXX-XXXX display format and is idempotent', () => {
    expect(formatCertificateId('23456789ABCD')).toBe('2345-6789-ABCD');
    expect(formatCertificateId('2345-6789-ABCD')).toBe('2345-6789-ABCD');
    expect(formatCertificateId('SAMPLE123456')).toBe('SAMP-LE12-3456');
    // If not 12 chars, returns original
    expect(formatCertificateId('SHORT')).toBe('SHORT');
  });

  it('validates both raw and hyphenated IDs as well as sample preview IDs', () => {
    expect(isValidCertificateId('23456789ABCD')).toBe(true);
    expect(isValidCertificateId('2345-6789-ABCD')).toBe(true);
    expect(isValidCertificateId('SAMPLE123456')).toBe(true);
    expect(isValidCertificateId('SAMP-LE12-3456')).toBe(true);
    expect(isValidCertificateId('INVALID')).toBe(false);
  });
});
