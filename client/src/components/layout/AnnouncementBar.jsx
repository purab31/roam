import React, { useState } from 'react';
import { X } from 'lucide-react';

/**
 * AnnouncementBar per UI Section 7.1:
 * Full width, height 28-32px, background --accent, text white, 11px, centred.
 * Two messages separated by a thin vertical divider.
 * Second message includes an underlined/bold inline link. Optional dismiss.
 */
export function AnnouncementBar({
  message1 = 'Free vehicle history report on every listing',
  message2 = 'List your car free this month.',
  linkText = 'Become a seller',
  onLinkClick,
}) {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  return (
    <aside
      aria-label="Announcement"
      className="relative z-40 flex items-center justify-center w-full min-h-[30px] px-4 py-1 text-white bg-accent select-none"
    >
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 text-[11px] font-medium tracking-tight text-center">
        <span>{message1}</span>
        <span className="hidden sm:inline-block w-[1px] h-3 bg-white/40" />
        <span className="flex items-center gap-1.5">
          <span>{message2}</span>
          {linkText && (
            <button
              type="button"
              onClick={onLinkClick}
              className="font-semibold underline underline-offset-2 hover:opacity-90 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white"
            >
              {linkText}
            </button>
          )}
        </span>
      </div>

      <button
        type="button"
        onClick={() => setIsDismissed(true)}
        aria-label="Dismiss announcement"
        className="absolute right-3 p-1 rounded-full text-white/80 hover:text-white transition-opacity cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </aside>
  );
}

export default AnnouncementBar;
