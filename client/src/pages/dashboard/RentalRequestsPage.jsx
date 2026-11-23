import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  User,
  Shield,
  Phone,
  Mail,
  ChevronRight,
  Filter,
  TrendingUp,
  Ban,
  Trash2,
  Plus,
} from 'lucide-react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { Button } from '../../components/ui/Button';
import { StatusChip } from '../../components/ui/StatusChip';
import { Modal } from '../../components/ui/Modal';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { useToast } from '../../context/ToastContext';
import { formatRupees } from '../../utils/money';

/**
 * UI Section 8.8: Owner / Dealer Rental Request Queue & Lifecycle Manager
 * - Stat cards: 40px/300 number, 11px muted label, SVG sparkline with real monthly series
 * - Tabs: Requests & Modifications, Active & Upcoming, Completed & History, Blocked Dates
 * - Actions: Mark Handed Over (activate), Mark Returned (complete), Review Modification
 * - Blocked-Dates Manager (add and delete unavailable dates)
 */
export function RentalRequestsPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('requests');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [actionType, setActionType] = useState(null); // 'handover' | 'complete' | 'accept' | 'reject' | 'review_mod'
  const [rejectReason, setRejectReason] = useState('');

  // Blocked dates state
  const [selectedListingId, setSelectedListingId] = useState('');
  const [blockStart, setBlockStart] = useState('');
  const [blockEnd, setBlockEnd] = useState('');
  const [blockReason, setBlockReason] = useState('');

  // 1. Fetch Rental Earnings & Statistics Summary (Adjustment 10 & 11)
  const { data: summaryData } = useQuery({
    queryKey: ['rentalSummary'],
    queryFn: async () => {
      const res = await fetch('/api/bookings/summary');
      const json = await res.json();
      return json.success ? json.data : null;
    },
  });

  // 2. Fetch User's Rental Listings (for blocked dates manager dropdown)
  const { data: listingsData } = useQuery({
    queryKey: ['myRentalListings'],
    queryFn: async () => {
      const res = await fetch('/api/listings/my');
      const json = await res.json();
      if (!json.success) return [];
      return (json.data.items || []).filter(
        l => l.purpose === 'rent' || l.purpose === 'both'
      );
    },
  });

  const rentalListings = listingsData || [];

  // Set default selected listing for blocked dates
  React.useEffect(() => {
    if (rentalListings.length > 0 && !selectedListingId) {
      setSelectedListingId(rentalListings[0]._id || rentalListings[0].id);
    }
  }, [rentalListings, selectedListingId]);

  // 3. Fetch Blocked Dates for selected listing
  const { data: blockedDatesData } = useQuery({
    queryKey: ['blockedDates', selectedListingId],
    enabled: !!selectedListingId && activeTab === 'blocked',
    queryFn: async () => {
      const res = await fetch(`/api/listings/${selectedListingId}/unavailable-dates`);
      const json = await res.json();
      return json.success ? json.data.unavailableDates : [];
    },
  });

  const unavailableDates = blockedDatesData || [];

  // 4. Fetch Bookings for current tab
  const { data: bookingsData, isLoading } = useQuery({
    queryKey: ['rentalBookings', activeTab],
    enabled: activeTab !== 'blocked',
    queryFn: async () => {
      let queryParam = '';
      if (activeTab === 'requests') {
        // Fetch requested, pending, modification_requested
        const res1 = await fetch('/api/bookings?role=owner&status=requested');
        const res2 = await fetch('/api/bookings?role=owner&status=pending');
        const res3 = await fetch('/api/bookings?role=owner&status=modification_requested');
        const [j1, j2, j3] = await Promise.all([res1.json(), res2.json(), res3.json()]);
        const items = [
          ...(j1.data?.items || []),
          ...(j2.data?.items || []),
          ...(j3.data?.items || []),
        ];
        return { items, total: items.length };
      } else if (activeTab === 'active') {
        // Confirmed and Active
        const res1 = await fetch('/api/bookings?role=owner&status=confirmed');
        const res2 = await fetch('/api/bookings?role=owner&status=active');
        const [j1, j2] = await Promise.all([res1.json(), res2.json()]);
        const items = [...(j1.data?.items || []), ...(j2.data?.items || [])];
        return { items, total: items.length };
      } else if (activeTab === 'history') {
        // Completed, Cancelled, Rejected
        const res1 = await fetch('/api/bookings?role=owner&status=completed');
        const res2 = await fetch('/api/bookings?role=owner&status=cancelled');
        const res3 = await fetch('/api/bookings?role=owner&status=rejected');
        const [j1, j2, j3] = await Promise.all([res1.json(), res2.json(), res3.json()]);
        const items = [
          ...(j1.data?.items || []),
          ...(j2.data?.items || []),
          ...(j3.data?.items || []),
        ];
        return { items, total: items.length };
      }

      const res = await fetch('/api/bookings?role=owner');
      const json = await res.json();
      return json.success ? json.data : { items: [], total: 0 };
    },
  });

  const bookings = bookingsData?.items || [];

  // Status Mutation (accept, reject, handover, complete)
  const statusMutation = useMutation({
    mutationFn: async ({ id, action, reason }) => {
      const res = await fetch(`/api/bookings/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action, reason }),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error?.message || `Action failed`);
      }
      return json.data.booking;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(['rentalBookings']);
      queryClient.invalidateQueries(['rentalSummary']);
      showToast({
        type: 'success',
        message: `Booking updated successfully`,
      });
      closeModal();
    },
    onError: err => {
      showToast({
        type: 'danger',
        message: err.message || 'Action failed',
      });
    },
  });

  // Modification Review Mutation (approve | reject)
  const modificationReviewMutation = useMutation({
    mutationFn: async ({ id, action, reason }) => {
      const res = await fetch(`/api/bookings/${id}/modification`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action, reason }),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error?.message || `Failed to review modification`);
      }
      return json.data.booking;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(['rentalBookings']);
      queryClient.invalidateQueries(['rentalSummary']);
      showToast({
        type: 'success',
        message: `Date modification ${variables.action === 'approve' ? 'approved' : 'declined'} successfully`,
      });
      closeModal();
    },
    onError: err => {
      showToast({
        type: 'danger',
        message: err.message || 'Modification review failed',
      });
    },
  });

  // Add Unavailable Date Mutation
  const addBlockedDateMutation = useMutation({
    mutationFn: async ({ listingId, startDate, endDate, reason }) => {
      const res = await fetch(`/api/listings/${listingId}/unavailable-dates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ startDate, endDate, reason }),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error?.message || 'Failed to block dates');
      }
      return json.data.unavailableDate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['blockedDates', selectedListingId]);
      showToast({
        type: 'success',
        message: 'Dates blocked successfully',
      });
      setBlockStart('');
      setBlockEnd('');
      setBlockReason('');
    },
    onError: err => {
      showToast({
        type: 'danger',
        message: err.message || 'Failed to block dates',
      });
    },
  });

  // Delete Unavailable Date Mutation
  const deleteBlockedDateMutation = useMutation({
    mutationFn: async ({ listingId, dateId }) => {
      const res = await fetch(`/api/listings/${listingId}/unavailable-dates/${dateId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error?.message || 'Failed to remove blocked date');
      }
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['blockedDates', selectedListingId]);
      showToast({
        type: 'success',
        message: 'Blocked dates removed',
      });
    },
    onError: err => {
      showToast({
        type: 'danger',
        message: err.message || 'Failed to remove',
      });
    },
  });

  const openActionModal = (booking, type) => {
    setSelectedBooking(booking);
    setActionType(type);
    setRejectReason('');
  };

  const closeModal = () => {
    setSelectedBooking(null);
    setActionType(null);
    setRejectReason('');
  };

  const tabs = [
    { id: 'requests', label: 'Requests & Modifications' },
    { id: 'active', label: 'Active & Upcoming' },
    { id: 'history', label: 'Completed & History' },
    { id: 'blocked', label: 'Blocked Dates' },
  ];

  // Helper for sparkline SVG points
  const recentEarnings = summaryData?.recentEarnings || [];
  const maxVal = Math.max(...recentEarnings.map(e => e.amount), 1);
  const sparkPoints = recentEarnings
    .map((e, idx) => {
      const x = (idx / Math.max(recentEarnings.length - 1, 1)) * 100;
      const y = 30 - (e.amount / maxVal) * 26;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 max-w-5xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-light tracking-[-0.02em] text-text">
              Rental Operations & History
            </h1>
            <p className="text-[12px] text-muted">
              Manage vehicle handovers, returns, date modifications, and blocked calendars.
            </p>
          </div>
        </div>

        {/* Stat Cards (UI 8.8: 40px/300 number, 11px muted label, SVG sparkline) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Recorded Earnings */}
          <div className="p-5 rounded-[20px] bg-surface border border-border shadow-xs flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-medium tracking-wider uppercase text-muted mb-1">
                Completed Rental Earnings
              </div>
              <div className="text-[40px] font-light leading-none tracking-tight text-text">
                {formatRupees(summaryData?.totalEarnings || 0)}
              </div>
            </div>
            {recentEarnings.length > 0 && (
              <div className="mt-4 pt-2 border-t border-border/40 flex items-center justify-between">
                <span className="text-[10px] text-muted">Last 6 Months</span>
                <svg className="w-20 h-7 overflow-visible" viewBox="0 0 100 30">
                  <polyline
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-text"
                    points={sparkPoints}
                  />
                </svg>
              </div>
            )}
          </div>

          {/* Card 2: Completed Rentals */}
          <div className="p-5 rounded-[20px] bg-surface border border-border shadow-xs flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-medium tracking-wider uppercase text-muted mb-1">
                Completed Rentals
              </div>
              <div className="text-[40px] font-light leading-none tracking-tight text-text">
                {summaryData?.completedCount ?? 0}
              </div>
            </div>
            <div className="mt-4 pt-2 border-t border-border/40 text-[11px] text-muted">
              Vehicles safely returned
            </div>
          </div>

          {/* Card 3: Active Rentals */}
          <div className="p-5 rounded-[20px] bg-surface border border-border shadow-xs flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-medium tracking-wider uppercase text-muted mb-1">
                Active Rentals
              </div>
              <div className="text-[40px] font-light leading-none tracking-tight text-text">
                {summaryData?.activeCount ?? 0}
              </div>
            </div>
            <div className="mt-4 pt-2 border-t border-border/40 text-[11px] text-muted">
              Currently on the road
            </div>
          </div>

          {/* Card 4: Upcoming Confirmed */}
          <div className="p-5 rounded-[20px] bg-surface border border-border shadow-xs flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-medium tracking-wider uppercase text-muted mb-1">
                Upcoming Rentals
              </div>
              <div className="text-[40px] font-light leading-none tracking-tight text-text">
                {summaryData?.upcomingCount ?? 0}
              </div>
            </div>
            <div className="mt-4 pt-2 border-t border-border/40 text-[11px] text-muted">
              Confirmed future bookings
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 border-b border-border/80 pb-2 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-all shrink-0 ${
                activeTab === tab.id
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-muted hover:text-text hover:bg-tile'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1, 2, 3: Bookings Lists */}
        {activeTab !== 'blocked' && (
          <div>
            {isLoading ? (
              <div className="flex flex-col gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 rounded-[20px]" />
                ))}
              </div>
            ) : bookings.length === 0 ? (
              <EmptyState
                title="No rentals in this view"
                description="There are currently no items matching this operational category."
              />
            ) : (
              <div className="flex flex-col gap-4">
                {bookings.map(booking => {
                  const vehicle = booking.listing?.vehicleRef;
                  const renter = booking.renter;
                  const isModRequested = booking.status === 'modification_requested';
                  const isRequested = booking.status === 'requested' || booking.status === 'pending';
                  const isConfirmed = booking.status === 'confirmed';
                  const isActive = booking.status === 'active';

                  return (
                    <div
                      key={booking._id || booking.id}
                      className="p-5 rounded-[20px] bg-surface border border-border shadow-xs flex flex-col gap-4 transition-all hover:border-border/80"
                    >
                      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        {/* Vehicle & Renter info */}
                        <div className="flex items-start gap-4 min-w-0">
                          {vehicle?.images?.[0]?.url ? (
                            <img
                              src={vehicle.images[0].url}
                              alt=""
                              className="w-20 h-16 rounded-[14px] object-cover bg-tile shrink-0 border border-border/40"
                            />
                          ) : (
                            <div className="w-20 h-16 rounded-[14px] bg-tile flex items-center justify-center text-muted shrink-0">
                              <FileText className="w-6 h-6" />
                            </div>
                          )}

                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2.5 flex-wrap mb-1">
                              <span className="text-[14px] font-medium text-text truncate">
                                {vehicle?.brand} {vehicle?.model} {vehicle?.variant}
                              </span>
                              <StatusChip status={booking.status} />
                            </div>

                            <div className="flex items-center gap-3 text-[12px] text-muted flex-wrap">
                              <span className="flex items-center gap-1 text-text font-medium">
                                <Calendar className="w-3.5 h-3.5 text-muted" />
                                {new Date(booking.startDate).toLocaleDateString()} –{' '}
                                {new Date(booking.endDate).toLocaleDateString()}
                              </span>
                              <span>•</span>
                              <span>{booking.pricing?.days} Days</span>
                              <span>•</span>
                              <span className="font-semibold text-text">
                                {formatRupees(booking.pricing?.estimatedTotal || 0)}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 text-[11px] text-muted mt-1.5 flex-wrap">
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3 text-muted" />
                                {renter?.fullName || 'Renter'} ({renter?.mobile || renter?.email})
                              </span>
                              {booking.pricing?.deposit > 0 && (
                                <span className="flex items-center gap-1">
                                  <Shield className="w-3 h-3 text-muted" />
                                  Deposit: {formatRupees(booking.pricing.deposit)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Lifecycle Action Buttons */}
                        <div className="shrink-0 flex items-center gap-2 w-full md:w-auto justify-end border-t md:border-t-0 border-border/50 pt-3 md:pt-0">
                          {/* 1. Request Actions: Accept / Reject */}
                          {isRequested && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openActionModal(booking, 'reject')}
                                className="text-[12px] text-danger hover:bg-danger/10 border-danger/30"
                              >
                                Decline
                              </Button>
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => openActionModal(booking, 'accept')}
                                className="text-[12px]"
                              >
                                Accept Request
                              </Button>
                            </>
                          )}

                          {/* 2. Review Modification Action */}
                          {isModRequested && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => openActionModal(booking, 'review_mod')}
                              className="text-[12px]"
                            >
                              Review Date Change
                            </Button>
                          )}

                          {/* 3. Confirmed Action: Mark Handed Over */}
                          {isConfirmed && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => openActionModal(booking, 'handover')}
                              className="text-[12px] bg-primary text-on-primary"
                            >
                              Mark Handed Over
                            </Button>
                          )}

                          {/* 4. Active Action: Mark Returned & Complete */}
                          {isActive && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => openActionModal(booking, 'complete')}
                              className="text-[12px] bg-success text-white hover:bg-success/90"
                            >
                              Mark Returned & Complete
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Modification Notice Banner */}
                      {isModRequested && booking.pendingModification && (
                        <div className="p-3.5 rounded-[12px] bg-warning/10 border border-warning/20 text-[12px] flex items-center justify-between gap-3 text-text">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-warning shrink-0" />
                            <div>
                              <strong>Renter requested date change:</strong>{' '}
                              <span>
                                {new Date(booking.pendingModification.startDate).toLocaleDateString()} –{' '}
                                {new Date(booking.pendingModification.endDate).toLocaleDateString()} (
                                {booking.pendingModification.pricing?.days} days ·{' '}
                                {formatRupees(
                                  booking.pendingModification.pricing?.estimatedTotal || 0
                                )}
                                )
                              </span>
                              {booking.pendingModification.reason && (
                                <div className="text-[11px] text-muted mt-0.5">
                                  Reason: "{booking.pendingModification.reason}"
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: Blocked Dates Manager */}
        {activeTab === 'blocked' && (
          <div className="flex flex-col gap-6">
            {/* Listing Selector & Block Form */}
            <div className="p-5 rounded-[20px] bg-surface border border-border shadow-xs flex flex-col gap-4">
              <h2 className="text-[16px] font-medium text-text">Block Calendar Dates</h2>
              <p className="text-[12px] text-muted leading-relaxed">
                Mark dates as unavailable when you are using your vehicle privately or during
                scheduled maintenance. Conflicting bookings will be prevented.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-muted mb-1 block">Vehicle Listing</label>
                  <select
                    value={selectedListingId}
                    onChange={e => setSelectedListingId(e.target.value)}
                    className="w-full h-9 px-3 rounded-[10px] border border-border bg-surface text-text text-[12px] focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {rentalListings.map(l => (
                      <option key={l._id || l.id} value={l._id || l.id}>
                        {l.vehicleRef?.brand} {l.vehicleRef?.model} ({l.vehicleRef?.registrationNumber || 'No reg'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-muted mb-1 block">From Date & Time</label>
                  <input
                    type="datetime-local"
                    value={blockStart}
                    onChange={e => setBlockStart(e.target.value)}
                    className="w-full h-9 px-3 rounded-[10px] border border-border bg-surface text-text text-[12px] focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-muted mb-1 block">To Date & Time</label>
                  <input
                    type="datetime-local"
                    value={blockEnd}
                    onChange={e => setBlockEnd(e.target.value)}
                    className="w-full h-9 px-3 rounded-[10px] border border-border bg-surface text-text text-[12px] focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-muted mb-1 block">Reason for blocking (notes)</label>
                <input
                  type="text"
                  placeholder="e.g. Private family holiday, general maintenance..."
                  value={blockReason}
                  onChange={e => setBlockReason(e.target.value)}
                  className="w-full h-9 px-3 rounded-[10px] border border-border bg-surface text-text text-[12px] focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  variant="primary"
                  size="sm"
                  loading={addBlockedDateMutation.isPending}
                  disabled={!selectedListingId || !blockStart || !blockEnd}
                  onClick={() =>
                    addBlockedDateMutation.mutate({
                      listingId: selectedListingId,
                      startDate: new Date(blockStart).toISOString(),
                      endDate: new Date(blockEnd).toISOString(),
                      reason: blockReason,
                    })
                  }
                >
                  Block These Dates
                </Button>
              </div>
            </div>

            {/* List of currently blocked dates */}
            <div className="flex flex-col gap-3">
              <h3 className="text-[14px] font-medium text-text">Currently Blocked Ranges</h3>
              {unavailableDates.length === 0 ? (
                <div className="p-6 rounded-[16px] bg-surface border border-border text-center text-[12px] text-muted">
                  No unavailable dates currently recorded for this vehicle.
                </div>
              ) : (
                unavailableDates.map(item => (
                  <div
                    key={item._id || item.id}
                    className="p-4 rounded-[14px] bg-surface border border-border flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="text-[13px] font-medium text-text flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-muted" />
                        <span>
                          {new Date(item.startDate).toLocaleString()} –{' '}
                          {new Date(item.endDate).toLocaleString()}
                        </span>
                      </div>
                      {item.reason && (
                        <div className="text-[11px] text-muted mt-0.5">Note: {item.reason}</div>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        deleteBlockedDateMutation.mutate({
                          listingId: selectedListingId,
                          dateId: item._id || item.id,
                        })
                      }
                      className="text-danger hover:bg-danger/10 border-danger/30 text-[11px]"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      <span>Remove</span>
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Action Confirmation Modal (Accept, Reject, Handover, Complete) */}
        <Modal
          isOpen={!!selectedBooking && actionType !== 'review_mod'}
          onClose={closeModal}
          title={
            actionType === 'accept'
              ? 'Accept Rental Request'
              : actionType === 'reject'
              ? 'Decline Rental Request'
              : actionType === 'handover'
              ? 'Confirm Vehicle Handover'
              : actionType === 'complete'
              ? 'Confirm Vehicle Return & Completion'
              : 'Booking Action'
          }
        >
          <div className="flex flex-col gap-4 text-[13px]">
            <p className="text-muted leading-relaxed">
              {actionType === 'accept' && (
                <>
                  Accepting this booking confirms the dates for{' '}
                  <strong className="text-text">{selectedBooking?.renter?.fullName}</strong>.
                  Conflicting requests will be prevented.
                </>
              )}
              {actionType === 'reject' && (
                <>
                  Are you sure you want to decline this rental request? The dates will remain open for
                  other renters.
                </>
              )}
              {actionType === 'handover' && (
                <>
                  Marking the vehicle as handed over transitions this booking to{' '}
                  <strong className="text-text">Active</strong> status. Confirm that the keys and
                  vehicle have been inspected and delivered.
                </>
              )}
              {actionType === 'complete' && (
                <>
                  Confirm that the vehicle has been returned in satisfactory condition. This will mark
                  the rental as <strong className="text-text">Completed</strong> and record the final
                  transaction earnings.
                </>
              )}
            </p>

            {actionType === 'reject' && (
              <div>
                <label className="text-[11px] font-medium text-muted mb-1 block">Reason for declining</label>
                <input
                  type="text"
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="e.g. Schedule conflict, vehicle maintenance..."
                  className="w-full h-9 px-3 rounded-[10px] border border-border bg-surface text-text text-[12px] focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <Button variant="outline" size="sm" onClick={closeModal}>
                Cancel
              </Button>
              <Button
                variant={actionType === 'reject' ? 'danger' : 'primary'}
                size="sm"
                loading={statusMutation.isPending}
                onClick={() =>
                  statusMutation.mutate({
                    id: selectedBooking._id || selectedBooking.id,
                    action: actionType,
                    reason: rejectReason,
                  })
                }
              >
                {actionType === 'accept'
                  ? 'Confirm Acceptance'
                  : actionType === 'reject'
                  ? 'Decline Request'
                  : actionType === 'handover'
                  ? 'Confirm Handover'
                  : 'Complete Rental'}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Review Modification Modal */}
        <Modal
          isOpen={actionType === 'review_mod' && !!selectedBooking}
          onClose={closeModal}
          title="Review Rental Date Modification"
        >
          <div className="flex flex-col gap-4 text-[13px]">
            <p className="text-muted leading-relaxed">
              The renter has requested to change their rental schedule. Approving this change will
              atomically update the confirmed dates and recalculate the total estimate.
            </p>

            {selectedBooking?.pendingModification && (
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-tile rounded-[14px]">
                <div className="border-r border-border/60 pr-3">
                  <div className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                    Current Dates
                  </div>
                  <div className="text-[12px] font-medium text-text">
                    {new Date(selectedBooking.startDate).toLocaleDateString()} –{' '}
                    {new Date(selectedBooking.endDate).toLocaleDateString()}
                  </div>
                  <div className="text-[11px] text-muted mt-1">
                    {selectedBooking.pricing?.days} Days ·{' '}
                    {formatRupees(selectedBooking.pricing?.estimatedTotal || 0)}
                  </div>
                </div>

                <div className="pl-1">
                  <div className="text-[11px] font-semibold text-primary uppercase tracking-wider mb-1">
                    Proposed Dates
                  </div>
                  <div className="text-[12px] font-medium text-text">
                    {new Date(selectedBooking.pendingModification.startDate).toLocaleDateString()} –{' '}
                    {new Date(selectedBooking.pendingModification.endDate).toLocaleDateString()}
                  </div>
                  <div className="text-[11px] text-text font-semibold mt-1">
                    {selectedBooking.pendingModification.pricing?.days} Days ·{' '}
                    {formatRupees(
                      selectedBooking.pendingModification.pricing?.estimatedTotal || 0
                    )}
                  </div>
                </div>
              </div>
            )}

            {selectedBooking?.pendingModification?.reason && (
              <div className="text-[12px] text-muted italic">
                Renter Note: "{selectedBooking.pendingModification.reason}"
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                loading={modificationReviewMutation.isPending}
                onClick={() =>
                  modificationReviewMutation.mutate({
                    id: selectedBooking._id || selectedBooking.id,
                    action: 'reject',
                    reason: 'Dates unavailable or declined by owner',
                  })
                }
                className="text-danger border-danger/30 hover:bg-danger/10"
              >
                Decline Change
              </Button>
              <Button
                variant="primary"
                size="sm"
                loading={modificationReviewMutation.isPending}
                onClick={() =>
                  modificationReviewMutation.mutate({
                    id: selectedBooking._id || selectedBooking.id,
                    action: 'approve',
                  })
                }
              >
                Approve New Dates
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
