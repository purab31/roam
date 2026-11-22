import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, Bell, User as UserIcon, LogOut, LayoutDashboard, Settings } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ThemeToggle } from '../ui/ThemeToggle';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

/**
 * Global Header per UI Section 7.2 & Sprint 1:
 * Sticky, gains backdrop-filter: blur(12px) and 1px bottom border after 8px scroll.
 * Right cluster when logged in: Theme toggle -> Language switch -> Notification bell with accent dot -> Avatar menu.
 */
export function Header({ activeNav }) {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [language, setLanguage] = useState('EN');
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const avatarRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 8);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close avatar dropdown on outside click
  useEffect(() => {
    const handleClickOutside = e => {
      if (avatarRef.current && !avatarRef.current.contains(e.target)) {
        setAvatarMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navLinks = [
    { label: 'Buy', href: '#buy' },
    { label: 'Rent', href: '#rent' },
    { label: 'Sell', href: '#sell' },
    { label: 'Dealers', href: '#dealers' },
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
          <Link
            to="/"
            className="flex items-center gap-2.5 select-none group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text"
          >
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
          </Link>

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

            {isAuthenticated ? (
              /* Logged In Cluster (UI 7.2): Bell with Accent Dot + Avatar Circle */
              <div className="flex items-center gap-2.5">
                {/* Notification Bell */}
                <button
                  type="button"
                  aria-label="Notifications"
                  onClick={() => navigate('/dashboard')}
                  className="relative flex items-center justify-center w-9 h-9 rounded-full border border-border text-muted hover:text-text hover:border-text transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text"
                >
                  <Bell className="w-4 h-4" />
                  <span className="absolute top-2 right-2">
                    <Badge variant="dot" />
                  </span>
                </button>

                {/* Avatar Menu Container */}
                <div ref={avatarRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setAvatarMenuOpen(prev => !prev)}
                    aria-label="User account menu"
                    aria-expanded={avatarMenuOpen}
                    className="flex items-center justify-center w-9 h-9 rounded-full bg-primary text-primary-foreground font-semibold text-[12px] cursor-pointer hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text"
                  >
                    {user?.fullName?.charAt(0).toUpperCase() || 'U'}
                  </button>

                  {/* Dropdown Menu */}
                  {avatarMenuOpen && (
                    <div className="absolute right-0 mt-2 w-60 p-2 rounded-[20px] bg-surface text-text border border-border shadow-card z-50 animate-fade-in">
                      <div className="px-3 py-2.5 border-b border-border mb-1">
                        <p className="text-[13px] font-semibold text-text truncate">
                          {user?.fullName}
                        </p>
                        <p className="text-[11px] text-muted truncate">
                          {user?.email}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {user?.capabilities?.map(c => (
                            <span
                              key={c}
                              className="text-[9px] px-2 py-0.5 rounded-full bg-tile text-text capitalize font-medium"
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-col gap-0.5">
                        <Link
                          to="/dashboard"
                          onClick={() => setAvatarMenuOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-full text-[12px] text-muted hover:text-text hover:bg-tile transition-colors"
                        >
                          <LayoutDashboard className="w-4 h-4" />
                          <span>Dashboard</span>
                        </Link>

                        <Link
                          to="/profile"
                          onClick={() => setAvatarMenuOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-full text-[12px] text-muted hover:text-text hover:bg-tile transition-colors"
                        >
                          <UserIcon className="w-4 h-4" />
                          <span>My Profile</span>
                        </Link>

                        <Link
                          to="/settings"
                          onClick={() => setAvatarMenuOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-full text-[12px] text-muted hover:text-text hover:bg-tile transition-colors"
                        >
                          <Settings className="w-4 h-4" />
                          <span>Account Settings</span>
                        </Link>

                        <button
                          type="button"
                          onClick={async () => {
                            setAvatarMenuOpen(false);
                            await logout();
                            navigate('/login');
                          }}
                          className="flex items-center gap-2.5 w-full text-left px-3 py-2 rounded-full text-[12px] text-danger hover:bg-[rgba(220,38,38,0.12)] transition-colors cursor-pointer"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Sign out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Logged Out Cluster: Get in touch + Sign in */
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="hidden sm:inline-flex h-9 px-4 text-[12px]"
                >
                  Get in touch
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/login')}
                  className="h-9 px-4 text-[12px]"
                >
                  Sign in
                </Button>
              </div>
            )}

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

      {/* Mobile Drawer (UI 7.2) */}
      {mobileMenuOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex md:hidden"
        >
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />

          <div className="relative z-10 flex flex-col justify-between w-4/5 max-w-sm h-full p-6 bg-surface text-text border-r border-border shadow-2xl">
            <div>
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

              <nav className="flex flex-col gap-4 py-8">
                {navLinks.map(link => (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-[15px] font-medium py-1 text-muted hover:text-text transition-colors"
                  >
                    {link.label}
                  </a>
                ))}
                {isAuthenticated && (
                  <>
                    <Link
                      to="/dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-[15px] font-medium py-1 text-text"
                    >
                      Dashboard
                    </Link>
                    <Link
                      to="/profile"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-[15px] font-medium py-1 text-muted"
                    >
                      Profile
                    </Link>
                    <Link
                      to="/settings"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-[15px] font-medium py-1 text-muted"
                    >
                      Settings
                    </Link>
                  </>
                )}
              </nav>
            </div>

            <div className="flex flex-col gap-4 pt-6 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-muted">Theme</span>
                <ThemeToggle showLabel />
              </div>
              {isAuthenticated ? (
                <Button
                  variant="destructive"
                  size="lg"
                  className="w-full"
                  onClick={async () => {
                    setMobileMenuOpen(false);
                    await logout();
                    navigate('/login');
                  }}
                >
                  Sign out
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate('/login');
                  }}
                >
                  Sign in
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Header;
