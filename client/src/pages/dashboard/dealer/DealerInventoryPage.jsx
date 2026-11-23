import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  Building2,
  Plus,
  Upload,
  CheckCircle2,
  Tag,
  Car,
  Search,
  Filter,
  Check,
  Power,
  PowerOff,
  MoreVertical,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';
import { DashboardLayout } from '../../../components/dashboard/DashboardLayout';
import { StatusChip } from '../../../components/ui/StatusChip';
import { Button } from '../../../components/ui/Button';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { useToast } from '../../../context/ToastContext';
import { formatRupees } from '../../../utils/money';

/**
 * Dealer Inventory Page per Spec 11.4 & UI 8.8:
 * - Inventory table: 12px text, 1px row dividers, sticky header, status chips, bulk actions
 * - Stats counters: total, active, draft, sold
 * - Quick actions: toggle activate/deactivate, link to CSV bulk upload, link to new listing
 */
export function DealerInventoryPage() {
  const { addToast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedIds, setSelectedIds] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Fetch Dashboard Stats
  const { data: statsData } = useQuery({
    queryKey: ['dealer-dashboard-stats'],
    queryFn: async () => {
      const res = await fetch('/api/dealers/dashboard-stats', { credentials: 'include' });
      if (!res.ok) return { total: 0, active: 0, draft: 0, sold: 0 };
      const json = await res.json();
      return json.data || { total: 0, active: 0, draft: 0, sold: 0 };
    },
  });

  // 2. Fetch Dealer Inventory
  const {
    data: inventoryData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['dealer-inventory', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      const res = await fetch(`/api/dealers/inventory?${params.toString()}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to load inventory');
      const json = await res.json();
      return json.data || { items: [], total: 0 };
    },
  });

  const items = inventoryData?.items || [];
  const stats = statsData || { total: 0, active: 0, draft: 0, sold: 0 };

  // Filter items by client search term
  const filteredItems = items.filter(item => {
    if (!searchTerm) return true;
    const vehicle = item.vehicleRef || {};
    const text = `${vehicle.brand || ''} ${vehicle.model || ''} ${vehicle.variant || ''} ${vehicle.registrationNumber || ''}`.toLowerCase();
    return text.includes(searchTerm.toLowerCase());
  });

  // Bulk status update mutation
  const bulkStatusMutation = useMutation({
    mutationFn: async ({ action, listingIds }) => {
      const res = await fetch('/api/dealers/inventory/bulk-status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action, listingIds }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Bulk status update failed');
      }
      return json.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(['dealer-inventory']);
      queryClient.invalidateQueries(['dealer-dashboard-stats']);
      setSelectedIds([]);
      addToast(
        `Successfully ${variables.action === 'activate' ? 'activated' : 'deactivated'} ${data.modifiedCount || variables.listingIds.length} listings`,
        'success'
      );
    },
    onError: err => {
      addToast(err.message || 'Operation failed', 'error');
    },
  });

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredItems.map(item => item.id || item._id));
    }
  };

  const toggleSelectRow = id => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 select-none">
        {/* Top Header & Action Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-5 h-5 text-primary" />
              <h1 className="text-[24px] sm:text-[28px] font-semibold text-text tracking-tight">
                Dealership Inventory
              </h1>
            </div>
            <p className="text-[13px] text-muted">
              Manage your vehicle stock, adjust active catalog states, and import bulk stock via CSV.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/dashboard/inventory/upload">
              <Button variant="secondary" size="md" className="rounded-full text-[12px]">
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                <span>Bulk Upload CSV</span>
              </Button>
            </Link>
            <Link to="/listing/new">
              <Button variant="primary" size="md" className="rounded-full text-[12px]">
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                <span>Add Vehicle</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Row per UI 8.8 (40px/300 number, 11px muted label) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-[22px] bg-surface border border-border">
            <span className="text-[11px] font-medium text-muted uppercase tracking-wider block mb-1">
              Total Stock
            </span>
            <div className="text-[36px] font-light text-text leading-tight tracking-tight">
              {stats.total}
            </div>
            <span className="text-[11px] text-muted mt-1 block">Vehicles in catalogue</span>
          </div>

          <div className="p-5 rounded-[22px] bg-surface border border-border">
            <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block mb-1">
              Active Showroom
            </span>
            <div className="text-[36px] font-light text-text leading-tight tracking-tight">
              {stats.active}
            </div>
            <span className="text-[11px] text-muted mt-1 block">Live for purchase/rent</span>
          </div>

          <div className="p-5 rounded-[22px] bg-surface border border-border">
            <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider block mb-1">
              Draft / Inactive
            </span>
            <div className="text-[36px] font-light text-text leading-tight tracking-tight">
              {stats.draft}
            </div>
            <span className="text-[11px] text-muted mt-1 block">Pending publishing</span>
          </div>

          <div className="p-5 rounded-[22px] bg-surface border border-border">
            <span className="text-[11px] font-medium text-muted uppercase tracking-wider block mb-1">
              Sold & Acquired
            </span>
            <div className="text-[36px] font-light text-text leading-tight tracking-tight">
              {stats.sold}
            </div>
            <span className="text-[11px] text-muted mt-1 block">Historical completions</span>
          </div>
        </div>

        {/* Controls & Bulk Action Bar */}
        <div className="p-4 rounded-[22px] bg-surface border border-border flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Search & Filter */}
          <div className="flex flex-1 items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
              <input
                type="text"
                placeholder="Search brand, model, registration..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full h-10 pl-10 pr-3 rounded-full bg-tile border border-border text-[12px] text-text placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="h-10 px-3.5 rounded-full bg-tile border border-border text-[12px] text-text focus:outline-none cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
              <option value="draft">Draft Only</option>
            </select>
          </div>

          {/* Bulk Selection Actions */}
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 w-full md:w-auto justify-end bg-tile/70 px-4 py-1.5 rounded-full border border-border/80 animate-fade-in">
              <span className="text-[12px] font-semibold text-text">
                {selectedIds.length} selected
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  bulkStatusMutation.mutate({ action: 'activate', listingIds: selectedIds })
                }
                disabled={bulkStatusMutation.isPending}
                className="rounded-full text-[11px] h-7"
              >
                <Power className="w-3 h-3 mr-1 text-emerald-500" />
                Activate
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  bulkStatusMutation.mutate({ action: 'deactivate', listingIds: selectedIds })
                }
                disabled={bulkStatusMutation.isPending}
                className="rounded-full text-[11px] h-7"
              >
                <PowerOff className="w-3 h-3 mr-1 text-amber-500" />
                Deactivate
              </Button>
            </div>
          )}
        </div>

        {/* Inventory Table (12px text, 1px row dividers, sticky header) */}
        <div className="rounded-[24px] bg-surface border border-border overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-16">
              <EmptyState
                icon={Car}
                title="No inventory records found"
                description={
                  searchTerm || statusFilter
                    ? 'No vehicles match your active search or filter criteria.'
                    : 'You have not added any vehicles to your dealer inventory yet.'
                }
                actionLabel="Add New Listing"
                onAction={() => navigate('/listing/new')}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[12px]">
                {/* Sticky Header */}
                <thead className="sticky top-0 bg-tile/90 backdrop-blur-sm border-b border-border text-[11px] uppercase tracking-wider text-muted font-semibold">
                  <tr>
                    <th className="py-3.5 pl-6 pr-3 w-10">
                      <input
                        type="checkbox"
                        checked={
                          selectedIds.length > 0 &&
                          selectedIds.length === filteredItems.length
                        }
                        onChange={toggleSelectAll}
                        className="rounded border-border cursor-pointer"
                      />
                    </th>
                    <th className="py-3.5 px-3">Vehicle Details</th>
                    <th className="py-3.5 px-3">Reg. Number</th>
                    <th className="py-3.5 px-3">Purpose</th>
                    <th className="py-3.5 px-3">Asking Price</th>
                    <th className="py-3.5 px-3">Sale Status</th>
                    <th className="py-3.5 px-3">Moderation</th>
                    <th className="py-3.5 pr-6 pl-3 text-right">Actions</th>
                  </tr>
                </thead>

                {/* Rows with 1px dividers */}
                <tbody className="divide-y divide-border/60">
                  {filteredItems.map(item => {
                    const id = item.id || item._id;
                    const vehicle = item.vehicleRef || {};
                    const isSelected = selectedIds.includes(id);

                    return (
                      <tr
                        key={id}
                        className={`hover:bg-tile/40 transition-colors ${
                          isSelected ? 'bg-tile/60' : ''
                        }`}
                      >
                        <td className="py-3.5 pl-6 pr-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectRow(id)}
                            className="rounded border-border cursor-pointer"
                          />
                        </td>

                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-tile border border-border overflow-hidden shrink-0 flex items-center justify-center p-0.5">
                              <img
                                src={vehicle.images?.[0]?.url || '/placeholders/sedan.svg'}
                                alt=""
                                className="w-full h-full object-contain"
                                onError={e => {
                                  e.currentTarget.src = '/placeholders/sedan.svg';
                                }}
                              />
                            </div>
                            <div>
                              <p className="font-semibold text-text leading-tight">
                                {vehicle.brand} {vehicle.model}
                              </p>
                              <p className="text-[11px] text-muted">
                                {vehicle.manufacturingYear} · {vehicle.fuelType} · {vehicle.transmission}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-3 font-mono text-[11px] text-text">
                          {vehicle.registrationNumber || '—'}
                        </td>

                        <td className="py-3.5 px-3 capitalize text-muted">
                          {item.purpose || 'sale'}
                        </td>

                        <td className="py-3.5 px-3 font-semibold text-text">
                          {item.sale?.askingPrice
                            ? formatRupees(item.sale.askingPrice)
                            : item.rental?.dailyPrice
                            ? `${formatRupees(item.rental.dailyPrice)}/day`
                            : '—'}
                        </td>

                        <td className="py-3.5 px-3">
                          <StatusChip
                            status={item.sale?.status || 'draft'}
                            label={item.sale?.status}
                          />
                        </td>

                        <td className="py-3.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${
                              item.moderationStatus === 'approved'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : item.moderationStatus === 'draft'
                                ? 'bg-tile text-muted'
                                : 'bg-amber-500/10 text-amber-600'
                            }`}
                          >
                            {item.moderationStatus}
                          </span>
                        </td>

                        <td className="py-3.5 pr-6 pl-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {item.sale?.status === 'active' ? (
                              <button
                                type="button"
                                title="Deactivate"
                                onClick={() =>
                                  bulkStatusMutation.mutate({
                                    action: 'deactivate',
                                    listingIds: [id],
                                  })
                                }
                                className="p-1.5 rounded-lg hover:bg-tile text-muted hover:text-amber-500 transition-colors"
                              >
                                <PowerOff className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                title="Activate"
                                onClick={() =>
                                  bulkStatusMutation.mutate({
                                    action: 'activate',
                                    listingIds: [id],
                                  })
                                }
                                className="p-1.5 rounded-lg hover:bg-tile text-muted hover:text-emerald-500 transition-colors"
                              >
                                <Power className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <Link
                              to={`/listings/${id}`}
                              title="View Public Listing"
                              className="p-1.5 rounded-lg hover:bg-tile text-muted hover:text-text transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default DealerInventoryPage;
