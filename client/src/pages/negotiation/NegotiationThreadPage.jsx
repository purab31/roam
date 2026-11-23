import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Send,
  ArrowLeft,
  Tag,
  MessageSquare,
  Check,
  X,
  RotateCcw,
  CheckCircle2,
  Clock,
  Car,
  ShieldCheck,
  AlertCircle,
  Building2,
} from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { Footer } from '../../components/layout/Footer';
import { Button } from '../../components/ui/Button';
import { StatusChip } from '../../components/ui/StatusChip';
import { Skeleton } from '../../components/ui/Skeleton';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { formatRupees, rupeesToPaise } from '../../utils/money';

export function NegotiationThreadPage({ type = 'offer' }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { addToast } = useToast();

  const [composerMessage, setComposerMessage] = useState('');
  const [isCounterModalOpen, setIsCounterModalOpen] = useState(false);
  const [counterRupees, setCounterRupees] = useState('');
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [finalAmountRupees, setFinalAmountRupees] = useState('');
  const [completionNotes, setCompletionNotes] = useState('');

  const messagesEndRef = useRef(null);

  // Scroll to bottom on new events
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 1. Fetch Thread Data
  const endpoint = type === 'offer' ? `/api/offers/${id}` : `/api/enquiries/${id}`;
  const queryKey = type === 'offer' ? ['offer-thread', id] : ['enquiry-thread', id];

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await fetch(endpoint, { credentials: 'include' });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error?.message || 'Failed to load thread');
      }
      const json = await res.json();
      return json.data;
    },
    refetchInterval: 15000, // Poll every 15s for new messages/responses
  });

  useEffect(() => {
    if (data) {
      scrollToBottom();
      if (type === 'offer') {
        const currentAmountRupees = data.amount ? data.amount / 100 : 0;
        setCounterRupees(currentAmountRupees);
        setFinalAmountRupees(currentAmountRupees);
      }
    }
  }, [data, type]);

  // Mutations
  const replyMutation = useMutation({
    mutationFn: async message => {
      if (type === 'enquiry') {
        const res = await fetch(`/api/enquiries/${id}/replies`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ message }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error?.message || 'Failed to send reply');
        return json.data;
      } else {
        // Counteroffer with message or status comment
        throw new Error('For offers, use counter or action buttons');
      }
    },
    onSuccess: () => {
      setComposerMessage('');
      queryClient.invalidateQueries({ queryKey });
    },
    onError: err => {
      addToast({ type: 'error', title: 'Error', message: err.message });
    },
  });

  const offerStatusMutation = useMutation({
    mutationFn: async ({ status, message }) => {
      const res = await fetch(`/api/offers/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status, message }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to update offer status');
      return json.data;
    },
    onSuccess: updated => {
      addToast({
        type: 'success',
        title: 'Status Updated',
        message: `Offer status is now ${updated.status}.`,
      });
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['my-offers'] });
    },
    onError: err => {
      addToast({ type: 'error', title: 'Action Failed', message: err.message });
    },
  });

  const counterMutation = useMutation({
    mutationFn: async ({ amount, message }) => {
      const res = await fetch(`/api/offers/${id}/counter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ amount, message }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to make counteroffer');
      return json.data;
    },
    onSuccess: () => {
      addToast({
        type: 'success',
        title: 'Counteroffer Sent',
        message: 'Your counteroffer has been submitted.',
      });
      setIsCounterModalOpen(false);
      queryClient.invalidateQueries({ queryKey });
    },
    onError: err => {
      addToast({ type: 'error', title: 'Counter Failed', message: err.message });
    },
  });

  const completeSaleMutation = useMutation({
    mutationFn: async ({ finalAmount, notes }) => {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ offerId: id, finalAmount, notes }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to record sale completion');
      return json.data;
    },
    onSuccess: () => {
      addToast({
        type: 'success',
        title: 'Sale Completed',
        message: 'Transaction recorded and vehicle marked as sold!',
      });
      setIsCompleteModalOpen(false);
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['my-transactions'] });
    },
    onError: err => {
      addToast({ type: 'error', title: 'Completion Failed', message: err.message });
    },
  });

  const acquireMutation = useMutation({
    mutationFn: async notes => {
      const res = await fetch('/api/transactions/acquire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ offerId: id, notes }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to initiate acquisition');
      return json.data;
    },
    onSuccess: () => {
      addToast({
        type: 'success',
        title: 'Acquisition Initiated',
        message: 'Awaiting owner handover confirmation.',
      });
      queryClient.invalidateQueries({ queryKey });
    },
    onError: err => {
      addToast({ type: 'error', title: 'Acquisition Failed', message: err.message });
    },
  });

  const updateAcquisitionMutation = useMutation({
    mutationFn: async ({ transactionId, action, notes }) => {
      const res = await fetch(`/api/transactions/${transactionId}/acquisition`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action, notes }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to update acquisition');
      return json.data;
    },
    onSuccess: (_, vars) => {
      addToast({
        type: 'success',
        title: vars.action === 'confirm' ? 'Acquisition Confirmed' : 'Acquisition Cancelled',
        message:
          vars.action === 'confirm'
            ? 'Vehicle ownership transferred to dealer and marked as sold!'
            : 'Acquisition cancelled and listing restored to active.',
      });
      queryClient.invalidateQueries({ queryKey });
    },
    onError: err => {
      addToast({ type: 'error', title: 'Action Failed', message: err.message });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-bg text-text">
        <Header />
        <main className="flex-1 max-w-[720px] w-full mx-auto px-4 py-8">
          <Skeleton className="h-28 w-full rounded-[24px] mb-6" />
          <Skeleton className="h-96 w-full rounded-[24px]" />
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col bg-bg text-text">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <AlertCircle className="w-12 h-12 text-danger mb-3" />
          <h1 className="text-xl font-semibold mb-1">Unable to Load Thread</h1>
          <p className="text-[13px] text-muted mb-6">{error?.message || 'Thread not found.'}</p>
          <Button variant="secondary" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  const isOffer = type === 'offer';
  const listing = data.listing || {};
  const vehicle = listing.vehicleRef || {};
  const vehicleTitle = `${vehicle.brand || ''} ${vehicle.model || ''} ${vehicle.variant || ''}`.trim() || 'Vehicle';
  const coverImage = vehicle.images?.find(img => img.isCover)?.url || vehicle.images?.[0]?.url || '/placeholders/sedan.svg';

  const currentUserId = user?._id?.toString();
  const isBuyer = isOffer
    ? data.offeredBy?._id?.toString() === currentUserId
    : data.enquirer?._id?.toString() === currentUserId;
  const isSeller = isOffer
    ? data.seller?._id?.toString() === currentUserId
    : data.recipient?._id?.toString() === currentUserId;

  const awaitingTurn = isOffer ? data.awaitingResponseFrom : null;
  const isMyTurn = (isSeller && awaitingTurn === 'seller') || (isBuyer && awaitingTurn === 'buyer');

  return (
    <div className="min-h-screen flex flex-col bg-bg text-text transition-colors duration-200">
      <Header />

      <main className="flex-1 w-full max-w-[720px] mx-auto px-4 py-6 sm:py-8 flex flex-col">
        {/* Back Link */}
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-muted hover:text-text transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <span className="text-[11px] font-medium text-muted uppercase tracking-wider">
            {isOffer ? 'Purchase Negotiation' : 'Vehicle Enquiry'}
          </span>
        </div>

        {/* Pinned Vehicle Mini Card per UI Section 8.5 */}
        <div className="p-4 rounded-[24px] bg-surface border border-border shadow-card mb-6 flex items-center justify-between gap-4 sticky top-20 z-20 backdrop-blur-md bg-surface/90">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-14 h-14 rounded-[16px] bg-tile border border-border overflow-hidden shrink-0 flex items-center justify-center">
              <img
                src={coverImage}
                alt={vehicleTitle}
                className="w-full h-full object-contain p-1"
                onError={e => {
                  e.currentTarget.src = '/placeholders/sedan.svg';
                }}
              />
            </div>
            <div className="min-w-0">
              <Link
                to={`/listings/${listing._id}`}
                className="text-[14px] font-semibold text-text hover:underline truncate block"
              >
                {vehicleTitle}
              </Link>
              <div className="flex items-center gap-2 text-[12px] text-muted mt-0.5">
                <span>{vehicle.manufacturingYear}</span>
                <span>•</span>
                <span>{vehicle.location?.city || 'India'}</span>
              </div>
              {data.dealerSummary && (
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Dealer: </span>
                  <Link
                    to={`/dealers/${data.dealerSummary.id || data.dealerSummary._id}`}
                    className="font-semibold underline hover:opacity-80"
                  >
                    {data.dealerSummary.dealershipName}
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end shrink-0">
            {isOffer ? (
              <>
                <span className="text-[15px] font-bold text-text">
                  {formatRupees(data.amount)}
                </span>
                <div className="mt-1">
                  <StatusChip status={data.status} />
                </div>
              </>
            ) : (
              <>
                <span className="text-[14px] font-semibold text-text">
                  {formatRupees(listing.sale?.askingPrice || 0)}
                </span>
                <div className="mt-1">
                  <StatusChip status={data.status} />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Below Minimum Alert for Seller View Only (Adjustment 2) */}
        {isOffer && isSeller && data.isBelowMinimum && data.status !== 'completed' && data.status !== 'rejected' && (
          <div className="p-3 mb-4 rounded-[16px] bg-[rgba(217,119,6,0.12)] border border-[rgba(217,119,6,0.24)] text-[#d97706] dark:text-[#fbbf24] text-[12px] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              <strong>Below Minimum Indicator:</strong> This offer is below your private minimum acceptable offer threshold.
            </span>
          </div>
        )}

        {/* Negotiation / Enquiry Thread Body */}
        <div className="flex-1 flex flex-col gap-4 pb-6 min-h-[360px]">
          {isOffer ? (
            /* Offer Thread Events & History per UI 8.5 */
            <>
              {/* Initial offer event */}
              <div className="flex justify-center my-2">
                <span className="px-3.5 py-1 rounded-full bg-tile border border-border text-[11px] font-medium text-muted">
                  Offer created for {formatRupees(data.history?.[0]?.amount || data.amount)}
                </span>
              </div>

              {/* History events and messages */}
              {data.history?.map((event, idx) => {
                const isActorMe = event.actor?._id
                  ? event.actor._id.toString() === currentUserId
                  : event.actor?.toString() === currentUserId;

                // System event pills
                if (['accepted', 'completed', 'withdrawn', 'rejected', 'closed_competing_offer'].includes(event.action)) {
                  let eventLabel = `Offer ${event.action}`;
                  if (event.action === 'accepted') eventLabel = 'Offer accepted by seller';
                  if (event.action === 'completed') eventLabel = `Sale completed for ${formatRupees(event.amount)}`;
                  if (event.action === 'closed_competing_offer') eventLabel = 'Compromise reached on another offer (Closed)';

                  return (
                    <div key={idx} className="flex justify-center my-2">
                      <span className="px-3.5 py-1 rounded-full bg-tile border border-border text-[11px] font-medium text-muted shadow-sm">
                        {eventLabel}
                      </span>
                    </div>
                  );
                }

                // Counteroffer pill
                if (event.action === 'counteroffer_made') {
                  return (
                    <React.Fragment key={idx}>
                      <div className="flex justify-center my-2">
                        <span className="px-3.5 py-1 rounded-full bg-tile border border-border text-[11px] font-semibold text-text shadow-sm">
                          Counteroffer made: {formatRupees(event.amount)}
                        </span>
                      </div>
                      {event.message && (
                        <div className={`flex ${isActorMe ? 'justify-end' : 'justify-start'} my-1`}>
                          <div
                            className={`max-w-[80%] px-4 py-2.5 rounded-[20px] text-[13px] leading-relaxed ${
                              isActorMe
                                ? 'bg-primary text-primary-foreground rounded-br-xs'
                                : 'bg-tile text-text rounded-bl-xs border border-border'
                            }`}
                          >
                            <p>{event.message}</p>
                            <span className="block text-[10px] opacity-70 mt-1 text-right">
                              {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      )}
                    </React.Fragment>
                  );
                }

                // Normal message
                if (event.message) {
                  return (
                    <div key={idx} className={`flex ${isActorMe ? 'justify-end' : 'justify-start'} my-1`}>
                      <div
                        className={`max-w-[80%] px-4 py-2.5 rounded-[20px] text-[13px] leading-relaxed ${
                          isActorMe
                            ? 'bg-primary text-primary-foreground rounded-br-xs'
                            : 'bg-tile text-text rounded-bl-xs border border-border'
                        }`}
                      >
                        <p>{event.message}</p>
                        <span className="block text-[10px] opacity-70 mt-1 text-right">
                          {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                }

                return null;
              })}
            </>
          ) : (
            /* Enquiry Thread (Initial Message + Replies) */
            <>
              {/* Category Pill */}
              <div className="flex justify-center my-2">
                <span className="px-3.5 py-1 rounded-full bg-tile border border-border text-[11px] font-medium text-muted">
                  Category: {data.subject}
                </span>
              </div>

              {/* Initial message from enquirer */}
              <div
                className={`flex ${
                  data.enquirer?._id?.toString() === currentUserId ? 'justify-end' : 'justify-start'
                } my-1`}
              >
                <div
                  className={`max-w-[80%] px-4 py-2.5 rounded-[20px] text-[13px] leading-relaxed ${
                    data.enquirer?._id?.toString() === currentUserId
                      ? 'bg-primary text-primary-foreground rounded-br-xs'
                      : 'bg-tile text-text rounded-bl-xs border border-border'
                  }`}
                >
                  <p>{data.message}</p>
                  <span className="block text-[10px] opacity-70 mt-1 text-right">
                    {new Date(data.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              {/* Replies */}
              {data.replies?.map(r => {
                const isReplyMine = r.sender?._id
                  ? r.sender._id.toString() === currentUserId
                  : r.sender?.toString() === currentUserId;

                return (
                  <div key={r._id} className={`flex ${isReplyMine ? 'justify-end' : 'justify-start'} my-1`}>
                    <div
                      className={`max-w-[80%] px-4 py-2.5 rounded-[20px] text-[13px] leading-relaxed ${
                        isReplyMine
                          ? 'bg-primary text-primary-foreground rounded-br-xs'
                          : 'bg-tile text-text rounded-bl-xs border border-border'
                      }`}
                    >
                      <p>{r.message}</p>
                      <span className="block text-[10px] opacity-70 mt-1 text-right">
                        {new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Action Bar for Offers (UI 8.5 & 8.8) */}
        {isOffer && (
          <div className="p-4 rounded-[24px] bg-surface border border-border shadow-card mb-4 flex flex-col gap-3">
            {/* Active Turn Actions */}
            {['submitted', 'pending', 'counteroffer_made'].includes(data.status) && (
              <>
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-muted">Turn Status:</span>
                  <span className="font-semibold text-text">
                    {isMyTurn ? 'Your turn to respond' : `Waiting for ${awaitingTurn}...`}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
                  {/* Seller Turn Actions */}
                  {isSeller && awaitingTurn === 'seller' && (
                    <>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => offerStatusMutation.mutate({ status: 'accepted' })}
                        disabled={offerStatusMutation.isPending}
                        className="rounded-full px-4 text-[12px]"
                      >
                        <Check className="w-3.5 h-3.5 mr-1.5" />
                        Accept Offer ({formatRupees(data.amount)})
                      </Button>

                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setIsCounterModalOpen(true)}
                        className="rounded-full px-4 text-[12px]"
                      >
                        <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                        Counteroffer
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => offerStatusMutation.mutate({ status: 'rejected' })}
                        disabled={offerStatusMutation.isPending}
                        className="rounded-full px-4 text-[12px] text-danger hover:bg-danger/10"
                      >
                        <X className="w-3.5 h-3.5 mr-1.5" />
                        Decline
                      </Button>
                    </>
                  )}

                  {/* Buyer Turn Actions */}
                  {isBuyer && awaitingTurn === 'buyer' && (
                    <>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => offerStatusMutation.mutate({ status: 'accepted' })}
                        disabled={offerStatusMutation.isPending}
                        className="rounded-full px-4 text-[12px]"
                      >
                        <Check className="w-3.5 h-3.5 mr-1.5" />
                        Accept Counter ({formatRupees(data.amount)})
                      </Button>

                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setIsCounterModalOpen(true)}
                        className="rounded-full px-4 text-[12px]"
                      >
                        <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                        Counter
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => offerStatusMutation.mutate({ status: 'withdrawn' })}
                        disabled={offerStatusMutation.isPending}
                        className="rounded-full px-4 text-[12px] text-danger"
                      >
                        Withdraw
                      </Button>
                    </>
                  )}

                  {/* Offerer can withdraw when awaiting seller */}
                  {isBuyer && awaitingTurn === 'seller' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => offerStatusMutation.mutate({ status: 'withdrawn' })}
                      disabled={offerStatusMutation.isPending}
                      className="rounded-full px-4 text-[12px] text-muted hover:text-danger"
                    >
                      Withdraw Offer
                    </Button>
                  )}
                </div>
              </>
            )}

            {/* Accepted State */}
            {data.status === 'accepted' && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-[16px] bg-[rgba(22,163,74,0.08)] border border-[rgba(22,163,74,0.2)]">
                <div className="flex items-center gap-2 text-[13px] text-[#16a34a] dark:text-[#34d399] font-medium">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>
                    {data.dealerSummary
                      ? 'Offer Accepted! Dealership acquisition workflow active.'
                      : 'Offer Accepted! Pending payment and handover settlement.'}
                  </span>
                </div>
                {data.dealerSummary ? (
                  isBuyer ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => acquireMutation.mutate('Vehicle inspection completed; initiating acquisition')}
                      disabled={acquireMutation.isPending}
                      className="rounded-full px-4 text-[12px] shrink-0"
                    >
                      {acquireMutation.isPending ? 'Initiating...' : 'Initiate Acquisition'}
                    </Button>
                  ) : (
                    <span className="text-[12px] text-muted">
                      Awaiting dealer acquisition transfer
                    </span>
                  )
                ) : (
                  isSeller && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setIsCompleteModalOpen(true)}
                      className="rounded-full px-4 text-[12px] shrink-0"
                    >
                      Mark as Sold (Complete)
                    </Button>
                  )
                )}
              </div>
            )}

            {/* Completed State */}
            {data.status === 'completed' && (
              <div className="p-3 text-center rounded-[16px] bg-tile text-[12px] font-medium text-text">
                ✓ Sale transaction successfully recorded and vehicle marked as sold.
              </div>
            )}
          </div>
        )}

        {/* Composer per UI Section 8.5: Pill input with circular send button */}
        {!isOffer && data.status !== 'closed' && (
          <form
            onSubmit={e => {
              e.preventDefault();
              if (composerMessage.trim()) {
                replyMutation.mutate(composerMessage.trim());
              }
            }}
            className="flex items-center gap-2 p-1.5 rounded-full bg-surface border border-border shadow-card sticky bottom-4 z-20"
          >
            <input
              type="text"
              value={composerMessage}
              onChange={e => setComposerMessage(e.target.value)}
              placeholder="Type your reply here..."
              className="flex-1 h-11 pl-4 pr-2 bg-transparent text-[13px] text-text placeholder:text-muted focus:outline-none"
            />
            <button
              type="submit"
              disabled={!composerMessage.trim() || replyMutation.isPending}
              aria-label="Send message"
              className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground hover:scale-105 transition-transform disabled:opacity-40 disabled:hover:scale-100 cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Counteroffer Modal */}
        {isCounterModalOpen && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsCounterModalOpen(false)} />
            <div className="relative z-10 w-full max-w-sm p-6 rounded-[24px] bg-surface text-text border border-border shadow-2xl animate-fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <h3 className="text-[16px] font-semibold text-text">Make Counteroffer</h3>
                <button
                  type="button"
                  onClick={() => setIsCounterModalOpen(false)}
                  className="p-1 rounded-full border border-border text-muted hover:text-text cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="my-4">
                <label className="block text-[12px] font-medium text-text mb-1">
                  Counter Amount (₹)
                </label>
                <input
                  type="number"
                  min="1"
                  step="1000"
                  value={counterRupees}
                  onChange={e => setCounterRupees(e.target.value)}
                  className="w-full h-11 px-4 rounded-full bg-bg border border-border text-text font-semibold text-[14px] focus:outline-none focus:ring-2 focus:ring-text"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button variant="secondary" size="sm" onClick={() => setIsCounterModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    const amt = Number(counterRupees);
                    if (amt > 0) {
                      counterMutation.mutate({
                        amount: rupeesToPaise(amt),
                        message: `Counteroffer submitted: ₹${amt.toLocaleString('en-IN')}`,
                      });
                    }
                  }}
                  disabled={counterMutation.isPending}
                >
                  {counterMutation.isPending ? 'Sending...' : 'Send Counter'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Mark as Sold / Complete Transaction Modal */}
        {isCompleteModalOpen && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsCompleteModalOpen(false)} />
            <div className="relative z-10 w-full max-w-md p-6 rounded-[24px] bg-surface text-text border border-border shadow-2xl animate-fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <h3 className="text-[16px] font-semibold text-text">Confirm Sale Completion</h3>
                <button
                  type="button"
                  onClick={() => setIsCompleteModalOpen(false)}
                  className="p-1 rounded-full border border-border text-muted hover:text-text cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-[12px] text-muted my-3">
                This will record the final sale transaction, mark the vehicle as <strong>Sold</strong>, and close the negotiation.
              </p>

              <div className="mb-4">
                <label className="block text-[12px] font-medium text-text mb-1">
                  Final Agreed Amount (₹)
                </label>
                <input
                  type="number"
                  min="1"
                  step="1000"
                  value={finalAmountRupees}
                  onChange={e => setFinalAmountRupees(e.target.value)}
                  className="w-full h-11 px-4 rounded-full bg-bg border border-border text-text font-bold text-[15px] focus:outline-none focus:ring-2 focus:ring-text"
                />
              </div>

              <div className="mb-4">
                <label className="block text-[12px] font-medium text-text mb-1">
                  Settlement Notes (Optional)
                </label>
                <input
                  type="text"
                  value={completionNotes}
                  onChange={e => setCompletionNotes(e.target.value)}
                  placeholder="e.g. Bank transfer and vehicle keys handed over."
                  className="w-full h-10 px-4 rounded-full bg-bg border border-border text-[12px] text-text focus:outline-none focus:ring-2 focus:ring-text"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button variant="secondary" size="sm" onClick={() => setIsCompleteModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    const amt = Number(finalAmountRupees);
                    if (amt > 0) {
                      completeSaleMutation.mutate({
                        finalAmount: rupeesToPaise(amt),
                        notes: completionNotes.trim(),
                      });
                    }
                  }}
                  disabled={completeSaleMutation.isPending}
                >
                  {completeSaleMutation.isPending ? 'Completing...' : 'Confirm & Mark Sold'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default NegotiationThreadPage;
