import { Link } from "react-router-dom";

/** Small hub/network glyph — three nodes orbiting a center, standing in for
 *  "one hub, many connected tenants/APIs". Used only in the brand mark. */
function HubMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="2.5" fill="currentColor" />
      <circle cx="12" cy="4" r="2" fill="currentColor" opacity="0.85" />
      <circle cx="19.5" cy="16" r="2" fill="currentColor" opacity="0.85" />
      <circle cx="4.5" cy="16" r="2" fill="currentColor" opacity="0.85" />
      <path d="M12 6.5V10M17.8 15L14 12.7M6.2 15L10 12.7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function AppShell() {
  return (
    <header className="sticky top-0 z-50 h-12 bg-vistex-navy text-white shadow-sm">
      <div className="h-full mx-auto max-w-[1800px] px-6 md:px-10 lg:px-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-white hover:text-blue-200 transition-colors">
          <HubMark />
          <span className="font-display font-semibold tracking-tight text-[15px]">Vistex API Hub</span>
        </Link>
        <span className="hidden sm:inline font-mono text-[11px] text-blue-200/70 tracking-wide">
          INDUSTRY TEMPLATE EXPLORER
        </span>
      </div>
    </header>
  );
}