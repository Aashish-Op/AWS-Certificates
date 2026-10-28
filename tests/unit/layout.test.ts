import { describe, it, expect } from 'vitest';
import { computeNameLayout, DEFAULT_CERTIFICATE_LAYOUT, FontKitFont } from '@/lib/certificate/layout';

describe('Layout computation math', () => {
  const aspectRatio = 3508 / 2480; // ~1.414 (A4 Landscape)

  it('preserves nominal font size for short names that comfortably fit', () => {
    const shortName = 'Aarav Shah';
    const result = computeNameLayout(shortName, DEFAULT_CERTIFICATE_LAYOUT, aspectRatio);

    expect(result.fits).toBe(true);
    expect(result.overflow).toBe(false);
    expect(result.fontSizeFraction).toBe(DEFAULT_CERTIFICATE_LAYOUT.name.fontSize);
  });

  it('scales down font size dynamically for very long names', () => {
    const longName = 'Ashish Kumar Satyanarayan Prasad Gupta-Choudhary';
    const result = computeNameLayout(longName, DEFAULT_CERTIFICATE_LAYOUT, aspectRatio);

    expect(result.fontSizeFraction).toBeLessThan(DEFAULT_CERTIFICATE_LAYOUT.name.fontSize);
    expect(result.fontSizeFraction).toBeGreaterThanOrEqual(DEFAULT_CERTIFICATE_LAYOUT.name.minFontSize);
  });

  it('works with simulated exact fontkit metrics', () => {
    const mockFont: FontKitFont = {
      unitsPerEm: 1000,
      layout: (text: string) => ({ advanceWidth: text.length * 600 }),
    };

    const result = computeNameLayout('Ashish Gupta', DEFAULT_CERTIFICATE_LAYOUT, aspectRatio, mockFont);
    expect(result.fits).toBe(true);
    expect(result.actualWidthFraction).toBeGreaterThan(0);
  });
});
