import { Link } from 'react-router-dom';
import { ThemeToggle } from '../ui/ThemeToggle';

export function AuthLayout({ children, title, subtitle }) {
  return (
    <div className="min-h-screen flex w-full bg-bg text-text transition-colors duration-200">
      {/* Left Column: 420px Form Column per UI Section 8.10 */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-12 lg:p-16 max-w-[520px] mx-auto w-full">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-8">
          <Link
            to="/"
            className="flex items-center gap-2.5 select-none group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text"
          >
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground group-hover:scale-105 transition-transform">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
                <circle cx="12" cy="12" r="10" />
                <polygon points="12 8 8 16 16 16" fill="currentColor" />
              </svg>
            </div>
            <span className="text-[14px] font-semibold tracking-tight text-text">
              Roam
            </span>
          </Link>

          <ThemeToggle />
        </div>

        {/* Center Content Form */}
        <div className="flex flex-col gap-6 py-6 w-full max-w-[420px] mx-auto">
          <div>
            <span className="text-[11px] uppercase tracking-wider font-semibold text-muted">
              Roam Authentication
            </span>
            <h1 className="text-3xl font-light tracking-tight text-text mt-1">
              {title}
            </h1>
            {subtitle && (
              <p className="text-[13px] text-muted mt-2 leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>

          {children}
        </div>

        {/* Bottom Micro Footer */}
        <div className="pt-8 text-[11px] text-muted">
          <span>© {new Date().getFullYear()} Roam Marketplace Inc.</span>
        </div>
      </div>

      {/* Right Column: Full-height Grey/Black Panel with Cropped Vehicle Cut-out (UI 8.10) */}
      <div className="hidden lg:flex flex-1 relative bg-black text-white p-16 flex-col justify-between overflow-hidden border-l border-border">
        {/* Subtle Decorative Gradient and Cut-Out Overlay */}
        <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(circle_at_70%_30%,_#333_0%,_transparent_70%)]" />

        <div className="relative z-10 flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-widest text-neutral-400 font-semibold">
            Pre-Owned Vehicle Marketplace
          </span>
          <span className="text-[11px] text-neutral-500">
            Sprint 1 • Identity & Roles
          </span>
        </div>

        {/* Vehicle Graphic & Tagline */}
        <div className="relative z-10 flex flex-col items-center text-center max-w-md mx-auto my-auto">
          {/* Stylized Vehicle Silhouette Cut-out */}
          <div className="w-72 h-44 mb-8 rounded-[24px] bg-[#161617] border border-neutral-800 flex items-center justify-center shadow-2xl relative overflow-hidden group">
            <svg
              viewBox="0 0 120 60"
              className="w-48 h-24 text-neutral-400 group-hover:scale-105 transition-transform duration-500"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M10 40 L25 40 L35 25 L75 25 L90 40 L110 40 L110 48 L10 48 Z" />
              <circle cx="32" cy="48" r="8" fill="#1C1C1E" stroke="currentColor" />
              <circle cx="88" cy="48" r="8" fill="#1C1C1E" stroke="currentColor" />
              <line x1="55" y1="25" x2="55" y2="40" stroke="currentColor" />
            </svg>
            <div className="absolute bottom-2 text-[9px] font-mono text-neutral-500 uppercase tracking-wider">
              Roam Certified Platform
            </div>
          </div>

          <h2 className="text-4xl font-light tracking-tight text-white leading-tight">
            Vehicles that fit your journey.
          </h2>
          <p className="text-[13px] text-neutral-400 mt-3 leading-relaxed">
            A quiet luxury experience connecting private owners, second-hand dealerships, and discerning buyers.
          </p>
        </div>

        <div className="relative z-10 flex items-center justify-between text-[11px] text-neutral-500">
          <span>Buy · Sell · Rent</span>
          <span>Verified & Protected</span>
        </div>
      </div>
    </div>
  );
}

export default AuthLayout;
