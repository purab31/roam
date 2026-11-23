import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  HandCoins,
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

const OFFER_STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'submitted', label: 'Submitted / Pending' },
  { value: 'countered', label: 'Countered' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'withdrawn', label: 'Withdrawn' },
  { value: 'expired', label: 'Expired' },
];

/**
 * Admin Offers Oversight per Spec 12.4 & UI 8.8 (Read-Only):
 * - Table: no zebra, 1px dividers, 12px text, hover --bg-subtle, sticky header.
 * - Second-to-last column: status chip.
 * - Last column: kebab menu.
 */
export function AdminOffersPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const limit = 20;

  const { data: offersData, isLoading } = useQuery({
    queryKey: ['admin-offers', statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      params.append('page', String(page));
      params.append('limit', String(limit));

      const res = await fetch(`/api/admin/offers?${params.toString()}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to load offers oversight');
      const json = await res.json();
      return json.data || { items: [], total: 0, page: 1, pageSize: limit };
    },
    staleTime: 30 * 1000,
  });

  const offers = offersData?.items || [];
  const total = offersData?.total || 0;
  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <DashboardLayout>
      <div className="space-y-6 select-none">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <HandCoins className="w-5 h-5 text-primary" />
              <h1 className="text-[24px] sm:text-[28px] font-semibold text-text tracking-tight">
                Offers Oversight
              </h1>
            </div>
            <p className="text-[13px] text-muted">
              Read-only administrative monitoring of purchase offers, counters, and accepted negotiations.
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
              {OFFER_STATUS_OPTIONS.map(opt => (
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
          ) : offers.length === 0 ? (
            <div className="p-16">
              <EmptyState
                icon={HandCoins}
                title="No offers found"
                description={`There are currently no purchase offer records matching status "${statusFilter || 'all'}".`}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[12px]">
                {/* Sticky Header */}
                <thead className="sticky top-0 bg-surface z-10 border-b border-border text-[11px] uppercase tracking-wider text-muted font-semibold">
                  <tr>
                    <th className="py-3.5 pl-6 pr-3">Vehicle</th>
                    <th className="py-3.5 px-3">Offered By (Buyer)</th>
                    <th className="py-3.5 px-3">Seller</th>
                    <th className="py-3.5 px-3">Offered Amount</th>
                    <th className="py-3.5 px-3">Date</th>
                    {/* Status Chip Second-to-Last */}
                    <th className="py-3.5 px-3">Offer Status</th>
                    {/* Kebab Menu Last */}
                    <th className="py-3.5 pr-6 pl-3 text-right">Actions</th>
                  </tr>
                </thead>

                {/* Rows with 1px dividers & hover --bg-subtle */}
                <tbody className="divide-y divide-border/60">
                  {offers.map(o => {
                    const id = o.id || o._id;
                    const listing = o.listing || {};
                    const vehicle = listing.vehicleRef || {};
                    const buyer = o.offeredBy || {};
                    const seller = o.seller || {};

                    const actions = [
                      {
                        label: 'View Details',
                        icon: Eye,
                        onClick: () => setSelectedOffer(o),
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

                        {/* Buyer */}
                        <td className="py-3.5 px-3">
                          <p className="font-medium text-text truncate max-w-[130px]">
                            {buyer.fullName || 'Buyer'}
                          </p>
                          <p className="text-[11px] text-muted truncate max-w-[130px]">
                            {buyer.email || ''}
                          </p>
                        </td>

                        {/* Seller */}
                        <td className="py-3.5 px-3">
                          <p className="font-medium text-text truncate max-w-[130px]">
                            {seller.fullName || 'Seller'}
                          </p>
                          <p className="text-[11px] text-muted truncate max-w-[130px]">
                            {seller.email || ''}
                          </p>
                        </td>

                        {/* Offered Amount */}
                        <td className="py-3.5 px-3 font-semibold text-text">
                          {formatRupees(o.amount || 0)}
                        </td>

                        {/* Date */}
                        <td className="py-3.5 px-3 text-muted text-[11px]">
                          {o.createdAt
                            ? new Date(o.createdAt).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                              })
                            : '—'}
                        </td>

                        {/* Status Chip Second-to-Last */}
                        <td className="py-3.5 px-3">
                          <StatusChip status={o.status || 'submitted'} />
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
                Showing page {page} of {totalPages} ({total} offers)
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

        {/* Modal: Offer Inspection */}
        {selectedOffer && (
          <Modal
            isOpen={true}
            onClose={() => setSelectedOffer(null)}
            title="Purchase Offer Record"
            description="Detailed snapshot of the negotiation record."
          >
            <div className="space-y-4 pt-2 text-[12px]">
              <div className="p-3.5 rounded-xl bg-tile border border-border/70 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-text block">
                    {selectedOffer.listing?.vehicleRef?.manufacturingYear}{' '}
                    {selectedOffer.listing?.vehicleRef?.brand}{' '}
                    {selectedOffer.listing?.vehicleRef?.model}
                  </span>
                  <span className="text-[11px] text-muted">
                    Offered Amount: <strong className="text-text">{formatRupees(selectedOffer.amount || 0)}</strong>
                  </span>
                </div>
                <StatusChip status={selectedOffer.status} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[11px] font-semibold uppercase text-muted block mb-1">
                    Offered By (Buyer)
                  </span>
                  <p className="font-medium text-text">{selectedOffer.offeredBy?.fullName}</p>
                  <p className="text-[11px] text-muted">{selectedOffer.offeredBy?.email}</p>
                </div>
                <div>
                  <span className="text-[11px] font-semibold uppercase text-muted block mb-1">
                    Seller
                  </span>
                  <p className="font-medium text-text">{selectedOffer.seller?.fullName}</p>
                  <p className="text-[11px] text-muted">{selectedOffer.seller?.email}</p>
                </div>
              </div>

              {selectedOffer.message && (
                <div className="p-3 rounded-xl bg-surface border border-border">
                  <span className="text-[11px] font-semibold uppercase text-muted block mb-1">
                    Buyer Message
                  </span>
                  <p className="text-text whitespace-pre-wrap">{selectedOffer.message}</p>
                </div>
              )}

              <div className="flex items-center justify-end pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => setSelectedOffer(null)}
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

export default AdminOffersPage;
