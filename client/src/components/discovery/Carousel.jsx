import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * UI 7.9 Section Header with Count & UI 7.11 Carousel Controls:
 * - Left: Eyebrow label, 56px/300 headline, muted description.
 * - Right: Big number count + "Items" beneath + circular arrow-up-right link button.
 * - Scroll container with snap alignment and peek effect on right edge.
 * - Below: Two circular ghost buttons (32px) centered with 16px gap, disabled at scroll bounds.
 */
export function Carousel({
  eyebrow = '',
  title = '',
  description = '',
  totalCount = null,
  viewAllLink = null,
  children,
  className = '',
}) {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScrollBounds = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
  };

  useEffect(() => {
    checkScrollBounds();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkScrollBounds, { passive: true });
      window.addEventListener('resize', checkScrollBounds);
    }
    return () => {
      if (el) el.removeEventListener('scroll', checkScrollBounds);
      window.removeEventListener('resize', checkScrollBounds);
    };
  }, [children]);

  const handleScroll = direction => {
    if (!scrollRef.current) return;
    const scrollAmount = 300 * 2; // scroll two cards
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  return (
    <section className={`w-full flex flex-col gap-8 select-none ${className}`}>
      {/* 7.9 Section Header with Count */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-2 border-b border-border/40">
        <div className="flex flex-col gap-1.5 max-w-[640px]">
          {eyebrow && (
            <span className="text-[11px] font-medium uppercase tracking-[0.05em] text-muted">
              {eyebrow}
            </span>
          )}
          <h2 className="text-[36px] sm:text-[48px] lg:text-[56px] font-light leading-[1.05] tracking-[-0.03em] text-text">
            {title}
          </h2>
          {description && (
            <p className="text-[12px] sm:text-[13px] text-muted line-clamp-2 max-w-[540px]">
              {description}
            </p>
          )}
        </div>

        {/* Right count + view all button */}
        {(totalCount !== null || viewAllLink) && (
          <div className="flex items-center gap-4 self-end sm:self-auto shrink-0">
            {totalCount !== null && (
              <div className="flex flex-col items-end">
                <span className="text-[28px] font-normal leading-none tracking-tight text-text">
                  {totalCount}
                </span>
                <span className="text-[10px] text-muted uppercase tracking-wider mt-0.5">
                  Items
                </span>
              </div>
            )}
            {viewAllLink && (
              <Link
                to={viewAllLink}
                aria-label={`View all ${title}`}
                className="flex items-center justify-center w-8 h-8 rounded-full border border-border text-muted hover:text-text hover:border-text transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-text"
              >
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Horizontal Carousel Track with Peek */}
      <div
        ref={scrollRef}
        tabIndex={0}
        aria-label={`${title} carousel`}
        className="flex gap-6 overflow-x-auto scroll-smooth snap-x snap-mandatory py-2 px-1 focus:outline-none scrollbar-none"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        onKeyDown={e => {
          if (e.key === 'ArrowLeft') handleScroll('left');
          if (e.key === 'ArrowRight') handleScroll('right');
        }}
      >
        {children}
      </div>

      {/* 7.11 Carousel Controls (Centered Two Ghost Buttons) */}
      <div className="flex items-center justify-center gap-4 pt-2">
        <button
          type="button"
          onClick={() => handleScroll('left')}
          disabled={!canScrollLeft}
          aria-label="Previous slide"
          className={`flex items-center justify-center w-8 h-8 rounded-full border border-border text-text transition-opacity cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-text ${
            canScrollLeft ? 'hover:border-text' : 'opacity-30 cursor-not-allowed'
          }`}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => handleScroll('right')}
          disabled={!canScrollRight}
          aria-label="Next slide"
          className={`flex items-center justify-center w-8 h-8 rounded-full border border-border text-text transition-opacity cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-text ${
            canScrollRight ? 'hover:border-text' : 'opacity-30 cursor-not-allowed'
          }`}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </section>
  );
}

export default Carousel;