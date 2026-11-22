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
    accepted: {
      label: label || 'Accepted',
      icon: Check,
      style: 'bg-[rgba(22,163,74,0.12)] text-[#16a34a] dark:text-[#34d399]',
    },
    pending: {
      label: label || 'Pending',
      icon: Clock,
      style: 'bg-[rgba(217,119,6,0.12)] text-[#d97706] dark:text-[#fbbf24]',
    },
    negotiating: {
      label: label || 'Negotiating',
      icon: MessageSquare,
      style: 'bg-[rgba(217,119,6,0.12)] text-[#d97706] dark:text-[#fbbf24]',
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
