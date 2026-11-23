import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Header } from '../components/layout/Header';
import { AnnouncementBar } from '../components/layout/AnnouncementBar';
import { Footer } from '../components/layout/Footer';
import { PillSearchBar } from '../components/discovery/PillSearchBar';
import { Carousel } from '../components/discovery/Carousel';
import { VehicleCard } from '../components/vehicle/VehicleCard';
import { Skeleton } from '../components/ui/Skeleton';
import { RecentlyViewedCarousel } from '../components/discovery/RecentlyViewedCarousel';
import { Button } from '../components/ui/Button';
import { ArrowRight, ShieldCheck, CheckCircle2, Car, Award } from 'lucide-react';

async function fetchFeaturedListings() {
  const res = await fetch('/api/listings?limit=8&sort=recentlyListed');
  if (!res.ok) throw new Error('Failed to fetch featured listings');
  const json = await res.json();
  return json.data;
}

async function fetchRentListings() {
  const res = await fetch('/api/listings?purpose=rent&limit=8');
  if (!res.ok) throw new Error('Failed to fetch rental listings');
  const json = await res.json();
  return json.data;
}

/**
 * UI 8.1 Home Page:
 * 1. Header + AnnouncementBar.
 * 2. Hero band (grey): 64px/300 headline "Find, sell or rent your next car", pill search bar.
 * 3. Intent tabs: Buy · Rent · Sell.
 * 4. "Featured vehicles" carousel (7.9 + 7.10 + 7.11).
 * 5. "Browse by type" grid of tiles.
 * 6. "For rent this week" carousel (hidden when no rent listings).
 * 7. Three-step "How it works" row (numbered 1-2-3 per 7.8).
 * 8. Dealer logo strip (hidden when no verified dealers).
 * 9. Black CTA band (UI 7.13) with decorative silhouette cut-outs.
 * 10. Footer with giant wordmark.
 */
export function HomePage() {
  const navigate = useNavigate();
  const [activeIntent, setActiveIntent] = useState('buy');

  const { data: featuredData, isLoading: isFeaturedLoading } = useQuery({
    queryKey: ['featured-listings'],
    queryFn: fetchFeaturedListings,
  });

  const { data: rentData, isLoading: isRentLoading } = useQuery({
    queryKey: ['rent-listings'],
    queryFn: fetchRentListings,
  });

  const { data: verifiedDealers = [] } = useQuery({
    queryKey: ['home-verified-dealers'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/dealers');
        if (!res.ok) return [];
        const json = await res.json();
        return json.data || [];
      } catch {
        return [];
      }
    },
    staleTime: 10 * 60 * 1000,
  });

  const featuredItems = featuredData?.items || [];
  const rentItems = rentData?.items || [];
  const dealerCount = (featuredData?.facetCounts?.sellerType?.dealer || 0) + verifiedDealers.length;

  // Dynamic categories from settings API (Decision 1)
  const { data: categories = ['SUV', 'Sedan', 'Hatchback', 'Truck', 'Luxury', 'Minivan'] } = useQuery({
    queryKey: ['settings-categories'],
    queryFn: async () => {
      const res = await fetch('/api/settings/categories');
      if (!res.ok) return ['SUV', 'Sedan', 'Hatchback', 'Truck', 'Luxury', 'Minivan'];
      const json = await res.json();
      return json.data?.length > 0 ? json.data : ['SUV', 'Sedan', 'Hatchback', 'Truck', 'Luxury', 'Minivan'];
    },
    staleTime: 5 * 60 * 1000,
  });

  const vehicleTypes = categories.slice(0, 8).map(cat => ({
    label: cat,
    count: featuredData?.facetCounts?.bodyType?.[cat] || 'Explore',
    href: `/browse?bodyType=${encodeURIComponent(cat)}`,
  }));

  const handleIntentTab = key => {
    setActiveIntent(key);
    if (key === 'buy') navigate('/browse?purpose=sale');
    if (key === 'rent') navigate('/browse?purpose=rent');
    if (key === 'sell') navigate('/listing/new');
  };

  return (
    <div className="min-h-screen bg-bg text-text transition-colors duration-200">
      {/* 1. Global Announcement Bar (fetches dynamically from GET /api/settings/announcement) */}
      <AnnouncementBar />

      {/* 2. Global Sticky Header */}
      <Header activeNav="Buy" />

      <main>
        {/* 2. Hero Band (Grey / --bg-subtle, 560px height) */}
        <section className="relative w-full bg-bg-subtle border-b border-border/40 py-16 sm:py-24 overflow-hidden">
          {/* Background Car Silhouette Image with Reduced Opacity */}
          <div className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center overflow-hidden">
            <img
              src="/images/hero-car.jpg"
              alt=""
              aria-hidden="true"
              className="w-full h-full object-cover object-center opacity-15 dark:opacity-30 select-none scale-105 transition-opacity duration-300"
            />
            {/* Soft edge-blending vignettes to smoothly feather into --bg-subtle */}
            <div className="absolute inset-0 bg-gradient-to-t from-bg-subtle via-transparent to-bg-subtle opacity-90" />
            <div className="absolute inset-0 bg-gradient-to-r from-bg-subtle via-transparent to-bg-subtle opacity-80" />
          </div>

          <div className="max-w-container mx-auto px-4 sm:px-8 lg:px-16 flex flex-col items-center text-center relative z-10">
            {/* Eyebrow Label */}
            <span className="text-[11px] sm:text-[12px] font-medium uppercase tracking-[0.08em] text-muted mb-4 animate-fade-in">
              Verified Pre-Owned & Rental Marketplace
            </span>

            {/* 64px / 300 Hero Headline */}
            <h1 className="text-[40px] sm:text-[56px] lg:text-[64px] font-light leading-[1.05] tracking-[-0.03em] text-text max-w-[820px] mb-8 animate-fade-in">
              Find, sell or rent your next vehicle.
            </h1>

            {/* Pill Search Bar */}
            <div className="w-full flex justify-center mb-8 animate-fade-in">
              <PillSearchBar />
            </div>

            {/* 3. Intent Tabs: Buy · Rent · Sell (UI 7.6) */}
            <div className="flex items-center gap-1 p-1 rounded-full bg-surface border border-border shadow-sm">
              {[
                { label: 'Buy Pre-Owned', key: 'buy' },
                { label: 'Rent by Day', key: 'rent' },
                { label: 'Sell Your Car', key: 'sell' },
              ].map(tab => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => handleIntentTab(tab.key)}
                  className={`px-5 py-2 rounded-full text-[13px] font-medium transition-all cursor-pointer ${
                    activeIntent === tab.key
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted hover:text-text'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* 4. Featured Vehicles Carousel (UI 7.9, 7.10, 7.11) */}
        <section className="max-w-container mx-auto px-4 sm:px-8 lg:px-16 py-16 sm:py-24">
          <Carousel
            eyebrow="Marketplace Selection"
            title="Featured vehicles"
            description="Hand-picked pre-owned vehicles verified for condition, provenance and market price."
            totalCount={featuredData?.total || featuredItems.length}
            viewAllLink="/browse?sort=recentlyListed"
          >
            {isFeaturedLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="shrink-0 w-[270px]">
                  <Skeleton className="w-[270px] h-[300px] rounded-[24px] mb-3" />
                  <Skeleton className="w-[180px] h-4 rounded mb-1" />
                  <Skeleton className="w-[120px] h-3 rounded" />
                </div>
              ))
            ) : featuredItems.length > 0 ? (
              featuredItems.map(item => (
                <div key={item.id} className="shrink-0 w-[270px] snap-start">
                  <VehicleCard
                    vehicle={item.vehicleRef}
                    listing={item}
                  />
                </div>
              ))
            ) : (
              <div className="w-full py-12 text-center text-muted text-[13px]">
                No vehicles listed yet. Run the seed script to populate realistic listings.
              </div>
            )}
          </Carousel>
        </section>

        {/* 5. Browse by Type Grid of Tiles (UI 8.1) */}
        <section className="w-full bg-bg-subtle py-16 sm:py-20 border-y border-border/40">
          <div className="max-w-container mx-auto px-4 sm:px-8 lg:px-16">
            <div className="flex flex-col gap-2 mb-10">
              <span className="text-[11px] font-medium uppercase tracking-[0.05em] text-muted">
                Body Categories
              </span>
              <h2 className="text-[32px] sm:text-[40px] font-light tracking-tight text-text">
                Browse by vehicle type
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {vehicleTypes.map(t => (
                <Link
                  key={t.label}
                  to={t.href}
                  className="group flex flex-col justify-between p-6 h-[140px] rounded-[24px] bg-surface border border-border hover:border-text transition-all duration-200 cursor-pointer shadow-xs hover:scale-104 select-none"
                >
                  <span className="text-[10px] uppercase font-semibold text-muted tracking-wider group-hover:text-text">
                    {t.count}
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="text-[18px] font-medium tracking-tight text-text">
                      {t.label}
                    </span>
                    <ArrowRight className="w-4 h-4 text-muted group-hover:text-text group-hover:translate-x-1 transition-all" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* 6. "For Rent this Week" Carousel (Conditionally shown if rent listings exist) */}
        {rentItems.length > 0 && (
          <section className="max-w-container mx-auto px-4 sm:px-8 lg:px-16 py-16 sm:py-24">
            <Carousel
              eyebrow="Flexible Durations"
              title="For rent this week"
              description="Daily and weekly self-drive rental vehicles with transparent security deposits."
              totalCount={rentData?.total || rentItems.length}
              viewAllLink="/browse?purpose=rent"
            >
              {isRentLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="shrink-0 w-[270px]">
                    <Skeleton className="w-[270px] h-[300px] rounded-[24px] mb-3" />
                  </div>
                ))
              ) : (
                rentItems.map(item => (
                  <div key={item.id} className="shrink-0 w-[270px] snap-start">
                    <VehicleCard
                      vehicle={item.vehicleRef}
                      listing={item}
                    />
                  </div>
                ))
              )}
            </Carousel>
          </section>
        )}

        {/* Recently Viewed Carousel */}
        <div className="max-w-container mx-auto px-4 sm:px-8 lg:px-16">
          <RecentlyViewedCarousel />
        </div>

        {/* 7. Three-Step "How it works" Row (Numbered 1-2-3 per UI 7.8) */}
        <section className="max-w-container mx-auto px-4 sm:px-8 lg:px-16 py-16 sm:py-24 border-t border-border/40">
          <div className="flex flex-col gap-2 mb-12">
            <span className="text-[11px] font-medium uppercase tracking-[0.05em] text-muted">
              Quiet & Transparent
            </span>
            <h2 className="text-[32px] sm:text-[44px] font-light tracking-tight text-text">
              How Roam works
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="flex flex-col p-8 rounded-[24px] bg-tile border border-border/40 gap-4">
              <span className="text-[28px] font-light text-muted">1.</span>
              <h3 className="text-[18px] font-medium tracking-tight text-text">
                Browse & Discover
              </h3>
              <p className="text-[13px] text-muted leading-relaxed">
                Explore verified vehicle listings across Indian cities. Filter by budget, fuel type, transmission and body style with true disjunctive facet counts.
              </p>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col p-8 rounded-[24px] bg-tile border border-border/40 gap-4">
              <span className="text-[28px] font-light text-muted">2.</span>
              <h3 className="text-[18px] font-medium tracking-tight text-text">
                Connect Directly
              </h3>
              <p className="text-[13px] text-muted leading-relaxed">
                Connect directly with private individual owners or verified dealers. Submit purchase enquiries or make offers with no intermediary markups.
              </p>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col p-8 rounded-[24px] bg-tile border border-border/40 gap-4">
              <span className="text-[28px] font-light text-muted">3.</span>
              <h3 className="text-[18px] font-medium tracking-tight text-text">
                Inspect & Handover
              </h3>
              <p className="text-[13px] text-muted leading-relaxed">
                Coordinate in-person vehicle viewing and inspection. Finalise legal registration transfer and payments directly and securely.
              </p>
            </div>
          </div>
        </section>

        {/* 8. Dealer Trust Strip (UI 7.12) - Only rendered when verified dealers exist */}
        {dealerCount > 0 && (
          <section className="w-full py-12 border-t border-border/40 bg-bg select-none">
            <div className="max-w-container mx-auto px-4 sm:px-8 lg:px-16 flex flex-col items-center text-center">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted/70 mb-6">
                Trusted by Established Dealerships & Private Sellers
              </span>
              <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-14 opacity-75 hover:opacity-100 transition-opacity">
                {verifiedDealers.length > 0
                  ? verifiedDealers.slice(0, 6).map(d => (
                      <button
                        type="button"
                        key={d.id || d._id}
                        onClick={() => navigate(`/dealers/${d.id || d._id}`)}
                        className="text-[14px] sm:text-[15px] font-medium tracking-tight text-text hover:text-primary transition-colors cursor-pointer"
                      >
                        {d.dealershipName}
                      </button>
                    ))
                  : ['Apex Motor Corp', 'City Wheels Pune', 'Metro Car Hub', 'Velocity Motors', 'Capital Auto Trust'].map(
                      name => (
                        <button
                          type="button"
                          key={name}
                          onClick={() => navigate('/dealers')}
                          className="text-[14px] sm:text-[15px] font-medium tracking-tight text-text hover:text-primary transition-colors cursor-pointer"
                        >
                          {name}
                        </button>
                      )
                    )}
              </div>
              <button
                type="button"
                onClick={() => navigate('/dealers')}
                className="mt-6 text-[12px] font-medium text-muted hover:text-text transition-colors"
              >
                Browse all certified partner showrooms →
              </button>
            </div>
          </section>
        )}

        {/* 9. Black Community CTA Band (UI 7.13) */}
        <section className="relative w-full bg-black text-white py-20 sm:py-28 overflow-hidden select-none">
          {/* Decorative rotated corner silhouette */}
          <div
            className="absolute -top-16 -left-16 w-64 h-64 opacity-10 pointer-events-none rotate-12"
            aria-hidden="true"
          >
            <Car className="w-full h-full text-white" />
          </div>
          <div
            className="absolute -bottom-16 -right-16 w-80 h-80 opacity-10 pointer-events-none -rotate-12"
            aria-hidden="true"
          >
            <Car className="w-full h-full text-white" />
          </div>

          <div className="max-w-[760px] mx-auto px-4 sm:px-8 text-center flex flex-col items-center relative z-10">
            {/* Social Proof Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-900 border border-neutral-800 text-[11px] text-neutral-300 mb-8">
              <div className="flex -space-x-1.5">
                <div className="w-4 h-4 rounded-full bg-neutral-700 border border-black" />
                <div className="w-4 h-4 rounded-full bg-neutral-600 border border-black" />
                <div className="w-4 h-4 rounded-full bg-neutral-500 border border-black" />
              </div>
              <span>2,500+ active members</span>
            </div>

            {/* 64-72px Headline on Two Lines */}
            <h2 className="text-[38px] sm:text-[56px] lg:text-[68px] font-light leading-[1.05] tracking-[-0.03em] text-white mb-6">
              List your vehicle.<br />Reach real buyers.
            </h2>

            <p className="text-[13px] sm:text-[14px] text-neutral-400 max-w-[500px] leading-relaxed mb-10">
              No hidden fees, no commission deductions. Publish your car in minutes with comprehensive inspection records and photos.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Button
                variant="onDark"
                size="lg"
                onClick={() => navigate('/listing/new')}
                className="w-full sm:w-auto h-12 px-8 text-[13px]"
              >
                Sell your car
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => navigate('/dealer/register')}
                className="w-full sm:w-auto h-12 px-8 text-[13px] text-white border-neutral-700 hover:border-white"
              >
                Register as a dealer
              </Button>
              <Button
                variant="ghost"
                size="lg"
                onClick={() => navigate('/dealers')}
                className="w-full sm:w-auto h-12 px-6 text-[13px] text-neutral-400 hover:text-white"
              >
                Find verified dealers
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* 10. Global Footer with Giant Wordmark */}
      <Footer />
    </div>
  );
}

export default HomePage;