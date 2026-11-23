import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Search, Building2, MapPin, ShieldCheck, Plus, Car } from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { Footer } from '../../components/layout/Footer';
import { DealerCard } from '../../components/dealer/DealerCard';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAuth } from '../../context/AuthContext';

export function DealerDirectoryPage() {
  const { user, isAuthenticated } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('');

  // Fetch verified dealers
  const {
    data: dealers = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['dealers-directory', selectedCity, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCity) params.append('city', selectedCity);
      if (searchTerm) params.append('search', searchTerm);

      const res = await fetch(`/api/dealers?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load dealer directory');
      const json = await res.json();
      return json.data || [];
    },
  });

  // Extract unique cities from dealers list
  const cities = Array.from(new Set(dealers.map(d => d.city).filter(Boolean))).sort();

  const isDealer = user?.capabilities?.includes('dealer');

  return (
    <div className="min-h-screen flex flex-col bg-bg text-text">
      <Header activeNav="Dealers" />

      <main className="flex-1 max-w-container mx-auto w-full px-4 sm:px-8 lg:px-16 py-8 sm:py-12">
        {/* Hero Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-border/60">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-tile border border-border/60 text-[11px] font-medium text-muted mb-3">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              <span>Certified Marketplace Partners</span>
            </div>
            <h1 className="text-[32px] sm:text-[40px] font-light tracking-tight leading-[1.1]">
              Verified Dealerships
            </h1>
            <p className="text-[14px] text-muted max-w-xl mt-2 leading-relaxed">
              Explore established pre-owned automobile showrooms and certified dealers across the country. Direct contact with zero brokerage.
            </p>
          </div>

          {/* Action Link for registration or status */}
          <div className="shrink-0 flex items-center gap-3">
            {isAuthenticated ? (
              isDealer ? (
                <Link to="/dealer/verification">
                  <Button variant="secondary" size="md" className="rounded-full">
                    <Building2 className="w-4 h-4 mr-2" />
                    My Dealership
                  </Button>
                </Link>
              ) : (
                <Link to="/dealer/register">
                  <Button variant="primary" size="md" className="rounded-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Register Dealership
                  </Button>
                </Link>
              )
            ) : (
              <Link to="/login?redirect=/dealer/register">
                <Button variant="secondary" size="md" className="rounded-full">
                  <Building2 className="w-4 h-4 mr-2" />
                  Become a Verified Dealer
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-3 py-6">
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Search by dealership name or keyword..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full h-11 pl-11 pr-4 rounded-full bg-surface border border-border text-[13px] text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
            />
          </div>

          {/* City Filter */}
          <div className="w-full sm:w-56 shrink-0">
            <select
              value={selectedCity}
              onChange={e => setSelectedCity(e.target.value)}
              className="w-full h-11 px-4 rounded-full bg-surface border border-border text-[13px] text-text focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all cursor-pointer"
            >
              <option value="">All Cities</option>
              {cities.map(city => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Dealers Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="p-6 rounded-[24px] bg-surface border border-border/70 flex flex-col justify-between h-[240px]"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <Skeleton className="w-14 h-14 rounded-2xl" />
                    <Skeleton className="w-24 h-6 rounded-full" />
                  </div>
                  <Skeleton className="w-3/4 h-5 mb-2" />
                  <Skeleton className="w-1/2 h-4 mb-3" />
                  <Skeleton className="w-full h-10 rounded-lg" />
                </div>
                <div className="pt-4 border-t border-border/50 flex justify-between">
                  <Skeleton className="w-24 h-4" />
                  <Skeleton className="w-24 h-4" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="py-12">
            <EmptyState
              title="Failed to load directory"
              description="Could not connect to the dealer directory service. Please try again."
              actionLabel="Retry"
              onAction={() => window.location.reload()}
            />
          </div>
        ) : dealers.length === 0 ? (
          <div className="py-16">
            <EmptyState
              icon={Building2}
              title="No dealerships found"
              description={
                searchTerm || selectedCity
                  ? 'No verified dealerships match your current search and location filters.'
                  : 'No verified dealerships are currently published in the marketplace.'
              }
              actionLabel={searchTerm || selectedCity ? 'Clear Filters' : undefined}
              onAction={
                searchTerm || selectedCity
                  ? () => {
                      setSearchTerm('');
                      setSelectedCity('');
                    }
                  : undefined
              }
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
            {dealers.map(dealer => (
              <DealerCard key={dealer.id || dealer._id} dealer={dealer} />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default DealerDirectoryPage;
