import { siteConfig } from '@/config/site';
import { formatCertificateId } from '@/config/site';

/**
 * LinkedIn URL builders.
 * See Prompt.md §7.5.
 * Both return URLs to open in a new tab with rel="noopener noreferrer".
 */

interface LinkedInParams {
  certificateTitle: string;
  certId: string;
  eventDate: Date;
}

export const OFFICIAL_LINKEDIN_COMPANY_URL = 'https://www.linkedin.com/company/awsbuilderslpu';
export const OFFICIAL_LINKEDIN_ORG_ID = '69826209';

/**
 * Build a LinkedIn "Add to profile" URL.
 * Opens the LinkedIn certification form pre-filled with the official AWS Student Builder Group at LPU organization.
 */
export function buildLinkedInAddUrl({
  certificateTitle,
  certId,
  eventDate,
}: LinkedInParams): string {
  const formattedId = formatCertificateId(certId);
  const verifyUrl = `${siteConfig.url}/verify/${formattedId}`;
  const year = eventDate.getFullYear().toString();
  const month = (eventDate.getMonth() + 1).toString();

  const orgId =
    process.env.LINKEDIN_ORG_ID ??
    process.env.NEXT_PUBLIC_LINKEDIN_ORG_ID ??
    siteConfig.linkedInOrgId ??
    OFFICIAL_LINKEDIN_ORG_ID;

  const params = new URLSearchParams({
    startTask: 'CERTIFICATION_NAME',
    name: certificateTitle,
    organizationId: orgId,
    organizationName: siteConfig.issuer || 'AWS Student Builder Group at LPU',
    issueYear: year,
    issueMonth: month,
    certUrl: verifyUrl,
    certId: formattedId,
  });

  return `https://www.linkedin.com/profile/add?${params.toString()}`;
}

/**
 * Build a LinkedIn "Share post" URL.
 */
export function buildLinkedInShareUrl(certId: string): string {
  const formattedId = formatCertificateId(certId);
  const verifyUrl = `${siteConfig.url}/verify/${formattedId}`;
  const params = new URLSearchParams({ url: verifyUrl });
  return `https://www.linkedin.com/sharing/share-offsite/?${params.toString()}`;
}

/**
 * Build the public verification URL for a certificate.
 */
export function buildVerifyUrl(certId: string): string {
  return `${siteConfig.url}/verify/${formatCertificateId(certId)}`;
}
