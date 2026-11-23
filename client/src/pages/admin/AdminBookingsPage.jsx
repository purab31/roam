import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Calendar,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Eye,
} from 'lucide-react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { StatusChip } from '../../components/ui/StatusChip';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { KebabMenu } from '../../components/ui/KebabMenu';
import { formatRupees } from '../../utils/money';

const BOOKING_STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'requested', label: 'Requested' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed (Reserved)' },
  { value: 'active', label: 'Active (Handed Over)' },
  { value: 'completed', label: 'Completed (Returned)' },
  { value: 'cancelled', label: 'Cancelled' },
];

/**
 * Admin Bookings Oversight per Spec 12.4 & UI 8.8 (Read-Only):
 * - Table: no zebra, 1px dividers, 12px text, hover --bg-subtle, sticky header.
 * - Second-to-last column: status chip.
 * - Last column: kebab menu.
 */
export function AdminBookingsPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const limit = 20;

  const { data: bookingsData, isLoading } = useQuery({
    queryKey: ['admin-bookings', statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      params.append('page', String(page));
      params.append('limit', String(limit));

      const res = await fetch(`/api/admin/bookings?${params.toString()}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to load bookings oversight');
      const json = await res.json();
      return json.data || { items: [], total: 0, page: 1, pageSize: limit };
    },
    staleTime: 30 * 1000,
  });

  const bookings = bookingsData?.items || [];
  const total = bookingsData?.total || 0;
  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <DashboardLayout>
      <div className="space-y-6 select-none">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-5 h-5 text-primary" />
              <h1 className="text-[24px] sm:text-[28px] font-semibold text-text tracking-tight">
                Rental Bookings Oversight
              </h1>
            </div>
            <p className="text-[13px] text-muted">
              Read-only administrative review of rental booking requests, dates, handover/returns, and completed transactions.
            </p>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-muted uppercase tracking-wider">
              Status:
            </span>
            <select
              value={statusFilter}
              onChange={e => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 rounded-full bg-surface border border-border text-[12px] font-medium text-text focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              {BOOKING_STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table Container per UI 8.8 */}
        <div className="rounded-[24px] bg-surface border border-border overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          ) : bookings.length === 0 ? (
            <div className="p-16">
              <EmptyState
                icon={Calendar}
                title="No bookings found"
                description={`There are currently no rental booking records matching status "${statusFilter || 'all'}".`}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[12px]">
                {/* Sticky Header */}
                <thead className="sticky top-0 bg-surface z-10 border-b border-border text-[11px] uppercase tracking-wider text-muted font-semibold">
                  <tr>
                    <th className="py-3.5 pl-6 pr-3">Vehicle</th>
                    <th className="py-3.5 px-3">Renter</th>
                    <th className="py-3.5 px-3">Rental Dates</th>
                    <th className="py-3.5 px-3">Rental Total</th>
                    <th className="py-3.5 px-3">Deposit</th>
                    {/* Status Chip Second-to-Last */}
                    <th className="py-3.5 px-3">Booking Status</th>
                    {/* Kebab Menu Last */}
                    <th className="py-3.5 pr-6 pl-3 text-right">Actions</th>
                  </tr>
                </thead>

                {/* Rows with 1px dividers & hover --bg-subtle */}
                <tbody className="divide-y divide-border/60">
                  {bookings.map(b => {
                    const id = b.id || b._id;
                    const listing = b.listing || {};
                    const vehicle = listing.vehicleRef || {};
                    const renter = b.renter || {};

                    const actions = [
                      {
                        label: 'View Booking Details',
                        icon: Eye,
                        onClick: () => setSelectedBooking(b),
                      },
                      listing._id && {
                        label: 'Open Listing',
                        icon: ExternalLink,
                        onClick: () => window.open(`/listings/${listing._id || listing.id}`, '_blank'),
                      },
                    ].filter(Boolean);

                    return (
                      <tr
                        key={id}
                        className="hover:bg-bg-subtle transition-colors group"
                      >
                        {/* Vehicle */}
                        <td className="py-3.5 pl-6 pr-3">
                          <p className="font-semibold text-text truncate max-w-[180px]">
                            {vehicle.manufacturingYear} {vehicle.brand} {vehicle.model}
                          </p>
                          <p className="text-[11px] text-muted truncate max-w-[180px]">
                            {vehicle.variant || ''}
                          </p>
                        </td>

                        {/* Renter */}
                        <td className="py-3.5 px-3">
                          <p className="font-medium text-text truncate max-w-[140px]">
                            {renter.fullName || 'Renter'}
                          </p>
                          <p className="text-[11px] text-muted truncate max-w-[140px]">
                            {renter.email || ''}
                          </p>
                        </td>

                        {/* Rental Dates */}
                        <td className="py-3.5 px-3">
                          <p className="font-medium text-text">
                            {b.startDate ? new Date(b.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}{' '}
                            →{' '}
                            {b.endDate ? new Date(b.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                          </p>
                          <p className="text-[11px] text-muted">
                            {b.days ? `${b.days} ${b.days === 1 ? 'day' : 'days'}` : ''}
                          </p>
                        </td>

                        {/* Total Amount */}
                        <td className="py-3.5 px-3 font-semibold text-text">
                          {formatRupees(b.pricing?.totalPrice || b.totalAmount || 0)}
                        </td>

                        {/* Deposit */}
                        <td className="py-3.5 px-3 text-muted">
                          {b.pricing?.securityDeposit ? formatRupees(b.pricing.securityDeposit) : '—'}
                        </td>

                        {/* Status Chip Second-to-Last */}
                        <td className="py-3.5 px-3">
                          <StatusChip status={b.status || 'requested'} />
                        </td>

                        {/* Kebab Menu Last */}
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-border flex items-center justify-between text-[12px] text-muted">
              <span>
                Showing page {page} of {totalPages} ({total} bookings)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="rounded-full w-8 h-8 p-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="font-semibold text-text px-2">{page}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  className="rounded-full w-8 h-8 p-0"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Modal: Booking Inspection */}
        {selectedBooking && (
          <Modal
            isOpen={true}
            onClose={() => setSelectedBooking(null)}
            title="Rental Booking Record"
            description="Detailed snapshot of rental reservation lifecycle and pricing."
          >
            <div className="space-y-4 pt-2 text-[12px]">
              <div className="p-3.5 rounded-xl bg-tile border border-border/70 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-text block">
                    {selectedBooking.listing?.vehicleRef?.manufacturingYear}{' '}
                    {selectedBooking.listing?.vehicleRef?.brand}{' '}
                    {selectedBooking.listing?.vehicleRef?.model}
                  </span>
                  <span className="text-[11px] text-muted">
                    Total: <strong className="text-text">{formatRupees(selectedBooking.pricing?.totalPrice || selectedBooking.totalAmount || 0)}</strong>
                    {' '}· Deposit: {formatRupees(selectedBooking.pricing?.securityDeposit || 0)}
                  </span>
                </div>
                <StatusChip status={selectedBooking.status} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[11px] font-semibold uppercase text-muted block mb-1">
                    Renter
                  </span>
                  <p className="font-medium text-text">{selectedBooking.renter?.fullName}</p>
                  <p className="text-[11px] text-muted">{selectedBooking.renter?.email}</p>
                  <p className="text-[11px] text-muted">{selectedBooking.renter?.mobile || 'No phone'}</p>
                </div>
                <div>
                  <span className="text-[11px] font-semibold uppercase text-muted block mb-1">
                    Dates & Duration
                  </span>
                  <p className="font-medium text-text">
                    {selectedBooking.startDate ? new Date(selectedBooking.startDate).toLocaleDateString('en-IN') : '—'}{' '}
                    to{' '}
                    {selectedBooking.endDate ? new Date(selectedBooking.endDate).toLocaleDateString('en-IN') : '—'}
                  </p>
                  <p className="text-[11px] text-muted">
                    {selectedBooking.days ? `${selectedBooking.days} rental days` : ''}
                  </p>
                </div>
              </div>

              {/* Status history if available */}
              {selectedBooking.statusHistory?.length > 0 && (
                <div className="pt-2 border-t border-border">
                  <span className="text-[11px] font-semibold uppercase text-muted block mb-2">
                    Lifecycle Timeline
                  </span>
                  <div className="space-y-1.5">
                    {selectedBooking.statusHistory.map((h, i) => (
                      <div key={i} className="flex items-center justify-between text-[11px]">
                        <span className="capitalize text-text font-medium">
                          {h.fromStatus ? `${h.fromStatus} → ${h.toStatus}` : h.toStatus}
                        </span>
                        <span className="text-muted">
                          {h.changedAt ? new Date(h.changedAt).toLocaleString('en-IN') : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => setSelectedBooking(null)}
                  className="rounded-full text-[12px] px-5"
                >
                  Close
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </DashboardLayout>
  );
}

export default AdminBookingsPage;
