import { z } from 'zod';

export const certificateLayoutSchema = z.object({
  version: z.literal(1).default(1),
  name: z.object({
    x: z.number().min(0).max(1), // fraction of width (anchor point or center)
    y: z.number().min(0).max(1), // fraction of height
    maxWidth: z.number().min(0.1).max(1), // fraction of width allowed for name
    align: z.enum(['left', 'center', 'right']).default('center'),
    fontFamily: z.string().default('Inter-Bold'),
    fontSize: z.number().min(0.01).max(0.2).default(0.045), // fraction of template height
    minFontSize: z.number().min(0.01).max(0.1).default(0.025), // fraction of template height
    color: z.string().default('#0F1B2A'), // hex color
  }),
  qr: z.object({
    x: z.number().min(0).max(1), // fraction of width
    y: z.number().min(0).max(1), // fraction of height
    size: z.number().min(0.03).max(0.4).default(0.12), // fraction of template width
  }),
  certId: z.object({
    x: z.number().min(0).max(1), // fraction of width
    y: z.number().min(0).max(1), // fraction of height
    fontSize: z.number().min(0.005).max(0.05).default(0.015), // fraction of template height
    color: z.string().default('#5F6B7A'),
    align: z.enum(['left', 'center', 'right']).default('center'),
  }),
});

export type CertificateLayout = z.infer<typeof certificateLayoutSchema>;

export const DEFAULT_CERTIFICATE_LAYOUT: CertificateLayout = {
  version: 1,
  name: {
    x: 0.74,
    y: 0.59,
    maxWidth: 0.45,
    align: 'center',
    fontFamily: 'Inter-Bold',
    fontSize: 0.045,
    minFontSize: 0.024,
    color: '#5200D5',
  },
  qr: {
    x: 0.10,
    y: 0.85,
    size: 0.09,
  },
  certId: {
    x: 0.74,
    y: 0.94,
    fontSize: 0.012,
    color: '#5F6B7A',
    align: 'center',
  },
};

/**
 * Interface representing a fontkit font object with layout() method.
 */
export interface FontKitFont {
  unitsPerEm: number;
  layout(text: string): { advanceWidth: number };
  hasGlyphForCodePoint?(codePoint: number): boolean;
}

export interface ComputedNameLayout {
  fontSizeFraction: number;
  fits: boolean;
  actualWidthFraction: number;
  overflow: boolean;
}

/**
 * Computes font size that fits the recipient name within layout.name.maxWidth.
 * Resolution-independent: all sizes/coordinates are fractions.
 */
export function computeNameLayout(
  name: string,
  layout: CertificateLayout,
  aspectRatio: number, // templateWidth / templateHeight
  font?: FontKitFont
): ComputedNameLayout {
  const { fontSize, minFontSize, maxWidth } = layout.name;

  if (!font) {
    // Heuristic approximation when fontkit font is not loaded (client-side preview)
    // Average character width is ~0.55 of font height for bold sans-serif
    const approxCharWidthRatio = 0.55;
    const nameLen = Math.max(name.length, 1);
    const nominalWidthFraction = (nameLen * approxCharWidthRatio * fontSize) / aspectRatio;

    if (nominalWidthFraction <= maxWidth) {
      return {
        fontSizeFraction: fontSize,
        fits: true,
        actualWidthFraction: nominalWidthFraction,
        overflow: false,
      };
    }

    const scaledFontSize = Math.max(
      minFontSize,
      (maxWidth * aspectRatio) / (nameLen * approxCharWidthRatio)
    );
    const finalWidthFraction = (nameLen * approxCharWidthRatio * scaledFontSize) / aspectRatio;

    return {
      fontSizeFraction: scaledFontSize,
      fits: finalWidthFraction <= maxWidth,
      actualWidthFraction: finalWidthFraction,
      overflow: finalWidthFraction > maxWidth,
    };
  }

  // Exact fontkit measurement
  const glyphRun = font.layout(name);
  const totalAdvance = glyphRun.advanceWidth;
  const unitsPerEm = font.unitsPerEm || 1000;

  // Width in pt when fontSize is 1.0 (relative to height) = (totalAdvance / unitsPerEm) * height
  // Relative to width = ((totalAdvance / unitsPerEm) * height) / width = (totalAdvance / unitsPerEm) / aspectRatio
  const advancePerHeightUnit = totalAdvance / unitsPerEm;
  const initialWidthFraction = (advancePerHeightUnit * fontSize) / aspectRatio;

  if (initialWidthFraction <= maxWidth) {
    return {
      fontSizeFraction: fontSize,
      fits: true,
      actualWidthFraction: initialWidthFraction,
      overflow: false,
    };
  }

  // Shrink font size to fit maxWidth
  const requiredFontSize = (maxWidth * aspectRatio) / advancePerHeightUnit;
  const finalFontSize = Math.max(minFontSize, requiredFontSize);
  const finalWidthFraction = (advancePerHeightUnit * finalFontSize) / aspectRatio;

  return {
    fontSizeFraction: finalFontSize,
    fits: finalWidthFraction <= maxWidth + 0.001,
    actualWidthFraction: finalWidthFraction,
    overflow: finalWidthFraction > maxWidth + 0.001,
  };
}
