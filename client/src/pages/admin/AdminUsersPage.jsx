import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Search,
  Ban,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  AlertTriangle,
  Building2,
  Car,
  Tag,
  HandCoins,
  Calendar,
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

/**
 * Admin User Management per Spec 12.1 & UI 8.8:
 * - Search by name, email, mobile.
 * - Filter by status (active, blocked, deactivated) and capability (buyer, seller, dealer, admin).
 * - UI 8.8 table: no zebra, 1px dividers, 12px text, hover --bg-subtle, sticky header.
 * - Second-to-last column: status chip.
 * - Last column: kebab menu.
 * - Actions: Block with reason modal, unblock modal, view activity details modal.
 */
export function AdminUsersPage() {
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [capabilityFilter, setCapabilityFilter] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Debounce search query
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Action modals
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalAction, setModalAction] = useState(null); // 'block' | 'unblock' | 'details'
  const [blockReason, setBlockReason] = useState('');
  const [modalError, setModalError] = useState('');

  // Fetch Users
  const { data: usersData, isLoading } = useQuery({
    queryKey: ['admin-users', debouncedQuery, statusFilter, capabilityFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedQuery) params.append('q', debouncedQuery);
      if (statusFilter) params.append('status', statusFilter);
      if (capabilityFilter) params.append('capability', capabilityFilter);
      params.append('page', String(page));
      params.append('limit', String(limit));

      const res = await fetch(`/api/admin/users?${params.toString()}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to load users');
      const json = await res.json();
      return json.data || { items: [], total: 0, page: 1, pageSize: limit };
    },
    staleTime: 30 * 1000,
  });

  const users = usersData?.items || [];
  const total = usersData?.total || 0;
  const totalPages = Math.ceil(total / limit) || 1;

  // Single User Details Query (when details modal is open)
  const { data: userDetails, isLoading: isDetailsLoading } = useQuery({
    queryKey: ['admin-user-details', selectedUser?.id || selectedUser?._id],
    queryFn: async () => {
      const id = selectedUser.id || selectedUser._id;
      const res = await fetch(`/api/admin/users/${id}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to load user profile');
      const json = await res.json();
      return json.data;
    },
    enabled: modalAction === 'details' && !!selectedUser,
  });

  // Block Mutation
  const blockMutation = useMutation({
    mutationFn: async ({ id, reason }) => {
      const res = await fetch(`/api/admin/users/${id}/block`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to block user');
      }
      return json.data;
    },
    onSuccess: data => {
      queryClient.invalidateQueries(['admin-users']);
      queryClient.invalidateQueries(['admin-dashboard-stats']);
      addToast(`User ${data.fullName} has been blocked`, 'success');
      closeModal();
    },
    onError: err => {
      setModalError(err.message || 'Block failed');
    },
  });

  // Unblock Mutation
  const unblockMutation = useMutation({
    mutationFn: async ({ id, reason }) => {
      const res = await fetch(`/api/admin/users/${id}/unblock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to unblock user');
      }
      return json.data;
    },
    onSuccess: data => {
      queryClient.invalidateQueries(['admin-users']);
      queryClient.invalidateQueries(['admin-dashboard-stats']);
      addToast(`User ${data.fullName} unblocked successfully`, 'success');
      closeModal();
    },
    onError: err => {
      setModalError(err.message || 'Unblock failed');
    },
  });

  const openActionModal = (user, action) => {
    setSelectedUser(user);
    setModalAction(action);
    setBlockReason('');
    setModalError('');
  };

  const closeModal = () => {
    setSelectedUser(null);
    setModalAction(null);
    setBlockReason('');
    setModalError('');
  };

  const handleConfirmBlock = e => {
    e.preventDefault();
    if (!selectedUser) return;
    const trimmed = blockReason.trim();
    if (!trimmed) {
      setModalError('A non-empty blocking reason is mandatory.');
      return;
    }
    blockMutation.mutate({
      id: selectedUser.id || selectedUser._id,
      reason: trimmed,
    });
  };

  const handleConfirmUnblock = e => {
    e.preventDefault();
    if (!selectedUser) return;
    unblockMutation.mutate({
      id: selectedUser.id || selectedUser._id,
      reason: blockReason.trim(),
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 select-none">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-5 h-5 text-primary" />
              <h1 className="text-[24px] sm:text-[28px] font-semibold text-text tracking-tight">
                User Management
              </h1>
            </div>
            <p className="text-[13px] text-muted">
              Search registered platform accounts, audit capabilities, and manage access restrictions.
            </p>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, email, or mobile..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-full bg-surface border border-border text-[12px] text-text placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={e => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-full bg-surface border border-border text-[12px] font-medium text-text focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="blocked">Blocked</option>
              <option value="deactivated">Deactivated</option>
            </select>

            {/* Capability Filter */}
            <select
              value={capabilityFilter}
              onChange={e => {
                setCapabilityFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-full bg-surface border border-border text-[12px] font-medium text-text focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="">All Capabilities</option>
              <option value="buyer">Buyers</option>
              <option value="renter">Renters</option>
              <option value="seller">Sellers</option>
              <option value="dealer">Dealers</option>
              <option value="admin">Administrators</option>
            </select>
          </div>
        </div>

        {/* Table Container per UI 8.8 */}
        <div className="rounded-[24px] bg-surface border border-border overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="p-16">
              <EmptyState
                icon={Users}
                title="No users found"
                description={
                  debouncedQuery || statusFilter || capabilityFilter
                    ? 'No accounts match the active search query or filter options.'
                    : 'No registered user records on the platform.'
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[12px]">
                {/* Sticky Header */}
                <thead className="sticky top-0 bg-surface z-10 border-b border-border text-[11px] uppercase tracking-wider text-muted font-semibold">
                  <tr>
                    <th className="py-3.5 pl-6 pr-3">User Profile</th>
                    <th className="py-3.5 px-3">Contact</th>
                    <th className="py-3.5 px-3">Capabilities</th>
                    <th className="py-3.5 px-3">Registered</th>
                    {/* Status Chip Second-to-Last */}
                    <th className="py-3.5 px-3">Account Status</th>
                    {/* Kebab Menu Last */}
                    <th className="py-3.5 pr-6 pl-3 text-right">Actions</th>
                  </tr>
                </thead>

                {/* Rows with 1px dividers & hover --bg-subtle */}
                <tbody className="divide-y divide-border/60">
                  {users.map(u => {
                    const id = u.id || u._id;
                    const isBlocked = u.accountStatus === 'blocked';
                    const isAdmin = u.capabilities?.includes('admin');

                    const actions = [
                      {
                        label: 'View Activity Details',
                        icon: Eye,
                        onClick: () => openActionModal(u, 'details'),
                      },
                      !isBlocked && !isAdmin && {
                        label: 'Block Account',
                        icon: Ban,
                        danger: true,
                        onClick: () => openActionModal(u, 'block'),
                      },
                      isBlocked && {
                        label: 'Unblock Account',
                        icon: CheckCircle2,
                        onClick: () => openActionModal(u, 'unblock'),
                      },
                    ].filter(Boolean);

                    return (
                      <tr
                        key={id}
                        className="hover:bg-bg-subtle transition-colors group"
                      >
                        {/* Profile */}
                        <td className="py-3.5 pl-6 pr-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-tile text-text text-[11px] font-semibold flex items-center justify-center shrink-0">
                              {u.fullName?.charAt(0) || 'U'}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-text leading-tight truncate">
                                {u.fullName}
                              </p>
                              <p className="text-[11px] text-muted truncate">
                                ID: {id.slice(-6)}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Contact */}
                        <td className="py-3.5 px-3">
                          <p className="text-text font-medium truncate">{u.email}</p>
                          <p className="text-[11px] text-muted">{u.mobile || 'No mobile'}</p>
                        </td>

                        {/* Capabilities */}
                        <td className="py-3.5 px-3">
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {u.capabilities?.map(c => (
                              <span
                                key={c}
                                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                                  c === 'admin'
                                    ? 'bg-primary text-on-primary'
                                    : c === 'dealer'
                                    ? 'bg-warning/15 text-warning'
                                    : c === 'seller'
                                    ? 'bg-accent/15 text-accent'
                                    : 'bg-tile text-text'
                                }`}
                              >
                                {c}
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* Registered */}
                        <td className="py-3.5 px-3 text-muted text-[11px]">
                          {u.createdAt
                            ? new Date(u.createdAt).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            : '—'}
                        </td>

                        {/* Status Chip Second-to-Last */}
                        <td className="py-3.5 px-3">
                          <StatusChip status={u.accountStatus || 'active'} />
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
                Showing page {page} of {totalPages} ({total} users)
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

        {/* Modal: Block User (Confirmation with Mandatory Reason) */}
        {selectedUser && modalAction === 'block' && (
          <Modal
            isOpen={true}
            onClose={closeModal}
            title="Block User Account"
            description={`Blocking immediately invalidates active sessions and hides this user's listings from public marketplace search.`}
          >
            <form onSubmit={handleConfirmBlock} className="space-y-4 pt-2">
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
                <p className="font-semibold text-text">{selectedUser.fullName}</p>
                <p className="text-[11px] text-muted">{selectedUser.email}</p>
              </div>

              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wider text-muted mb-1.5">
                  Mandatory Block Reason (Sent to user & logged in audit trail) *
                </label>
                <Textarea
                  rows={3}
                  placeholder="e.g. Confirmed fraudulent transactions or policy violations reported..."
                  value={blockReason}
                  onChange={e => {
                    setBlockReason(e.target.value);
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
                  disabled={blockMutation.isPending}
                  className="rounded-full text-[12px]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  size="sm"
                  disabled={blockMutation.isPending}
                  className="rounded-full text-[12px] px-5"
                >
                  {blockMutation.isPending ? 'Blocking...' : 'Block Account'}
                </Button>
              </div>
            </form>
          </Modal>
        )}

        {/* Modal: Unblock User */}
        {selectedUser && modalAction === 'unblock' && (
          <Modal
            isOpen={true}
            onClose={closeModal}
            title="Unblock User Account"
            description={`Restores active account status, permitting immediate authentication and marketplace interactions.`}
          >
            <form onSubmit={handleConfirmUnblock} className="space-y-4 pt-2">
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
                <p className="font-semibold text-text">{selectedUser.fullName}</p>
                <p className="text-[11px] text-muted">{selectedUser.email}</p>
              </div>

              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wider text-muted mb-1.5">
                  Resolution Note (Optional)
                </label>
                <Textarea
                  rows={2}
                  placeholder="e.g. Identity verified via appeal..."
                  value={blockReason}
                  onChange={e => setBlockReason(e.target.value)}
                  className="w-full text-[12px]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={closeModal}
                  disabled={unblockMutation.isPending}
                  className="rounded-full text-[12px]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={unblockMutation.isPending}
                  className="rounded-full text-[12px] px-5"
                >
                  {unblockMutation.isPending ? 'Unblocking...' : 'Unblock Account'}
                </Button>
              </div>
            </form>
          </Modal>
        )}

        {/* Modal: Detailed User Activity Summary */}
        {selectedUser && modalAction === 'details' && (
          <Modal
            isOpen={true}
            onClose={closeModal}
            title="User Profile & Activity"
            description={`Comprehensive view of user stats and linked records.`}
          >
            {isDetailsLoading ? (
              <div className="space-y-3 py-4">
                <Skeleton className="h-6 w-1/2 rounded" />
                <Skeleton className="h-24 w-full rounded-2xl" />
              </div>
            ) : (
              <div className="space-y-4 pt-2">
                <div className="p-4 rounded-2xl bg-tile border border-border/70 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-text text-[15px]">
                      {userDetails?.fullName}
                    </h3>
                    <p className="text-[12px] text-muted">{userDetails?.email}</p>
                    <p className="text-[11px] text-muted">{userDetails?.mobile || 'No phone registered'}</p>
                  </div>
                  <StatusChip status={userDetails?.accountStatus || 'active'} />
                </div>

                {/* Activity Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-3 rounded-xl bg-surface border border-border">
                    <Car className="w-4 h-4 mx-auto mb-1 text-primary" />
                    <div className="text-[18px] font-semibold text-text">
                      {userDetails?.stats?.vehicles ?? 0}
                    </div>
                    <div className="text-[10px] uppercase text-muted">Vehicles</div>
                  </div>
                  <div className="p-3 rounded-xl bg-surface border border-border">
                    <Tag className="w-4 h-4 mx-auto mb-1 text-primary" />
                    <div className="text-[18px] font-semibold text-text">
                      {userDetails?.stats?.listings ?? 0}
                    </div>
                    <div className="text-[10px] uppercase text-muted">Listings</div>
                  </div>
                  <div className="p-3 rounded-xl bg-surface border border-border">
                    <HandCoins className="w-4 h-4 mx-auto mb-1 text-primary" />
                    <div className="text-[18px] font-semibold text-text">
                      {userDetails?.stats?.offersSent ?? 0}
                    </div>
                    <div className="text-[10px] uppercase text-muted">Offers</div>
                  </div>
                  <div className="p-3 rounded-xl bg-surface border border-border">
                    <Calendar className="w-4 h-4 mx-auto mb-1 text-primary" />
                    <div className="text-[18px] font-semibold text-text">
                      {userDetails?.stats?.bookings ?? 0}
                    </div>
                    <div className="text-[10px] uppercase text-muted">Bookings</div>
                  </div>
                </div>

                {/* Linked Dealership info if exists */}
                {userDetails?.stats?.dealership && (
                  <div className="p-3 rounded-xl bg-tile border border-border/70 text-[12px]">
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 className="w-3.5 h-3.5 text-primary" />
                      <span className="font-semibold text-text">
                        Dealership: {userDetails.stats.dealership.dealershipName}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted">
                      Status: {userDetails.stats.dealership.verificationStatus} · {userDetails.stats.dealership.city}
                    </p>
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
                    Close
                  </Button>
                </div>
              </div>
            )}
          </Modal>
        )}
      </div>
    </DashboardLayout>
  );
}

export default AdminUsersPage;
