/**
 * Central site configuration.
 * All magic strings and patterns live here so they can be changed in one place.
 */
export const siteConfig = {
  name: 'AWS SBG LPU Certificates',
  shortName: 'AWS SBG LPU',
  issuer: 'AWS Student Builder Group at LPU',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  supportEmail: 'ashishop07@gmail.com',
  linkedInUrl: 'https://www.linkedin.com/company/awsbuilderslpu',
  linkedInOrgId: '69826209',
  description:
    'Certificate issuing and verification platform for AWS Student Builder Group at Lovely Professional University.',
} as const;



/**
 * Certificate ID alphabet — excludes 0, 1, I, L, O to avoid ambiguity.
 */
export const CERT_ID_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export const CERT_ID_LENGTH = 12;

/**
 * Format a raw 12-char certificate ID as XXXX-XXXX-XXXX for display.
 */
export function formatCertificateId(id: string): string {
  const clean = id.replace(/[-\s]/g, '').toUpperCase();
  if (clean.length !== CERT_ID_LENGTH) return id;
  return `${clean.slice(0, 4)}-${clean.slice(4, 8)}-${clean.slice(8, 12)}`;
}
