import React, { useState } from 'react';
import { X, Send, Tag, AlertCircle, ArrowRight } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { StatusChip } from '../ui/StatusChip';
import { useToast } from '../../context/ToastContext';
import { formatRupees, rupeesToPaise } from '../../utils/money';

export function OfferSideSheet({ isOpen, onClose, listing }) {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const askingRupees = listing?.sale?.askingPrice ? listing.sale.askingPrice / 100 : 0;
  const [offerRupees, setOfferRupees] = useState(askingRupees ? Math.round(askingRupees * 0.95) : '');
  const [message, setMessage] = useState('');

  // Fetch previous offers on this listing
  const { data: previousOffersData } = useQuery({
    queryKey: ['my-offers-for-listing', listing?._id],
    queryFn: async () => {
      const res = await fetch('/api/offers/my-offers', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch offers');
      const data = await res.json();
      return (data.data?.items || []).filter(o => {
        const oListId = o.listing?._id || o.listing;
        return oListId?.toString() === listing?._id?.toString();
      });
    },
    enabled: isOpen && !!listing?._id,
  });

  const previousOffers = previousOffersData || [];

  const offerMutation = useMutation({
    mutationFn: async payload => {
      const res = await fetch('/api/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to submit offer');
      }
      return data.data;
    },
    onSuccess: newOffer => {
      addToast({
        type: 'success',
        title: 'Offer Submitted',
        message: 'Your purchase offer has been sent to the seller.',
      });
      queryClient.invalidateQueries({ queryKey: ['my-offers'] });
      queryClient.invalidateQueries({ queryKey: ['my-offers-for-listing', listing?._id] });
      onClose();
      navigate(`/negotiations/${newOffer._id}`);
    },
    onError: err => {
      addToast({
        type: 'error',
        title: 'Offer Failed',
        message: err.message,
      });
    },
  });

  if (!isOpen || !listing) return null;

  const vehicleTitle = `${listing.vehicleRef?.brand} ${listing.vehicleRef?.model} ${listing.vehicleRef?.variant || ''}`;

  const handleSubmit = e => {
    e.preventDefault();
    const numericRupees = Number(offerRupees);
    if (!numericRupees || numericRupees <= 0) {
      addToast({ type: 'error', title: 'Invalid Amount', message: 'Please enter a valid offer amount.' });
      return;
    }

    offerMutation.mutate({
      listingId: listing._id,
      amount: rupeesToPaise(numericRupees),
      message: message.trim(),
    });
  };

  const adjustOffer = delta => {
    setOfferRupees(prev => Math.max(0, Number(prev || 0) + delta));
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Make a purchase offer"
      className="fixed inset-0 z-50 flex justify-end"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Side Sheet Container (UI 8.3) */}
      <div className="relative z-10 w-full max-w-md h-full bg-surface text-text border-l border-border shadow-2xl flex flex-col justify-between overflow-y-auto p-6 sm:p-8 animate-slide-left">
        {/* Header */}
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground">
                <Tag className="w-4 h-4" />
              </div>
              <h2 className="text-[17px] font-semibold text-text">Make an Offer</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close offer sheet"
              className="p-1.5 rounded-full border border-border text-muted hover:text-text hover:border-text transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Vehicle & Price Summary */}
          <div className="p-4 my-6 rounded-[20px] bg-tile border border-border">
            <span className="text-[11px] font-medium text-muted uppercase tracking-wider block mb-1">
              Vehicle Target
            </span>
            <h3 className="text-[15px] font-semibold text-text truncate">{vehicleTitle}</h3>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/60">
              <span className="text-[12px] text-muted">Asking Price</span>
              <span className="text-[16px] font-bold text-text">
                {formatRupees(listing.sale?.askingPrice || 0)}
              </span>
            </div>
            {listing.sale?.negotiable && (
              <span className="inline-block mt-1 text-[11px] font-medium text-accent">
                Price negotiable
              </span>
            )}
          </div>

          {/* Offer Input Form */}
          <form id="offer-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="offer-amount" className="block text-[12px] font-medium text-text mb-1.5">
                Your Offer Amount (₹)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted font-semibold text-[14px]">
                  ₹
                </span>
                <input
                  id="offer-amount"
                  type="number"
                  min="1"
                  step="1000"
                  value={offerRupees}
                  onChange={e => setOfferRupees(e.target.value)}
                  placeholder="e.g. 1200000"
                  className="w-full h-12 pl-8 pr-4 rounded-full bg-bg border border-border text-text font-semibold text-[15px] focus:outline-none focus:ring-2 focus:ring-text transition-all"
                  required
                />
              </div>

              {/* Quick Adjustment Pills */}
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                <button
                  type="button"
                  onClick={() => adjustOffer(10000)}
                  className="px-2.5 py-1 rounded-full bg-tile hover:bg-border text-[11px] font-medium text-text transition-colors cursor-pointer"
                >
                  +₹10,000
                </button>
                <button
                  type="button"
                  onClick={() => adjustOffer(25000)}
                  className="px-2.5 py-1 rounded-full bg-tile hover:bg-border text-[11px] font-medium text-text transition-colors cursor-pointer"
                >
                  +₹25,000
                </button>
                <button
                  type="button"
                  onClick={() => adjustOffer(50000)}
                  className="px-2.5 py-1 rounded-full bg-tile hover:bg-border text-[11px] font-medium text-text transition-colors cursor-pointer"
                >
                  +₹50,000
                </button>
                <button
                  type="button"
                  onClick={() => setOfferRupees(askingRupees)}
                  className="px-2.5 py-1 rounded-full bg-tile hover:bg-border text-[11px] font-medium text-muted hover:text-text transition-colors cursor-pointer"
                >
                  Match asking
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="offer-message" className="block text-[12px] font-medium text-text mb-1.5">
                Optional Message / Terms
              </label>
              <textarea
                id="offer-message"
                rows={3}
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="e.g. Immediate payment upon inspection, valid for 48 hours."
                className="w-full p-3.5 rounded-[18px] bg-bg border border-border text-text text-[13px] focus:outline-none focus:ring-2 focus:ring-text resize-none"
              />
            </div>
          </form>

          {/* Previous Offers on this Listing */}
          {previousOffers.length > 0 && (
            <div className="mt-6 pt-4 border-t border-border">
              <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block mb-2">
                Your Previous Offers ({previousOffers.length})
              </span>
              <div className="flex flex-col gap-2">
                {previousOffers.map(o => (
                  <div
                    key={o._id}
                    onClick={() => {
                      onClose();
                      navigate(`/negotiations/${o._id}`);
                    }}
                    className="flex items-center justify-between p-3 rounded-[16px] bg-tile hover:border-text border border-border transition-colors cursor-pointer"
                  >
                    <div>
                      <span className="text-[13px] font-semibold text-text">
                        {formatRupees(o.amount)}
                      </span>
                      <span className="text-[11px] text-muted block">
                        {new Date(o.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusChip status={o.status} />
                      <ArrowRight className="w-3.5 h-3.5 text-muted" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-6 border-t border-border mt-6">
          <Button
            type="submit"
            form="offer-form"
            variant="primary"
            size="lg"
            className="w-full h-12 rounded-full text-[14px]"
            disabled={offerMutation.isPending}
          >
            <Send className="w-4 h-4 mr-2" />
            {offerMutation.isPending ? 'Submitting...' : 'Submit Offer'}
          </Button>
          <p className="text-[11px] text-muted text-center mt-2">
            Non-binding negotiation. Final settlement and vehicle handover occur outside platform.
          </p>
        </div>
      </div>
    </div>
  );
}

export default OfferSideSheet;
