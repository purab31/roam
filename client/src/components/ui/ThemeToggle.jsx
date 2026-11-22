import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export function ThemeToggle({ className = '', showLabel = false }) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <button
        type="button"
        role="switch"
        aria-checked={isDark}
        aria-label="Toggle dark mode"
        onClick={toggleTheme}
        className="relative flex items-center justify-between w-14 h-8 px-1.5 rounded-full border border-border bg-transparent cursor-pointer transition-colors duration-200 hover:border-text group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text focus-visible:ring-offset-2"
      >
        {/* Sliding Thumb: 24px circle with 200ms ease-out */}
        <span
          className={`absolute top-[3px] left-[3px] w-6 h-6 rounded-full bg-primary transition-transform duration-200 ease-out group-active:scale-95 shadow-sm ${
            isDark ? 'translate-x-6' : 'translate-x-0'
          }`}
        />

        {/* Sun Icon */}
        <span
          className={`relative z-10 flex items-center justify-center w-5 h-5 transition-opacity duration-200 ${
            !isDark ? 'opacity-100 text-on-primary' : 'opacity-40 text-muted'
          }`}
        >
          <Sun className="w-3.5 h-3.5" />
        </span>

        {/* Moon Icon */}
        <span
          className={`relative z-10 flex items-center justify-center w-5 h-5 transition-opacity duration-200 ${
            isDark ? 'opacity-100 text-on-primary' : 'opacity-40 text-muted'
          }`}
        >
          <Moon className="w-3.5 h-3.5" />
        </span>
      </button>

      {showLabel && (
        <span className="text-[12px] text-muted select-none">
          {isDark ? 'Dark mode' : 'Light mode'}
        </span>
      )}
    </div>
  );
}

export default ThemeToggle;
