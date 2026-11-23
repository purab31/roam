import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FileCode,
  Shield,
  Eye,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { KebabMenu } from '../../components/ui/KebabMenu';

const TARGET_TYPES = [
  { value: '', label: 'All Targets' },
  { value: 'listing', label: 'Listing' },
  { value: 'user', label: 'User' },
  { value: 'dealer', label: 'Dealer' },
  { value: 'report', label: 'Report' },
  { value: 'settings', label: 'Settings' },
];

/**
 * Admin Audit Log Page per Spec 12 & UI 8.8:
 * - Append-only immutable audit trail for administrative mutations.
 * - Table: no zebra, 1px dividers, 12px text, hover --bg-subtle, sticky header.
 * - Second-to-last column: status/action chip.
 * - Last column: kebab menu (view payload details).
 */
export function AdminAuditLogPage() {
  const [targetTypeFilter, setTargetTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState(null);
  const limit = 25;

  const { data: auditData, isLoading } = useQuery({
    queryKey: ['admin-audit-log', targetTypeFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (targetTypeFilter) params.append('targetType', targetTypeFilter);
      params.append('page', String(page));
      params.append('limit', String(limit));

      const res = await fetch(`/api/admin/audit-log?${params.toString()}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to load audit logs');
      const json = await res.json();
      return json.data || { items: [], total: 0, page: 1, pageSize: limit };
    },
    staleTime: 30 * 1000,
  });

  const logs = auditData?.items || [];
  const total = auditData?.total || 0;
  const totalPages = Math.ceil(total / limit) || 1;

  const formatActionName = action => {
    return action
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 select-none">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-5 h-5 text-primary" />
              <h1 className="text-[24px] sm:text-[28px] font-semibold text-text tracking-tight">
                Platform Audit Trail
              </h1>
            </div>
            <p className="text-[13px] text-muted">
              Append-only immutable record of administrative actions, moderation decisions, and policy updates.
            </p>
          </div>

          {/* Target Type Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-muted uppercase tracking-wider">
              Target:
            </span>
            <select
              value={targetTypeFilter}
              onChange={e => {
                setTargetTypeFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 rounded-full bg-surface border border-border text-[12px] font-medium text-text focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              {TARGET_TYPES.map(opt => (
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
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="p-16">
              <EmptyState
                icon={FileCode}
                title="No audit log entries"
                description={`No recorded events found matching target "${targetTypeFilter || 'all'}".`}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[12px]">
                {/* Sticky Header */}
                <thead className="sticky top-0 bg-surface z-10 border-b border-border text-[11px] uppercase tracking-wider text-muted font-semibold">
                  <tr>
                    <th className="py-3.5 pl-6 pr-3">Timestamp</th>
                    <th className="py-3.5 px-3">Administrator</th>
                    <th className="py-3.5 px-3">Target Reference</th>
                    <th className="py-3.5 px-3">IP Address</th>
                    {/* Status Chip Second-to-Last */}
                    <th className="py-3.5 px-3">Action Recorded</th>
                    {/* Kebab Menu Last */}
                    <th className="py-3.5 pr-6 pl-3 text-right">Actions</th>
                  </tr>
                </thead>

                {/* Rows with 1px dividers & hover --bg-subtle */}
                <tbody className="divide-y divide-border/60">
                  {logs.map(log => {
                    const id = log.id || log._id;
                    const actor = log.actor || {};

                    const actions = [
                      {
                        label: 'View Event Payload',
                        icon: Eye,
                        onClick: () => setSelectedLog(log),
                      },
                    ];

                    return (
                      <tr
                        key={id}
                        className="hover:bg-bg-subtle transition-colors group"
                      >
                        {/* Timestamp */}
                        <td className="py-3.5 pl-6 pr-3 text-muted text-[11px] whitespace-nowrap">
                          {log.createdAt
                            ? new Date(log.createdAt).toLocaleString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })
                            : '—'}
                        </td>

                        {/* Admin Actor */}
                        <td className="py-3.5 px-3">
                          <p className="font-semibold text-text truncate max-w-[150px]">
                            {actor.fullName || 'Administrator'}
                          </p>
                          <p className="text-[11px] text-muted truncate max-w-[150px]">
                            {actor.email || 'System'}
                          </p>
                        </td>

                        {/* Target Reference */}
                        <td className="py-3.5 px-3">
                          <span className="capitalize font-medium text-text block">
                            {log.targetType}
                          </span>
                          <span className="font-mono text-[11px] text-muted truncate block max-w-[140px]">
                            {log.targetId ? String(log.targetId) : 'N/A'}
                          </span>
                        </td>

                        {/* IP Address */}
                        <td className="py-3.5 px-3 font-mono text-[11px] text-muted">
                          {log.ipAddress || '127.0.0.1'}
                        </td>

                        {/* Status Chip Second-to-Last */}
                        <td className="py-3.5 px-3">
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-tile text-text border border-border/80 inline-block">
                            {formatActionName(log.action)}
                          </span>
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
                Showing page {page} of {totalPages} ({total} entries)
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

        {/* Modal: View Audit Payload Details */}
        {selectedLog && (
          <Modal
            isOpen={true}
            onClose={() => setSelectedLog(null)}
            title="Audit Event Details"
            description="Immutable audit record capturing payload and actor state."
          >
            <div className="space-y-4 pt-2 text-[12px]">
              <div className="p-3.5 rounded-xl bg-tile border border-border/70 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-text">
                    {formatActionName(selectedLog.action)}
                  </span>
                  <span className="text-[11px] text-muted">
                    {selectedLog.createdAt ? new Date(selectedLog.createdAt).toLocaleString('en-IN') : ''}
                  </span>
                </div>
                <div className="text-[11px] text-muted">
                  Actor: <strong className="text-text">{selectedLog.actor?.fullName}</strong> ({selectedLog.actor?.email})
                </div>
                <div className="text-[11px] text-muted font-mono">
                  Target: {selectedLog.targetType} ({String(selectedLog.targetId)}) · IP: {selectedLog.ipAddress || 'local'}
                </div>
              </div>

              <div>
                <span className="text-[11px] font-semibold uppercase text-muted block mb-1.5">
                  Event Details Payload:
                </span>
                <pre className="p-3.5 rounded-xl bg-surface border border-border font-mono text-[11px] text-text overflow-x-auto max-h-60">
                  {JSON.stringify(selectedLog.details || {}, null, 2)}
                </pre>
              </div>

              <div className="flex items-center justify-end pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => setSelectedLog(null)}
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

export default AdminAuditLogPage;
