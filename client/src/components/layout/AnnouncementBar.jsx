import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';

/**
 * AnnouncementBar per UI Section 7.1:
 * Full width, height 28-32px, background --accent, text white, 11px, centred.
 * Two messages separated by a thin vertical divider.
 * Second message includes an underlined/bold inline link. Optional dismiss.
 * Fetches GET /api/settings/announcement and renders nothing when the message is empty.
 */
export function AnnouncementBar({
  message1: propMessage1,
  message2: propMessage2,
  linkText: propLinkText,
  onLinkClick: propOnLinkClick,
}) {
  const [isDismissed, setIsDismissed] = useState(false);
  const navigate = useNavigate();

  const { data: announcementData } = useQuery({
    queryKey: ['public-announcement'],
    queryFn: async () => {
      const res = await fetch('/api/settings/announcement');
      if (!res.ok) return null;
      const json = await res.json();
      return json.data || null;
    },
    staleTime: 5 * 60 * 1000,
    enabled: propMessage1 === undefined, // skip fetch if explicit message prop passed
  });

  const announcement =
    propMessage1 !== undefined
      ? {
          message1: propMessage1,
          message2: propMessage2 || '',
          linkText: propLinkText || '',
          linkUrl: '',
        }
      : announcementData;

  const msg1 = announcement?.message1?.trim();
  const msg2 = announcement?.message2?.trim();
  const textLink = announcement?.linkText?.trim();
  const linkUrl = announcement?.linkUrl?.trim();

  // If no message is configured or user dismissed, do not render the bar at all
  if (!msg1 || isDismissed) return null;

  const handleLinkClick = () => {
    if (propOnLinkClick) {
      propOnLinkClick();
      return;
    }
    if (!linkUrl) return;
    if (linkUrl.startsWith('http://') || linkUrl.startsWith('https://')) {
      window.open(linkUrl, '_blank', 'noopener,noreferrer');
    } else {
      navigate(linkUrl);
    }
  };

  return (
    <aside
      aria-label="Announcement"
      className="relative z-40 flex items-center justify-center w-full min-h-[30px] px-4 py-1 text-white bg-accent select-none"
    >
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 text-[11px] font-medium tracking-tight text-center">
        <span>{msg1}</span>
        {msg2 && (
          <>
            <span className="hidden sm:inline-block w-[1px] h-3 bg-white/40" />
            <span className="flex items-center gap-1.5">
              <span>{msg2}</span>
              {textLink && (
                <button
                  type="button"
                  onClick={handleLinkClick}
                  className="font-semibold underline underline-offset-2 hover:opacity-90 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white"
                >
                  {textLink}
                </button>
              )}
            </span>
          </>
        )}
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
