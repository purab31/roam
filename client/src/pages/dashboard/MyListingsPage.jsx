import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Car,
  Plus,
  AlertCircle,
  Eye,
  Heart,
  MessageSquare,
  Calendar,
  CheckCircle,
  Lock,
  PauseCircle,
  PlayCircle,
  RotateCw,
  Trash2,
  Tag,
} from 'lucide-react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { VehicleImage } from '../../components/vehicle/VehicleImage';
import { useToast } from '../../context/ToastContext';
import { formatRupees } from '../../utils/money';

export function MyListingsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const [confirmModal, setConfirmModal] = useState({
    open: false,
    title: '',
    message: '',
    onConfirm: null,
  });

  const {
    data: listings = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['myListings'],
    queryFn: async () => {
      const res = await fetch('/api/listings/my', { credentials: 'include' });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to load listings');
      }
      return data.data;
    },
  });

  // Batched statistics query for all my listings
  const { data: statsMap = {} } = useQuery({
    queryKey: ['myListingsStats'],
    queryFn: async () => {
      const res = await fetch('/api/listings/my/statistics', { credentials: 'include' });
      const data = await res.json();
      return data.success ? data.data : {};
    },
  });

  // Renew mutation
  const renewMutation = useMutation({
    mutationFn: async id => {
      const res = await fetch(`/api/listings/${id}/renew`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || 'Renewal failed');
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['myListings']);
      queryClient.invalidateQueries(['myListingsStats']);
      addToast({
        title: 'Listing Renewed',
        message: 'Your listing has been renewed and reactivated.',
        type: 'success',
      });
    },
    onError: err => {
      addToast({
        title: 'Renewal Failed',
        message: err.message,
        type: 'danger',
      });
    },
  });

  // Status transition mutation
  const statusMutation = useMutation({
    mutationFn: async ({ id, action, status, reason }) => {
      const res = await fetch(`/api/listings/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action, status, reason }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error?.message || 'Status transition failed');
      }
      return data.data;
    },
    onSuccess: (updated, variables) => {
      queryClient.invalidateQueries(['myListings']);
      addToast({
        title: 'Status Updated',
        message: `Listing status successfully changed to ${variables.action || variables.status}.`,
        type: 'success',
      });
      setConfirmModal({ open: false, title: '', message: '', onConfirm: null });
    },
    onError: err => {
      addToast({
        title: 'Action Failed',
        message: err.message,
        type: 'danger',
      });
      setConfirmModal({ open: false, title: '', message: '', onConfirm: null });
    },
  });

  // Soft delete mutation
  const deleteMutation = useMutation({
    mutationFn: async id => {
      const res = await fetch(`/api/listings/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to remove listing');
      }
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['myListings']);
      addToast({
        title: 'Listing Removed',
        message: 'The listing has been safely archived.',
        type: 'success',
      });
      setConfirmModal({ open: false, title: '', message: '', onConfirm: null });
    },
    onError: err => {
      addToast({
        title: 'Removal Failed',
        message: err.message,
        type: 'danger',
      });
      setConfirmModal({ open: false, title: '', message: '', onConfirm: null });
    },
  });

  const promptStatusAction = (id, action, label) => {
    setConfirmModal({
      open: true,
      title: `${label} Listing`,
      message:
        action === 'sold'
          ? 'Are you sure you want to mark this vehicle as SOLD? Once marked as sold, it cannot be reactivated.'
          : `Are you sure you want to ${action} this listing?`,
      onConfirm: () => statusMutation.mutate({ id, action }),
    });
  };

  const promptDeleteAction = id => {
    setConfirmModal({
      open: true,
      title: 'Remove Listing',
      message:
        'Are you sure you want to remove this listing? It will no longer appear in search results.',
      onConfirm: () => deleteMutation.mutate(id),
    });
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-light tracking-tight text-text">
              My Vehicle Listings
            </h1>
            <p className="text-[12px] text-muted">
              Manage your active listings, pricing, reservations, and sale statuses.
            </p>
          </div>

          <Link to="/listing/new">
            <Button variant="primary" size="md" className="text-[12px]">
              <Plus className="w-4 h-4 mr-1.5" />
              Create New Listing
            </Button>
          </Link>
        </div>

        {/* Loading Skeletons */}
        {isLoading && (
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map(n => (
              <div
                key={n}
                className="bg-surface rounded-[24px] border border-border p-6 flex flex-col md:flex-row items-center gap-6 shadow-sm"
              >
                <Skeleton className="w-36 h-28 rounded-[16px] shrink-0" />
                <div className="flex-1 flex flex-col gap-2 w-full">
                  <Skeleton className="w-1/3 h-5" />
                  <Skeleton className="w-1/4 h-4" />
                  <Skeleton className="w-1/2 h-3" />
                </div>
                <div className="flex gap-2 shrink-0">
                  <Skeleton className="w-20 h-9 rounded-full" />
                  <Skeleton className="w-20 h-9 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="bg-surface rounded-[24px] border border-danger/30 p-8 flex flex-col items-center justify-center text-center gap-3">
            <AlertCircle className="w-10 h-10 text-danger" />
            <h3 className="text-[16px] font-medium text-text">Could not load listings</h3>
            <p className="text-[12px] text-muted max-w-md">{error.message}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Try Again
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !isError && listings.length === 0 && (
          <div className="bg-surface rounded-[24px] border border-border p-12">
            <EmptyState
              icon={Car}
              title="No Listings Found"
              description="You have not created any vehicle listings yet. Start selling or renting your vehicle today with our multi-step wizard."
              actionLabel="Create Listing Now"
              onAction={() => navigate('/listing/new')}
            />
          </div>
        )}

        {/* Listings List */}
        {!isLoading && !isError && listings.length > 0 && (
          <div className="flex flex-col gap-4">
            {listings.map(listing => {
              const vehicle = listing.vehicleRef || {};
              const coverImg =
                vehicle.images?.find(i => i.isCover)?.url ||
                vehicle.images?.[0]?.url ||
                null;

              const saleStatus = listing.sale?.status || 'inactive';
              const moderationStatus = listing.moderationStatus || 'draft';
              const listingId = listing.id || listing._id;
              const stats = statsMap[listingId] || {};
              const expiresAt = listing.expiresAt ? new Date(listing.expiresAt) : null;
              const isExpired = expiresAt && expiresAt <= new Date();
              const isApproachingExpiry =
                expiresAt && !isExpired && expiresAt <= new Date(Date.now() + 7 * 86400000);

              return (
                <div
                  key={listingId}
                  className={`bg-surface rounded-[24px] border p-5 md:p-6 flex flex-col gap-4 shadow-sm hover:border-text/30 transition-colors ${
                    isExpired
                      ? 'border-red-500/30'
                      : isApproachingExpiry
                      ? 'border-amber-500/30'
                      : 'border-border'
                  }`}
                >
                  {/* Expiry Banner if expired or approaching */}
                  {isExpired && (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-[12px]">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>This listing has expired and is inactive. Renew it to restore public visibility.</span>
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => renewMutation.mutate(listingId)}
                        loading={renewMutation.isLoading}
                        className="h-7 text-[11px] px-3 shrink-0"
                      >
                        <RotateCw className="w-3 h-3 mr-1" />
                        Renew Listing
                      </Button>
                    </div>
                  )}

                  {!isExpired && isApproachingExpiry && (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[12px]">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>
                          Approaching expiry on {expiresAt.toLocaleDateString()}. Renew early to maintain uninterrupted listing.
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => renewMutation.mutate(listingId)}
                        loading={renewMutation.isLoading}
                        className="h-7 text-[11px] px-3 shrink-0 border-amber-500/40 text-amber-600 dark:text-amber-400"
                      >
                        <RotateCw className="w-3 h-3 mr-1" />
                        Renew
                      </Button>
                    </div>
                  )}

                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                    {/* Left: Thumbnail & Main Info */}
                    <div className="flex items-center gap-5 w-full lg:w-auto">
                      {/* Thumbnail: 120x90 tile */}
                      <div className="w-28 h-24 rounded-[16px] bg-tile overflow-hidden flex items-center justify-center shrink-0 border border-border/50">
                        <VehicleImage
                          src={coverImg}
                          alt={`${vehicle.brand} ${vehicle.model}`}
                          bodyType={vehicle.bodyType}
                          fuelType={vehicle.fuelType}
                          className="w-full h-full object-cover"
                          lazy={true}
                        />
                      </div>

                      <div className="flex flex-col gap-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-[16px] font-semibold text-text tracking-tight truncate">
                            {vehicle.brand || 'Vehicle'} {vehicle.model || 'Listing'} {vehicle.variant || ''}
                          </h3>

                          {/* Status Chips */}
                          <span
                            className={`px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full ${
                              saleStatus === 'active'
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                : saleStatus === 'reserved'
                                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                : saleStatus === 'sold'
                                ? 'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/20'
                                : 'bg-muted/15 text-muted border border-border/50'
                            }`}
                          >
                            {saleStatus}
                          </span>

                          {moderationStatus !== 'approved' && (
                            <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-tile text-muted border border-border/40">
                              Mod: {moderationStatus}
                            </span>
                          )}
                        </div>

                        <div className="text-[12px] font-medium text-text">
                          {listing.sale?.askingPrice
                            ? formatRupees(listing.sale.askingPrice)
                            : 'Price on request'}
                          {listing.sale?.minAcceptableOffer && (
                            <span className="text-[10px] text-muted font-normal ml-2">
                              (Min offer: {formatRupees(listing.sale.minAcceptableOffer)} - private)
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-muted truncate">
                          {vehicle.kmDriven?.toLocaleString()} km · {vehicle.fuelType} · {vehicle.transmission} · {vehicle.location?.city}
                        </div>

                        {/* Performance Counters per Spec 17.3 */}
                        <div className="flex items-center gap-3 mt-2 text-[11px] text-muted flex-wrap">
                          <span className="flex items-center gap-1 font-medium text-text/80">
                            <Eye className="w-3.5 h-3.5 text-muted" /> {stats.views || listing.viewCount || 0} views
                          </span>
                          <span className="flex items-center gap-1">
                            <Heart className="w-3.5 h-3.5 text-accent" /> {stats.favourites || 0} saved
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-3.5 h-3.5 text-muted" /> {stats.enquiries || 0} enquiries
                          </span>
                          <span className="flex items-center gap-1">
                            <Tag className="w-3.5 h-3.5 text-muted" /> {stats.offers || 0} offers
                          </span>
                          {listing.purpose !== 'sale' && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-muted" /> {stats.bookings || 0} bookings
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                  {/* Right Actions Cluster */}
                  <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto justify-end border-t lg:border-t-0 pt-3 lg:pt-0 border-border/60">
                    {/* Toggle Active / Inactive */}
                    {saleStatus === 'active' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => promptStatusAction(listing.id || listing._id, 'deactivate', 'Deactivate')}
                        className="text-[11px] h-8 px-3"
                      >
                        <PauseCircle className="w-3.5 h-3.5 mr-1 text-muted" />
                        Deactivate
                      </Button>
                    )}

                    {saleStatus === 'inactive' && moderationStatus === 'approved' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => promptStatusAction(listing.id || listing._id, 'activate', 'Reactivate')}
                        className="text-[11px] h-8 px-3"
                      >
                        <PlayCircle className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                        Activate
                      </Button>
                    )}

                    {/* Reserve / Unreserve */}
                    {saleStatus === 'active' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => promptStatusAction(listing.id || listing._id, 'reserve', 'Reserve')}
                        className="text-[11px] h-8 px-3"
                      >
                        <Lock className="w-3.5 h-3.5 mr-1 text-amber-500" />
                        Reserve
                      </Button>
                    )}

                    {saleStatus === 'reserved' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => promptStatusAction(listing.id || listing._id, 'unreserve', 'Unreserve')}
                        className="text-[11px] h-8 px-3"
                      >
                        <Lock className="w-3.5 h-3.5 mr-1" />
                        Unreserve
                      </Button>
                    )}

                    {/* Mark Sold */}
                    {saleStatus !== 'sold' && moderationStatus !== 'removed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => promptStatusAction(listing.id || listing._id, 'sold', 'Mark Sold')}
                        className="text-[11px] h-8 px-3 text-red-600 dark:text-red-400 hover:bg-red-500/10"
                      >
                        <CheckCircle className="w-3.5 h-3.5 mr-1" />
                        Mark Sold
                      </Button>
                    )}

                    {/* Renew Button */}
                    {(isExpired || isApproachingExpiry) && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => renewMutation.mutate(listingId)}
                        loading={renewMutation.isLoading}
                        className="text-[11px] h-8 px-3"
                      >
                        <RotateCw className="w-3.5 h-3.5 mr-1" />
                        Renew
                      </Button>
                    )}

                    {/* Remove / Soft Delete */}
                    {moderationStatus !== 'removed' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => promptDeleteAction(listing.id || listing._id)}
                        className="text-[11px] h-8 px-2.5 text-muted hover:text-danger"
                        title="Remove listing"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}

        {/* Confirmation Modal */}
        <Modal
          isOpen={confirmModal.open}
          onClose={() => setConfirmModal({ open: false, title: '', message: '', onConfirm: null })}
          title={confirmModal.title}
        >
          <div className="flex flex-col gap-4">
            <p className="text-[13px] text-muted leading-relaxed">
              {confirmModal.message}
            </p>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmModal({ open: false, title: '', message: '', onConfirm: null })}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => confirmModal.onConfirm && confirmModal.onConfirm()}
              >
                Confirm
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
