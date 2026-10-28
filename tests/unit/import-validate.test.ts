import { describe, it, expect } from 'vitest';
import { validateImportBatch } from '@/lib/import/validate';

describe('Import Validation Logic', () => {
  const mapping = {
    regNoColumn: 'Registration Number',
    nameColumn: 'Student Name',
    emailColumn: 'Email',
  };

  it('validates a clean batch of attendees keyed by registration number', () => {
    const rows = [
      { 'Registration Number': '12409260', 'Student Name': 'Ashish Gupta', 'Email': 'ashish@example.com' },
      { 'Registration Number': '12409261', 'Student Name': 'John Doe', 'Email': 'john@example.com' },
    ];

    const report = validateImportBatch(rows, mapping, new Map());

    expect(report.summary.total).toBe(2);
    expect(report.summary.valid).toBe(2);
    expect(report.summary.errors).toBe(0);
    expect(report.summary.newToIssue).toBe(2);
  });

  it('allows duplicate emails across attendees when registration numbers are unique', () => {
    const rows = [
      { 'Registration Number': '12409260', 'Student Name': 'Ashish Gupta', 'Email': 'shared@example.com' },
      { 'Registration Number': '12409261', 'Student Name': 'Another Student', 'Email': 'shared@example.com' },
    ];

    const report = validateImportBatch(rows, mapping, new Map());

    expect(report.summary.errors).toBe(0);
    expect(report.summary.valid).toBe(2);
  });

  it('detects duplicate registration numbers within the file and marks both with errors', () => {
    const rows = [
      { 'Registration Number': '12409260', 'Student Name': 'Ashish Gupta' },
      { 'Registration Number': '12409260', 'Student Name': 'Duplicate Registration' },
    ];

    const report = validateImportBatch(rows, mapping, new Map());

    expect(report.summary.errors).toBe(2);
    expect(report.rows[0]?.isDuplicateInFile).toBe(true);
    expect(report.rows[1]?.isDuplicateInFile).toBe(true);
    expect(report.rows[0]?.errors[0]).toContain('Duplicate registration number');
  });

  it('detects already issued certificates by registration number', () => {
    const rows = [
      { 'Registration Number': '12409260', 'Student Name': 'Ashish Gupta' },
      { 'Registration Number': '12409299', 'Student Name': 'New Attendee' },
    ];

    const existing = new Map([['12409260', 'CERT12345678']]);
    const report = validateImportBatch(rows, mapping, existing);

    expect(report.summary.alreadyIssued).toBe(1);
    expect(report.summary.newToIssue).toBe(1);
    expect(report.rows[0]?.status).toBe('already_issued');
    expect(report.rows[0]?.alreadyIssuedCertId).toBe('CERT12345678');
    expect(report.rows[1]?.status).toBe('valid');
  });

  it('detects malformed registration numbers and blank names', () => {
    const rows = [
      { 'Registration Number': '12', 'Student Name': 'Valid Name' },
      { 'Registration Number': '12409260', 'Student Name': '   ' },
    ];

    const report = validateImportBatch(rows, mapping, new Map());

    expect(report.summary.errors).toBe(2);
    expect(report.rows[0]?.errors[0]).toContain('between 4 and 20');
    expect(report.rows[1]?.errors[0]).toContain('Name is blank');
  });
});
