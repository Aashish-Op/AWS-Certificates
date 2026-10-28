import { siteConfig } from '@/config/site';

/**
 * Brand mark component.
 * Renders the logo files from public/brand/ if available,
 * otherwise falls back to text-only brand name.
 *
 * Per spec: do NOT draw, trace, or download AWS logos.
 * The owner will supply files in public/brand/.
 */
export function BrandMark() {
  return (
    <div className="flex items-center">
      <div className="flex items-center bg-white px-2.5 py-1 rounded-md shadow-xs">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/logo.png"
          alt={siteConfig.name}
          className="h-7 sm:h-8 w-auto object-contain"
        />
      </div>
    </div>
  );
}
