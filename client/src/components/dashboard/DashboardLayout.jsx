import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Heart,
  MessageSquare,
  Car,
  Tag,
  Building2,
  ShieldCheck,
  User as UserIcon,
  Settings,
  LogOut,
  Search,
  Bell,
  Compass,
  Upload,
  HandCoins,
  Calendar,
  Users,
  Flag,
  FileCode,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ThemeToggle } from '../ui/ThemeToggle';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';

/**
 * Dashboard Shell per UI Section 8.8:
 * Left slim sidebar (icon + label, 12px, active item has the 2px left line from the gallery rail).
 * Top bar with search, theme toggle, notifications, avatar.
 * Content on --bg-subtle, cards on --surface, radius 24px.
 * Bottom tab bar under 768px.
 */
export function DashboardLayout({ children }) {
  const { user, hasCapability, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');

  // Define sidebar navigation items based on user capabilities
  const navItems = [
    {
      label: 'Dashboard',
      icon: LayoutDashboard,
      path: '/dashboard',
    },
    ...(hasCapability('buyer') || hasCapability('renter')
      ? [
          { label: 'Saved Vehicles', icon: Heart, path: '/dashboard/saved' },
          { label: 'My Enquiries', icon: MessageSquare, path: '/dashboard/enquiries' },
          ...(hasCapability('renter')
            ? [{ label: 'My Bookings', icon: Calendar, path: '/dashboard/bookings' }]
            : []),
        ]
      : []),
    ...(hasCapability('seller')
      ? [
          { label: 'My Vehicles', icon: Car, path: '/dashboard/vehicles' },
          { label: 'My Listings', icon: Tag, path: '/dashboard/listings' },
          { label: 'Rental Requests', icon: Calendar, path: '/dashboard/rental-requests' },
        ]
      : []),
    ...(hasCapability('dealer')
      ? [
          { label: 'Dealer Inventory', icon: Building2, path: '/dashboard/inventory' },
          { label: 'Discover Owners', icon: Compass, path: '/dashboard/discover' },
          { label: 'Bulk CSV Upload', icon: Upload, path: '/dashboard/inventory/upload' },
          { label: 'Offers Sent', icon: HandCoins, path: '/dashboard/dealer-offers' },
          { label: 'Rental Requests', icon: Calendar, path: '/dashboard/rental-requests' },
        ]
      : []),
    ...(hasCapability('admin')
      ? [
          { label: 'Admin Overview', icon: ShieldCheck, path: '/dashboard/admin' },
          { label: 'Moderation Queue', icon: Tag, path: '/dashboard/admin/listings' },
          { label: 'User Accounts', icon: Users, path: '/dashboard/admin/users' },
          { label: 'Dealer Verifications', icon: Building2, path: '/dashboard/admin/dealers' },
          { label: 'Policy Reports', icon: Flag, path: '/dashboard/admin/reports' },
          { label: 'Offers Oversight', icon: HandCoins, path: '/dashboard/admin/offers' },
          { label: 'Bookings Oversight', icon: Calendar, path: '/dashboard/admin/bookings' },
          { label: 'Platform Settings', icon: Settings, path: '/dashboard/admin/settings' },
          { label: 'Audit Trail', icon: FileCode, path: '/dashboard/admin/audit-log' },
        ]
      : []),
    {
      label: 'My Profile',
      icon: UserIcon,
      path: '/profile',
    },
    {
      label: 'Settings',
      icon: Settings,
      path: '/settings',
    },
  ];

  return (
    <div className="min-h-screen flex bg-bg text-text transition-colors duration-200">
      {/* 1. Left Slim Sidebar (Desktop: >=768px) */}
      <aside className="hidden md:flex flex-col justify-between w-64 border-r border-border bg-surface shrink-0 sticky top-0 h-screen p-4">
        <div className="flex flex-col gap-6">
          {/* Brand Logo & Wordmark */}
          <Link
            to="/"
            className="flex items-center gap-2.5 px-3 py-2 group select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text"
          >
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground group-hover:scale-105 transition-transform">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
                <circle cx="12" cy="12" r="10" />
                <polygon points="12 8 8 16 16 16" fill="currentColor" />
              </svg>
            </div>
            <div>
              <span className="text-[14px] font-semibold tracking-tight text-text">
                Roam
              </span>
              <span className="text-[10px] text-muted block -mt-1 font-normal">
                Dashboard Shell
              </span>
            </div>
          </Link>

          {/* Navigation Links with the 2px left active line from gallery rail */}
          <nav className="flex flex-col gap-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <Link
                  key={item.label}
                  to={item.path}
                  className={`relative flex items-center gap-3 px-3.5 py-2.5 text-[12px] font-medium rounded-r-full transition-colors select-none ${
                    isActive
                      ? 'text-text bg-bg-subtle font-semibold'
                      : 'text-muted hover:text-text hover:bg-tile'
                  }`}
                >
                  {/* 2px Solid Left Active Line */}
                  {isActive && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-[2.5px] bg-text rounded-r" />
                  )}
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer: User summary & Sign out */}
        <div className="border-t border-border pt-4 flex flex-col gap-3">
          <div className="flex items-center gap-3 px-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-tile text-text text-[11px] font-semibold">
              {user?.fullName?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium text-text truncate">
                {user?.fullName}
              </p>
              <p className="text-[10px] text-muted truncate">{user?.email}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={async () => {
              await logout();
              navigate('/login');
            }}
            className="flex items-center gap-2.5 px-3 py-2 text-[12px] text-muted hover:text-danger hover:bg-[rgba(220,38,38,0.12)] rounded-full transition-colors cursor-pointer w-full"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* 2. Main Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar per UI 8.8: Search input, theme toggle, notifications, avatar */}
        <header className="sticky top-0 z-30 h-16 border-b border-border bg-bg/85 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between gap-4">
          <div className="max-w-xs w-full">
            <Input
              placeholder="Search listings, enquiries..."
              icon={Search}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="h-9 text-[12px]"
            />
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />

            {/* Notification Bell with Accent Dot */}
            <button
              type="button"
              aria-label="Notifications"
              className="relative flex items-center justify-center w-9 h-9 rounded-full border border-border text-muted hover:text-text cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-2 right-2">
                <Badge variant="dot" />
              </span>
            </button>

            {/* Avatar Circle */}
            <Link
              to="/profile"
              className="flex items-center justify-center w-9 h-9 rounded-full bg-primary text-primary-foreground font-semibold text-[12px]"
            >
              {user?.fullName?.charAt(0) || 'U'}
            </Link>
          </div>
        </header>

        {/* Canvas Body: Content on --bg-subtle */}
        <main className="flex-1 p-4 sm:p-8 lg:p-10 bg-bg-subtle pb-24 md:pb-10">
          <div className="max-w-container mx-auto">{children}</div>
        </main>
      </div>

      {/* 3. Mobile Bottom Tab Bar (UI 8.8: Under 768px) */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface border-t border-border flex items-center justify-around px-2 z-40"
      >
        <Link
          to="/dashboard"
          className={`flex flex-col items-center gap-1 text-[10px] ${
            location.pathname === '/dashboard' ? 'text-text font-semibold' : 'text-muted'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span>Home</span>
        </Link>

        {hasCapability('seller') && (
          <Link
            to="/dashboard/listings"
            className="flex flex-col items-center gap-1 text-[10px] text-muted"
          >
            <Car className="w-5 h-5" />
            <span>Listings</span>
          </Link>
        )}

        {hasCapability('admin') && (
          <Link
            to="/dashboard/admin"
            className={`flex flex-col items-center gap-1 text-[10px] ${
              location.pathname.startsWith('/dashboard/admin')
                ? 'text-text font-semibold'
                : 'text-muted'
            }`}
          >
            <ShieldCheck className="w-5 h-5" />
            <span>Admin</span>
          </Link>
        )}

        <Link
          to="/profile"
          className={`flex flex-col items-center gap-1 text-[10px] ${
            location.pathname === '/profile' ? 'text-text font-semibold' : 'text-muted'
          }`}
        >
          <UserIcon className="w-5 h-5" />
          <span>Profile</span>
        </Link>

        <Link
          to="/settings"
          className={`flex flex-col items-center gap-1 text-[10px] ${
            location.pathname === '/settings' ? 'text-text font-semibold' : 'text-muted'
          }`}
        >
          <Settings className="w-5 h-5" />
          <span>Settings</span>
        </Link>
      </nav>
    </div>
  );
}

export default DashboardLayout;
