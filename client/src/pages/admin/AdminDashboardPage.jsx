import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Tag,
  HandCoins,
  Calendar,
  ArrowRight,
  Eye,
  TrendingUp,
} from 'lucide-react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { Skeleton } from '../../components/ui/Skeleton';
import { formatRupees } from '../../utils/money';

/**
 * Admin Dashboard Page per UI 8.8:
 * - Stat cards: 40px/300 number, 11px muted label, small SVG sparkline in --text with accent for alerts.
 * - Platform totals, popular brands and models, most viewed listings.
 * - Fetches from GET /api/admin/dashboard.
 */
export function AdminDashboardPage() {
  const { data: dashboardData, isLoading, error } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async () => {
      const res = await fetch('/api/admin/dashboard', {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to load admin dashboard stats');
      const json = await res.json();
      return json.data;
    },
    staleTime: 60 * 1000,
  });

  const totals = dashboardData?.totals || {};
  const popularBrands = dashboardData?.popularBrands || [];
  const popularModels = dashboardData?.popularModels || [];
  const mostViewedListings = dashboardData?.mostViewedListings || [];
  const sparklineUsers = dashboardData?.sparklines?.users || [];
  const sparklineListings = dashboardData?.sparklines?.listings || [];

  // Helper for rendering SVG sparkline
  const renderSparkline = (series, alertOnZero = false) => {
    if (!series || series.length === 0) return null;
    const maxVal = Math.max(...series.map(s => s.value), 1);
    const points = series
      .map((item, idx) => {
        const x = (idx / Math.max(series.length - 1, 1)) * 100;
        const y = 30 - (item.value / maxVal) * 26;
        return `${x},${y}`;
      })
      .join(' ');

    return (
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/40">
        <span className="text-[10px] text-muted">6M Trend</span>
        <svg className="w-20 h-7 overflow-visible" viewBox="0 0 100 30">
          <polyline
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-text"
            points={points}
          />
        </svg>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 select-none">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <LayoutDashboard className="w-5 h-5 text-primary" />
              <h1 className="text-[24px] sm:text-[28px] font-semibold text-text tracking-tight">
                Platform Overview
              </h1>
            </div>
            <p className="text-[13px] text-muted">
              Live statistics, verification pipelines, moderation queues, and user activity.
            </p>
          </div>

          {/* Quick Action Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/dashboard/admin/listings"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface border border-border hover:border-text/50 text-[12px] font-medium text-text transition-colors"
            >
              <span>Moderation Queue</span>
              {totals.pendingReviews > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-accent text-white text-[10px] font-semibold">
                  {totals.pendingReviews}
                </span>
              )}
            </Link>
            <Link
              to="/dashboard/admin/dealers"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface border border-border hover:border-text/50 text-[12px] font-medium text-text transition-colors"
            >
              <span>Dealers</span>
              {totals.pendingVerifications > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-warning text-white text-[10px] font-semibold">
                  {totals.pendingVerifications}
                </span>
              )}
            </Link>
            <Link
              to="/dashboard/admin/reports"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface border border-border hover:border-text/50 text-[12px] font-medium text-text transition-colors"
            >
              <span>Reports</span>
              {totals.reportedItems > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-danger text-white text-[10px] font-semibold">
                  {totals.reportedItems}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Action Banners for Pending Work */}
        {(totals.pendingReviews > 0 || totals.pendingVerifications > 0 || totals.reportedItems > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {totals.pendingReviews > 0 && (
              <Link
                to="/dashboard/admin/listings?status=pending_review"
                className="p-4 rounded-[20px] bg-accent/10 border border-accent/20 flex items-center justify-between hover:bg-accent/15 transition-colors group"
              >
                <div>
                  <div className="text-[11px] font-semibold text-accent uppercase tracking-wider">
                    Listings Pending Review
                  </div>
                  <div className="text-[20px] font-medium text-text mt-0.5">
                    {totals.pendingReviews} awaiting approval
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-accent group-hover:translate-x-1 transition-transform" />
              </Link>
            )}
            {totals.pendingVerifications > 0 && (
              <Link
                to="/dashboard/admin/dealers"
                className="p-4 rounded-[20px] bg-warning/10 border border-warning/20 flex items-center justify-between hover:bg-warning/15 transition-colors group"
              >
                <div>
                  <div className="text-[11px] font-semibold text-warning uppercase tracking-wider">
                    Dealer Verifications
                  </div>
                  <div className="text-[20px] font-medium text-text mt-0.5">
                    {totals.pendingVerifications} documents submitted
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-warning group-hover:translate-x-1 transition-transform" />
              </Link>
            )}
            {totals.reportedItems > 0 && (
              <Link
                to="/dashboard/admin/reports"
                className="p-4 rounded-[20px] bg-danger/10 border border-danger/20 flex items-center justify-between hover:bg-danger/15 transition-colors group"
              >
                <div>
                  <div className="text-[11px] font-semibold text-danger uppercase tracking-wider">
                    Flagged Reports
                  </div>
                  <div className="text-[20px] font-medium text-text mt-0.5">
                    {totals.reportedItems} unresolved reports
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-danger group-hover:translate-x-1 transition-transform" />
              </Link>
            )}
          </div>
        )}

        {/* 4 Stat Cards per UI 8.8 (40px/300 number, 11px muted label, SVG sparkline) */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-[20px]" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Registered Users & Sparkline */}
            <div className="p-5 rounded-[20px] bg-surface border border-border shadow-xs flex flex-col justify-between">
              <div>
                <div className="text-[11px] font-medium tracking-wider uppercase text-muted mb-1 flex items-center justify-between">
                  <span>Registered Users</span>
                  <Users className="w-3.5 h-3.5 text-muted" />
                </div>
                <div className="text-[40px] font-light leading-none tracking-tight text-text">
                  {totals.users ?? 0}
                </div>
                <div className="text-[11px] text-muted mt-1">
                  {totals.owners ?? 0} sellers · {totals.dealers ?? 0} dealers
                </div>
              </div>
              {renderSparkline(sparklineUsers)}
            </div>

            {/* Card 2: Catalog Listings & Sparkline */}
            <div className="p-5 rounded-[20px] bg-surface border border-border shadow-xs flex flex-col justify-between">
              <div>
                <div className="text-[11px] font-medium tracking-wider uppercase text-muted mb-1 flex items-center justify-between">
                  <span>Active Listings</span>
                  <Tag className="w-3.5 h-3.5 text-muted" />
                </div>
                <div className="text-[40px] font-light leading-none tracking-tight text-text">
                  {(totals.activeSaleListings || 0) + (totals.activeRentalListings || 0)}
                </div>
                <div className="text-[11px] text-muted mt-1">
                  {totals.activeSaleListings ?? 0} sale · {totals.activeRentalListings ?? 0} rental
                </div>
              </div>
              {renderSparkline(sparklineListings)}
            </div>

            {/* Card 3: Purchase Offers */}
            <div className="p-5 rounded-[20px] bg-surface border border-border shadow-xs flex flex-col justify-between">
              <div>
                <div className="text-[11px] font-medium tracking-wider uppercase text-muted mb-1 flex items-center justify-between">
                  <span>Purchase Offers</span>
                  <HandCoins className="w-3.5 h-3.5 text-muted" />
                </div>
                <div className="text-[40px] font-light leading-none tracking-tight text-text">
                  {totals.offers ?? 0}
                </div>
                <div className="text-[11px] text-muted mt-1">
                  {totals.soldVehicles ?? 0} vehicles marked sold
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-border/40 text-[10px] text-muted flex items-center justify-between">
                <span>Sale pipeline</span>
                <Link to="/dashboard/admin/offers" className="hover:text-text underline">
                  View offers
                </Link>
              </div>
            </div>

            {/* Card 4: Rental Bookings */}
            <div className="p-5 rounded-[20px] bg-surface border border-border shadow-xs flex flex-col justify-between">
              <div>
                <div className="text-[11px] font-medium tracking-wider uppercase text-muted mb-1 flex items-center justify-between">
                  <span>Rental Bookings</span>
                  <Calendar className="w-3.5 h-3.5 text-muted" />
                </div>
                <div className="text-[40px] font-light leading-none tracking-tight text-text">
                  {totals.bookings ?? 0}
                </div>
                <div className="text-[11px] text-muted mt-1">
                  Completed & active reservations
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-border/40 text-[10px] text-muted flex items-center justify-between">
                <span>Rental operations</span>
                <Link to="/dashboard/admin/bookings" className="hover:text-text underline">
                  View bookings
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* 2-Column Section: Popular Models & Most Viewed Listings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Popular Brands & Models */}
          <div className="p-6 rounded-[24px] bg-surface border border-border shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[16px] font-semibold text-text tracking-tight flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Popular Inventory
                </h2>
                <span className="text-[11px] text-muted">By total registered vehicles</span>
              </div>

              <div className="space-y-4">
                {/* Brands row */}
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted block mb-2">
                    Top Brands
                  </span>
                  {popularBrands.length === 0 ? (
                    <p className="text-[12px] text-muted italic">No vehicle data yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {popularBrands.map(b => (
                        <div
                          key={b.brand}
                          className="px-3 py-1.5 rounded-full bg-tile border border-border text-[12px] font-medium text-text flex items-center gap-2"
                        >
                          <span>{b.brand}</span>
                          <span className="px-1.5 py-0.2 rounded-full bg-surface text-muted text-[10px] font-semibold">
                            {b.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Models list */}
                <div className="pt-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted block mb-2">
                    Top Models
                  </span>
                  {popularModels.length === 0 ? (
                    <p className="text-[12px] text-muted italic">No model data yet.</p>
                  ) : (
                    <div className="divide-y divide-border/60">
                      {popularModels.map(m => (
                        <div
                          key={`${m.brand}-${m.model}`}
                          className="py-2.5 flex items-center justify-between text-[12px]"
                        >
                          <span className="font-medium text-text">
                            {m.brand} {m.model}
                          </span>
                          <span className="text-muted font-mono">{m.count} vehicles</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Most Viewed Listings */}
          <div className="p-6 rounded-[24px] bg-surface border border-border shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[16px] font-semibold text-text tracking-tight flex items-center gap-2">
                  <Eye className="w-4 h-4 text-primary" />
                  Most Viewed Listings
                </h2>
                <span className="text-[11px] text-muted">Debounced view counts</span>
              </div>

              {mostViewedListings.length === 0 ? (
                <div className="py-8 text-center text-muted text-[12px] italic">
                  No public views recorded yet.
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {mostViewedListings.map(l => (
                    <div
                      key={l.id}
                      className="py-3 flex items-center justify-between gap-3 text-[12px]"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-tile border border-border overflow-hidden shrink-0 flex items-center justify-center p-0.5">
                          <img
                            src={l.vehicle?.image || '/placeholders/sedan.svg'}
                            alt=""
                            className="w-full h-full object-contain"
                            onError={e => {
                              e.currentTarget.src = '/placeholders/sedan.svg';
                            }}
                          />
                        </div>
                        <div className="min-w-0">
                          <Link
                            to={`/listings/${l.id}`}
                            className="font-semibold text-text hover:underline truncate block"
                          >
                            {l.vehicle?.year} {l.vehicle?.brand} {l.vehicle?.model}
                          </Link>
                          <p className="text-[11px] text-muted capitalize">
                            {l.purpose} · {formatRupees(l.price)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-full bg-tile text-text text-[11px] font-semibold">
                        <Eye className="w-3.5 h-3.5 text-muted" />
                        <span>{l.viewCount}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-border/40 mt-4 text-right">
              <Link
                to="/dashboard/admin/listings"
                className="text-[11px] text-muted hover:text-text underline"
              >
                Go to listings queue →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default AdminDashboardPage;
