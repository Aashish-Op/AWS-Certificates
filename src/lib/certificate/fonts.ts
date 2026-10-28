import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import { PDFDocument, StandardFonts, PDFFont } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { AVAILABLE_FONTS } from './fonts-list';

export { AVAILABLE_FONTS, type AvailableFont } from './fonts-list';

const STANDARD_MAP: Record<string, StandardFonts> = {
  HelveticaBold: StandardFonts.HelveticaBold,
  Helvetica: StandardFonts.Helvetica,
  TimesRomanBold: StandardFonts.TimesRomanBold,
  CourierBold: StandardFonts.CourierBold,
};

const FONTS_DIR = path.join(process.cwd(), 'assets', 'fonts');

export async function loadFontForPdf(
  doc: PDFDocument,
  fontFamilyId: string
): Promise<{ font: PDFFont; rawFontkitFont?: any }> {
  doc.registerFontkit(fontkit);

  const matched = AVAILABLE_FONTS.find((f) => f.id === fontFamilyId) || AVAILABLE_FONTS[0]!;

  if (matched.fileName) {
    const fontPath = path.join(FONTS_DIR, matched.fileName);
    if (fs.existsSync(fontPath)) {
      try {
        const fontBytes = fs.readFileSync(fontPath);
        const embeddedFont = await doc.embedFont(fontBytes);
        const rawFont = (fontkit as any).create(fontBytes);
        return { font: embeddedFont, rawFontkitFont: rawFont };
      } catch (err) {
        console.warn(`Could not embed custom font ${matched.fileName}, using fallback`, err);
      }
    }
  }

  const fallbackStandard = STANDARD_MAP[matched.fallbackStandardName] || StandardFonts.HelveticaBold;
  const fallback = await doc.embedFont(fallbackStandard);
  return { font: fallback };
}
