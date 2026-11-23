import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { FilterPanel } from './FilterPanel';
import { Button } from '../ui/Button';

/**
 * UI 8.2 Mobile Filter Bottom Sheet:
 * - Slide-up drawer on mobile devices with rounded top corners.
 * - Backdrop overlay and locked background scroll.
 * - Docked bottom "View X results" action.
 */
export function FilterBottomSheet({
  isOpen,
  onClose,
  filters,
  facetCounts,
  onFilterChange,
  onClearAll,
  totalResults = 0,
}) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end lg:hidden animate-fade-in">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet Container */}
      <div className="relative z-10 w-full max-h-[85vh] bg-surface text-text rounded-t-[28px] border-t border-border shadow-2xl flex flex-col overflow-hidden animate-slide-up">
        {/* Top Grab Bar + Header */}
        <div className="flex items-center justify-between px-6 pt-4 pb-3 border-b border-border/60">
          <div className="flex flex-col">
            <div className="w-10 h-1 bg-border rounded-full mx-auto mb-3" />
            <span className="text-[16px] font-semibold tracking-tight text-text">
              Filters & Categories
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close filters"
            className="p-2 rounded-full text-muted hover:text-text hover:bg-tile transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Filter Body */}
        <div className="overflow-y-auto px-6 py-4">
          <FilterPanel
            filters={filters}
            facetCounts={facetCounts}
            onFilterChange={onFilterChange}
            onClearAll={onClearAll}
            className="max-w-none border-none p-0 shadow-none bg-transparent"
          />
        </div>

        {/* Docked Bottom Bar */}
        <div className="p-4 bg-surface border-t border-border/80 flex items-center gap-3">
          <Button
            variant="primary"
            size="lg"
            onClick={onClose}
            className="w-full h-12 text-[14px]"
          >
            Show {totalResults} {totalResults === 1 ? 'Vehicle' : 'Vehicles'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default FilterBottomSheet;