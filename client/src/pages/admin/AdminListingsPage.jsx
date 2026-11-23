import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Tag,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  PowerOff,
  Trash2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { StatusChip } from '../../components/ui/StatusChip';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Textarea } from '../../components/ui/Textarea';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { KebabMenu } from '../../components/ui/KebabMenu';
import { VehicleImage } from '../../components/vehicle/VehicleImage';
import { useToast } from '../../context/ToastContext';
import { formatRupees } from '../../utils/money';

const MODERATION_TABS = [
  { id: 'pending_review', label: 'Pending Review' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected / Corrections' },
  { id: 'removed', label: 'Removed' },
  { id: '', label: 'All Listings' },
];

/**
 * Admin Listings Moderation Queue per Spec 12.3 & UI 8.8:
 * - Table format: no zebra, 1px dividers, 12px text, hover --bg-subtle, sticky header.
 * - Second-to-last column: status chip.
 * - Last column: kebab menu.
 * - Moderation actions: approve, reject (reason required), request_corrections (reason required), deactivate, remove.
 */
export function AdminListingsPage() {
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const statusTab = searchParams.get('status') ?? 'pending_review';
  const purposeFilter = searchParams.get('purpose') ?? '';
  const page = Number(searchParams.get('page') ?? '1');
  const limit = 20;

  // Modals state
  const [selectedListing, setSelectedListing] = useState(null);
  const [modalAction, setModalAction] = useState(null); // 'approve' | 'reject' | 'request_corrections' | 'deactivate' | 'remove'
  const [reasonInput, setReasonInput] = useState('');
  const [reasonError, setReasonError] = useState('');

  // Fetch listings
  const { data: listingsData, isLoading } = useQuery({
    queryKey: ['admin-listings', statusTab, purposeFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusTab) params.append('status', statusTab);
      if (purposeFilter) params.append('purpose', purposeFilter);
      params.append('page', String(page));
      params.append('limit', String(limit));

      const res = await fetch(`/api/admin/listings?${params.toString()}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to load listings');
      const json = await res.json();
      return json.data || { items: [], total: 0, page: 1, pageSize: limit };
    },
    staleTime: 30 * 1000,
  });

  const listings = listingsData?.items || [];
  const total = listingsData?.total || 0;
  const totalPages = Math.ceil(total / limit) || 1;

  const closeModal = () => {
    setSelectedListing(null);
    setModalAction(null);
    setReasonInput('');
    setReasonError('');
  };

  // Moderation Mutation
  const moderateMutation = useMutation({
    mutationFn: async ({ id, action, reason }) => {
      const res = await fetch(`/api/admin/listings/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action, reason }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Moderation update failed');
      }
      return json.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(['admin-listings']);
      queryClient.invalidateQueries(['admin-dashboard-stats']);
      addToast(
        `Listing action "${variables.action.replace('_', ' ')}" executed successfully`,
        'success'
      );
      closeModal();
    },
    onError: err => {
      setReasonError(err.message || 'Operation failed');
    },
  });

  const openModal = (listing, action) => {
    setSelectedListing(listing);
    setModalAction(action);
    setReasonInput('');
    setReasonError('');
  };

  const handleConfirmAction = e => {
    e.preventDefault();
    if (!selectedListing || !modalAction) return;

    // Decision 2: Reject and request-corrections require a non-empty reason
    const requiresReason =
      modalAction === 'reject' || modalAction === 'request_corrections';
    const trimmed = reasonInput.trim();

    if (requiresReason && !trimmed) {
      setReasonError('Please provide a specific reason for this action.');
      return;
    }

    moderateMutation.mutate({
      id: selectedListing.id || selectedListing._id,
      action: modalAction,
      reason: trimmed,
    });
  };

  const setTab = tabId => {
    setSearchParams(prev => {
      const p = new URLSearchParams(prev);
      if (tabId) p.set('status', tabId);
      else p.delete('status');
      p.set('page', '1');
      return p;
    });
  };

  const setPurpose = pVal => {
    setSearchParams(prev => {
      const p = new URLSearchParams(prev);
      if (pVal) p.set('purpose', pVal);
      else p.delete('purpose');
      p.set('page', '1');
      return p;
    });
  };

  const setPageNum = pNum => {
    setSearchParams(prev => {
      const p = new URLSearchParams(prev);
      p.set('page', String(pNum));
      return p;
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 select-none">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <h1 className="text-[24px] sm:text-[28px] font-semibold text-text tracking-tight">
                Listings Moderation Queue
              </h1>
            </div>
            <p className="text-[13px] text-muted">
              Review, approve, request corrections, deactivate, or remove vehicle marketplace listings.
            </p>
          </div>

          {/* Purpose Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-muted uppercase tracking-wider">
              Purpose:
            </span>
            <select
              value={purposeFilter}
              onChange={e => setPurpose(e.target.value)}
              className="px-3 py-1.5 rounded-full bg-surface border border-border text-[12px] font-medium text-text focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="">All Purposes</option>
              <option value="sale">Sale Only</option>
              <option value="rent">Rent Only</option>
              <option value="both">Sale & Rent</option>
            </select>
          </div>
        </div>

        {/* Status Tabs per UI 7.6 */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-full bg-surface border border-border w-fit">
          {MODERATION_TABS.map(tab => {
            const isActive = statusTab === tab.id;
            return (
              <button
                type="button"
                key={tab.id}
                onClick={() => setTab(tab.id)}
                className={`px-3.5 py-1.5 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-text text-bg shadow-xs font-semibold'
                    : 'text-muted hover:text-text'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Table Container per UI 8.8 */}
        <div className="rounded-[24px] bg-surface border border-border overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          ) : listings.length === 0 ? (
            <div className="p-16">
              <EmptyState
                icon={Tag}
                title="No listings in this queue"
                description={`There are currently no listings matching status "${statusTab || 'all'}".`}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[12px]">
                {/* Sticky Header */}
                <thead className="sticky top-0 bg-surface z-10 border-b border-border text-[11px] uppercase tracking-wider text-muted font-semibold">
                  <tr>
                    <th className="py-3.5 pl-6 pr-3">Vehicle Details</th>
                    <th className="py-3.5 px-3">Owner / Seller</th>
                    <th className="py-3.5 px-3">Purpose & Price</th>
                    <th className="py-3.5 px-3">Sale Status</th>
                    <th className="py-3.5 px-3">Rental Status</th>
                    <th className="py-3.5 px-3">Created</th>
                    {/* Status Chip Second-to-Last per UI 8.8 */}
                    <th className="py-3.5 px-3">Moderation</th>
                    {/* Kebab Menu Last per UI 8.8 */}
                    <th className="py-3.5 pr-6 pl-3 text-right">Actions</th>
                  </tr>
                </thead>

                {/* Rows: No zebra, 1px row dividers, hover --bg-subtle */}
                <tbody className="divide-y divide-border/60">
                  {listings.map(item => {
                    const id = item.id || item._id;
                    const vehicle = item.vehicleRef || {};
                    const owner = item.ownerRef?.id || {};
                    const isApproved = item.moderationStatus === 'approved';
                    const isPending = item.moderationStatus === 'pending_review';
                    const isRejected = item.moderationStatus === 'rejected';
                    const isRemoved = item.moderationStatus === 'removed';

                    const actions = [
                      {
                        label: 'View Public Detail',
                        icon: ExternalLink,
                        onClick: () => window.open(`/listings/${id}`, '_blank'),
                      },
                      isPending && {
                        label: 'Approve Listing',
                        icon: CheckCircle2,
                        onClick: () => openModal(item, 'approve'),
                      },
                      isPending && {
                        label: 'Request Corrections',
                        icon: AlertTriangle,
                        onClick: () => openModal(item, 'request_corrections'),
                      },
                      (isPending || isApproved) && {
                        label: 'Reject Listing',
                        icon: XCircle,
                        danger: true,
                        onClick: () => openModal(item, 'reject'),
                      },
                      isApproved && {
                        label: 'Deactivate Availability',
                        icon: PowerOff,
                        danger: true,
                        onClick: () => openModal(item, 'deactivate'),
                      },
                      !isRemoved && {
                        label: 'Remove Listing',
                        icon: Trash2,
                        danger: true,
                        onClick: () => openModal(item, 'remove'),
                      },
                    ].filter(Boolean);

                    return (
                      <tr
                        key={id}
                        className="hover:bg-bg-subtle transition-colors group"
                      >
                        {/* Vehicle details */}
                        <td className="py-3.5 pl-6 pr-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-tile border border-border overflow-hidden shrink-0 flex items-center justify-center p-0.5">
                              <VehicleImage
                                src={vehicle.images?.[0]?.url}
                                alt=""
                                bodyType={vehicle.bodyType}
                                fuelType={vehicle.fuelType}
                                className="w-full h-full object-contain"
                                lazy={true}
                              />
                            </div>
                            <div className="min-w-0">
                              <Link
                                to={`/listings/${id}`}
                                className="font-semibold text-text hover:underline truncate block"
                              >
                                {vehicle.manufacturingYear} {vehicle.brand} {vehicle.model}
                              </Link>
                              <span className="text-[11px] text-muted">
                                {vehicle.variant || ''} · {vehicle.city || 'India'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Owner */}
                        <td className="py-3.5 px-3">
                          <p className="font-medium text-text leading-tight truncate max-w-[140px]">
                            {owner.fullName || 'User'}
                          </p>
                          <p className="text-[11px] text-muted truncate max-w-[140px]">
                            {owner.email || ''}
                          </p>
                        </td>

                        {/* Purpose & Price */}
                        <td className="py-3.5 px-3">
                          <span className="capitalize font-medium text-text block">
                            {item.purpose}
                          </span>
                          <span className="text-[11px] text-muted">
                            {item.purpose === 'rent'
                              ? `${formatRupees(item.rental?.dailyPrice || 0)} / day`
                              : formatRupees(item.sale?.askingPrice || 0)}
                          </span>
                        </td>

                        {/* Sale Status */}
                        <td className="py-3.5 px-3">
                          {item.sale?.enabled ? (
                            <StatusChip status={item.sale.status || 'inactive'} />
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>

                        {/* Rental Status */}
                        <td className="py-3.5 px-3">
                          {item.rental ? (
                            <StatusChip status={item.rental.status || 'inactive'} />
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>

                        {/* Created Date */}
                        <td className="py-3.5 px-3 text-muted text-[11px]">
                          {item.createdAt
                            ? new Date(item.createdAt).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                              })
                            : '—'}
                        </td>

                        {/* Status Chip Second-to-Last per UI 8.8 */}
                        <td className="py-3.5 px-3">
                          <StatusChip status={item.moderationStatus} />
                          {item.adminDeactivated && (
                            <span className="block text-[10px] text-danger font-semibold mt-0.5">
                              Admin Lock
                            </span>
                          )}
                        </td>

                        {/* Kebab Menu Last per UI 8.8 */}
                        <td className="py-3.5 pr-6 pl-3 text-right">
                          <KebabMenu items={actions} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-border flex items-center justify-between text-[12px] text-muted">
              <span>
                Showing page {page} of {totalPages} ({total} listings)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPageNum(page - 1)}
                  className="rounded-full w-8 h-8 p-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="font-semibold text-text px-2">{page}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPageNum(page + 1)}
                  className="rounded-full w-8 h-8 p-0"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Modal: Moderation Action Form */}
        {selectedListing && modalAction && (
          <Modal
            isOpen={true}
            onClose={closeModal}
            title={
              modalAction === 'approve'
                ? 'Approve Listing'
                : modalAction === 'reject'
                ? 'Reject Listing'
                : modalAction === 'request_corrections'
                ? 'Request Corrections from Owner'
                : modalAction === 'deactivate'
                ? 'Deactivate Listing Availability'
                : 'Remove Listing from Marketplace'
            }
            description={
              modalAction === 'approve'
                ? 'Approving publishes this listing to the marketplace and activates sale or rental availability.'
                : modalAction === 'request_corrections'
                ? 'Specify required changes. The owner will be notified and can edit the listing to resubmit.'
                : modalAction === 'reject'
                ? 'Explain the rejection reason. The owner will be notified.'
                : modalAction === 'deactivate'
                ? 'Deactivates availability and places an administrative lock on this listing.'
                : 'Permanently removes this listing from public discovery.'
            }
          >
            <form onSubmit={handleConfirmAction} className="space-y-4 pt-2">
              {reasonError && (
                <div
                  role="alert"
                  className="p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-[12px] flex items-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{reasonError}</span>
                </div>
              )}

              {/* Vehicle identity summary */}
              <div className="p-3 rounded-xl bg-tile border border-border/70 text-[12px] flex items-center justify-between">
                <div>
                  <span className="font-semibold text-text block">
                    {selectedListing.vehicleRef?.manufacturingYear}{' '}
                    {selectedListing.vehicleRef?.brand}{' '}
                    {selectedListing.vehicleRef?.model}
                  </span>
                  <span className="text-[11px] text-muted">
                    Reg: {selectedListing.vehicleRef?.registrationNumber || 'N/A'} ·{' '}
                    Owner: {selectedListing.ownerRef?.id?.fullName || 'User'}
                  </span>
                </div>
                <StatusChip status={selectedListing.moderationStatus} />
              </div>

              {/* Reason / Notes textarea (mandatory for reject & corrections) */}
              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wider text-muted mb-1.5">
                  {modalAction === 'reject' || modalAction === 'request_corrections'
                    ? 'Reason / Instructions *'
                    : 'Administrative Note (Optional)'}
                </label>
                <Textarea
                  rows={3}
                  placeholder={
                    modalAction === 'request_corrections'
                      ? 'e.g., Please upload clear photograph of the odometer and registration certificate...'
                      : modalAction === 'reject'
                      ? 'e.g., Vehicle details do not match submitted RC document...'
                      : 'Optional internal or audit note...'
                  }
                  value={reasonInput}
                  onChange={e => {
                    setReasonInput(e.target.value);
                    if (reasonError) setReasonError('');
                  }}
                  className="w-full text-[12px]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={closeModal}
                  disabled={moderateMutation.isPending}
                  className="rounded-full text-[12px]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant={
                    modalAction === 'reject' || modalAction === 'remove'
                      ? 'danger'
                      : 'primary'
                  }
                  size="sm"
                  disabled={moderateMutation.isPending}
                  className="rounded-full text-[12px] px-5"
                >
                  {moderateMutation.isPending ? 'Executing...' : 'Confirm Action'}
                </Button>
              </div>
            </form>
          </Modal>
        )}
      </div>
    </DashboardLayout>
  );
}

export default AdminListingsPage;
