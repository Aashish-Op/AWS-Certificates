import { describe, it, expect } from 'vitest';
import { buildLinkedInAddUrl, buildLinkedInShareUrl, buildVerifyUrl } from '@/lib/linkedin';
import { siteConfig } from '@/config/site';

describe('LinkedIn URL builder', () => {
  it('builds Add to Profile URL with correctly encoded query parameters', () => {
    const url = buildLinkedInAddUrl({
      certificateTitle: 'AWS Cloud Discovery Day 2026',
      certId: '23456789ABCD',
      eventDate: new Date('2026-10-12'),
    });

    expect(url).toContain('https://www.linkedin.com/profile/add?');
    expect(url).toContain('startTask=CERTIFICATION_NAME');
    expect(url).toContain('name=AWS+Cloud+Discovery+Day+2026');
    expect(url).toContain('organizationId=69826209');
    expect(url).toContain('organizationName=AWS+Student+Builder+Group+at+LPU');
    expect(url).toContain('issueYear=2026');
    expect(url).toContain('issueMonth=10');
    expect(url).toContain('certId=2345-6789-ABCD');
    expect(url).toContain(encodeURIComponent(`${siteConfig.url}/verify/2345-6789-ABCD`));
  });

  it('builds Share Post URL with verify URL', () => {
    const url = buildLinkedInShareUrl('23456789ABCD');
    expect(url).toContain('https://www.linkedin.com/sharing/share-offsite/?');
    expect(url).toContain(encodeURIComponent(`${siteConfig.url}/verify/2345-6789-ABCD`));
  });

  it('builds verification URL with formatted hyphenated ID', () => {
    expect(buildVerifyUrl('23456789ABCD')).toBe(`${siteConfig.url}/verify/2345-6789-ABCD`);
  });
});
