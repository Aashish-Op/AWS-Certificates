import { describe, it, expect } from 'vitest';
import { validateImportBatch } from '@/lib/import/validate';

describe('Import Validation Logic', () => {
  const mapping = {
    emailColumn: 'Email',
    nameColumn: 'Student Name',
  };

  it('validates a clean batch of attendees', () => {
    const rows = [
      { 'Email': 'ashishguptaop195@gmail.com', 'Student Name': 'Ashish Prasad Gupta' },
      { 'Email': 'john@example.com', 'Student Name': 'John Doe' },
    ];

    const report = validateImportBatch(rows, mapping, new Map());

    expect(report.summary.total).toBe(2);
    expect(report.summary.valid).toBe(2);
    expect(report.summary.errors).toBe(0);
    expect(report.summary.newToIssue).toBe(2);
  });

  it('detects duplicate emails within the file and marks both with errors', () => {
    const rows = [
      { 'Email': 'ashishguptaop195@gmail.com', 'Student Name': 'Ashish Gupta' },
      { 'Email': 'ASHISHGUPTAOP195@GMAIL.COM', 'Student Name': 'Duplicate Person' },
    ];

    const report = validateImportBatch(rows, mapping, new Map());

    expect(report.summary.errors).toBe(2);
    expect(report.rows[0]?.isDuplicateInFile).toBe(true);
    expect(report.rows[1]?.isDuplicateInFile).toBe(true);
    expect(report.rows[0]?.errors[0]).toContain('Duplicate email');
  });

  it('detects already issued certificates and defaults them to already_issued status', () => {
    const rows = [
      { 'Email': 'ashishguptaop195@gmail.com', 'Student Name': 'Ashish Gupta' },
      { 'Email': 'newattendee@example.com', 'Student Name': 'New Attendee' },
    ];

    const existing = new Map([['ashishguptaop195@gmail.com', 'CERT12345678']]);
    const report = validateImportBatch(rows, mapping, existing);

    expect(report.summary.alreadyIssued).toBe(1);
    expect(report.summary.newToIssue).toBe(1);
    expect(report.rows[0]?.status).toBe('already_issued');
    expect(report.rows[0]?.alreadyIssuedCertId).toBe('CERT12345678');
    expect(report.rows[1]?.status).toBe('valid');
  });

  it('detects malformed emails and blank names', () => {
    const rows = [
      { 'Email': 'not-an-email', 'Student Name': 'Valid Name' },
      { 'Email': 'user@example.com', 'Student Name': '   ' },
    ];

    const report = validateImportBatch(rows, mapping, new Map());

    expect(report.summary.errors).toBe(2);
    expect(report.rows[0]?.errors[0]).toContain('Invalid email');
    expect(report.rows[1]?.errors[0]).toContain('Name is blank');
  });
});
