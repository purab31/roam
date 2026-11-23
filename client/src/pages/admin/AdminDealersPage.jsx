import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShieldCheck,
  Building2,
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Ban,
  Download,
  AlertOctagon,
} from 'lucide-react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { StatusChip } from '../../components/ui/StatusChip';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Textarea } from '../../components/ui/Textarea';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { KebabMenu } from '../../components/ui/KebabMenu';
import { useToast } from '../../context/ToastContext';

const STATUS_TABS = [
  { id: 'pending', label: 'Pending Review' },
  { id: 'approved', label: 'Approved / Active' },
  { id: 'changes_requested', label: 'Info Requested' },
  { id: 'suspended', label: 'Suspended' },
  { id: 'revoked', label: 'Revoked' },
  { id: 'rejected', label: 'Rejected' },
  { id: '', label: 'All Dealers' },
];

/**
 * Admin Dealers Page per Spec 12.2 & UI 8.8:
 * - Table format: no zebra, 1px dividers, 12px text, hover --bg-subtle, sticky header.
 * - Second-to-last column: status chip.
 * - Last column: kebab menu.
 * - Verification lifecycle: approve/reinstate, request info, suspend, revoke, reject.
 * - Document viewer modal.
 */
export function AdminDealersPage() {
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState('pending');
  const [selectedDealer, setSelectedDealer] = useState(null);
  const [modalAction, setModalAction] = useState(null); // 'approved' | 'changes_requested' | 'rejected' | 'suspended' | 'revoked' | 'docs'
  const [actionNotes, setActionNotes] = useState('');
  const [modalError, setModalError] = useState('');

  // 1. Fetch Dealers for Admin
  const {
    data: dealers = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['admin-dealers', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      const res = await fetch(`/api/admin/dealers?${params.toString()}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to load dealer queue');
      const json = await res.json();
      return json.data || [];
    },
    staleTime: 30 * 1000,
  });

  const closeModal = () => {
    setSelectedDealer(null);
    setModalAction(null);
    setActionNotes('');
    setModalError('');
  };

  // 2. Verification Mutation
  const verifyMutation = useMutation({
    mutationFn: async ({ dealerId, status, notes }) => {
      const res = await fetch(`/api/admin/dealers/${dealerId}/verification`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status, notes }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Verification update failed');
      }
      return json.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(['admin-dealers']);
      queryClient.invalidateQueries(['admin-dashboard-stats']);
      addToast(
        `Dealer status updated to "${variables.status.replace('_', ' ')}" successfully`,
        'success'
      );
      closeModal();
    },
    onError: err => {
      setModalError(err.message || 'Verification update failed');
    },
  });

  const openActionModal = (dealer, action) => {
    setSelectedDealer(dealer);
    setModalAction(action);
    setActionNotes(dealer.verificationNotes || '');
    setModalError('');
  };

  const handleConfirmAction = e => {
    e.preventDefault();
    if (!selectedDealer || !modalAction) return;

    // Decision 2: Reject and request-corrections require a non-empty reason
    const requiresReason =
      modalAction === 'rejected' || modalAction === 'changes_requested';
    const trimmed = actionNotes.trim();

    if (requiresReason && !trimmed) {
      setModalError('Please provide a specific compliance note or reason.');
      return;
    }

    verifyMutation.mutate({
      dealerId: selectedDealer.id || selectedDealer._id,
      status: modalAction,
      notes: trimmed,
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
                Dealer Verifications & Management
              </h1>
            </div>
            <p className="text-[13px] text-muted">
              Audit business credentials, inspect submitted documents, and manage verification or suspension lifecycles.
            </p>
          </div>
        </div>

        {/* Status Filter Tabs per UI 7.6 */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-full bg-surface border border-border w-fit">
          {STATUS_TABS.map(tab => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                type="button"
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
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
          ) : dealers.length === 0 ? (
            <div className="p-16">
              <EmptyState
                icon={Building2}
                title="No dealerships found"
                description={`There are currently no dealer records in "${statusFilter || 'all'}" status.`}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[12px]">
                {/* Sticky Header */}
                <thead className="sticky top-0 bg-surface z-10 border-b border-border text-[11px] uppercase tracking-wider text-muted font-semibold">
                  <tr>
                    <th className="py-3.5 pl-6 pr-3">Dealership</th>
                    <th className="py-3.5 px-3">Manager / Phone</th>
                    <th className="py-3.5 px-3">City & Reg.</th>
                    <th className="py-3.5 px-3">Documents</th>
                    {/* Status Chip Second-to-Last */}
                    <th className="py-3.5 px-3">Verification</th>
                    {/* Kebab Menu Last */}
                    <th className="py-3.5 pr-6 pl-3 text-right">Actions</th>
                  </tr>
                </thead>

                {/* Rows with 1px dividers & hover --bg-subtle */}
                <tbody className="divide-y divide-border/60">
                  {dealers.map(d => {
                    const id = d.id || d._id;
                    const vStatus = d.verificationStatus || 'pending';
                    const docsCount = d.documents?.length || 0;

                    const actions = [
                      {
                        label: `View Documents (${docsCount})`,
                        icon: FileText,
                        onClick: () => openActionModal(d, 'docs'),
                      },
                      vStatus !== 'approved' && {
                        label: vStatus === 'suspended' || vStatus === 'revoked' ? 'Reinstate Dealer' : 'Approve Dealer',
                        icon: CheckCircle2,
                        onClick: () => openActionModal(d, 'approved'),
                      },
                      vStatus !== 'changes_requested' && {
                        label: 'Request Additional Info',
                        icon: AlertTriangle,
                        onClick: () => openActionModal(d, 'changes_requested'),
                      },
                      vStatus === 'approved' && {
                        label: 'Suspend Dealership',
                        icon: AlertOctagon,
                        danger: true,
                        onClick: () => openActionModal(d, 'suspended'),
                      },
                      vStatus !== 'revoked' && {
                        label: 'Revoke Verification',
                        icon: Ban,
                        danger: true,
                        onClick: () => openActionModal(d, 'revoked'),
                      },
                      vStatus === 'pending' && {
                        label: 'Reject Verification',
                        icon: XCircle,
                        danger: true,
                        onClick: () => openActionModal(d, 'rejected'),
                      },
                    ].filter(Boolean);

                    return (
                      <tr
                        key={id}
                        className="hover:bg-bg-subtle transition-colors group"
                      >
                        {/* Dealership info */}
                        <td className="py-3.5 pl-6 pr-3">
                          <p className="font-semibold text-text leading-tight truncate">
                            {d.dealershipName}
                          </p>
                          <p className="text-[11px] text-muted truncate">
                            {d.businessEmail}
                          </p>
                        </td>

                        {/* Manager & Phone */}
                        <td className="py-3.5 px-3">
                          <p className="font-medium text-text truncate">
                            {d.ownerName || 'Manager'}
                          </p>
                          <p className="text-[11px] text-muted">{d.phone || 'No phone'}</p>
                        </td>

                        {/* City & Reg */}
                        <td className="py-3.5 px-3">
                          <p className="font-medium text-text">{d.city || 'India'}</p>
                          <p className="text-[11px] font-mono text-muted truncate max-w-[150px]">
                            {d.registrationInfo || 'N/A'}
                          </p>
                        </td>

                        {/* Documents button */}
                        <td className="py-3.5 px-3">
                          <button
                            type="button"
                            onClick={() => openActionModal(d, 'docs')}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-tile border border-border hover:border-text/40 text-[11px] font-medium text-text transition-colors cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5 text-primary" />
                            <span>{docsCount} {docsCount === 1 ? 'doc' : 'docs'}</span>
                          </button>
                        </td>

                        {/* Status Chip Second-to-Last */}
                        <td className="py-3.5 px-3">
                          <StatusChip status={vStatus} />
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
        </div>

        {/* Modal: Document Viewer */}
        {selectedDealer && modalAction === 'docs' && (
          <Modal
            isOpen={true}
            onClose={closeModal}
            title={`${selectedDealer.dealershipName} — Verification Documents`}
            description="Submitted legal, business, and dealership documentation."
          >
            <div className="space-y-4 pt-2">
              {(!selectedDealer.documents || selectedDealer.documents.length === 0) ? (
                <div className="p-8 text-center bg-tile rounded-2xl text-[12px] text-muted italic">
                  No documents have been uploaded for this dealership.
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {selectedDealer.documents.map((doc, idx) => {
                    const docId = doc.id || doc._id || idx;
                    const dealerId = selectedDealer.id || selectedDealer._id;
                    const downloadUrl = `/api/dealers/${dealerId}/documents/${docId}/download`;

                    return (
                      <div
                        key={docId}
                        className="py-3.5 flex items-center justify-between gap-4 text-[12px]"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-tile border border-border flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-text truncate">
                              {doc.docType || 'Business License / Document'}
                            </p>
                            <p className="text-[11px] text-muted">
                              Uploaded {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString('en-IN') : 'on registration'}
                            </p>
                          </div>
                        </div>

                        <a
                          href={downloadUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-tile border border-border hover:border-text/50 text-[11px] font-medium text-text transition-colors shrink-0"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>View / Download</span>
                        </a>
                      </div>
                    );
                  })}
                </div>
              )}

              {selectedDealer.verificationNotes && (
                <div className="p-3.5 rounded-xl bg-tile text-[12px] border border-border/70">
                  <span className="font-semibold text-text block mb-1">Previous Admin Notes:</span>
                  <span className="text-muted">{selectedDealer.verificationNotes}</span>
                </div>
              )}

              <div className="flex items-center justify-end pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={closeModal}
                  className="rounded-full text-[12px] px-5"
                >
                  Done
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Modal: Status Action Confirmation (Approve, Reinstate, Changes, Suspend, Revoke, Reject) */}
        {selectedDealer && modalAction && modalAction !== 'docs' && (
          <Modal
            isOpen={true}
            onClose={closeModal}
            title={
              modalAction === 'approved'
                ? 'Approve / Reinstate Dealership'
                : modalAction === 'changes_requested'
                ? 'Request Additional Information'
                : modalAction === 'suspended'
                ? 'Suspend Dealership Privileges'
                : modalAction === 'revoked'
                ? 'Revoke Dealership Verification'
                : 'Reject Dealer Verification'
            }
            description={
              modalAction === 'approved'
                ? 'Grants verified partner status, enables inventory publishing, and displays public showroom.'
                : modalAction === 'changes_requested'
                ? 'Notify dealer to resubmit credentials or updated documentation.'
                : modalAction === 'suspended'
                ? 'Temporarily blocks publishing and excludes dealer listings from search results.'
                : modalAction === 'revoked'
                ? 'Revokes verification and blocks publishing until complete re-application.'
                : 'Rejects the verification application. The dealer will be notified.'
            }
          >
            <form onSubmit={handleConfirmAction} className="space-y-4 pt-2">
              {modalError && (
                <div
                  role="alert"
                  className="p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-[12px] flex items-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div className="p-3 rounded-xl bg-tile border border-border/70 text-[12px]">
                <p className="font-semibold text-text">{selectedDealer.dealershipName}</p>
                <p className="text-[11px] text-muted">
                  Owner: {selectedDealer.ownerName} · {selectedDealer.city}
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wider text-muted mb-1.5">
                  {modalAction === 'changes_requested' || modalAction === 'rejected'
                    ? 'Compliance Note / Instructions *'
                    : 'Audit Note (Optional)'}
                </label>
                <Textarea
                  rows={3}
                  placeholder={
                    modalAction === 'changes_requested'
                      ? 'e.g. Please provide GST registration certificate with valid address matching dealership...'
                      : modalAction === 'suspended'
                      ? 'e.g. Suspended due to customer fraud reports under investigation...'
                      : 'Optional administrative note...'
                  }
                  value={actionNotes}
                  onChange={e => {
                    setActionNotes(e.target.value);
                    if (modalError) setModalError('');
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
                  disabled={verifyMutation.isPending}
                  className="rounded-full text-[12px]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant={
                    modalAction === 'suspended' || modalAction === 'revoked' || modalAction === 'rejected'
                      ? 'danger'
                      : 'primary'
                  }
                  size="sm"
                  disabled={verifyMutation.isPending}
                  className="rounded-full text-[12px] px-5"
                >
                  {verifyMutation.isPending ? 'Updating...' : 'Confirm Action'}
                </Button>
              </div>
            </form>
          </Modal>
        )}
      </div>
    </DashboardLayout>
  );
}

export default AdminDealersPage;
