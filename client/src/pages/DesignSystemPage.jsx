import React, { useState } from 'react';
import {
  Car,
  Search,
  ArrowRight,
  Heart,
  Share2,
  Calendar,
  ShieldCheck,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';
import { Chip } from '../components/ui/Chip';
import { StatusChip } from '../components/ui/StatusChip';
import { Badge } from '../components/ui/Badge';
import { Tabs } from '../components/ui/Tabs';
import { VehicleCardSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { AnnouncementBar } from '../components/layout/AnnouncementBar';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';

export function DesignSystemPage() {
  const { theme, resolvedTheme, setTheme, isDark } = useTheme();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState('specs');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [selectValue, setSelectValue] = useState('');
  const [viewportMode, setViewportMode] = useState('100%');

  const themeTokens = [
    { name: '--bg', light: '#FFFFFF', dark: '#0B0B0C', desc: 'Page background' },
    { name: '--bg-subtle', light: '#F5F5F5', dark: '#121213', desc: 'Hero band, alternating bands' },
    { name: '--surface', light: '#FFFFFF', dark: '#161617', desc: 'Floating cards, surface cards' },
    { name: '--tile', light: '#F3F3F3', dark: '#1C1C1E', desc: 'Vehicle image tiles' },
    { name: '--border', light: '#E8E8E8', dark: '#2A2A2C', desc: 'Dividers, inputs, toggle' },
    { name: '--text', light: '#0A0A0A', dark: '#F5F5F5', desc: 'Primary headings & text' },
    { name: '--text-muted', light: '#8A8A8A', dark: '#9A9A9F', desc: 'Body copy, labels' },
    { name: '--text-faint', light: '#B5B5B5', dark: '#5E5E63', desc: 'Dotted leaders, placeholders' },
    { name: '--primary', light: '#0A0A0A', dark: '#FFFFFF', desc: 'Main pill button fill' },
    { name: '--on-primary', light: '#FFFFFF', dark: '#0A0A0A', desc: 'Text on primary button' },
    { name: '--accent', light: '#FF4B14', dark: '#FF5A26', desc: 'Promo bar, discounts, alert' },
    { name: '--on-accent', light: '#FFFFFF', dark: '#FFFFFF', desc: 'Text on accent' },
    { name: '--star', light: '#FFC20E', dark: '#FFC83A', desc: 'Rating stars' },
    { name: '--dark-band-bg', light: '#000000', dark: '#000000', desc: 'CTA + footer background' },
    { name: '--dark-band-text', light: '#FFFFFF', dark: '#FFFFFF', desc: 'Text on dark bands' },
    { name: '--success', light: '#16A34A', dark: '#34D399', desc: 'Available, accepted' },
    { name: '--warning', light: '#D97706', dark: '#FBBF24', desc: 'Pending, negotiating' },
    { name: '--danger', light: '#DC2626', dark: '#F87171', desc: 'Rejected, errors' },
  ];

  const specRows = [
    { label: 'Make', value: 'Honda' },
    { label: 'Model', value: 'Civic Sport Touring' },
    { label: 'Year', value: '2019' },
    { label: 'Body type', value: 'Sedan' },
    { label: 'Mileage', value: '42,500 km' },
    { label: 'Fuel', value: 'Petrol' },
    { label: 'Transmission', value: 'Automatic (CVT)' },
    { label: 'Condition', value: 'Verified Pre-Owned' },
  ];

  return (
    <div className="min-h-screen bg-bg text-text transition-colors duration-200">
      {/* 1. Global Announcement Bar */}
      <AnnouncementBar
        message1="Sprint 0 Foundation Complete • Design System Showcase"
        message2="Experience full Light & Dark mode tokens."
        linkText="View UI Reference"
        onLinkClick={() => {
          window.scrollTo({ top: document.getElementById('tokens-section')?.offsetTop - 80, behavior: 'smooth' });
        }}
      />

      {/* 2. Global Sticky Header */}
      <Header activeNav="Design System" />

      {/* Responsive Viewport Simulator Bar */}
      <div className="bg-bg-subtle border-b border-border py-2.5 px-4 sticky top-16 z-30">
        <div className="max-w-container mx-auto flex flex-wrap items-center justify-between gap-3 text-[12px]">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-text">Viewport test:</span>
            <div className="flex items-center gap-1.5">
              {[
                { label: 'Full Width (1280px+)', width: '100%' },
                { label: 'Tablet (768px)', width: '768px' },
                { label: 'Mobile (375px)', width: '375px' },
              ].map(vp => (
                <button
                  key={vp.width}
                  type="button"
                  onClick={() => setViewportMode(vp.width)}
                  className={`px-3 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${
                    viewportMode === vp.width
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-surface text-muted border border-border hover:border-text'
                  }`}
                >
                  {vp.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-muted">Theme Preference:</span>
            <div className="inline-flex rounded-full border border-border p-0.5 bg-surface">
              {['light', 'system', 'dark'].map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setTheme(m)}
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium capitalize cursor-pointer transition-colors ${
                    theme === m
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted hover:text-text'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* Main Container (Simulated Width Container for 375 / 768 / Full) */}
      <div
        style={{ maxWidth: viewportMode, margin: '0 auto', transition: 'max-width 0.3s ease' }}
        className="px-4 sm:px-8 lg:px-16 py-12 flex flex-col gap-24"
      >
        {/* Intro Section */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-accent">
              Roam Design System
            </span>
            <Badge variant="discount">Sprint 0 v0.1</Badge>
          </div>
          <h1 className="text-4xl sm:text-6xl font-light tracking-tight text-text leading-[1.05]">
            Quiet luxury & soft geometry
          </h1>
          <p className="text-[14px] text-muted max-w-reading leading-relaxed">
            Every component is built strictly to the specifications in{' '}
            <code className="text-xs bg-tile px-1.5 py-0.5 rounded">ui-design.md</code>. No
            hard-coded colors, zero-flash theme persistence, accessible focus rings (2px{' '}
            <code className="text-xs bg-tile px-1.5 py-0.5 rounded">--text</code> with 2px offset),
            and pure token mapping for both Light and Dark themes.
          </p>
        </section>

        {/* Section 1: Color Tokens */}
        <section id="tokens-section" className="flex flex-col gap-6">
          <div className="border-b border-border pb-3">
            <h2 className="text-[20px] font-light text-text">1. Theme Token Palette (UI 2.2 & 13)</h2>
            <p className="text-[12px] text-muted mt-1">
              Currently active: <strong className="text-text capitalize">{resolvedTheme} mode</strong> (Preference: {theme})
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            {themeTokens.map(token => (
              <div
                key={token.name}
                className="flex flex-col p-3 rounded-[16px] bg-surface border border-border shadow-sm"
              >
                <div
                  className="w-full h-12 rounded-[10px] border border-border mb-2.5 transition-colors"
                  style={{ backgroundColor: `var(${token.name})` }}
                />
                <span className="text-[12px] font-semibold text-text font-mono truncate">
                  {token.name}
                </span>
                <span className="text-[10px] text-muted mt-0.5">
                  {isDark ? token.dark : token.light}
                </span>
                <span className="text-[9px] text-muted/80 mt-1 line-clamp-1">
                  {token.desc}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Section 2: Typography Scale */}
        <section className="flex flex-col gap-6">
          <div className="border-b border-border pb-3">
            <h2 className="text-[20px] font-light text-text">2. Typography Scale (Urbanist, UI Section 4)</h2>
            <p className="text-[12px] text-muted mt-1">
              Single geometric sans-serif family. Thin, light headlines paired with airy, small body text.
            </p>
          </div>

          <div className="flex flex-col gap-6 bg-surface p-6 sm:p-8 rounded-[24px] border border-border">
            <div className="flex flex-col gap-1 border-b border-border pb-4">
              <span className="text-[10px] text-muted font-mono uppercase">CTA Headline (64-72px / 300)</span>
              <p className="text-4xl sm:text-6xl font-light tracking-tight text-text leading-[1.05]">
                List your vehicle. Reach real buyers.
              </p>
            </div>

            <div className="flex flex-col gap-1 border-b border-border pb-4">
              <span className="text-[10px] text-muted font-mono uppercase">Product Title (32-36px / 300)</span>
              <p className="text-3xl font-light tracking-tight text-text">
                2019 Honda Civic Sport Touring
              </p>
            </div>

            <div className="flex flex-col gap-1 border-b border-border pb-4">
              <span className="text-[10px] text-muted font-mono uppercase">Price Row (18px / 500 + Struck Accent)</span>
              <div className="flex items-center gap-2">
                <span className="text-[18px] font-medium text-text">$21,800</span>
                <span className="text-[14px] text-accent line-through opacity-80">$23,500</span>
                <Badge variant="discount">-8% off</Badge>
              </div>
            </div>

            <div className="flex flex-col gap-1 border-b border-border pb-4">
              <span className="text-[10px] text-muted font-mono uppercase">Card Title (14-15px / 500)</span>
              <p className="text-[15px] font-medium text-text">
                Mercedes-Benz C-Class C 300 AMG Line
              </p>
              <p className="text-[11px] text-muted">
                38,000 km · Petrol · Automatic
              </p>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-muted font-mono uppercase">Body Copy (13-14px / 400) & Eyebrow</span>
              <span className="text-[11px] text-muted uppercase tracking-wider">Eyebrow label</span>
              <p className="text-[13px] text-muted leading-relaxed max-w-reading">
                Roam connects pre-owned vehicle buyers, renters, and registered dealers in a quiet luxury marketplace.
                All records, agreed valuations, and booking conflicts are validated rigorously on the server.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: Button Variants */}
        <section className="flex flex-col gap-6">
          <div className="border-b border-border pb-3">
            <h2 className="text-[20px] font-light text-text">3. Button Variants & Sizes (UI 7.15)</h2>
            <p className="text-[12px] text-muted mt-1">
              Pill shaped (999px), 44px large / 36px small. Inverts in dark mode. Focus-visible has 2px ring.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 p-6 bg-surface rounded-[24px] border border-border">
            <Button variant="primary" size="lg">
              Primary Large (44px)
            </Button>
            <Button variant="primary" size="sm">
              Primary Small (36px)
            </Button>
            <Button variant="secondary" size="lg">
              Secondary Outline
            </Button>
            <Button variant="secondary" size="sm">
              Secondary Small
            </Button>
            <Button variant="destructive" size="lg">
              Destructive
            </Button>
            <Button variant="ghost" size="lg" icon={Heart} aria-label="Save vehicle" />
            <Button variant="ghost" size="sm" icon={Share2} aria-label="Share listing" />
            <Button variant="text">
              Text link with underline
            </Button>
            <Button variant="more">
              MORE
            </Button>
            <div className="bg-black p-3 rounded-full flex items-center">
              <Button variant="onDark" size="sm">
                On-Dark White Pill
              </Button>
            </div>
          </div>
        </section>

        {/* Section 4: Form Controls */}
        <section className="flex flex-col gap-6">
          <div className="border-b border-border pb-3">
            <h2 className="text-[20px] font-light text-text">4. Form Controls (UI 7.16)</h2>
            <p className="text-[12px] text-muted mt-1">
              Pill inputs (44px), 16px radius for selects and textareas. Focus: 2px --text with 2px offset.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 sm:p-8 bg-surface rounded-[24px] border border-border">
            <Input
              label="Standard Pill Input"
              placeholder="e.g. Honda Civic or search by make..."
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              helperText="Pill radius with 1px border and 16px padding."
            />

            <Input
              label="Input with Search Icon & Circular Action"
              placeholder="Filter by location or postal code..."
              icon={Search}
              rightElement={
                <Button
                  variant="primary"
                  size="sm"
                  className="w-8 h-8 p-0 rounded-full"
                  aria-label="Submit search"
                  icon={ArrowRight}
                />
              }
            />

            <Input
              label="Validation Error State (Spec 22.1)"
              defaultValue="invalid-budget"
              error="Minimum offer cannot be negative or non-numeric minor units."
            />

            <Select
              label="Select Dropdown (16px radius)"
              value={selectValue}
              onChange={e => setSelectValue(e.target.value)}
              placeholder="Choose vehicle category"
              options={[
                { value: 'sedan', label: 'Sedan' },
                { value: 'suv', label: 'SUV' },
                { value: 'hatchback', label: 'Hatchback' },
                { value: 'electric', label: 'Electric / Hybrid' },
              ]}
              helperText="16px radius matching UI spec section 7.16."
            />

            <div className="md:col-span-2">
              <Textarea
                label="Textarea (16px radius)"
                placeholder="Write seller notes, inspection details, or rental conditions..."
                rows={3}
                helperText="16px radius, focus outline 2px in --text with 2px offset."
              />
            </div>
          </div>
        </section>

        {/* Section 5: Chips, Status Chips & Badges */}
        <section className="flex flex-col gap-6">
          <div className="border-b border-border pb-3">
            <h2 className="text-[20px] font-light text-text">5. Chips, Status Chips & Badges (UI 7.17)</h2>
            <p className="text-[12px] text-muted mt-1">
              Status chips use 12% tinted background + solid text with an icon so color is never the only signal.
            </p>
          </div>

          <div className="flex flex-col gap-6 p-6 sm:p-8 bg-surface rounded-[24px] border border-border">
            <div>
              <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block mb-3">
                All 8 Standard Status Chips (12% Tint + Solid Text + Semantic Icon)
              </span>
              <div className="flex flex-wrap gap-2.5">
                <StatusChip status="Available" />
                <StatusChip status="Pending" />
                <StatusChip status="Negotiating" />
                <StatusChip status="Accepted" />
                <StatusChip status="Rejected" />
                <StatusChip status="Booked" />
                <StatusChip status="Returned" />
                <StatusChip status="Expired" />
              </div>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block mb-3">
                Listing Chips (24px Pill on --tile)
              </span>
              <div className="flex flex-wrap gap-2">
                <Chip>For Sale</Chip>
                <Chip>For Rent</Chip>
                <Chip>Sale & Rent</Chip>
                <Chip icon={ShieldCheck}>Verified Dealer</Chip>
                <Chip icon={Car}>Individual Owner</Chip>
                <Chip active>Active Filter Chip</Chip>
              </div>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block mb-3">
                Discount Badges & Indicators
              </span>
              <div className="flex items-center gap-3">
                <Badge variant="discount">-8% off</Badge>
                <Badge variant="discount">-15% off</Badge>
                <div className="flex items-center gap-1.5 text-[12px] text-text">
                  <Badge variant="dot" />
                  <span>Unread notification indicator</span>
                </div>
                <Badge variant="count">3</Badge>
              </div>
            </div>
          </div>
        </section>

        {/* Section 6: Specification Table (Dotted Leaders) */}
        <section className="flex flex-col gap-6">
          <div className="border-b border-border pb-3">
            <h2 className="text-[20px] font-light text-text">6. Spec Table with Dotted Leaders (UI 7.7)</h2>
            <p className="text-[12px] text-muted mt-1">
              Label left (muted), value right (text), connected by a dotted leader line in --text-faint.
            </p>
          </div>

          <div className="max-w-reading bg-surface p-6 sm:p-8 rounded-[24px] border border-border">
            <h3 className="text-[13px] font-semibold text-text uppercase tracking-wider mb-4">
              Vehicle details
            </h3>
            <div className="flex flex-col gap-2">
              {specRows.map(row => (
                <div
                  key={row.label}
                  className="flex items-baseline justify-between text-[12px] py-1"
                >
                  <span className="text-muted shrink-0 pr-2">{row.label}</span>
                  <span className="flex-1 dotted-leader h-3 mx-1" />
                  <span className="font-medium text-text shrink-0 pl-2">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 7: Tabs Component with Animated Indicator */}
        <section className="flex flex-col gap-6">
          <div className="border-b border-border pb-3">
            <h2 className="text-[20px] font-light text-text">7. Tabs Component (UI 7.6)</h2>
            <p className="text-[12px] text-muted mt-1">
              48px height, 1px baseline border, sliding 2px underline (250ms), supports superscript counts.
            </p>
          </div>

          <div className="bg-surface p-6 sm:p-8 rounded-[24px] border border-border">
            <Tabs
              activeTab={activeTab}
              onChange={setActiveTab}
              tabs={[
                { id: 'specs', label: 'Specifications' },
                { id: 'rental', label: 'Rental terms' },
                { id: 'reviews', label: 'Seller & Reviews', count: '²⁷' },
                { id: 'questions', label: 'Questions', count: '⁴' },
              ]}
            />

            <div className="mt-6 text-[13px] text-muted max-w-reading mx-auto text-center py-4">
              Active tab view: <strong className="text-text capitalize">{activeTab}</strong>
            </div>
          </div>
        </section>

        {/* Section 8: Skeletons & Empty State */}
        <section className="flex flex-col gap-6">
          <div className="border-b border-border pb-3">
            <h2 className="text-[20px] font-light text-text">8. Skeletons & Empty State (UI 7.10 & 8.8)</h2>
            <p className="text-[12px] text-muted mt-1">
              Vehicle cut-out placeholders on --tile background and centered empty state illustrations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            {/* Skeletons Preview */}
            <div className="bg-surface p-6 rounded-[24px] border border-border">
              <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block mb-4">
                Card & Text Loading Skeletons
              </span>
              <VehicleCardSkeleton />
            </div>

            {/* Empty State Preview */}
            <div className="bg-surface p-6 rounded-[24px] border border-border flex items-center justify-center">
              <EmptyState
                title="No active listings yet"
                description="When you list a pre-owned vehicle for sale or rent, your live cards will appear here."
                actionLabel="Create a listing"
                onAction={() => {
                  addToast({
                    type: 'info',
                    title: 'Action Triggered',
                    message: 'Create listing wizard will launch in Sprint 2.',
                  });
                }}
              />
            </div>
          </div>
        </section>

        {/* Section 9: Modal & Toast Notifications */}
        <section className="flex flex-col gap-6">
          <div className="border-b border-border pb-3">
            <h2 className="text-[20px] font-light text-text">9. Interactive Modal & Toast System</h2>
            <p className="text-[12px] text-muted mt-1">
              Accessible dialog with 24px radius and dismissible notifications with semantic styling.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 p-6 bg-surface rounded-[24px] border border-border">
            <Button variant="primary" size="lg" onClick={() => setIsModalOpen(true)}>
              Open Demo Modal
            </Button>

            <Button
              variant="secondary"
              size="lg"
              onClick={() => {
                addToast({
                  type: 'success',
                  title: 'Offer Accepted',
                  message: 'The seller agreed to $21,800. Handover details recorded.',
                });
              }}
            >
              Trigger Success Toast
            </Button>

            <Button
              variant="secondary"
              size="lg"
              onClick={() => {
                addToast({
                  type: 'error',
                  title: 'Date Overlap Conflict',
                  message: 'Selected dates conflict with an existing confirmed rental booking.',
                });
              }}
            >
              Trigger Error Toast
            </Button>

            <Button
              variant="secondary"
              size="lg"
              onClick={() => {
                addToast({
                  type: 'warning',
                  title: 'Pending Moderation',
                  message: 'Your listing is under review by administrator.',
                });
              }}
            >
              Trigger Warning Toast
            </Button>
          </div>
        </section>
      </div>

      {/* Demo Modal Dialog */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Vehicle Inspection Appointment"
        description="Schedule an in-person viewing with the verified seller or registered dealership."
      >
        <div className="flex flex-col gap-4 py-2">
          <Input
            label="Preferred Date"
            placeholder="YYYY-MM-DD"
            icon={Calendar}
            defaultValue="2026-11-25"
          />
          <Textarea
            label="Questions or notes for the seller"
            placeholder="e.g. Would like to inspect tyre wear and service book history..."
            rows={3}
          />
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="secondary" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setIsModalOpen(false);
                addToast({
                  type: 'success',
                  title: 'Request Sent',
                  message: 'Viewing request submitted to seller.',
                });
              }}
            >
              Confirm Appointment
            </Button>
          </div>
        </div>
      </Modal>

      {/* 10. Global Footer with Giant Cropped Wordmark */}
      <Footer />
    </div>
  );
}

export default DesignSystemPage;
