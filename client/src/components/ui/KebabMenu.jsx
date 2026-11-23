import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical } from 'lucide-react';

/**
 * KebabMenu per UI Section 8.8:
 * Action dropdown for table rows.
 * Sticky header & hover row compatible, keyboard accessible (Esc, tab), visible focus ring.
 */
export function KebabMenu({ items = [], align = 'right' }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const activeItems = items.filter(Boolean);
  if (activeItems.length === 0) return null;

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        aria-label="Row actions"
        aria-haspopup="true"
        aria-expanded={isOpen}
        onClick={e => {
          e.stopPropagation();
          setIsOpen(prev => !prev);
        }}
        className="flex items-center justify-center w-7 h-7 rounded-full text-muted hover:text-text hover:bg-tile transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {isOpen && (
        <div
          role="menu"
          className={`absolute ${
            align === 'right' ? 'right-0' : 'left-0'
          } mt-1 w-48 rounded-[16px] bg-surface border border-border shadow-card p-1 z-30 animate-fade-in text-[12px]`}
        >
          {activeItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label || idx}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={e => {
                  e.stopPropagation();
                  setIsOpen(false);
                  item.onClick?.();
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-colors font-medium cursor-pointer ${
                  item.danger
                    ? 'text-danger hover:bg-danger/10'
                    : 'text-text hover:bg-tile'
                } ${item.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default KebabMenu;
