import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  Car,
  ShieldCheck,
  ArrowRight,
  Activity,
  Clock,
  Tag,
  MessageSquare,
  Check,
  X,
  RotateCcw,
  CheckCircle2,
  Lock,
  Unlock,
  AlertCircle,
  Building2,
  Calendar,
} from 'lucide-react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { StatusChip } from '../../components/ui/StatusChip';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { formatRupees, rupeesToPaise } from '../../utils/money';

export function DashboardPage() {
  const { user, hasCapability, addCapability } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isUpgrading, setIsUpgrading] = useState(false);
  const [counterModalOffer, setCounterModalOffer] = useState(null);
  const [counterRupees, setCounterRupees] = useState('');
  const [completeModalOffer, setCompleteModalOffer] = useState(null);
  const [finalAmountRupees, setFinalAmountRupees] = useState('');
  const [completionNotes, setCompletionNotes] = useState('');

  // 1. Fetch Buyer Data
  const { data: myOffersData, isLoading: offersLoading } = useQuery({
    queryKey: ['my-offers'],
    queryFn: async () => {
      const res = await fetch('/api/offers/my-offers?limit=10', { credentials: 'include' });
      if (!res.ok) return { items: [], total: 0 };
      const json = await res.json();
      return json.data || { items: [], total: 0 };
    },
    refetchInterval: 30000,
  });

  const { data: myEnquiriesData, isLoading: enquiriesLoading } = useQuery({
    queryKey: ['my-enquiries-sent'],
    queryFn: async () => {
      const res = await fetch('/api/enquiries?type=sent&limit=10', { credentials: 'include' });
      if (!res.ok) return { items: [], total: 0 };
      const json = await res.json();
      return json.data || { items: [], total: 0 };
    },
    refetchInterval: 30000,
  });

  // 2. Fetch Seller Data (if seller capability active)
  const isSeller = hasCapability('seller');

  const { data: receivedOffersData, isLoading: recOffersLoading } = useQuery({
    queryKey: ['received-offers'],
    queryFn: async () => {
      const res = await fetch('/api/offers/received?limit=10', { credentials: 'include' });
      if (!res.ok) return { items: [], total: 0 };
      const json = await res.json();
      return json.data || { items: [], total: 0 };
    },
    enabled: isSeller,
    refetchInterval: 30000,
  });

  const { data: receivedEnquiriesData } = useQuery({
    queryKey: ['received-enquiries'],
    queryFn: async () => {
      const res = await fetch('/api/enquiries?type=received&limit=10', { credentials: 'include' });
      if (!res.ok) return { items: [], total: 0 };
      const json = await res.json();
      return json.data || { items: [], total: 0 };
    },
    enabled: isSeller,
    refetchInterval: 30000,
  });

  const { data: myListingsData } = useQuery({
    queryKey: ['my-listings-summary'],
    queryFn: async () => {
      const res = await fetch('/api/listings/my', { credentials: 'include' });
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    },
    enabled: isSeller,
  });

  // 3. Fetch Rental Data (Sprint 6)
  const isRenter = hasCapability('renter');
  const isDealer = hasCapability('dealer');

  const { data: myBookingsData } = useQuery({
    queryKey: ['my-bookings-summary'],
    queryFn: async () => {
      const res = await fetch('/api/bookings?role=renter&limit=5', { credentials: 'include' });
      if (!res.ok) return { items: [], total: 0 };
      const json = await res.json();
      return json.data || { items: [], total: 0 };
    },
    enabled: isRenter,
    refetchInterval: 30000,
  });

  const { data: incomingBookingsData } = useQuery({
    queryKey: ['incoming-bookings-summary'],
    queryFn: async () => {
      const res = await fetch('/api/bookings?role=owner&limit=5', { credentials: 'include' });
      if (!res.ok) return { items: [], total: 0 };
      const json = await res.json();
      return json.data || { items: [], total: 0 };
    },
    enabled: isSeller || isDealer,
    refetchInterval: 30000,
  });

  const myBookings = myBookingsData?.items || [];
  const incomingBookings = incomingBookingsData?.items || [];

  // Mutations
  const offerActionMutation = useMutation({
    mutationFn: async ({ offerId, status, message }) => {
      const res = await fetch(`/api/offers/${offerId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status, message }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to update offer');
      return json.data;
    },
    onSuccess: updated => {
      addToast({
        type: 'success',
        title: 'Offer Updated',
        message: `Offer status is now ${updated.status}.`,
      });
      queryClient.invalidateQueries({ queryKey: ['received-offers'] });
      queryClient.invalidateQueries({ queryKey: ['my-offers'] });
    },
    onError: err => {
      addToast({ type: 'error', title: 'Action Failed', message: err.message });
    },
  });

  const counterMutation = useMutation({
    mutationFn: async ({ offerId, amount, message }) => {
      const res = await fetch(`/api/offers/${offerId}/counter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ amount, message }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to send counteroffer');
      return json.data;
    },
    onSuccess: () => {
      addToast({ type: 'success', title: 'Counteroffer Sent', message: 'Counteroffer sent to buyer.' });
      setCounterModalOffer(null);
      queryClient.invalidateQueries({ queryKey: ['received-offers'] });
    },
    onError: err => {
      addToast({ type: 'error', title: 'Error', message: err.message });
    },
  });

  const reservationMutation = useMutation({
    mutationFn: async ({ listingId, action }) => {
      const res = await fetch(`/api/listings/${listingId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to update reservation');
      return json.data;
    },
    onSuccess: (_, variables) => {
      addToast({
        type: 'success',
        title: 'Listing Status Updated',
        message: `Listing is now ${variables.action === 'reserve' ? 'Reserved' : 'Active'}.`,
      });
      queryClient.invalidateQueries({ queryKey: ['my-listings-summary'] });
    },
    onError: err => {
      addToast({ type: 'error', title: 'Action Failed', message: err.message });
    },
  });

  const completeSaleMutation = useMutation({
    mutationFn: async ({ offerId, finalAmount, notes }) => {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ offerId, finalAmount, notes }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to complete sale');
      return json.data;
    },
    onSuccess: () => {
      addToast({
        type: 'success',
        title: 'Sale Completed',
        message: 'Transaction recorded and vehicle marked as sold!',
      });
      setCompleteModalOffer(null);
      queryClient.invalidateQueries({ queryKey: ['received-offers'] });
      queryClient.invalidateQueries({ queryKey: ['my-listings-summary'] });
    },
    onError: err => {
      addToast({ type: 'error', title: 'Error', message: err.message });
    },
  });

  const handleAddSeller = async () => {
    setIsUpgrading(true);
    try {
      await addCapability('seller');
      addToast({
        type: 'success',
        title: 'Capability Added',
        message: 'You now hold the Seller capability. Listing creation is active.',
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Error',
        message: err.message || 'Failed to add capability',
      });
    } finally {
      setIsUpgrading(false);
    }
  };

  const myOffers = myOffersData?.items || [];
  const myEnquiries = myEnquiriesData?.items || [];
  const receivedOffers = receivedOffersData?.items || [];
  const receivedEnquiries = receivedEnquiriesData?.items || [];
  const myListings = myListingsData || [];

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8">
        {/* Top Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-[24px] bg-surface border border-border">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">
                Dashboard Overview
              </span>
              <StatusChip status="Available" label={user?.accountStatus || 'Active'} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-text">
              Welcome back, {user?.fullName}
            </h1>
            <p className="text-[13px] text-muted mt-1">
              Registered email: <strong className="text-text">{user?.email}</strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {user?.capabilities?.map(c => (
              <span
                key={c}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold bg-tile text-text capitalize"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-muted" />
                <span>{c}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Stat Cards per UI 8.8 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-6 rounded-[24px] bg-surface border border-border">
            <span className="text-[11px] font-medium text-muted uppercase tracking-wide block mb-2">
              My Active Offers
            </span>
            <div className="text-4xl font-light text-text tracking-tight">
              {myOffers.filter(o => ['submitted', 'pending', 'counteroffer_made', 'accepted'].includes(o.status)).length}
            </div>
            <span className="text-[10px] text-muted mt-2 block">Offers in progress</span>
          </div>

          <div className="p-6 rounded-[24px] bg-surface border border-border">
            <span className="text-[11px] font-medium text-muted uppercase tracking-wide block mb-2">
              My Enquiries Sent
            </span>
            <div className="text-4xl font-light text-text tracking-tight">
              {myEnquiries.length}
            </div>
            <span className="text-[10px] text-muted mt-2 block">Vehicles enquired</span>
          </div>

          <div className="p-6 rounded-[24px] bg-surface border border-border">
            <span className="text-[11px] font-medium text-muted uppercase tracking-wide block mb-2">
              Active Listings
            </span>
            <div className="text-4xl font-light text-text tracking-tight">
              {isSeller ? myListings.filter(l => l.sale?.status === 'active' || l.sale?.status === 'reserved').length : '—'}
            </div>
            <span className="text-[10px] text-muted mt-2 block">
              {isSeller ? 'Live on marketplace' : 'Seller capability inactive'}
            </span>
          </div>

          <div className="p-6 rounded-[24px] bg-surface border border-border">
            <span className="text-[11px] font-medium text-muted uppercase tracking-wide block mb-2">
              Incoming Offers
            </span>
            <div className="text-4xl font-light text-text tracking-tight">
              {isSeller ? receivedOffers.filter(o => ['submitted', 'pending', 'counteroffer_made'].includes(o.status)).length : '—'}
            </div>
            <span className="text-[10px] text-muted mt-2 block">
              {isSeller ? 'Awaiting response' : 'Seller capability inactive'}
            </span>
          </div>
        </div>

        {/* OWNER WIDGET 1: Incoming Offers with Quick Actions (UI Section 8.8) */}
        {isSeller && (
          <div className="p-6 sm:p-8 rounded-[24px] bg-surface border border-border shadow-card">
            <div className="flex items-center justify-between pb-4 border-b border-border mb-6">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-accent" />
                <h2 className="text-[18px] font-semibold text-text">Incoming Purchase Offers</h2>
              </div>
              <span className="text-[12px] text-muted">
                {receivedOffers.length} {receivedOffers.length === 1 ? 'offer' : 'offers'} received
              </span>
            </div>

            {recOffersLoading ? (
              <div className="flex flex-col gap-3">
                <Skeleton className="h-20 w-full rounded-[20px]" />
                <Skeleton className="h-20 w-full rounded-[20px]" />
              </div>
            ) : receivedOffers.length === 0 ? (
              <div className="p-8 text-center text-muted text-[13px] bg-tile rounded-[20px]">
                No incoming purchase offers yet. They will appear here when buyers make offers on your listings.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {receivedOffers.map(offer => {
                  const vehicle = offer.listing?.vehicleRef || {};
                  const vehicleTitle = `${vehicle.brand || ''} ${vehicle.model || ''} ${vehicle.variant || ''}`.trim() || 'Vehicle';
                  const isAwaitingSeller = offer.status === 'submitted' || (offer.status === 'counteroffer_made' && offer.awaitingResponseFrom === 'seller');

                  return (
                    <div
                      key={offer._id}
                      className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 sm:p-5 rounded-[20px] bg-tile border border-border hover:border-text/30 transition-colors"
                    >
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div className="w-12 h-12 rounded-[14px] bg-surface border border-border overflow-hidden shrink-0 flex items-center justify-center p-1">
                          <img
                            src={vehicle.images?.[0]?.url || '/placeholders/sedan.svg'}
                            alt=""
                            className="w-full h-full object-contain"
                            onError={e => {
                              e.currentTarget.src = '/placeholders/sedan.svg';
                            }}
                          />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[14px] font-semibold text-text truncate">
                              {vehicleTitle}
                            </span>
                            <StatusChip status={offer.status} />
                            {offer.isBelowMinimum && (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500">
                                Below Minimum
                              </span>
                            )}
                          </div>
                          {offer.dealerSummary ? (
                            <div className="mt-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                  <Building2 className="w-3 h-3" />
                                  Dealer Offer
                                </span>
                                <Link
                                  to={`/dealers/${offer.dealerSummary.id || offer.dealerSummary._id}`}
                                  className="text-[12px] font-semibold text-text hover:underline"
                                >
                                  {offer.dealerSummary.dealershipName}
                                </Link>
                                <span className="text-[11px] text-muted">
                                  ({offer.dealerSummary.city})
                                </span>
                              </div>
                              <p className="text-[12px] text-muted mt-0.5">
                                Offered:{' '}
                                <strong className="text-text font-bold text-[13px]">{formatRupees(offer.amount)}</strong>
                              </p>
                            </div>
                          ) : (
                            <p className="text-[12px] text-muted mt-0.5">
                              Buyer: <strong className="text-text">{offer.offeredBy?.fullName}</strong> • Offered:{' '}
                              <strong className="text-text font-bold text-[13px]">{formatRupees(offer.amount)}</strong>
                            </p>
                          )}
                          {offer.message && (
                            <p className="text-[11px] text-muted italic mt-1 line-clamp-1">
                              &ldquo;{offer.message}&rdquo;
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Action Cluster (Accept / Counter / Decline / Mark Sold) */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {isAwaitingSeller && (
                          <>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => offerActionMutation.mutate({ offerId: offer._id, status: 'accepted' })}
                              disabled={offerActionMutation.isPending}
                              className="rounded-full px-3.5 text-[11px] h-8"
                            >
                              <Check className="w-3.5 h-3.5 mr-1" />
                              Accept
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                setCounterModalOffer(offer);
                                setCounterRupees(offer.amount / 100);
                              }}
                              className="rounded-full px-3.5 text-[11px] h-8"
                            >
                              <RotateCcw className="w-3.5 h-3.5 mr-1" />
                              Counter
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => offerActionMutation.mutate({ offerId: offer._id, status: 'rejected' })}
                              disabled={offerActionMutation.isPending}
                              className="rounded-full px-3.5 text-[11px] h-8 text-danger hover:bg-danger/10"
                            >
                              <X className="w-3.5 h-3.5 mr-1" />
                              Decline
                            </Button>
                          </>
                        )}

                        {offer.status === 'accepted' && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              setCompleteModalOffer(offer);
                              setFinalAmountRupees(offer.amount / 100);
                            }}
                            className="rounded-full px-4 text-[11px] h-8 bg-success hover:bg-success/90"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                            Mark as Sold
                          </Button>
                        )}

                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => navigate(`/negotiations/${offer._id}`)}
                          className="rounded-full px-3.5 text-[11px] h-8"
                        >
                          View Thread
                          <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* OWNER WIDGET 2: Active Listings with Reserve / Unreserve Control (UI Section 8.8) */}
        {isSeller && myListings.length > 0 && (
          <div className="p-6 sm:p-8 rounded-[24px] bg-surface border border-border shadow-card">
            <div className="flex items-center justify-between pb-4 border-b border-border mb-6">
              <div className="flex items-center gap-2">
                <Car className="w-5 h-5 text-primary" />
                <h2 className="text-[18px] font-semibold text-text">Vehicle Reservation Control</h2>
              </div>
              <span className="text-[12px] text-muted">
                Reserve / unreserve vehicle listings directly
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myListings.map(l => {
                const vehicle = l.vehicleRef || {};
                const vTitle = `${vehicle.brand || ''} ${vehicle.model || ''} ${vehicle.variant || ''}`.trim() || 'Vehicle';
                const isListingReserved = l.sale?.status === 'reserved';
                const isListingActive = l.sale?.status === 'active';

                return (
                  <div
                    key={l._id}
                    className="flex items-center justify-between gap-3 p-4 rounded-[20px] bg-tile border border-border"
                  >
                    <div className="min-w-0">
                      <h3 className="text-[14px] font-semibold text-text truncate">{vTitle}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[12px] font-bold text-text">
                          {formatRupees(l.sale?.askingPrice || 0)}
                        </span>
                        <StatusChip status={l.sale?.status || l.moderationStatus} />
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isListingActive && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => reservationMutation.mutate({ listingId: l._id, action: 'reserve' })}
                          disabled={reservationMutation.isPending}
                          className="rounded-full px-3 text-[11px] h-8"
                        >
                          <Lock className="w-3 h-3 mr-1 text-muted" />
                          Reserve
                        </Button>
                      )}

                      {isListingReserved && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => reservationMutation.mutate({ listingId: l._id, action: 'unreserve' })}
                          disabled={reservationMutation.isPending}
                          className="rounded-full px-3 text-[11px] h-8 border-accent text-accent"
                        >
                          <Unlock className="w-3 h-3 mr-1" />
                          Unreserve
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* BUYER WIDGET 1: My Purchase Offers Sent */}
        <div className="p-6 sm:p-8 rounded-[24px] bg-surface border border-border shadow-card">
          <div className="flex items-center justify-between pb-4 border-b border-border mb-6">
            <div className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-muted" />
              <h2 className="text-[18px] font-semibold text-text">My Purchase Offers Sent</h2>
            </div>
            <Link
              to="/browse?purpose=sale"
              className="text-[12px] font-semibold text-accent hover:underline flex items-center gap-1"
            >
              <span>Explore Marketplace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {offersLoading ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-16 w-full rounded-[16px]" />
              <Skeleton className="h-16 w-full rounded-[16px]" />
            </div>
          ) : myOffers.length === 0 ? (
            <div className="p-8 text-center text-muted text-[13px] bg-tile rounded-[20px]">
              You have not submitted any purchase offers yet. Explore vehicles and make an offer to begin negotiations.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {myOffers.map(o => {
                const vehicle = o.listing?.vehicleRef || {};
                const vTitle = `${vehicle.brand || ''} ${vehicle.model || ''} ${vehicle.variant || ''}`.trim() || 'Vehicle';

                return (
                  <div
                    key={o._id}
                    onClick={() => navigate(`/negotiations/${o._id}`)}
                    className="flex items-center justify-between gap-4 p-4 rounded-[18px] bg-tile border border-border hover:border-text/40 transition-colors cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-[14px] font-semibold text-text truncate">{vTitle}</h3>
                        <StatusChip status={o.status} />
                      </div>
                      <p className="text-[12px] text-muted mt-0.5">
                        Offer Amount: <strong className="text-text font-bold">{formatRupees(o.amount)}</strong> • Seller:{' '}
                        {o.seller?.fullName}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] text-muted hidden sm:inline">
                        {new Date(o.createdAt).toLocaleDateString()}
                      </span>
                      <ArrowRight className="w-4 h-4 text-muted" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* BUYER WIDGET 2: My Enquiries Sent */}
        <div className="p-6 sm:p-8 rounded-[24px] bg-surface border border-border shadow-card">
          <div className="flex items-center justify-between pb-4 border-b border-border mb-6">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-muted" />
              <h2 className="text-[18px] font-semibold text-text">My Enquiries Sent</h2>
            </div>
            <span className="text-[12px] text-muted">
              {myEnquiries.length} {myEnquiries.length === 1 ? 'enquiry' : 'enquiries'}
            </span>
          </div>

          {enquiriesLoading ? (
            <Skeleton className="h-24 w-full rounded-[16px]" />
          ) : myEnquiries.length === 0 ? (
            <div className="p-8 text-center text-muted text-[13px] bg-tile rounded-[20px]">
              No enquiries submitted yet. When you enquire about a vehicle, your conversation thread will appear here.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {myEnquiries.map(enq => {
                const vehicle = enq.listing?.vehicleRef || {};
                const vTitle = `${vehicle.brand || ''} ${vehicle.model || ''}`.trim() || 'Vehicle';

                return (
                  <div
                    key={enq._id}
                    onClick={() => navigate(`/enquiries/${enq._id}`)}
                    className="flex items-center justify-between gap-4 p-4 rounded-[18px] bg-tile border border-border hover:border-text/40 transition-colors cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold text-text truncate">
                          {enq.subject}
                        </span>
                        <StatusChip status={enq.status} />
                      </div>
                      <p className="text-[11px] text-muted mt-0.5 truncate">
                        Regarding: <strong className="text-text">{vTitle}</strong> • {enq.message}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] text-muted">
                        {enq.replies?.length || 0} {(enq.replies?.length === 1) ? 'reply' : 'replies'}
                      </span>
                      <ArrowRight className="w-4 h-4 text-muted" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SPRINT 6: RENTER WIDGET: My Bookings */}
        {isRenter && (
          <div className="p-6 sm:p-8 rounded-[24px] bg-surface border border-border shadow-card">
            <div className="flex items-center justify-between pb-4 border-b border-border mb-6">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                <h2 className="text-[18px] font-semibold text-text">My Rental Bookings</h2>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to="/dashboard/bookings">View All</Link>
              </Button>
            </div>

            {myBookings.length === 0 ? (
              <div className="p-8 text-center text-muted text-[13px] bg-tile rounded-[20px]">
                No rental bookings yet. Browse vehicles available for rent to request a trip.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {myBookings.map(b => {
                  const v = b.listing?.vehicleRef || {};
                  return (
                    <div
                      key={b._id}
                      onClick={() => navigate('/dashboard/bookings')}
                      className="flex items-center justify-between gap-4 p-4 rounded-[18px] bg-tile border border-border hover:border-text/40 transition-colors cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-semibold text-text truncate">
                            {v.brand} {v.model} {v.variant}
                          </span>
                          <StatusChip status={b.status} />
                        </div>
                        <p className="text-[11px] text-muted mt-0.5">
                          {new Date(b.startDate).toLocaleDateString()} to {new Date(b.endDate).toLocaleDateString()} ({b.pricing?.days} days) • Total: <strong className="text-text">{formatRupees(b.pricing?.estimatedTotal || 0)}</strong>
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted shrink-0" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* SPRINT 6: OWNER/DEALER WIDGET: Incoming Rental Requests */}
        {(isSeller || isDealer) && (
          <div className="p-6 sm:p-8 rounded-[24px] bg-surface border border-border shadow-card">
            <div className="flex items-center justify-between pb-4 border-b border-border mb-6">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                <h2 className="text-[18px] font-semibold text-text">Rental Booking Requests</h2>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to="/dashboard/rental-requests">Manage Queue</Link>
              </Button>
            </div>

            {incomingBookings.length === 0 ? (
              <div className="p-8 text-center text-muted text-[13px] bg-tile rounded-[20px]">
                No pending rental requests at this time.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {incomingBookings.map(b => {
                  const v = b.listing?.vehicleRef || {};
                  return (
                    <div
                      key={b._id}
                      onClick={() => navigate('/dashboard/rental-requests')}
                      className="flex items-center justify-between gap-4 p-4 rounded-[18px] bg-tile border border-border hover:border-text/40 transition-colors cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-semibold text-text truncate">
                            {v.brand} {v.model}
                          </span>
                          <StatusChip status={b.status} />
                        </div>
                        <p className="text-[11px] text-muted mt-0.5">
                          Requested by {b.renter?.fullName} • {new Date(b.startDate).toLocaleDateString()} to {new Date(b.endDate).toLocaleDateString()} ({b.pricing?.days} days) • {formatRupees(b.pricing?.estimatedTotal || 0)}
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted shrink-0" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Upgrade to Seller Card (if not seller) */}
        {!isSeller && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 p-6 sm:p-8 rounded-[24px] bg-surface border border-border">
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-[16px] bg-tile text-muted shrink-0">
                <Car className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-[18px] font-normal text-text">
                  Want to sell your vehicle on Roam?
                </h3>
                <p className="text-[13px] text-muted mt-1 leading-relaxed max-w-xl">
                  Enable the <strong className="text-text">Seller</strong> capability to list personal vehicles for sale, receive purchase offers, negotiate directly with buyers, and track completions.
                </p>
              </div>
            </div>

            <Button
              variant="primary"
              size="lg"
              disabled={isUpgrading}
              onClick={handleAddSeller}
              className="shrink-0"
            >
              <span>{isUpgrading ? 'Enabling...' : 'Become a Seller'}</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        {/* Counteroffer Modal */}
        {counterModalOffer && (
          <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setCounterModalOffer(null)} />
            <div className="relative z-10 w-full max-w-sm p-6 rounded-[24px] bg-surface text-text border border-border shadow-2xl animate-fade-in">
              <h3 className="text-[16px] font-semibold text-text mb-4">Send Counteroffer</h3>
              <div className="mb-4">
                <label className="block text-[12px] font-medium text-text mb-1">
                  New Counter Amount (₹)
                </label>
                <input
                  type="number"
                  min="1"
                  step="1000"
                  value={counterRupees}
                  onChange={e => setCounterRupees(e.target.value)}
                  className="w-full h-11 px-4 rounded-full bg-bg border border-border text-text font-semibold text-[14px] focus:outline-none focus:ring-2 focus:ring-text"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <Button variant="secondary" size="sm" onClick={() => setCounterModalOffer(null)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    const amt = Number(counterRupees);
                    if (amt > 0) {
                      counterMutation.mutate({
                        offerId: counterModalOffer._id,
                        amount: rupeesToPaise(amt),
                        message: `Counteroffer sent: ₹${amt.toLocaleString('en-IN')}`,
                      });
                    }
                  }}
                  disabled={counterMutation.isPending}
                >
                  {counterMutation.isPending ? 'Sending...' : 'Confirm Counter'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Mark as Sold Modal */}
        {completeModalOffer && (
          <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setCompleteModalOffer(null)} />
            <div className="relative z-10 w-full max-w-md p-6 rounded-[24px] bg-surface text-text border border-border shadow-2xl animate-fade-in">
              <h3 className="text-[17px] font-semibold text-text mb-2">Record Sale Completion</h3>
              <p className="text-[12px] text-muted mb-4">
                Confirm final payment and handover. This will mark the vehicle as <strong>Sold</strong> and record the official transaction.
              </p>

              <div className="mb-4">
                <label className="block text-[12px] font-medium text-text mb-1">
                  Final Agreed Amount (₹)
                </label>
                <input
                  type="number"
                  min="1"
                  step="1000"
                  value={finalAmountRupees}
                  onChange={e => setFinalAmountRupees(e.target.value)}
                  className="w-full h-11 px-4 rounded-full bg-bg border border-border text-text font-bold text-[15px] focus:outline-none focus:ring-2 focus:ring-text"
                />
              </div>

              <div className="mb-4">
                <label className="block text-[12px] font-medium text-text mb-1">
                  Settlement Notes (Optional)
                </label>
                <input
                  type="text"
                  value={completionNotes}
                  onChange={e => setCompletionNotes(e.target.value)}
                  placeholder="e.g. Bank transfer verified, vehicle keys delivered."
                  className="w-full h-10 px-4 rounded-full bg-bg border border-border text-[12px] text-text focus:outline-none focus:ring-2 focus:ring-text"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button variant="secondary" size="sm" onClick={() => setCompleteModalOffer(null)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    const amt = Number(finalAmountRupees);
                    if (amt > 0) {
                      completeSaleMutation.mutate({
                        offerId: completeModalOffer._id,
                        finalAmount: rupeesToPaise(amt),
                        notes: completionNotes.trim(),
                      });
                    }
                  }}
                  disabled={completeSaleMutation.isPending}
                >
                  {completeSaleMutation.isPending ? 'Processing...' : 'Confirm & Mark Sold'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default DashboardPage;
