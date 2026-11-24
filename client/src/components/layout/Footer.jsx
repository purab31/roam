import React, { useState } from 'react';
import { Button } from '../ui/Button';

/**
 * Footer component per UI Section 7.14:
 * Black dark band (--dark-band-bg), text --dark-band-text.
 * Row 1: Logo left. Right: "Request a call back" white pill button (black text).
 * Row 2: Four link columns (Company, Marketplace, Services, Support) + Location tabs (Los Angeles · Dubai), address, hours, phone in 10px muted.
 * Row 3: Giant brand wordmark "Roam", white, 500 weight, spans full container width, cropped at bottom edge (~15% hidden).
 * Bottom bar: copyright left, "Built by ..." credit right, 10px muted.
 */
export function Footer() {
  const [activeLocation, setActiveLocation] = useState('Los Angeles');

  const locations = {
    'Los Angeles': {
      address: '742 Evergreen Terrace, Suite 400',
      hours: 'Mon - Fri: 9:00 AM - 7:00 PM PST',
      phone: '+1 (213) 555-0199',
    },
    'Dubai': {
      address: 'Burj Khalifa District, Boulevard 12',
      hours: 'Sun - Thu: 10:00 AM - 8:00 PM GST',
      phone: '+971 4 555 0188',
    },
  };

  const columns = [
    {
      title: 'Company',
      links: ['About Roam', 'Careers', 'Press & Media', 'Quiet Luxury Philosophy'],
    },
    {
      title: 'Marketplace',
      links: ['Buy Pre-Owned', 'Rent Vehicles', 'Sell Your Vehicle', 'Verified Dealers'],
    },
    {
      title: 'Services',
      links: ['Vehicle History', 'Inspection Guarantee', 'Escrow Status', 'Fleet Acquisition'],
    },
    {
      title: 'Support',
      links: ['Help Center', 'Safety & Security', 'Community Guidelines', 'Privacy Policy'],
    },
  ];

  return (
    <footer className="w-full bg-black text-white border-t border-[var(--border)] overflow-hidden">
      <div className="max-w-container mx-auto px-4 sm:px-8 lg:px-16 pt-16 sm:pt-20 pb-8">
        {/* Row 1: Logo Left + "Request a call back" White Pill Button Right */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-12 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white text-black">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                <polygon points="12 8 8 16 16 16" fill="currentColor" />
              </svg>
            </div>
            <div>
              <span className="text-[16px] font-semibold tracking-tight text-white">
                Roam
              </span>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Your journey starts here
              </p>
            </div>
          </div>

          <Button variant="onDark" size="lg" className="self-start sm:self-auto">
            Request a call back
          </Button>
        </div>

        {/* Row 2: Link Columns + Location Details */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 py-12 border-b border-neutral-800">
          {/* 4 Link Columns */}
          {columns.map(col => (
            <div key={col.title} className="flex flex-col gap-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                {col.title}
              </span>
              <ul className="flex flex-col gap-2.5">
                {col.links.map(link => (
                  <li key={link}>
                    <a
                      href={`#${link.toLowerCase().replace(/\s+/g, '-')}`}
                      className="text-[11px] text-white hover:text-neutral-300 transition-colors"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Location & Contact Information Column */}
          <div className="col-span-2 flex flex-col gap-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
              Locations
            </span>

            {/* Location Tabs */}
            <div className="flex items-center gap-3 text-[11px]">
              {Object.keys(locations).map(loc => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setActiveLocation(loc)}
                  className={`transition-colors cursor-pointer ${
                    activeLocation === loc
                      ? 'text-white font-semibold underline underline-offset-4'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {loc}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-1.5 mt-2 text-[10px] text-neutral-400 leading-relaxed">
              <p>{locations[activeLocation].address}</p>
              <p>{locations[activeLocation].hours}</p>
              <p className="text-white font-medium">{locations[activeLocation].phone}</p>
            </div>
          </div>
        </div>

        {/* Row 3: Giant Cropped "Roam" Wordmark Filling Container Width */}
        <div className="relative w-full overflow-hidden select-none pointer-events-none mt-6 sm:mt-10">
          <div className="w-full text-center">
            <span className="inline-block text-[24vw] leading-[0.76] font-medium tracking-tight text-white translate-y-[15%]">
              Roam
            </span>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Attribution */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-neutral-800 text-[10px] text-neutral-400">
          <p>© {new Date().getFullYear()} Roam Marketplace Inc. All rights reserved.</p>
          <p>Your Journey starts here</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
