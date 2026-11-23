import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Flag,
  CheckCircle2,
  XCircle,
  Eye,
  AlertTriangle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Building2,
  Tag,
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

const REPORT_TABS = [
  { id: 'open', label: 'Open Reports' },
  { id: 'in_review', label: 'In Review' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'dismissed', label: 'Dismissed' },
  { id: '', label: 'All Reports' },
];

/**
 * Admin Reports Queue per Spec 15 & UI 8.8:
 * - Table: no zebra, 1px dividers, 12px text, hover --bg-subtle, sticky header.
 * - Second-to-last column: status chip.
 * - Last column: kebab menu.
 * - Actions: Mark in review, resolve with note, dismiss with note.
 */
export function AdminReportsPage() {
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState('open');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Resolution modal state
  const [selectedReport, setSelectedReport] = useState(null);
  const [actionStatus, setActionStatus] = useState(''); // 'resolved' | 'dismissed' | 'in_review' | 'view'
  const [resolutionNote, setResolutionNote] = useState('');
  const [modalError, setModalError] = useState('');

  // Fetch Reports
  const { data: reportsData, isLoading } = useQuery({
    queryKey: ['admin-reports', statusFilter, subjectFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (subjectFilter) params.append('subjectType', subjectFilter);
      params.append('page', String(page));
      params.append('limit', String(limit));

      const res = await fetch(`/api/admin/reports?${params.toString()}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to load reports queue');
      const json = await res.json();
      return json.data || { items: [], total: 0, page: 1, pageSize: limit };
    },
    staleTime: 30 * 1000,
  });

  const reports = reportsData?.items || [];
  const total = reportsData?.total || 0;
  const totalPages = Math.ceil(total / limit) || 1;

  // Resolve Mutation
  const resolveMutation = useMutation({
    mutationFn: async ({ id, status, note }) => {
      const res = await fetch(`/api/admin/reports/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status, resolutionNote: note }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to update report status');
      }
      return json.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(['admin-reports']);
      queryClient.invalidateQueries(['admin-dashboard-stats']);
      addToast(
        `Report updated to "${variables.status.replace('_', ' ')}"`,
        'success'
      );
      closeModal();
    },
    onError: err => {
      setModalError(err.message || 'Resolution failed');
    },
  });

  const openActionModal = (report, action) => {
    setSelectedReport(report);
    setActionStatus(action);
    setResolutionNote(report.resolutionNote || '');
    setModalError('');
  };

  const closeModal = () => {
    setSelectedReport(null);
    setActionStatus('');
    setResolutionNote('');
    setModalError('');
  };

  const handleConfirmAction = e => {
    e.preventDefault();
    if (!selectedReport || !actionStatus) return;

    resolveMutation.mutate({
      id: selectedReport.id || selectedReport._id,
      status: actionStatus,
      note: resolutionNote.trim(),
    });
  };

  const getSubjectLink = report => {
    if (report.subjectType === 'listing') return `/listings/${report.subjectRef}`;
    if (report.subjectType === 'dealer') return `/dealers/${report.subjectRef}`;
    return null;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 select-none">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Flag className="w-5 h-5 text-primary" />
              <h1 className="text-[24px] sm:text-[28px] font-semibold text-text tracking-tight">
                Policy Reports Queue
              </h1>
            </div>
            <p className="text-[13px] text-muted">
              Investigate reported listings, suspect users, or flagged dealerships and record resolutions.
            </p>
          </div>

          {/* Subject Type Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-muted uppercase tracking-wider">
              Subject:
            </span>
            <select
              value={subjectFilter}
              onChange={e => {
                setSubjectFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 rounded-full bg-surface border border-border text-[12px] font-medium text-text focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="">All Subjects</option>
              <option value="listing">Listings</option>
              <option value="dealer">Dealers</option>
              <option value="user">Users</option>
            </select>
          </div>
        </div>

        {/* Status Tabs per UI 7.6 */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-full bg-surface border border-border w-fit">
          {REPORT_TABS.map(tab => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                type="button"
                key={tab.id}
                onClick={() => {
                  setStatusFilter(tab.id);
                  setPage(1);
                }}
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
          ) : reports.length === 0 ? (
            <div className="p-16">
              <EmptyState
                icon={Flag}
                title="No reports in queue"
                description={`There are currently no reports with status "${statusFilter || 'all'}".`}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[12px]">
                {/* Sticky Header */}
                <thead className="sticky top-0 bg-surface z-10 border-b border-border text-[11px] uppercase tracking-wider text-muted font-semibold">
                  <tr>
                    <th className="py-3.5 pl-6 pr-3">Subject</th>
                    <th className="py-3.5 px-3">Category</th>
                    <th className="py-3.5 px-3">Description Snippet</th>
                    <th className="py-3.5 px-3">Reporter</th>
                    <th className="py-3.5 px-3">Submitted</th>
                    {/* Status Chip Second-to-Last */}
                    <th className="py-3.5 px-3">Status</th>
                    {/* Kebab Menu Last */}
                    <th className="py-3.5 pr-6 pl-3 text-right">Actions</th>
                  </tr>
                </thead>

                {/* Rows with 1px dividers & hover --bg-subtle */}
                <tbody className="divide-y divide-border/60">
                  {reports.map(r => {
                    const id = r.id || r._id;
                    const rStatus = r.status || 'open';
                    const link = getSubjectLink(r);

                    const actions = [
                      {
                        label: 'View Report Details',
                        icon: Eye,
                        onClick: () => openActionModal(r, 'view'),
                      },
                      link && {
                        label: `Open Target ${r.subjectType}`,
                        icon: ExternalLink,
                        onClick: () => window.open(link, '_blank'),
                      },
                      rStatus === 'open' && {
                        label: 'Mark In Review',
                        icon: Clock,
                        onClick: () => openActionModal(r, 'in_review'),
                      },
                      rStatus !== 'resolved' && {
                        label: 'Resolve Report',
                        icon: CheckCircle2,
                        onClick: () => openActionModal(r, 'resolved'),
                      },
                      rStatus !== 'dismissed' && {
                        label: 'Dismiss Report',
                        icon: XCircle,
                        danger: true,
                        onClick: () => openActionModal(r, 'dismissed'),
                      },
                    ].filter(Boolean);

                    return (
                      <tr
                        key={id}
                        className="hover:bg-bg-subtle transition-colors group"
                      >
                        {/* Subject */}
                        <td className="py-3.5 pl-6 pr-3">
                          <div className="flex items-center gap-2">
                            {r.subjectType === 'listing' ? (
                              <Tag className="w-3.5 h-3.5 text-primary shrink-0" />
                            ) : r.subjectType === 'dealer' ? (
                              <Building2 className="w-3.5 h-3.5 text-warning shrink-0" />
                            ) : (
                              <User className="w-3.5 h-3.5 text-muted shrink-0" />
                            )}
                            <div>
                              <span className="font-semibold text-text capitalize block">
                                {r.subjectType}
                              </span>
                              <span className="text-[11px] font-mono text-muted">
                                ID: {r.subjectRef ? String(r.subjectRef).slice(-6) : '—'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3.5 px-3">
                          <span className="px-2 py-0.5 rounded-full bg-tile text-text text-[11px] font-medium capitalize">
                            {r.category?.replace('_', ' ')}
                          </span>
                        </td>

                        {/* Description */}
                        <td className="py-3.5 px-3 max-w-xs">
                          <p className="line-clamp-2 text-text text-[12px]">
                            {r.description}
                          </p>
                        </td>

                        {/* Reporter */}
                        <td className="py-3.5 px-3">
                          <p className="font-medium text-text truncate max-w-[120px]">
                            {r.reporter?.fullName || 'User'}
                          </p>
                          <p className="text-[11px] text-muted truncate max-w-[120px]">
                            {r.reporter?.email || ''}
                          </p>
                        </td>

                        {/* Submitted Date */}
                        <td className="py-3.5 px-3 text-muted text-[11px]">
                          {r.createdAt
                            ? new Date(r.createdAt).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                              })
                            : '—'}
                        </td>

                        {/* Status Chip Second-to-Last */}
                        <td className="py-3.5 px-3">
                          <StatusChip status={rStatus} />
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
                Showing page {page} of {totalPages} ({total} reports)
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

        {/* Modal: View Details or Resolve/Dismiss Action */}
        {selectedReport && actionStatus && (
          <Modal
            isOpen={true}
            onClose={closeModal}
            title={
              actionStatus === 'view'
                ? 'Report Review'
                : actionStatus === 'resolved'
                ? 'Resolve Report'
                : actionStatus === 'dismissed'
                ? 'Dismiss Report'
                : 'Mark In Review'
            }
            description={
              actionStatus === 'view'
                ? `Submitted by ${selectedReport.reporter?.fullName || 'User'} regarding ${selectedReport.subjectType}.`
                : actionStatus === 'resolved'
                ? 'Resolving marks this report closed and dispatches a notification to the reporter.'
                : actionStatus === 'dismissed'
                ? 'Dismissing indicates the reported subject adheres to platform policies.'
                : 'Moves this report into active administrative investigation.'
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

              {/* Subject & Category badge */}
              <div className="p-3.5 rounded-xl bg-tile border border-border/70 text-[12px] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-text capitalize">
                    {selectedReport.subjectType}: {String(selectedReport.subjectRef)}
                  </span>
                  <StatusChip status={selectedReport.status} />
                </div>
                <div className="text-[11px] text-muted">
                  Category:{' '}
                  <strong className="text-text capitalize">
                    {selectedReport.category?.replace('_', ' ')}
                  </strong>
                </div>
                <div className="pt-1 text-[12px] text-text whitespace-pre-wrap leading-relaxed">
                  {selectedReport.description}
                </div>
              </div>

              {/* Action specific input */}
              {actionStatus !== 'view' ? (
                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-muted mb-1.5">
                    Resolution Note (Sent to reporting user & logged in audit trail)
                  </label>
                  <Textarea
                    rows={3}
                    placeholder={
                      actionStatus === 'resolved'
                        ? 'e.g. Listing removed / vehicle details corrected after seller verification...'
                        : actionStatus === 'dismissed'
                        ? 'e.g. Content verified compliant with platform marketplace terms...'
                        : 'e.g. Under active review by moderation team...'
                    }
                    value={resolutionNote}
                    onChange={e => setResolutionNote(e.target.value)}
                    className="w-full text-[12px]"
                  />
                </div>
              ) : selectedReport.resolutionNote ? (
                <div className="p-3 rounded-xl bg-surface border border-border text-[12px]">
                  <span className="font-semibold text-text block mb-1">
                    Recorded Resolution Note:
                  </span>
                  <span className="text-muted">{selectedReport.resolutionNote}</span>
                </div>
              ) : null}

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={closeModal}
                  disabled={resolveMutation.isPending}
                  className="rounded-full text-[12px]"
                >
                  {actionStatus === 'view' ? 'Close' : 'Cancel'}
                </Button>
                {actionStatus !== 'view' && (
                  <Button
                    type="submit"
                    variant={actionStatus === 'dismissed' ? 'secondary' : 'primary'}
                    size="sm"
                    disabled={resolveMutation.isPending}
                    className="rounded-full text-[12px] px-5"
                  >
                    {resolveMutation.isPending
                      ? 'Updating...'
                      : actionStatus === 'resolved'
                      ? 'Resolve Report'
                      : actionStatus === 'dismissed'
                      ? 'Dismiss Report'
                      : 'Confirm Review'}
                  </Button>
                )}
              </div>
            </form>
          </Modal>
        )}
      </div>
    </DashboardLayout>
  );
}

export default AdminReportsPage;
