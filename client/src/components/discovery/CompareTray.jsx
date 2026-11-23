import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { X, ArrowRight, Scale } from 'lucide-react';
import { useCompare } from '../../context/CompareContext';
import { Button } from '../ui/Button';
import { VehicleImage } from '../vehicle/VehicleImage';

/**
 * UI 8.2 Compare Tray:
 * Bottom docked pill showing up to 3 thumbnails + Compare primary button.
 */
export function CompareTray() {
  const { compareItems, removeFromCompare, clearCompare } = useCompare();
  const navigate = useNavigate();
  const location = useLocation();

  // Hide compare tray when already on the Compare page
  if (location.pathname === '/compare' || compareItems.length === 0) {
    return null;
  }

  const handleCompareClick = () => {
    const ids = compareItems.map(item => item.id).join(',');
    navigate(`/compare?ids=${ids}`);
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-[95vw] sm:max-w-2xl w-full px-4 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="bg-surface/95 dark:bg-[#1C1C1E]/95 backdrop-blur-md border border-border/80 shadow-2xl rounded-full p-2 pl-4 flex items-center justify-between gap-3">
        {/* Left: Indicator & Thumbnails */}
        <div className="flex items-center gap-3 overflow-x-auto py-1 scrollbar-none">
          <div className="hidden sm:flex items-center gap-1.5 text-muted text-[11px] font-medium tracking-tight">
            <Scale className="w-4 h-4 text-accent" />
            <span>Compare ({compareItems.length}/3)</span>
          </div>

          <div className="flex items-center gap-2">
            {compareItems.map(item => (
              <div
                key={item.id}
                className="group/thumb relative flex items-center gap-2 bg-tile/80 rounded-full pl-1.5 pr-2.5 py-1 border border-border/50 shrink-0"
              >
                <div className="w-7 h-7 rounded-full overflow-hidden bg-surface shrink-0 border border-border/40">
                  <VehicleImage
                    src={item.coverImage}
                    alt={item.title}
                    className="w-full h-full object-cover"
                    lazy={false}
                  />
                </div>
                <span className="text-[11px] font-medium text-text max-w-[80px] sm:max-w-[110px] truncate">
                  {item.title}
                </span>
                <button
                  type="button"
                  onClick={() => removeFromCompare(item.id)}
                  className="w-4 h-4 rounded-full flex items-center justify-center text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                  title="Remove from compare"
                  aria-label="Remove"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={clearCompare}
            className="text-[11px] text-muted hover:text-text px-2 py-1 transition-colors"
          >
            Clear
          </button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleCompareClick}
            className="flex items-center gap-1.5 px-4 shadow-md"
          >
            <span>Compare</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default CompareTray;
