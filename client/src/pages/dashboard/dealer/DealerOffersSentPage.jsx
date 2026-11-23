import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  Tag,
  Car,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  ShieldCheck,
  ChevronRight,
  HandCoins,
} from 'lucide-react';
import { DashboardLayout } from '../../../components/dashboard/DashboardLayout';
import { StatusChip } from '../../../components/ui/StatusChip';
import { Button } from '../../../components/ui/Button';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { useToast } from '../../../context/ToastContext';
import { formatRupees } from '../../../utils/money';

export function DealerOffersSentPage() {
  const { addToast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [acquireModalOffer, setAcquireModalOffer] = useState(null);
  const [acquireNotes, setAcquireNotes] = useState('');

  // Fetch offers sent by this dealer
  const {
    data: offersData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['dealer-sent-offers'],
    queryFn: async () => {
      const res = await fetch('/api/offers/my-offers', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load sent offers');
      const json = await res.json();
      return json.data || { items: [], total: 0 };
    },
    refetchInterval: 30000,
  });

  const offers = offersData?.items || [];

  // Initiate Acquisition mutation
  const acquireMutation = useMutation({
    mutationFn: async ({ offerId, notes }) => {
      const res = await fetch('/api/transactions/acquire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ offerId, notes }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to initiate acquisition');
      }
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['dealer-sent-offers']);
      queryClient.invalidateQueries(['dealer-inventory']);
      setAcquireModalOffer(null);
      setAcquireNotes('');
      addToast(
        'Vehicle acquisition initiated! Awaiting final owner handover confirmation.',
        'success'
      );
    },
    onError: err => {
      addToast(err.message || 'Acquisition initiation failed', 'error');
    },
  });

  const handleAcquireSubmit = e => {
    e.preventDefault();
    if (!acquireModalOffer) return;
    acquireMutation.mutate({
      offerId: acquireModalOffer._id || acquireModalOffer.id,
      notes: acquireNotes,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 select-none">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <HandCoins className="w-5 h-5 text-primary" />
              <h1 className="text-[24px] sm:text-[28px] font-semibold text-text tracking-tight">
                Dealer Purchase Offers & Acquisitions
              </h1>
            </div>
            <p className="text-[13px] text-muted">
              Track purchase proposals made to private vehicle sellers and manage acquisition completions.
            </p>
          </div>

          <Link to="/dashboard/discover">
            <Button variant="secondary" size="md" className="rounded-full text-[12px]">
              <span>Discover Vehicles</span>
              <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
        </div>

        {/* Offers List */}
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-[22px]" />
            ))}
          </div>
        ) : offers.length === 0 ? (
          <div className="p-16 rounded-[28px] bg-surface border border-border text-center">
            <EmptyState
              icon={Tag}
              title="No purchase offers sent yet"
              description="Browse the Discover Owner Listings feed and send competitive purchase offers directly to individual owners."
              actionLabel="Discover Vehicles"
              onAction={() => navigate('/dashboard/discover')}
            />
          </div>
        ) : (
          <div className="space-y-4">
            {offers.map(offer => {
              const offerId = offer.id || offer._id;
              const vehicle = offer.listing?.vehicleRef || {};
              const vehicleTitle =
                `${vehicle.brand || ''} ${vehicle.model || ''} ${vehicle.variant || ''}`.trim() ||
                'Vehicle';
              const isAccepted = offer.status === 'accepted';

              return (
                <div
                  key={offerId}
                  className="p-5 sm:p-6 rounded-[24px] bg-surface border border-border hover:border-text/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm"
                >
                  {/* Left: Vehicle and Offer details */}
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-tile border border-border overflow-hidden shrink-0 flex items-center justify-center p-1">
                      <img
                        src={vehicle.images?.[0]?.url || '/placeholders/sedan.svg'}
                        alt=""
                        className="w-full h-full object-contain"
                        onError={e => {
                          e.currentTarget.src = '/placeholders/sedan.svg';
                        }}
                      />
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="text-[15px] font-semibold text-text">
                          {vehicleTitle}
                        </h3>
                        <StatusChip status={offer.status} />
                      </div>

                      <p className="text-[12px] text-muted">
                        Offered:{' '}
                        <strong className="text-text font-bold text-[13px]">
                          {formatRupees(offer.amount)}
                        </strong>{' '}
                        • Listing Asking:{' '}
                        <span>
                          {offer.listing?.sale?.askingPrice
                            ? formatRupees(offer.listing.sale.askingPrice)
                            : '—'}
                        </span>
                      </p>

                      {offer.message && (
                        <p className="text-[11px] text-muted italic mt-1 line-clamp-1">
                          &ldquo;{offer.message}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex flex-wrap items-center gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-border/60 justify-end shrink-0">
                    <Link to={`/negotiations/${offerId}`}>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="rounded-full text-[12px] h-8 px-4"
                      >
                        <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                        <span>Negotiation Thread</span>
                      </Button>
                    </Link>

                    {/* If accepted, dealer can initiate acquisition */}
                    {isAccepted && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setAcquireModalOffer(offer);
                          setAcquireNotes('');
                        }}
                        className="rounded-full text-[12px] h-8 px-4"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                        <span>Initiate Acquisition</span>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal: Initiate Acquisition */}
        {acquireModalOffer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in select-none">
            <div className="w-full max-w-md p-6 rounded-[28px] bg-surface border border-border shadow-2xl">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                <h3 className="text-[18px] font-semibold text-text tracking-tight">
                  Initiate Vehicle Acquisition
                </h3>
              </div>
              <p className="text-[12px] text-muted mb-4 leading-relaxed">
                Confirm your intent to acquire this vehicle from the owner at the accepted price of{' '}
                <strong className="text-text font-bold">
                  {formatRupees(acquireModalOffer.amount)}
                </strong>
                . Upon seller handover confirmation, ownership will transfer to your dealership.
              </p>

              <form onSubmit={handleAcquireSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-medium text-muted mb-1">
                    Acquisition Notes / Handover Details
                  </label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Physical vehicle inspection passed, scheduled RTO paperwork transfer..."
                    value={acquireNotes}
                    onChange={e => setAcquireNotes(e.target.value)}
                    className="w-full p-3 rounded-xl bg-tile border border-border text-[12px] text-text focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setAcquireModalOffer(null)}
                    disabled={acquireMutation.isPending}
                    className="rounded-full"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={acquireMutation.isPending}
                    className="rounded-full px-5"
                  >
                    {acquireMutation.isPending ? 'Initiating...' : 'Confirm Acquisition'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default DealerOffersSentPage;
