import { describe, it, expect } from 'vitest';
import { normalizeEmail, validateEmail, normalizeName, validateName } from '@/lib/import/normalize';

describe('normalizeEmail & validateEmail', () => {
  it('normalizes whitespace and converts to lowercase', () => {
    expect(normalizeEmail('  Ashish@Example.COM  ')).toBe('ashish@example.com');
    expect(normalizeEmail('ASHISHGUPTAOP195@GMAIL.COM')).toBe('ashishguptaop195@gmail.com');
    expect(normalizeEmail('ashish@example.com')).toBe('ashish@example.com');
  });

  it('validates correct email addresses according to spec', () => {
    expect(validateEmail('ashishguptaop195@gmail.com')).toBeNull();
    expect(validateEmail('user.name+tag@domain.co.in')).toBeNull();
  });

  it('rejects invalid or blank email addresses', () => {
    expect(validateEmail('')).not.toBeNull();
    expect(validateEmail('   ')).not.toBeNull();
    expect(validateEmail('invalid-email')).not.toBeNull();
    expect(validateEmail('@domain.com')).not.toBeNull();
    expect(validateEmail('user@')).not.toBeNull();
  });
});

describe('normalizeName & validateName', () => {
  it('preserves casing and spelling while collapsing extra spaces and applying NFC', () => {
    expect(normalizeName('  Ashish   Prasad   Gupta  ')).toBe('Ashish Prasad Gupta');
    expect(normalizeName('Renée   Müller')).toBe('Renée Müller');
  });

  it('validates clean names with no warnings or errors', () => {
    const res = validateName('Ashish Prasad Gupta');
    expect(res.errors).toHaveLength(0);
    expect(res.warnings).toHaveLength(0);
  });

  it('flags errors on blank names', () => {
    const res = validateName('   ');
    expect(res.errors.length).toBeGreaterThan(0);
    expect(res.errors[0]).toContain('blank');
  });

  it('flags warnings for ALL CAPS and all lowercase', () => {
    const caps = validateName('ASHISH GUPTA');
    expect(caps.warnings).toContain('Name is all uppercase.');

    const lower = validateName('ashish gupta');
    expect(lower.warnings).toContain('Name is all lowercase.');
  });

  it('flags warnings for digits or unusual symbols', () => {
    const withDigits = validateName('Ashish 123');
    expect(withDigits.warnings).toContain('Name contains digits.');
  });
});
