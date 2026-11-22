import React, { useRef, useState, useEffect } from 'react';

/**
 * Tabs component per UI Section 7.6:
 * Centered or full-width, equal-width tabs, 48px high.
 * Inactive: --text-faint, active: --text with a 2px solid bottom border the width of the tab.
 * Baseline 1px --border. Counts shown as superscript (e.g. Reviews ²⁷).
 */
export function Tabs({
  tabs = [],
  activeTab,
  onChange,
  className = '',
}) {
  const containerRef = useRef(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  const activeIndex = tabs.findIndex(t => (t.id || t.value || t.label) === activeTab);

  useEffect(() => {
    if (!containerRef.current) return;
    const buttons = containerRef.current.querySelectorAll('button[role="tab"]');
    const target = buttons[activeIndex >= 0 ? activeIndex : 0];
    if (target) {
      setIndicatorStyle({
        left: target.offsetLeft,
        width: target.offsetWidth,
      });
    }
  }, [activeTab, activeIndex, tabs]);

  return (
    <div className={`relative border-b border-border w-full ${className}`}>
      <div
        ref={containerRef}
        role="tablist"
        className="relative flex items-center justify-center gap-4 sm:gap-8 h-12 max-w-reading mx-auto"
      >
        {tabs.map((tab, idx) => {
          const tabId = tab.id || tab.value || tab.label;
          const isActive = activeIndex === idx;

          return (
            <button
              key={tabId}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange?.(tabId)}
              className={`relative flex items-center gap-1.5 h-full px-2 text-[13px] font-medium transition-colors duration-150 select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text focus-visible:ring-offset-2 ${
                isActive ? 'text-text' : 'text-faint hover:text-muted'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className="text-[10px] text-muted align-super -top-1 relative">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}

        {/* Sliding 2px solid underline indicator */}
        <span
          className="absolute bottom-0 h-[2px] bg-text transition-all duration-250 ease-out pointer-events-none"
          style={{
            left: `${indicatorStyle.left}px`,
            width: `${indicatorStyle.width}px`,
          }}
        />
      </div>
    </div>
  );
}

export default Tabs;
