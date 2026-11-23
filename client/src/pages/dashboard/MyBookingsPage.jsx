import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  Clock,
  Shield,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  Edit3,
  ArrowRight,
} from 'lucide-react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { Button } from '../../components/ui/Button';
import { StatusChip } from '../../components/ui/StatusChip';
import { Modal } from '../../components/ui/Modal';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { VehicleImage } from '../../components/vehicle/VehicleImage';
import { useToast } from '../../context/ToastContext';
import { formatRupees } from '../../utils/money';

/**
 * UI Section 8.8: Renter Dashboard - My Bookings
 * - Tabs: Upcoming, Current, Completed, Cancelled, All
 * - Booking detail card with modification and cancellation capabilities
 * - Modals for Date Modification and Cancellation with policy rules
 */
export function MyBookingsPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('upcoming');
  const [cancellingBooking, setCancellingBooking] = useState(null);
  const [modifyingBooking, setModifyingBooking] = useState(null);
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [modificationReason, setModificationReason] = useState('');

  // Fetch bookings submitted as renter with view filter
  const { data, isLoading } = useQuery({
    queryKey: ['myBookings', activeTab],
    queryFn: async () => {
      const url =
        activeTab === 'all'
          ? '/api/bookings?role=renter'
          : `/api/bookings?role=renter&view=${activeTab}`;
      const res = await fetch(url);
      const json = await res.json();
      return json.success ? json.data : { items: [], total: 0 };
    },
  });

  const bookings = data?.items || [];

  // Cancel Booking Mutation
  const cancelMutation = useMutation({
    mutationFn: async bookingId => {
      const res = await fetch(`/api/bookings/${bookingId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'cancel', reason: 'Cancelled by renter' }),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error?.message || 'Failed to cancel booking');
      }
      return json.data.booking;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['myBookings']);
      showToast({
        type: 'success',
        message: 'Booking cancelled successfully',
      });
      setCancellingBooking(null);
    },
    onError: err => {
      showToast({
        type: 'danger',
        message: err.message || 'Cancellation failed',
      });
    },
  });

  const closeModifyModal = () => {
    setModifyingBooking(null);
    setNewStartDate('');
    setNewEndDate('');
    setModificationReason('');
  };

  // Submit Modification Request Mutation
  const modifyMutation = useMutation({
    mutationFn: async ({ bookingId, startDate, endDate, reason }) => {
      const res = await fetch(`/api/bookings/${bookingId}/modification`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ startDate, endDate, reason }),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error?.message || 'Failed to submit modification request');
      }
      return json.data.booking;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['myBookings']);
      showToast({
        type: 'success',
        message: 'Date change request submitted to owner for review',
      });
      closeModifyModal();
    },
    onError: err => {
      showToast({
        type: 'danger',
        message: err.message || 'Modification request failed',
      });
    },
  });

  const openModifyModal = booking => {
    setModifyingBooking(booking);
    setNewStartDate(new Date(booking.startDate).toISOString().slice(0, 16));
    setNewEndDate(new Date(booking.endDate).toISOString().slice(0, 16));
    setModificationReason('');
  };

  const handleConfirmModification = () => {
    if (!modifyingBooking || !newStartDate || !newEndDate) return;
    modifyMutation.mutate({
      bookingId: modifyingBooking._id || modifyingBooking.id,
      startDate: new Date(newStartDate).toISOString(),
      endDate: new Date(newEndDate).toISOString(),
      reason: modificationReason,
    });
  };

  const tabs = [
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'current', label: 'Current (Active)' },
    { id: 'completed', label: 'Completed' },
    { id: 'cancelled', label: 'Cancelled' },
    { id: 'all', label: 'All History' },
  ];

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 max-w-5xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-light tracking-[-0.02em] text-text">
              My Rental Bookings
            </h1>
            <p className="text-[12px] text-muted">
              Track upcoming trips, manage dates, and view past rental history.
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/browse?purpose=rent">Find a Rental</Link>
          </Button>
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

        {/* List of Bookings */}
        {isLoading ? (
          <div className="flex flex-col gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-[20px]" />
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <EmptyState
            title="No bookings found"
            description={`You have no ${activeTab === 'all' ? '' : activeTab} vehicle rentals at the moment.`}
            action={
              <Button variant="primary" size="sm" asChild>
                <Link to="/browse?purpose=rent">Find a Rental</Link>
              </Button>
            }
          />
        ) : (
          <div className="flex flex-col gap-4">
            {bookings.map(booking => {
              const vehicle = booking.listing?.vehicleRef;
              const isConfirmed = booking.status === 'confirmed';
              const isRequestedOrPending =
                booking.status === 'requested' || booking.status === 'pending';
              const isModRequested = booking.status === 'modification_requested';
              const canModify = isConfirmed && new Date(booking.startDate).getTime() > Date.now();

              // Calculate cutoff status for confirmed bookings
              const cutoffHours = booking.listing?.rental?.cancellationCutoffHours ?? 24;
              const cutoffTime = new Date(
                new Date(booking.startDate).getTime() - cutoffHours * 3600000
              );
              const isPastCutoff = isConfirmed && Date.now() > cutoffTime.getTime();
              const canCancel = (isRequestedOrPending || isConfirmed) && !isPastCutoff;

              return (
                <div
                  key={booking._id || booking.id}
                  className="p-5 rounded-[20px] bg-surface border border-border shadow-xs flex flex-col gap-4 transition-all hover:border-border/80"
                >
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    {/* Left: Vehicle and Booking details */}
                    <div className="flex items-start gap-4 min-w-0">
                      <div className="w-20 h-16 rounded-[14px] overflow-hidden bg-tile shrink-0 border border-border/40 flex items-center justify-center">
                        <VehicleImage
                          src={vehicle?.images?.[0]?.url}
                          alt=""
                          bodyType={vehicle?.bodyType}
                          fuelType={vehicle?.fuelType}
                          className="w-full h-full object-cover"
                          lazy={true}
                        />
                      </div>

                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2.5 flex-wrap mb-1">
                          <Link
                            to={`/listings/${booking.listing?._id || booking.listing}`}
                            className="text-[14px] font-medium text-text hover:underline truncate"
                          >
                            {vehicle?.brand} {vehicle?.model} {vehicle?.variant}
                          </Link>
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

                        {booking.pricing?.deposit > 0 && (
                          <div className="text-[11px] text-muted flex items-center gap-1 mt-1.5">
                            <Shield className="w-3 h-3 text-muted" />
                            <span>Includes {formatRupees(booking.pricing.deposit)} refundable deposit</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="shrink-0 flex items-center gap-2 w-full md:w-auto justify-end border-t md:border-t-0 border-border/50 pt-3 md:pt-0">
                      {canModify && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openModifyModal(booking)}
                          className="text-[12px] flex items-center gap-1.5"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Change Dates</span>
                        </Button>
                      )}

                      {canCancel && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCancellingBooking(booking)}
                          className="text-[12px] text-danger hover:bg-danger/10 border-danger/30"
                        >
                          Cancel Booking
                        </Button>
                      )}

                      {isConfirmed && isPastCutoff && (
                        <span className="text-[11px] text-muted italic">
                          Cancellation window expired ({cutoffHours}h cutoff)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Pending Modification Banner */}
                  {isModRequested && booking.pendingModification && (
                    <div className="p-3.5 rounded-[12px] bg-warning/10 border border-warning/20 text-[12px] flex items-center justify-between gap-3 text-text">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-warning shrink-0" />
                        <div>
                          <strong>Date change request pending owner approval:</strong>{' '}
                          <span>
                            {new Date(booking.pendingModification.startDate).toLocaleDateString()} –{' '}
                            {new Date(booking.pendingModification.endDate).toLocaleDateString()} (
                            {booking.pendingModification.pricing?.days} days ·{' '}
                            {formatRupees(booking.pendingModification.pricing?.estimatedTotal || 0)})
                          </span>
                        </div>
                      </div>
                      <span className="text-[11px] text-muted bg-surface px-2 py-0.5 rounded-full border border-border">
                        Awaiting Review
                      </span>
                    </div>
                  )}

                  {/* Modification History Pill */}
                  {booking.modificationHistory?.length > 0 && (
                    <div className="text-[11px] text-muted border-t border-border/40 pt-2 flex items-center gap-2">
                      <span className="font-medium">Modification History:</span>
                      <span>
                        {booking.modificationHistory.length} request(s) (Latest:{' '}
                        <span
                          className={`font-semibold ${
                            booking.modificationHistory[booking.modificationHistory.length - 1]
                              .action === 'approved'
                              ? 'text-success'
                              : 'text-danger'
                          }`}
                        >
                          {booking.modificationHistory[booking.modificationHistory.length - 1].action}
                        </span>
                        )
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Change Dates Modal */}
        <Modal
          isOpen={!!modifyingBooking}
          onClose={closeModifyModal}
          title="Request Date Modification"
        >
          <div className="flex flex-col gap-4 text-[13px]">
            <p className="text-muted leading-relaxed">
              Submit your proposed rental dates for{' '}
              <strong className="text-text">
                {modifyingBooking?.listing?.vehicleRef?.brand}{' '}
                {modifyingBooking?.listing?.vehicleRef?.model}
              </strong>
              . The owner will review availability and either approve or decline your request.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-muted mb-1 block">New Pickup Date & Time</label>
                <input
                  type="datetime-local"
                  value={newStartDate}
                  onChange={e => setNewStartDate(e.target.value)}
                  className="w-full h-9 px-3 rounded-[10px] border border-border bg-surface text-text text-[12px] focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted mb-1 block">New Return Date & Time</label>
                <input
                  type="datetime-local"
                  value={newEndDate}
                  onChange={e => setNewEndDate(e.target.value)}
                  className="w-full h-9 px-3 rounded-[10px] border border-border bg-surface text-text text-[12px] focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium text-muted mb-1 block">Reason for change (optional)</label>
              <textarea
                value={modificationReason}
                onChange={e => setModificationReason(e.target.value)}
                placeholder="e.g. Flight rescheduled, extending vacation..."
                className="w-full h-18 p-2.5 rounded-[10px] border border-border bg-surface text-text text-[12px] resize-none focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <Button variant="outline" size="sm" onClick={closeModifyModal}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                loading={modifyMutation.isPending}
                disabled={!newStartDate || !newEndDate}
                onClick={handleConfirmModification}
              >
                Submit Request
              </Button>
            </div>
          </div>
        </Modal>

        {/* Cancel Confirmation Modal */}
        <Modal
          isOpen={!!cancellingBooking}
          onClose={() => setCancellingBooking(null)}
          title="Cancel Rental Booking"
        >
          <div className="flex flex-col gap-4 text-[13px]">
            <p className="text-muted leading-relaxed">
              Are you sure you want to cancel your rental booking for{' '}
              <strong className="text-text">
                {cancellingBooking?.listing?.vehicleRef?.brand}{' '}
                {cancellingBooking?.listing?.vehicleRef?.model}
              </strong>
              ?
            </p>

            <div className="p-3 bg-tile rounded-[12px] text-[12px] text-muted">
              <div className="font-medium text-text mb-1">Cancellation Terms</div>
              <div>
                Free cancellation is permitted up to{' '}
                <strong>
                  {cancellingBooking?.listing?.rental?.cancellationCutoffHours || 24} hours
                </strong>{' '}
                before the scheduled pickup time. Releasing dates allows other renters to book the
                vehicle.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => setCancellingBooking(null)}>
                Keep Booking
              </Button>
              <Button
                variant="danger"
                size="sm"
                loading={cancelMutation.isPending}
                onClick={() => cancelMutation.mutate(cancellingBooking._id || cancellingBooking.id)}
              >
                Yes, Cancel Booking
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
