import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Compass,
  Search,
  Filter,
  Car,
  MapPin,
  Calendar,
  Gauge,
  User,
  Phone,
  Mail,
  ExternalLink,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
import { DashboardLayout } from '../../../components/dashboard/DashboardLayout';
import { Button } from '../../../components/ui/Button';
import { StatusChip } from '../../../components/ui/StatusChip';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { OfferSideSheet } from '../../../components/offer/OfferSideSheet';
import { formatRupees } from '../../../utils/money';

export function DiscoverOwnerListingsPage() {
  const [filters, setFilters] = useState({
    brand: '',
    model: '',
    city: '',
    condition: '',
    yearFrom: '',
    yearTo: '',
    kmMax: '',
    maxPrice: '',
  });

  const [activeListingForOffer, setActiveListingForOffer] = useState(null);

  // Fetch Discover Listings for Dealers (Spec 8.1)
  const {
    data: discoverData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['dealer-discover-listings', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.brand) params.append('brand', filters.brand);
      if (filters.model) params.append('model', filters.model);
      if (filters.city) params.append('city', filters.city);
      if (filters.condition) params.append('condition', filters.condition);
      if (filters.yearFrom) params.append('yearFrom', filters.yearFrom);
      if (filters.yearTo) params.append('yearTo', filters.yearTo);
      if (filters.kmMax) params.append('kmMax', filters.kmMax);
      if (filters.maxPrice) params.append('maxPrice', Number(filters.maxPrice) * 100); // rupees to paise

      const res = await fetch(`/api/dealers/discover-listings?${params.toString()}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to load discover listings');
      const json = await res.json();
      return json.data || { items: [], total: 0 };
    },
  });

  const items = discoverData?.items || [];
  const total = discoverData?.total || items.length;

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setFilters({
      brand: '',
      model: '',
      city: '',
      condition: '',
      yearFrom: '',
      yearTo: '',
      kmMax: '',
      maxPrice: '',
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 select-none">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Compass className="w-5 h-5 text-primary" />
              <h1 className="text-[24px] sm:text-[28px] font-semibold text-text tracking-tight">
                Discover Owner Listings
              </h1>
            </div>
            <p className="text-[13px] text-muted">
              Source inventory directly from verified private car owners across all markets.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[12px] font-medium text-text px-3 py-1.5 rounded-full bg-tile border border-border">
              {total} {total === 1 ? 'vehicle' : 'vehicles'} available
            </span>
          </div>
        </div>

        {/* Filter Controls (Spec 8.1) */}
        <div className="p-5 rounded-[24px] bg-surface border border-border shadow-sm space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-muted mb-1">Brand / Make</label>
              <input
                type="text"
                placeholder="e.g. Maruti, Toyota"
                value={filters.brand}
                onChange={e => handleFilterChange('brand', e.target.value)}
                className="w-full h-9 px-3 rounded-full bg-tile border border-border text-[12px] text-text focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-muted mb-1">Model</label>
              <input
                type="text"
                placeholder="e.g. Swift, Innova"
                value={filters.model}
                onChange={e => handleFilterChange('model', e.target.value)}
                className="w-full h-9 px-3 rounded-full bg-tile border border-border text-[12px] text-text focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-muted mb-1">City</label>
              <input
                type="text"
                placeholder="e.g. Mumbai, Delhi"
                value={filters.city}
                onChange={e => handleFilterChange('city', e.target.value)}
                className="w-full h-9 px-3 rounded-full bg-tile border border-border text-[12px] text-text focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-muted mb-1">Condition</label>
              <select
                value={filters.condition}
                onChange={e => handleFilterChange('condition', e.target.value)}
                className="w-full h-9 px-3 rounded-full bg-tile border border-border text-[12px] text-text focus:outline-none cursor-pointer"
              >
                <option value="">Any Condition</option>
                <option value="Excellent">Excellent</option>
                <option value="Very Good">Very Good</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div>
              <label className="block text-[11px] font-medium text-muted mb-1">Max Price (₹)</label>
              <input
                type="number"
                placeholder="e.g. 1500000"
                value={filters.maxPrice}
                onChange={e => handleFilterChange('maxPrice', e.target.value)}
                className="w-full h-9 px-3 rounded-full bg-tile border border-border text-[12px] text-text focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-muted mb-1">Min Year</label>
              <input
                type="number"
                placeholder="e.g. 2018"
                value={filters.yearFrom}
                onChange={e => handleFilterChange('yearFrom', e.target.value)}
                className="w-full h-9 px-3 rounded-full bg-tile border border-border text-[12px] text-text focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-muted mb-1">Max Mileage (Km)</label>
              <input
                type="number"
                placeholder="e.g. 60000"
                value={filters.kmMax}
                onChange={e => handleFilterChange('kmMax', e.target.value)}
                className="w-full h-9 px-3 rounded-full bg-tile border border-border text-[12px] text-text focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex items-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="w-full h-9 rounded-full text-[11px] text-muted hover:text-text"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Reset Filters
              </Button>
            </div>
          </div>
        </div>

        {/* Listings Feed */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-44 w-full rounded-[22px]" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="p-16 rounded-[28px] bg-surface border border-border text-center">
            <EmptyState
              icon={Car}
              title="No owner listings matched your criteria"
              description="Try adjusting your brand, price, or city filters to see more available private vehicle listings."
              actionLabel="Clear Filters"
              onAction={handleResetFilters}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map(listing => {
              const id = listing.id || listing._id;
              const vehicle = listing.vehicle || listing.vehicleRef || {};
              const owner = listing.owner || {};

              return (
                <div
                  key={id}
                  className="p-5 rounded-[24px] bg-surface border border-border/80 hover:border-text/40 transition-all flex flex-col justify-between shadow-sm"
                >
                  <div>
                    {/* Top row: Asking price & City */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <h3 className="text-[16px] font-semibold text-text tracking-tight">
                          {vehicle.brand} {vehicle.model} {vehicle.variant || ''}
                        </h3>
                        <p className="text-[11px] text-muted flex items-center gap-1.5 mt-0.5">
                          <MapPin className="w-3 h-3 text-muted" />
                          <span>{vehicle.location?.city || vehicle.city || 'India'}</span>
                          <span>•</span>
                          <span>{vehicle.condition || 'Good'} Condition</span>
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[17px] font-bold text-text block leading-tight">
                          {listing.sale?.askingPrice
                            ? formatRupees(listing.sale.askingPrice)
                            : 'Price on request'}
                        </span>
                        {listing.sale?.negotiable && (
                          <span className="text-[10px] text-muted">Negotiable</span>
                        )}
                      </div>
                    </div>

                    {/* Vehicle spec chips */}
                    <div className="flex flex-wrap gap-2 text-[11px] text-muted py-2 border-y border-border/40 my-3">
                      <span className="px-2.5 py-0.5 rounded-full bg-tile text-text">
                        {vehicle.manufacturingYear}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-tile text-text">
                        {vehicle.kmDriven ? `${vehicle.kmDriven.toLocaleString('en-IN')} km` : '— km'}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-tile text-text">
                        {vehicle.fuelType}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-tile text-text">
                        {vehicle.transmission}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-tile text-text">
                        {vehicle.previousOwners} {vehicle.previousOwners === 1 ? 'Owner' : 'Owners'}
                      </span>
                    </div>

                    {/* Owner summary & contacts (if allowed) */}
                    <div className="flex items-center justify-between text-[11px] text-muted mt-2">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-muted" />
                        <span>Owner: {owner.fullName || 'Private Seller'}</span>
                      </div>

                      <div className="flex items-center gap-3">
                        {owner.mobile && (
                          <span className="flex items-center gap-1 text-text">
                            <Phone className="w-3 h-3 text-muted" />
                            {owner.mobile}
                          </span>
                        )}
                        {owner.email && (
                          <span className="flex items-center gap-1 text-text">
                            <Mail className="w-3 h-3 text-muted" />
                            {owner.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions: View listing & Make Offer */}
                  <div className="pt-4 mt-4 border-t border-border/50 flex items-center justify-between">
                    <Link
                      to={`/listings/${id}`}
                      className="inline-flex items-center gap-1 text-[12px] font-medium text-muted hover:text-text transition-colors"
                    >
                      <span>View Details</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() =>
                        setActiveListingForOffer({
                          ...listing,
                          _id: id,
                          vehicleRef: vehicle,
                        })
                      }
                      className="rounded-full px-4 text-[12px]"
                    >
                      <span>Make Purchase Offer</span>
                      <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Offer Side Sheet drawer */}
        {activeListingForOffer && (
          <OfferSideSheet
            isOpen={!!activeListingForOffer}
            onClose={() => setActiveListingForOffer(null)}
            listing={activeListingForOffer}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

export default DiscoverOwnerListingsPage;
