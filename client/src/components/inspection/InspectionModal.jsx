import React, { useState } from 'react';
import { Calendar, Clock, MessageSquare, AlertCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { useToast } from '../../context/ToastContext';

export function InspectionModal({
  isOpen,
  onClose,
  listingId,
  vehicleTitle = 'this vehicle',
  sellerName = 'the seller',
}) {
  const { addToast } = useToast();
  const toast = addToast;
  const [date, setDate] = useState('');
  const [time, setTime] = useState('10:00');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Minimum date is tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDateString = tomorrow.toISOString().split('T')[0];

  const handleSubmit = async e => {
    e.preventDefault();
    if (!date) {
      setError('Please choose a preferred date');
      return;
    }

    const combinedDateTime = new Date(`${date}T${time}:00`);
    if (combinedDateTime.getTime() <= Date.now()) {
      setError('Selected inspection date and time must be in the future');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const res = await fetch('/api/inspections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId,
          preferredDateTime: combinedDateTime.toISOString(),
          message,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to submit inspection request');
      }

      toast({
        type: 'success',
        title: 'Inspection Requested',
        message: `Your viewing request for ${vehicleTitle} was sent to ${sellerName}.`,
      });

      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Request Vehicle Inspection"
      description={`Coordinate an in-person viewing and inspection with ${sellerName}.`}
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {error && (
          <div className="p-3 rounded-xl bg-danger/10 border border-danger/20 flex items-center gap-2 text-danger text-[12px]">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-muted uppercase tracking-wider mb-1.5">
              Preferred Date
            </label>
            <Input
              type="date"
              min={minDateString}
              value={date}
              onChange={e => setDate(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-muted uppercase tracking-wider mb-1.5">
              Preferred Time
            </label>
            <Input
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-muted uppercase tracking-wider mb-1.5">
            Note or Questions (Optional)
          </label>
          <Textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="e.g. Would like to bring my mechanic to check the suspension..."
            rows={3}
            maxLength={500}
          />
        </div>

        <div className="p-3 rounded-xl bg-tile/80 text-[11px] text-muted leading-relaxed">
          <strong>Notice:</strong> This request coordinates an in-person appointment only. It does not verify mechanical condition or reserve the vehicle.
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={submitting}>
            Send Request
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default InspectionModal;
