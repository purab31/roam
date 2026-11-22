import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { ThemeToggle } from '../ui/ThemeToggle';
import { Button } from '../ui/Button';

/**
 * Global Header per UI Section 7.2:
 * Height 64px, background --bg.
 * Sticky, gains backdrop-filter: blur(12px) and 1px bottom border after 8px scroll.
 * Left: logo mark (circular black mark with cut-out glyph) + brand wordmark "Roam" (14px/600).
 * Centre: Buy · Rent · Sell · Dealers · Contact (12px/400).
 * Right cluster: Theme toggle -> Language switch (EN / AR) -> "Get in touch" outlined pill.
 * Mobile: logo left, theme toggle + hamburger right; full-height drawer.
 */
export function Header({ activeNav = 'Design System', onNavClick }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [language, setLanguage] = useState('EN');

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 8);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Buy', href: '#buy' },
    { label: 'Rent', href: '#rent' },
    { label: 'Sell', href: '#sell' },
    { label: 'Dealers', href: '#dealers' },
    { label: 'Contact', href: '#contact' },
    { label: 'Design System', href: '/design-system' },
  ];

  return (
    <>
      <header
        className={`sticky top-0 z-40 w-full h-16 transition-all duration-200 ${
          isScrolled
            ? 'bg-bg/85 backdrop-blur-md border-b border-border'
            : 'bg-bg'
        }`}
      >
        <div className="flex items-center justify-between h-full max-w-container mx-auto px-4 sm:px-8 lg:px-16">
          {/* Left: Circular Mark + Wordmark */}
          <a
            href="/"
            className="flex items-center gap-2.5 select-none group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text"
          >
            {/* Circular Black Mark with Cut-out Glyph */}
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground group-hover:scale-105 transition-transform">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-3.5 h-3.5"
              >
                <circle cx="12" cy="12" r="10" />
                <polygon points="12 8 8 16 16 16" fill="currentColor" />
              </svg>
            </div>
            <span className="text-[14px] font-semibold tracking-tight text-text">
              Roam
            </span>
          </a>

          {/* Centre: Nav Links (Desktop) */}
          <nav
            aria-label="Main Navigation"
            className="hidden md:flex items-center gap-8"
          >
            {navLinks.map(link => {
              const isActive = activeNav === link.label;
              return (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={e => {
                    if (onNavClick) {
                      e.preventDefault();
                      onNavClick(link.label);
                    }
                  }}
                  className={`text-[12px] font-normal transition-colors select-none relative py-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-text ${
                    isActive
                      ? 'text-text font-medium'
                      : 'text-muted hover:text-text'
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-text" />
                  )}
                </a>
              );
            })}
          </nav>

          {/* Right Cluster */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Language Switch */}
            <button
              type="button"
              onClick={() => setLanguage(prev => (prev === 'EN' ? 'AR' : 'EN'))}
              aria-label="Toggle language"
              className="hidden sm:inline-flex text-[11px] font-medium text-muted hover:text-text px-2 py-1 rounded-full cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-text"
            >
              {language} / {language === 'EN' ? 'AR' : 'EN'}
            </button>

            {/* "Get in touch" Outlined Pill Button (36px high, 16px padding) */}
            <div className="hidden sm:block">
              <Button variant="secondary" size="sm" className="h-9 px-4 text-[12px]">
                Get in touch
              </Button>
            </div>

            {/* Mobile Hamburger Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(prev => !prev)}
              aria-label="Toggle mobile menu"
              aria-expanded={mobileMenuOpen}
              className="flex md:hidden items-center justify-center w-9 h-9 rounded-full border border-border text-text hover:border-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer (UI 7.2: Full-height drawer with nav links and theme toggle) */}
      {mobileMenuOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex md:hidden"
        >
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer Canvas */}
          <div className="relative z-10 flex flex-col justify-between w-4/5 max-w-sm h-full p-6 bg-surface text-text border-r border-border shadow-2xl">
            <div>
              {/* Drawer Top */}
              <div className="flex items-center justify-between pb-6 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
                      <polygon points="12 8 8 16 16 16" fill="currentColor" />
                    </svg>
                  </div>
                  <span className="text-[14px] font-semibold">Roam</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-full text-muted hover:text-text border border-border"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Drawer Navigation Links */}
              <nav className="flex flex-col gap-4 py-8">
                {navLinks.map(link => (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={e => {
                      setMobileMenuOpen(false);
                      if (onNavClick) {
                        e.preventDefault();
                        onNavClick(link.label);
                      }
                    }}
                    className={`text-[15px] font-medium py-1 transition-colors ${
                      activeNav === link.label ? 'text-text' : 'text-muted hover:text-text'
                    }`}
                  >
                    {link.label}
                  </a>
                ))}
              </nav>
            </div>

            {/* Drawer Bottom Actions: Theme Toggle + Contact */}
            <div className="flex flex-col gap-4 pt-6 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-muted">Theme</span>
                <ThemeToggle showLabel />
              </div>
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={() => setMobileMenuOpen(false)}
              >
                Get in touch
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Header;
