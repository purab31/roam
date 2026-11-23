import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { FilterPanel } from '../components/discovery/FilterPanel';
import { FilterBottomSheet } from '../components/discovery/FilterBottomSheet';
import { VehicleCard } from '../components/vehicle/VehicleCard';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { SlidersHorizontal, ArrowUpDown, X, Car } from 'lucide-react';

async function fetchBrowseListings(searchParamsString) {
  const url = searchParamsString ? `/api/listings?${searchParamsString}` : '/api/listings';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to load listings');
  const json = await res.json();
  return json.data;
}

/**
 * UI 8.2 Browse / Search Results Page:
 * - Left 24px radius filter panel with dotted-leader facet counts.
 * - Filters synced bidirectionally with URL query string.
 * - Results bar: Total count in big number style, Sort dropdown, Mobile filter trigger.
 * - Active filter pills with dismiss (x).
 * - 3-column vehicle grid with skeleton loaders and empty state.
 * - Mobile bottom sheet filter drawer.
 */
export function BrowsePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Parse filters from URL
  const filters = useMemo(() => {
    const obj = {};
    for (const [key, value] of searchParams.entries()) {
      obj[key] = value;
    }
    return obj;
  }, [searchParams]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['browse-listings', searchParams.toString()],
    queryFn: () => fetchBrowseListings(searchParams.toString()),
  });

  const items = data?.items || [];
  const total = data?.total || 0;
  const facetCounts = data?.facetCounts || {};
  const page = data?.page || 1;
  const pageSize = data?.pageSize || 20;
  const totalPages = Math.ceil(total / pageSize);

  // Update a single filter in the URL query string
  const handleFilterChange = (key, value) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (value !== undefined && value !== null && value !== '') {
        next.set(key, value.toString());
      } else {
        next.delete(key);
      }
      next.set('page', '1'); // Reset to first page on filter change
      return next;
    });
  };

  // Clear all filters from URL query string
  const handleClearAll = () => {
    setSearchParams(new URLSearchParams());
  };

  // Remove a single active filter pill
  const handleRemovePill = key => {
    handleFilterChange(key, '');
  };

  const sortOptions = [
    { label: 'Recently Listed', value: 'recentlyListed' },
    { label: 'Price: Low to High', value: 'priceAsc' },
    { label: 'Price: High to Low', value: 'priceDesc' },
    { label: 'Manufacturing Year', value: 'year' },
    { label: 'Lowest Kilometres', value: 'lowestKm' },
    { label: 'Recently Updated', value: 'recentlyUpdated' },
  ];

  // Active filter pills list (excluding pagination/sort)
  const activePills = Object.entries(filters).filter(([k, v]) => {
    if (!v) return false;
    if (k === 'page' || k === 'sort' || k === 'limit') return false;
    return true;
  });

  const activeFilterCount = activePills.length;

  return (
    <div className="min-h-screen bg-bg text-text transition-colors duration-200 flex flex-col">
      <Header activeNav="Buy" />

      <main className="grow max-w-container mx-auto w-full px-4 sm:px-8 lg:px-16 py-8 sm:py-12">
        {/* Top Control Bar: Total count left, Sort dropdown + Mobile filter right */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-8 border-b border-border/80">
          <div className="flex items-baseline gap-3">
            <span className="text-[32px] sm:text-[38px] font-light tracking-tight text-text leading-none">
              {total}
            </span>
            <span className="text-[13px] text-muted">
              {total === 1 ? 'vehicle available' : 'vehicles available'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Mobile Filter Sheet Trigger Button */}
            <button
              type="button"
              onClick={() => setMobileFilterOpen(true)}
              aria-label="Open filter sheet"
              className="lg:hidden flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-surface text-[12px] font-medium text-text hover:border-text transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Sort Pill Dropdown */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-surface text-[12px] text-muted">
              <ArrowUpDown className="w-3.5 h-3.5 shrink-0" />
              <select
                aria-label="Sort listings"
                value={filters.sort || 'recentlyListed'}
                onChange={e => handleFilterChange('sort', e.target.value)}
                className="bg-transparent text-text text-[12px] font-medium focus:outline-none cursor-pointer"
              >
                {sortOptions.map(opt => (
                  <option key={opt.value} value={opt.value} className="bg-surface text-text">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Active Filter Pills Row */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-8 animate-fade-in">
            <span className="text-[11px] uppercase font-semibold text-muted mr-1">
              Active:
            </span>
            {activePills.map(([key, value]) => {
              let displayVal = value;
              if (key === 'minPrice') displayVal = `Min ₹${(value / 100).toLocaleString('en-IN')}`;
              if (key === 'maxPrice') displayVal = `Max ₹${(value / 100).toLocaleString('en-IN')}`;
              if (key === 'yearFrom') displayVal = `From ${value}`;
              if (key === 'yearTo') displayVal = `To ${value}`;

              return (
                <span
                  key={key}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-tile text-[11px] font-medium text-text border border-border"
                >
                  <span className="capitalize">{key}:</span>
                  <span className="font-semibold">{displayVal}</span>
                  <button
                    type="button"
                    onClick={() => handleRemovePill(key)}
                    aria-label={`Remove filter ${key}`}
                    className="hover:text-accent transition-colors ml-0.5 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
            <button
              type="button"
              onClick={handleClearAll}
              className="text-[11px] text-muted hover:text-accent underline transition-colors cursor-pointer ml-2"
            >
              Reset all
            </button>
          </div>
        )}

        {/* Main Layout: Left Filter Panel + Right Vehicle Grid */}
        <div className="flex items-start gap-8">
          {/* Desktop Left Filter Panel */}
          <div className="hidden lg:block shrink-0 sticky top-24">
            <FilterPanel
              filters={filters}
              facetCounts={facetCounts}
              onFilterChange={handleFilterChange}
              onClearAll={handleClearAll}
            />
          </div>

          {/* Right Vehicle Grid */}
          <div className="grow w-full">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex flex-col w-full max-w-[280px] mx-auto sm:mx-0">
                    <Skeleton className="w-full h-[300px] rounded-[24px] mb-3" />
                    <Skeleton className="w-[180px] h-4 rounded mb-1" />
                    <Skeleton className="w-[120px] h-3 rounded" />
                  </div>
                ))}
              </div>
            ) : items.length > 0 ? (
              <div className="flex flex-col gap-10">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 justify-items-center sm:justify-items-start">
                  {items.map(item => (
                    <VehicleCard
                      key={item.id}
                      vehicle={item.vehicleRef}
                      listing={item}
                    />
                  ))}
                </div>

                {/* Pagination Controls / Load More */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-4 pt-6 border-t border-border/60">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => handleFilterChange('page', page - 1)}
                    >
                      Previous
                    </Button>
                    <span className="text-[12px] text-muted">
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => handleFilterChange('page', page + 1)}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              /* Empty Search Results */
              <div className="py-16">
                <EmptyState
                  icon={Car}
                  title="No vehicles found"
                  description="We couldn't find any listings matching your active filters. Try broadening your criteria or resetting filters."
                  actionLabel="Clear all filters"
                  onAction={handleClearAll}
                />
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Mobile Filter Bottom Sheet */}
      <FilterBottomSheet
        isOpen={mobileFilterOpen}
        onClose={() => setMobileFilterOpen(false)}
        filters={filters}
        facetCounts={facetCounts}
        onFilterChange={handleFilterChange}
        onClearAll={handleClearAll}
        totalResults={total}
      />

      <Footer />
    </div>
  );
}

export default BrowsePage;