import React, { useState } from 'react';
import { X, Send, MessageSquare } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { useToast } from '../../context/ToastContext';

export function EnquiryModal({ isOpen, onClose, listing }) {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [subject, setSubject] = useState('General Enquiry');
  const [message, setMessage] = useState('');

  const enquiryCategories = [
    'General Enquiry',
    'Inspection / Viewing',
    'Price & Terms',
    'Vehicle History & Records',
    'Availability',
  ];

  const enquiryMutation = useMutation({
    mutationFn: async payload => {
      const res = await fetch('/api/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to send enquiry');
      }
      return data.data;
    },
    onSuccess: newEnquiry => {
      addToast({
        type: 'success',
        title: 'Enquiry Sent',
        message: 'The seller has received your message and will reply in the thread.',
      });
      queryClient.invalidateQueries({ queryKey: ['my-enquiries'] });
      onClose();
      navigate(`/enquiries/${newEnquiry._id}`);
    },
    onError: err => {
      addToast({
        type: 'error',
        title: 'Enquiry Failed',
        message: err.message,
      });
    },
  });

  if (!isOpen || !listing) return null;

  const vehicleTitle = `${listing.vehicleRef?.brand} ${listing.vehicleRef?.model} ${listing.vehicleRef?.variant || ''}`;

  const handleSubmit = e => {
    e.preventDefault();
    if (!message.trim()) {
      addToast({ type: 'error', title: 'Message Required', message: 'Please write a message.' });
      return;
    }

    enquiryMutation.mutate({
      listingId: listing._id,
      subject,
      message: message.trim(),
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Send vehicle enquiry"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Surface */}
      <div className="relative z-10 w-full max-w-lg p-6 sm:p-8 rounded-[24px] bg-surface text-text border border-border shadow-2xl animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-[17px] font-semibold text-text">Send Enquiry</h2>
              <span className="text-[11px] text-muted block -mt-0.5 truncate max-w-xs sm:max-w-sm">
                Regarding {vehicleTitle}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close enquiry modal"
            className="p-1.5 rounded-full border border-border text-muted hover:text-text hover:border-text transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-6">
          <div>
            <label htmlFor="enquiry-category" className="block text-[12px] font-medium text-text mb-1.5">
              Subject Category
            </label>
            <select
              id="enquiry-category"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="w-full h-11 px-4 rounded-full bg-bg border border-border text-text text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-text cursor-pointer"
            >
              {enquiryCategories.map(cat => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="enquiry-message" className="block text-[12px] font-medium text-text mb-1.5">
              Your Message
            </label>
            <textarea
              id="enquiry-message"
              rows={4}
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Ask about vehicle condition, service history, availability for physical viewing, etc."
              className="w-full p-4 rounded-[20px] bg-bg border border-border text-text text-[13px] focus:outline-none focus:ring-2 focus:ring-text resize-none"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border mt-2">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={onClose}
              className="rounded-full px-5 text-[13px]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="rounded-full px-6 text-[13px]"
              disabled={enquiryMutation.isPending}
            >
              <Send className="w-3.5 h-3.5 mr-2" />
              {enquiryMutation.isPending ? 'Sending...' : 'Send Message'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EnquiryModal;
