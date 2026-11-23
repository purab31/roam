import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, User, Check, X, RotateCcw, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { StatusChip } from '../ui/StatusChip';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';
import { useToast } from '../../context/ToastContext';

export function InspectionAppointmentsList({ role = 'all' }) {
  const { addToast } = useToast();
  const toast = addToast;
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  // Modal states
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState(null);
  const [altDate, setAltDate] = useState('');
  const [altTime, setAltTime] = useState('11:00');
  const [actionReason, setActionReason] = useState('');
  const [pendingAction, setPendingAction] = useState(''); // 'accept', 'reject', 'cancel', 'complete'
  const [submitting, setSubmitting] = useState(false);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/inspections?role=${role}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setAppointments(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch inspections:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [role]);

  const handleOpenActionModal = (inspection, action) => {
    setSelectedInspection(inspection);
    setPendingAction(action);
    setActionReason('');
    setActionModalOpen(true);
  };

  const handleOpenRescheduleModal = inspection => {
    setSelectedInspection(inspection);
    setAltDate('');
    setAltTime('11:00');
    setActionReason('');
    setRescheduleModalOpen(true);
  };

  const executeAction = async () => {
    if (!selectedInspection) return;
    try {
      setSubmitting(true);
      let res;

      if (pendingAction === 'accept' || pendingAction === 'reject') {
        res = await fetch(`/api/inspections/${selectedInspection.id || selectedInspection._id}/respond`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: pendingAction,
            alternativeMessage: actionReason,
          }),
        });
      } else {
        res = await fetch(`/api/inspections/${selectedInspection.id || selectedInspection._id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: pendingAction,
            note: actionReason,
          }),
        });
      }

      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || 'Action failed');

      toast({
        type: 'success',
        title: 'Status Updated',
        message: 'Inspection appointment status updated successfully.',
      });

      setActionModalOpen(false);
      fetchAppointments();
    } catch (err) {
      toast({
        type: 'danger',
        title: 'Update Failed',
        message: err.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const executeReschedule = async e => {
    e.preventDefault();
    if (!selectedInspection || !altDate) return;

    try {
      setSubmitting(true);
      const combinedDateTime = new Date(`${altDate}T${altTime}:00`);

      const res = await fetch(`/api/inspections/${selectedInspection.id || selectedInspection._id}/respond`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reschedule',
          proposedAlternative: combinedDateTime.toISOString(),
          alternativeMessage: actionReason,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || 'Failed to propose reschedule');

      toast({
        type: 'success',
        title: 'Alternative Proposed',
        message: 'Buyer has been notified of your proposed inspection time.',
      });

      setRescheduleModalOpen(false);
      fetchAppointments();
    } catch (err) {
      toast({
        type: 'danger',
        title: 'Reschedule Failed',
        message: err.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Filter tab logic
  const filteredAppointments = appointments.filter(app => {
    if (activeTab === 'all') return true;
    if (activeTab === 'upcoming') return app.status === 'accepted';
    if (activeTab === 'pending') return app.status === 'requested';
    if (activeTab === 'reschedule') return app.status === 'reschedule_proposed';
    if (activeTab === 'completed') return app.status === 'completed';
    if (activeTab === 'cancelled') return app.status === 'cancelled' || app.status === 'rejected';
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="w-full h-28 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none border-b border-border/60">
        {[
          { key: 'all', label: `All (${appointments.length})` },
          { key: 'upcoming', label: 'Upcoming Confirmed' },
          { key: 'pending', label: 'Pending Requests' },
          { key: 'reschedule', label: 'Reschedule Proposed' },
          { key: 'completed', label: 'Completed' },
          { key: 'cancelled', label: 'Cancelled / Declined' },
        ].map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 text-[12px] font-medium rounded-full transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-primary text-on-primary'
                : 'bg-tile text-muted hover:text-text'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filteredAppointments.length === 0 ? (
        <EmptyState
          title="No inspection appointments"
          description="Inspection requests and in-person viewing appointments will be listed here."
          icon={Calendar}
        />
      ) : (
        <div className="space-y-3">
          {filteredAppointments.map(app => {
            const vehicle = app.listing?.vehicleRef;
            const formattedDate = new Date(app.preferredDateTime).toLocaleString('en-IN', {
              dateStyle: 'medium',
              timeStyle: 'short',
            });

            return (
              <div
                key={app.id || app._id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-surface border border-border/70 hover:border-border transition-colors gap-4"
              >
                {/* Left: Vehicle and Date Info */}
                <div className="flex items-start gap-3.5">
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-tile shrink-0 border border-border/50">
                    <img
                      src={
                        vehicle?.images?.[0]?.url ||
                        '/placeholders/placeholder-suv.svg'
                      }
                      alt={vehicle?.brand || 'Vehicle'}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-medium text-text">
                        {vehicle
                          ? `${vehicle.manufacturingYear} ${vehicle.brand} ${vehicle.model}`
                          : 'Vehicle Inspection'}
                      </span>
                      <StatusChip status={app.status} />
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-muted mt-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{formattedDate}</span>
                    </div>

                    {app.message && (
                      <div className="text-[12px] text-muted/90 mt-1.5 italic bg-tile/40 px-2.5 py-1 rounded-md">
                        &ldquo;{app.message}&rdquo;
                      </div>
                    )}

                    {app.status === 'reschedule_proposed' && app.proposedAlternative && (
                      <div className="mt-2 text-[11px] font-medium text-warning bg-warning/10 border border-warning/20 p-2 rounded-lg">
                        Proposed Time:{' '}
                        {new Date(app.proposedAlternative).toLocaleString('en-IN', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                        {app.alternativeMessage && ` — \u201C${app.alternativeMessage}\u201D`}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {/* Seller actions on requested */}
                  {role === 'seller' && app.status === 'requested' && (
                    <>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleOpenActionModal(app, 'accept')}
                      >
                        Accept
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenRescheduleModal(app)}
                      >
                        Reschedule
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-danger hover:bg-danger/10"
                        onClick={() => handleOpenActionModal(app, 'reject')}
                      >
                        Decline
                      </Button>
                    </>
                  )}

                  {/* Seller actions on accepted */}
                  {role === 'seller' && app.status === 'accepted' && (
                    <>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleOpenActionModal(app, 'complete')}
                      >
                        Complete
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenActionModal(app, 'cancel')}
                      >
                        Cancel
                      </Button>
                    </>
                  )}

                  {/* Buyer actions on reschedule_proposed */}
                  {role === 'buyer' && app.status === 'reschedule_proposed' && (
                    <>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleOpenActionModal(app, 'accept_reschedule')}
                      >
                        Accept Reschedule
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-danger"
                        onClick={() => handleOpenActionModal(app, 'reject_reschedule')}
                      >
                        Decline
                      </Button>
                    </>
                  )}

                  {/* Buyer cancel on requested or accepted */}
                  {role === 'buyer' && (app.status === 'requested' || app.status === 'accepted') && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenActionModal(app, 'cancel')}
                    >
                      Cancel Request
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Action Confirmation Modal */}
      <Modal
        isOpen={actionModalOpen}
        onClose={() => setActionModalOpen(false)}
        title="Update Inspection Appointment"
      >
        <div className="space-y-4">
          <p className="text-[13px] text-muted">
            Are you sure you want to {pendingAction.replace('_', ' ')} this appointment?
          </p>

          <div>
            <label className="block text-[11px] font-medium text-muted uppercase tracking-wider mb-1.5">
              Reason / Note (Optional)
            </label>
            <Textarea
              value={actionReason}
              onChange={e => setActionReason(e.target.value)}
              placeholder="Provide a brief explanation..."
              rows={3}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <Button variant="ghost" onClick={() => setActionModalOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="primary" onClick={executeAction} loading={submitting}>
              Confirm
            </Button>
          </div>
        </div>
      </Modal>

      {/* Propose Reschedule Modal */}
      <Modal
        isOpen={rescheduleModalOpen}
        onClose={() => setRescheduleModalOpen(false)}
        title="Propose Alternative Appointment"
        description="Select a new date and time that works better for you."
      >
        <form onSubmit={executeReschedule} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-muted uppercase tracking-wider mb-1.5">
                New Date
              </label>
              <Input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={altDate}
                onChange={e => setAltDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-muted uppercase tracking-wider mb-1.5">
                New Time
              </label>
              <Input
                type="time"
                value={altTime}
                onChange={e => setAltTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-muted uppercase tracking-wider mb-1.5">
              Reason / Note
            </label>
            <Textarea
              value={actionReason}
              onChange={e => setActionReason(e.target.value)}
              placeholder="e.g. Unavailable Saturday morning, Sunday 11am would be ideal."
              rows={3}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <Button variant="ghost" type="button" onClick={() => setRescheduleModalOpen(false)} disabled={submitting}>
              Close
            </Button>
            <Button variant="primary" type="submit" loading={submitting}>
              Send Proposal
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default InspectionAppointmentsList;
