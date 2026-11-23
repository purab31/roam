import React from 'react';
import { X, RotateCcw } from 'lucide-react';
import { DottedSpecRow } from './DottedSpecRow';
import { Button } from '../ui/Button';

/**
 * UI 8.2 Left Collapsible Filter Panel:
 * - Surface card with 24px radius (--surface, border --border).
 * - Dotted-leader facet count rows (e.g. "Petrol ........ 24").
 * - Filter groups: Listing Type (Buy/Rent), Price Range, Body Type, Fuel, Transmission,
 *   Seller Type, Condition, Location (Top Cities), Year, Mileage.
 * - Clear all action.
 */
export function FilterPanel({
  filters = {},
  facetCounts = {},
  onFilterChange,
  onClearAll,
  className = '',
}) {
  const activeCount = Object.entries(filters).filter(([key, val]) => {
    if (!val) return false;
    if (key === 'page' || key === 'sort' || key === 'limit') return false;
    return true;
  }).length;

  const handleToggle = (key, value) => {
    if (filters[key] === value) {
      onFilterChange(key, '');
    } else {
      onFilterChange(key, value);
    }
  };

  const bodyTypes = [
    'SUV',
    'Sedan',
    'Hatchback',
    'Luxury',
    'Minivan',
    'Coupe',
    'Convertible',
    'Truck',
  ];

  const fuelTypes = ['Petrol', 'Diesel', 'Electric', 'Hybrid', 'CNG'];
  const transmissions = ['Automatic', 'Manual'];
  const sellerTypes = [
    { label: 'Private Individual', value: 'individual' },
    { label: 'Verified Dealer', value: 'dealer' },
  ];
  const conditions = ['Excellent', 'Very Good', 'Good', 'Fair'];

  return (
    <aside
      aria-label="Search and discovery filters"
      className={`w-full max-w-[320px] rounded-[24px] bg-surface text-text border border-border p-6 flex flex-col gap-6 shadow-sm select-none ${className}`}
    >
      {/* Header with Active Filters & Reset */}
      <div className="flex items-center justify-between pb-4 border-b border-border/80">
        <div className="flex items-center gap-2">
          <h3 className="text-[15px] font-semibold tracking-tight text-text">
            Filters
          </h3>
          {activeCount > 0 && (
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-primary text-primary-foreground">
              {activeCount}
            </span>
          )}
        </div>

        {activeCount > 0 && (
          <button
            type="button"
            onClick={onClearAll}
            className="flex items-center gap-1 text-[11px] font-medium text-muted hover:text-accent transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-text"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Clear all</span>
          </button>
        )}
      </div>

      {/* 1. Listing Purpose (Intent Switcher) */}
      <div className="flex flex-col gap-2.5 pb-5 border-b border-border/60">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
          Listing Purpose
        </span>
        <div className="grid grid-cols-3 gap-1.5 p-1 rounded-full bg-tile border border-border/50">
          {[
            { label: 'All', value: '' },
            { label: 'Buy', value: 'sale' },
            { label: 'Rent', value: 'rent' },
          ].map(opt => {
            const isSelected = (filters.purpose || '') === opt.value;
            return (
              <button
                key={opt.label}
                type="button"
                onClick={() => onFilterChange('purpose', opt.value)}
                className={`py-1.5 px-3 rounded-full text-[12px] font-medium transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-surface text-text shadow-sm'
                    : 'text-muted hover:text-text'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Price Range (in Lakhs or INR) */}
      <div className="flex flex-col gap-2.5 pb-5 border-b border-border/60">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
          Price Range (₹)
        </span>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-muted">Min Price</span>
            <input
              type="number"
              placeholder="e.g. 500000"
              value={filters.minPrice ? filters.minPrice / 100 : ''}
              onChange={e => {
                const val = e.target.value ? Number(e.target.value) * 100 : '';
                onFilterChange('minPrice', val);
              }}
              className="w-full px-3 py-1.5 rounded-full bg-tile text-[12px] text-text border border-border/50 focus:outline-none focus:border-text"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-muted">Max Price</span>
            <input
              type="number"
              placeholder="e.g. 2500000"
              value={filters.maxPrice ? filters.maxPrice / 100 : ''}
              onChange={e => {
                const val = e.target.value ? Number(e.target.value) * 100 : '';
                onFilterChange('maxPrice', val);
              }}
              className="w-full px-3 py-1.5 rounded-full bg-tile text-[12px] text-text border border-border/50 focus:outline-none focus:border-text"
            />
          </div>
        </div>
      </div>

      {/* 3. Body Type (with Dotted-Leader Facet Counts) */}
      <div className="flex flex-col gap-1.5 pb-5 border-b border-border/60">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted mb-1">
          Body Type
        </span>
        {bodyTypes.map(type => {
          const count = facetCounts.bodyType?.[type] || 0;
          const isSelected = filters.bodyType === type;
          return (
            <DottedSpecRow
              key={type}
              label={type}
              count={count}
              selected={isSelected}
              onClick={() => handleToggle('bodyType', type)}
            />
          );
        })}
      </div>

      {/* 4. Fuel Type */}
      <div className="flex flex-col gap-1.5 pb-5 border-b border-border/60">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted mb-1">
          Fuel Type
        </span>
        {fuelTypes.map(fuel => {
          const count = facetCounts.fuel?.[fuel] || 0;
          const isSelected = filters.fuel === fuel;
          return (
            <DottedSpecRow
              key={fuel}
              label={fuel}
              count={count}
              selected={isSelected}
              onClick={() => handleToggle('fuel', fuel)}
            />
          );
        })}
      </div>

      {/* 5. Transmission */}
      <div className="flex flex-col gap-1.5 pb-5 border-b border-border/60">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted mb-1">
          Transmission
        </span>
        {transmissions.map(trans => {
          const count = facetCounts.transmission?.[trans] || 0;
          const isSelected = filters.transmission === trans;
          return (
            <DottedSpecRow
              key={trans}
              label={trans}
              count={count}
              selected={isSelected}
              onClick={() => handleToggle('transmission', trans)}
            />
          );
        })}
      </div>

      {/* 6. Seller Type */}
      <div className="flex flex-col gap-1.5 pb-5 border-b border-border/60">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted mb-1">
          Seller Type
        </span>
        {sellerTypes.map(s => {
          const count = facetCounts.sellerType?.[s.value] || 0;
          const isSelected = filters.sellerType === s.value;
          return (
            <DottedSpecRow
              key={s.value}
              label={s.label}
              count={count}
              selected={isSelected}
              onClick={() => handleToggle('sellerType', s.value)}
            />
          );
        })}
      </div>

      {/* 7. Condition */}
      <div className="flex flex-col gap-1.5 pb-5 border-b border-border/60">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted mb-1">
          Vehicle Condition
        </span>
        {conditions.map(c => {
          const count = facetCounts.condition?.[c] || 0;
          const isSelected = filters.condition === c;
          return (
            <DottedSpecRow
              key={c}
              label={c}
              count={count}
              selected={isSelected}
              onClick={() => handleToggle('condition', c)}
            />
          );
        })}
      </div>

      {/* 8. Top Cities (Location Discovery Spec 17.1) */}
      {facetCounts.cities && Object.keys(facetCounts.cities).length > 0 && (
        <div className="flex flex-col gap-1.5 pb-5 border-b border-border/60">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted mb-1">
            Popular Cities
          </span>
          {Object.entries(facetCounts.cities).map(([cityName, count]) => {
            const isSelected = filters.city === cityName;
            return (
              <DottedSpecRow
                key={cityName}
                label={cityName}
                count={count}
                selected={isSelected}
                onClick={() => handleToggle('city', cityName)}
              />
            );
          })}
        </div>
      )}

      {/* 9. Manufacturing Year */}
      <div className="flex flex-col gap-2 pb-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
          Manufacturing Year
        </span>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            placeholder="From (2018)"
            value={filters.yearFrom || ''}
            onChange={e => onFilterChange('yearFrom', e.target.value)}
            className="w-full px-3 py-1.5 rounded-full bg-tile text-[12px] text-text border border-border/50 focus:outline-none focus:border-text"
          />
          <input
            type="number"
            placeholder="To (2024)"
            value={filters.yearTo || ''}
            onChange={e => onFilterChange('yearTo', e.target.value)}
            className="w-full px-3 py-1.5 rounded-full bg-tile text-[12px] text-text border border-border/50 focus:outline-none focus:border-text"
          />
        </div>
      </div>
    </aside>
  );
}

export default FilterPanel;