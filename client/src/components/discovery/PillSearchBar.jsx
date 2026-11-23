import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowRight, MapPin, DollarSign, SlidersHorizontal } from 'lucide-react';

/**
 * UI 8.1 Hero Pill Search Bar:
 * - Make / Model input, Budget selector, Location input/select,
 *   plus circular arrow button inside the right end.
 * - Navigates directly to /browse with matching query parameters.
 */
export function PillSearchBar({ className = '', initialValues = {} }) {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState(initialValues.q || '');
  const [budget, setBudget] = useState(initialValues.maxPrice || '');
  const [city, setCity] = useState(initialValues.city || '');

  const budgetOptions = [
    { label: 'Any Budget', value: '' },
    { label: 'Under ₹10 Lakh', value: '100000000' },
    { label: 'Under ₹15 Lakh', value: '150000000' },
    { label: 'Under ₹25 Lakh', value: '250000000' },
    { label: 'Under ₹50 Lakh', value: '500000000' },
    { label: '₹50 Lakh+', value: '1000000000' },
  ];

  const cityOptions = [
    { label: 'All Cities', value: '' },
    { label: 'Mumbai', value: 'Mumbai' },
    { label: 'New Delhi', value: 'New Delhi' },
    { label: 'Bengaluru', value: 'Bengaluru' },
    { label: 'Pune', value: 'Pune' },
    { label: 'Hyderabad', value: 'Hyderabad' },
    { label: 'Chennai', value: 'Chennai' },
    { label: 'Ahmedabad', value: 'Ahmedabad' },
    { label: 'Jaipur', value: 'Jaipur' },
    { label: 'Chandigarh', value: 'Chandigarh' },
  ];

  const handleSearch = e => {
    if (e) e.preventDefault();
    const params = new URLSearchParams();
    if (keyword.trim()) params.set('q', keyword.trim());
    if (budget) params.set('maxPrice', budget);
    if (city) params.set('city', city);
    navigate(`/browse${params.toString() ? `?${params.toString()}` : ''}`);
  };

  return (
    <form
      onSubmit={handleSearch}
      className={`w-full max-w-[840px] p-2 sm:p-2.5 rounded-[32px] sm:rounded-full bg-surface text-text border border-border shadow-card flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-1 transition-all ${className}`}
    >
      {/* 1. Keyword / Make / Model Segment */}
      <div className="flex-1 flex items-center px-4 py-2 sm:py-0 border-b sm:border-b-0 sm:border-r border-border/60">
        <Search className="w-4 h-4 text-muted shrink-0 mr-2.5" />
        <div className="flex flex-col w-full">
          <label htmlFor="search-keyword" className="text-[10px] uppercase font-semibold text-muted tracking-wider">
            Vehicle
          </label>
          <input
            id="search-keyword"
            type="text"
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            placeholder="Make, model or variant..."
            className="w-full bg-transparent text-[13px] text-text placeholder:text-text-faint focus:outline-none"
          />
        </div>
      </div>

      {/* 2. Budget Segment */}
      <div className="flex-1 flex items-center px-4 py-2 sm:py-0 border-b sm:border-b-0 sm:border-r border-border/60">
        <DollarSign className="w-4 h-4 text-muted shrink-0 mr-2" />
        <div className="flex flex-col w-full">
          <label htmlFor="search-budget" className="text-[10px] uppercase font-semibold text-muted tracking-wider">
            Budget
          </label>
          <select
            id="search-budget"
            value={budget}
            onChange={e => setBudget(e.target.value)}
            className="w-full bg-transparent text-[13px] text-text focus:outline-none cursor-pointer"
          >
            {budgetOptions.map(opt => (
              <option key={opt.value} value={opt.value} className="bg-surface text-text">
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3. Location Segment */}
      <div className="flex-1 flex items-center px-4 py-2 sm:py-0">
        <MapPin className="w-4 h-4 text-muted shrink-0 mr-2" />
        <div className="flex flex-col w-full">
          <label htmlFor="search-city" className="text-[10px] uppercase font-semibold text-muted tracking-wider">
            Location
          </label>
          <select
            id="search-city"
            value={city}
            onChange={e => setCity(e.target.value)}
            className="w-full bg-transparent text-[13px] text-text focus:outline-none cursor-pointer"
          >
            {cityOptions.map(opt => (
              <option key={opt.value} value={opt.value} className="bg-surface text-text">
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 4. Action Button: Circular arrow button */}
      <button
        type="submit"
        aria-label="Search vehicles"
        className="shrink-0 flex items-center justify-center w-full sm:w-11 h-11 rounded-full bg-primary text-primary-foreground font-medium text-[13px] sm:text-base hover:opacity-90 active:scale-95 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text"
      >
        <span className="sm:hidden mr-2">Search Vehicles</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </form>
  );
}

export default PillSearchBar;