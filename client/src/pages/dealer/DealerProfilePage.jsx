import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  ChevronLeft,
  ShieldCheck,
  Car,
  Calendar,
  Share2,
  Flag,
} from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { Footer } from '../../components/layout/Footer';
import { VehicleCard } from '../../components/vehicle/VehicleCard';
import { StatusChip } from '../../components/ui/StatusChip';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ReportModal } from '../../components/report/ReportModal';
import { useToast } from '../../context/ToastContext';

export function DealerProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { addToast } = useToast();
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Fetch Dealer details
  const {
    data: dealer,
    isLoading: isDealerLoading,
    error: dealerError,
  } = useQuery({
    queryKey: ['dealer-profile', id],
    queryFn: async () => {
      const res = await fetch(`/api/dealers/${id}`);
      if (!res.ok) throw new Error('Dealership not found');
      const json = await res.json();
      return json.data;
    },
    enabled: !!id,
  });

  // Fetch Dealer's public listings
  const {
    data: listingsData,
    isLoading: isListingsLoading,
  } = useQuery({
    queryKey: ['dealer-listings', id],
    queryFn: async () => {
      const res = await fetch(`/api/dealers/${id}/listings`);
      if (!res.ok) return { items: [], total: 0 };
      const json = await res.json();
      return json.data || { items: [], total: 0 };
    },
    enabled: !!id,
  });

  const listings = listingsData?.items || [];
  const totalCount = listingsData?.total || listings.length;

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: dealer?.dealershipName || 'Dealership on Roam',
        url: window.location.href,
      }).catch(() => { });
    } else {
      navigator.clipboard.writeText(window.location.href);
      addToast('Dealership link copied to clipboard', 'info');
    }
  };

  const isDealerOwner =
    isAuthenticated &&
    user &&
    dealer &&
    (dealer.user === user.id ||
      dealer.user === user._id ||
      dealer.userId === user.id ||
      (user.dealerId && (dealer.id === user.dealerId || dealer._id === user.dealerId)));

  const handleReportClick = () => {
    if (!isAuthenticated) {
      navigate(`/login?redirect=/dealers/${id}`);
      return;
    }
    setIsReportModalOpen(true);
  };

  if (isDealerLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-bg text-text">
        <Header activeNav="Dealers" />
        <main className="flex-1 max-w-container mx-auto w-full px-4 sm:px-8 lg:px-16 py-10">
          <Skeleton className="w-32 h-6 mb-6" />
          <div className="p-8 rounded-[28px] bg-surface border border-border/70 mb-10">
            <div className="flex gap-6 items-center">
              <Skeleton className="w-20 h-20 rounded-2xl shrink-0" />
              <div className="space-y-3 w-full">
                <Skeleton className="w-1/3 h-7" />
                <Skeleton className="w-1/4 h-4" />
                <Skeleton className="w-1/2 h-4" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-80 rounded-[24px]" />
            ))}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (dealerError || !dealer) {
    return (
      <div className="min-h-screen flex flex-col bg-bg text-text">
        <Header activeNav="Dealers" />
        <main className="flex-1 max-w-container mx-auto w-full px-4 sm:px-8 lg:px-16 py-16 flex items-center justify-center">
          <EmptyState
            icon={Building2}
            title="Dealership Not Found"
            description="The requested dealer profile does not exist or is not publicly accessible."
            actionLabel="Back to Directory"
            onAction={() => window.location.assign('/dealers')}
          />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-bg text-text">
      <Header activeNav="Dealers" />

      <main className="flex-1 max-w-container mx-auto w-full px-4 sm:px-8 lg:px-16 py-8 sm:py-12">
        {/* Breadcrumb Navigation */}
        <div className="mb-6">
          <Link
            to="/dealers"
            className="inline-flex items-center gap-1.5 text-[12px] text-muted hover:text-text transition-colors select-none"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>All Dealerships</span>
          </Link>
        </div>

        {/* Dealership Banner Card */}
        <div className="p-6 sm:p-10 rounded-[28px] bg-surface border border-border/70 shadow-sm relative overflow-hidden mb-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            {/* Left: Identity */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <div className="w-20 h-20 rounded-2xl bg-tile border border-border/80 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
                {dealer.logo ? (
                  <img
                    src={dealer.logo}
                    alt={dealer.dealershipName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Building2 className="w-9 h-9 text-muted" />
                )}
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <h1 className="text-[24px] sm:text-[28px] font-medium tracking-tight text-text">
                    {dealer.dealershipName}
                  </h1>
                  <StatusChip
                    status={dealer.verificationStatus || 'approved'}
                    label={dealer.verificationStatus === 'approved' ? 'Verified Partner' : dealer.verificationStatus}
                  />
                </div>

                <p className="text-[13px] text-muted flex flex-wrap items-center gap-x-4 gap-y-1">
                  {dealer.ownerName && <span>Managed by {dealer.ownerName}</span>}
                  {dealer.city && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-muted/80" />
                      {dealer.city}{dealer.pincode ? `, ${dealer.pincode}` : ''}
                    </span>
                  )}
                </p>

                {dealer.address && (
                  <p className="text-[12px] text-muted/80 mt-1 max-w-lg">
                    {dealer.address}
                  </p>
                )}
              </div>
            </div>

            {/* Right: Actions & Contacts */}
            <div className="flex flex-wrap md:flex-col items-start md:items-end gap-3 shrink-0 pt-4 md:pt-0 border-t md:border-t-0 border-border/50">
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleShare}
                  className="rounded-full"
                >
                  <Share2 className="w-3.5 h-3.5 mr-1.5" />
                  Share
                </Button>
                {!isDealerOwner && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleReportClick}
                    className="rounded-full text-[11px] text-muted hover:text-danger hover:bg-danger/10"
                  >
                    <Flag className="w-3.5 h-3.5 mr-1 text-danger" />
                    Report
                  </Button>
                )}
              </div>

              <div className="flex flex-col gap-1 text-[12px] text-muted md:text-right">
                {dealer.phone && (
                  <a
                    href={`tel:${dealer.phone}`}
                    className="inline-flex items-center md:justify-end gap-1.5 hover:text-text transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>{dealer.phone}</span>
                  </a>
                )}
                {dealer.businessEmail && (
                  <a
                    href={`mailto:${dealer.businessEmail}`}
                    className="inline-flex items-center md:justify-end gap-1.5 hover:text-text transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>{dealer.businessEmail}</span>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          {dealer.description && (
            <div className="mt-8 pt-6 border-t border-border/50">
              <h2 className="text-[12px] font-semibold uppercase tracking-wider text-muted mb-2">
                About Dealership
              </h2>
              <p className="text-[13px] sm:text-[14px] text-text/90 leading-relaxed max-w-3xl">
                {dealer.description}
              </p>
            </div>
          )}
        </div>

        {/* Showroom / Inventory Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-border/60">
            <div>
              <h2 className="text-[20px] sm:text-[24px] font-light tracking-tight text-text">
                Showroom Inventory
              </h2>
              <p className="text-[12px] text-muted mt-0.5">
                {totalCount} {totalCount === 1 ? 'vehicle' : 'vehicles'} available for direct purchase or rental
              </p>
            </div>
          </div>

          {isListingsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-80 rounded-[24px]" />
              ))}
            </div>
          ) : listings.length === 0 ? (
            <div className="py-16 bg-surface/50 rounded-[24px] border border-border/60">
              <EmptyState
                icon={Car}
                title="No vehicles currently in showroom"
                description="This dealership has not published any active listings yet or all vehicles have recently been sold."
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
              {listings.map(item => (
                <VehicleCard
                  key={item.id || item._id}
                  vehicle={item.vehicle || item.vehicleRef || {}}
                  listing={item}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Report Modal */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        subjectType="dealer"
        subjectRef={dealer.id || dealer._id || id}
        subjectTitle={dealer.dealershipName}
      />

      <Footer />
    </div>
  );
}

export default DealerProfilePage;
