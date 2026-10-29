import 'server-only';
import { PDFDocument, rgb } from 'pdf-lib';
import QRCode from 'qrcode';
import { CertificateLayout, DEFAULT_CERTIFICATE_LAYOUT, computeNameLayout } from './layout';
import { loadFontForPdf } from './fonts';
import { formatCertificateId, siteConfig, LIVE_PROD_URL } from '@/config/site';

export interface RenderPdfOptions {
  certificateId: string;
  recipientName: string;
  eventTitle: string;
  issuerName: string;
  templateBuffer: Buffer;
  templateWidth: number;
  templateHeight: number;
  layout?: CertificateLayout | null;
  verifyOrigin?: string;
}

function hexToRgb(hex: string) {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  return rgb(isNaN(r) ? 0 : r, isNaN(g) ? 0 : g, isNaN(b) ? 0 : b);
}

export async function renderCertificatePdf(options: RenderPdfOptions): Promise<Uint8Array> {
  const {
    certificateId,
    recipientName,
    eventTitle,
    issuerName,
    templateBuffer,
    templateWidth,
    templateHeight,
    layout: inputLayout,
    verifyOrigin = siteConfig.url,
  } = options;

  const formattedId = formatCertificateId(certificateId);
  const cleanOrigin =
    verifyOrigin && !verifyOrigin.includes('localhost') && !verifyOrigin.includes('127.0.0.1')
      ? verifyOrigin.replace(/\/+$/, '')
      : (siteConfig.url || LIVE_PROD_URL);

  const layout = inputLayout || DEFAULT_CERTIFICATE_LAYOUT;
  const aspectRatio = templateWidth / templateHeight;

  // Prompt.md §7.3: Page width is 842 pt (A4 landscape width), height follows template aspect ratio
  const pageWidth = 842;
  const pageHeight = Math.round(pageWidth / aspectRatio);

  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(`${eventTitle} - ${recipientName}`);
  pdfDoc.setAuthor(issuerName);
  pdfDoc.setSubject(`${cleanOrigin}/verify/${formattedId}`);
  pdfDoc.setProducer('AWS Student Builder Group, LPU');

  const page = pdfDoc.addPage([pageWidth, pageHeight]);

  // Embed template background image
  let bgImage;
  try {
    bgImage = await pdfDoc.embedJpg(templateBuffer);
  } catch {
    bgImage = await pdfDoc.embedPng(templateBuffer);
  }

  // Draw full-bleed
  page.drawImage(bgImage, {
    x: 0,
    y: 0,
    width: pageWidth,
    height: pageHeight,
  });

  // Load font
  const { font, rawFontkitFont } = await loadFontForPdf(pdfDoc, layout.name.fontFamily);

  // Compute name layout and font size
  const computed = computeNameLayout(recipientName, layout, aspectRatio, rawFontkitFont);
  const namePtSize = computed.fontSizeFraction * pageHeight;
  const nameWidth = font.widthOfTextAtSize(recipientName, namePtSize);

  let nameX = layout.name.x * pageWidth;
  if (layout.name.align === 'center') {
    nameX = layout.name.x * pageWidth - nameWidth / 2;
  } else if (layout.name.align === 'right') {
    nameX = layout.name.x * pageWidth - nameWidth;
  }

  // Convert top-relative Y to bottom-relative PDF coordinate
  const nameY = pageHeight - layout.name.y * pageHeight - namePtSize * 0.35;

  page.drawText(recipientName, {
    x: nameX,
    y: nameY,
    size: namePtSize,
    font,
    color: hexToRgb(layout.name.color),
  });

  // Generate QR Code with formatted verifiable ID (e.g. SAMP-LE12-3456 or XXXX-XXXX-XXXX)
  const verifyUrl = `${cleanOrigin}/verify/${formattedId}`;
  const qrBuffer = await QRCode.toBuffer(verifyUrl, {
    margin: 1,
    width: 256,
    errorCorrectionLevel: 'M',
    type: 'png',
  });
  const qrImage = await pdfDoc.embedPng(qrBuffer);

  const qrSizePt = layout.qr.size * pageWidth;
  const qrX = layout.qr.x * pageWidth - qrSizePt / 2;
  const qrY = pageHeight - layout.qr.y * pageHeight - qrSizePt / 2;

  page.drawImage(qrImage, {
    x: qrX,
    y: qrY,
    width: qrSizePt,
    height: qrSizePt,
  });

  // Certificate ID and verify URL
  const certIdPtSize = layout.certId.fontSize * pageHeight;
  const idText = `Certificate ID: ${formattedId}`;
  const idWidth = font.widthOfTextAtSize(idText, certIdPtSize);

  let idX = layout.certId.x * pageWidth;
  if (layout.certId.align === 'center') {
    idX = layout.certId.x * pageWidth - idWidth / 2;
  } else if (layout.certId.align === 'right') {
    idX = layout.certId.x * pageWidth - idWidth;
  }

  const idY = pageHeight - layout.certId.y * pageHeight - certIdPtSize * 0.35;

  page.drawText(idText, {
    x: idX,
    y: idY,
    size: certIdPtSize,
    font,
    color: hexToRgb(layout.certId.color),
  });

  return await pdfDoc.save();
}
