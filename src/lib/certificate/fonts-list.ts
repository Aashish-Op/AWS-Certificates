export interface AvailableFont {
  id: string;
  name: string;
  category: 'sans' | 'serif' | 'mono' | 'display';
  fileName?: string;
  fallbackStandardName: 'HelveticaBold' | 'Helvetica' | 'TimesRomanBold' | 'CourierBold';
}

export const AVAILABLE_FONTS: AvailableFont[] = [
  {
    id: 'Inter-Bold',
    name: 'Inter Bold (Sans)',
    category: 'sans',
    fileName: 'Inter-Bold.ttf',
    fallbackStandardName: 'HelveticaBold',
  },
  {
    id: 'Inter-Regular',
    name: 'Inter Regular (Sans)',
    category: 'sans',
    fileName: 'Inter-Regular.ttf',
    fallbackStandardName: 'Helvetica',
  },
  {
    id: 'Playfair-Bold',
    name: 'Playfair Display Bold (Serif)',
    category: 'serif',
    fileName: 'PlayfairDisplay-Bold.ttf',
    fallbackStandardName: 'TimesRomanBold',
  },
  {
    id: 'Courier-Bold',
    name: 'Courier Bold (Mono)',
    category: 'mono',
    fileName: 'Courier-Bold.ttf',
    fallbackStandardName: 'CourierBold',
  },
];
