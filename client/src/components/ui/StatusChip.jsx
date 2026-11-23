import React from 'react';
import {
  CheckCircle2,
  Clock,
  MessageSquare,
  Check,
  XCircle,
  Calendar,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';

/**
 * StatusChip component per UI Section 7.17 & Section 3:
 * 12% tinted background + solid text with an icon so colour is never the only signal.
 * Supported statuses:
 * Available, Pending, Negotiating, Accepted, Rejected, Booked, Returned, Expired
 */
export function StatusChip({ status, label, className = '' }) {
  const normalized = (status || '').toLowerCase();

  const configs = {
    available: {
      label: label || 'Available',
      icon: CheckCircle2,
      style: 'bg-[rgba(22,163,74,0.12)] text-[#16a34a] dark:text-[#34d399]',
    },
    active: {
      label: label || 'Active',
      icon: CheckCircle2,
      style: 'bg-[rgba(22,163,74,0.12)] text-[#16a34a] dark:text-[#34d399]',
    },
    accepted: {
      label: label || 'Accepted',
      icon: Check,
      style: 'bg-[rgba(22,163,74,0.12)] text-[#16a34a] dark:text-[#34d399]',
    },
    approved: {
      label: label || 'Approved',
      icon: CheckCircle2,
      style: 'bg-[rgba(22,163,74,0.12)] text-[#16a34a] dark:text-[#34d399]',
    },
    changes_requested: {
      label: label || 'Changes Requested',
      icon: AlertTriangle,
      style: 'bg-[rgba(217,119,6,0.12)] text-[#d97706] dark:text-[#fbbf24]',
    },
    suspended: {
      label: label || 'Suspended',
      icon: XCircle,
      style: 'bg-[rgba(220,38,38,0.12)] text-[#dc2626] dark:text-[#f87171]',
    },
    completed: {
      label: label || 'Completed',
      icon: CheckCircle2,
      style: 'bg-[rgba(22,163,74,0.12)] text-[#16a34a] dark:text-[#34d399]',
    },
    sold: {
      label: label || 'Sold',
      icon: CheckCircle2,
      style: 'bg-[rgba(22,163,74,0.12)] text-[#16a34a] dark:text-[#34d399]',
    },
    pending: {
      label: label || 'Pending',
      icon: Clock,
      style: 'bg-[rgba(217,119,6,0.12)] text-[#d97706] dark:text-[#fbbf24]',
    },
    submitted: {
      label: label || 'Submitted',
      icon: Clock,
      style: 'bg-[rgba(217,119,6,0.12)] text-[#d97706] dark:text-[#fbbf24]',
    },
    counteroffer_made: {
      label: label || 'Counteroffer',
      icon: RotateCcw,
      style: 'bg-[rgba(147,51,234,0.12)] text-[#9333ea] dark:text-[#c084fc]',
    },
    negotiating: {
      label: label || 'Negotiating',
      icon: MessageSquare,
      style: 'bg-[rgba(217,119,6,0.12)] text-[#d97706] dark:text-[#fbbf24]',
    },
    reserved: {
      label: label || 'Reserved',
      icon: Clock,
      style: 'bg-[rgba(37,99,235,0.12)] text-[#2563eb] dark:text-[#60a5fa]',
    },
    open: {
      label: label || 'Open',
      icon: MessageSquare,
      style: 'bg-[rgba(37,99,235,0.12)] text-[#2563eb] dark:text-[#60a5fa]',
    },
    answered: {
      label: label || 'Answered',
      icon: Check,
      style: 'bg-[rgba(147,51,234,0.12)] text-[#9333ea] dark:text-[#c084fc]',
    },
    resolved: {
      label: label || 'Resolved',
      icon: CheckCircle2,
      style: 'bg-[rgba(22,163,74,0.12)] text-[#16a34a] dark:text-[#34d399]',
    },
    closed: {
      label: label || 'Closed',
      icon: XCircle,
      style: 'bg-[rgba(107,114,128,0.12)] text-[#6b7280] dark:text-[#9ca3af]',
    },
    withdrawn: {
      label: label || 'Withdrawn',
      icon: XCircle,
      style: 'bg-[rgba(107,114,128,0.12)] text-[#6b7280] dark:text-[#9ca3af]',
    },
    rejected: {
      label: label || 'Rejected',
      icon: XCircle,
      style: 'bg-[rgba(220,38,38,0.12)] text-[#dc2626] dark:text-[#f87171]',
    },
    expired: {
      label: label || 'Expired',
      icon: AlertTriangle,
      style: 'bg-[rgba(220,38,38,0.12)] text-[#dc2626] dark:text-[#f87171]',
    },
    booked: {
      label: label || 'Booked',
      icon: Calendar,
      style: 'bg-[rgba(10,10,10,0.08)] dark:bg-[rgba(255,255,255,0.12)] text-text',
    },
    returned: {
      label: label || 'Returned',
      icon: RotateCcw,
      style: 'bg-[rgba(10,10,10,0.08)] dark:bg-[rgba(255,255,255,0.12)] text-text',
    },
  };

  const config = configs[normalized] || {
    label: label || status,
    icon: CheckCircle2,
    style: 'bg-tile text-text',
  };

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-[11px] font-semibold tracking-wide select-none ${config.style} ${className}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>{config.label}</span>
    </span>
  );
}

export default StatusChip;
