import { useState } from 'react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { StatusChip } from '../../components/ui/StatusChip';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Car, ShieldCheck, ArrowRight, Activity, Clock } from 'lucide-react';

export function DashboardPage() {
  const { user, hasCapability, addCapability } = useAuth();
  const { addToast } = useToast();
  const [isUpgrading, setIsUpgrading] = useState(false);

  const handleAddSeller = async () => {
    setIsUpgrading(true);
    try {
      await addCapability('seller');
      addToast({
        type: 'success',
        title: 'Capability Added',
        message: 'You now hold the Seller capability. Listing creation will unlock in Sprint 2.',
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Error',
        message: err.message || 'Failed to add capability',
      });
    } finally {
      setIsUpgrading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8">
        {/* Top Header / Welcome Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-[24px] bg-surface border border-border">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">
                Dashboard Overview
              </span>
              <StatusChip status="Available" label={user?.accountStatus || 'Active'} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-text">
              Welcome back, {user?.fullName}
            </h1>
            <p className="text-[13px] text-muted mt-1">
              Your registered email is <strong className="text-text">{user?.email}</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {user?.capabilities?.map(c => (
              <span
                key={c}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold bg-tile text-text capitalize"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-muted" />
                <span>{c}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Stat Cards per UI 8.8: 40px/300 number, 11px muted label */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-6 rounded-[24px] bg-surface border border-border">
            <span className="text-[11px] font-medium text-muted uppercase tracking-wide block mb-2">
              Active Enquiries
            </span>
            <div className="text-4xl font-light text-text tracking-tight">0</div>
            <span className="text-[10px] text-muted mt-2 block">Incoming & sent</span>
          </div>

          <div className="p-6 rounded-[24px] bg-surface border border-border">
            <span className="text-[11px] font-medium text-muted uppercase tracking-wide block mb-2">
              Saved Vehicles
            </span>
            <div className="text-4xl font-light text-text tracking-tight">0</div>
            <span className="text-[10px] text-muted mt-2 block">Wishlist items</span>
          </div>

          <div className="p-6 rounded-[24px] bg-surface border border-border">
            <span className="text-[11px] font-medium text-muted uppercase tracking-wide block mb-2">
              Active Listings
            </span>
            <div className="text-4xl font-light text-text tracking-tight">
              {hasCapability('seller') ? '0' : '—'}
            </div>
            <span className="text-[10px] text-muted mt-2 block">
              {hasCapability('seller') ? 'Live on marketplace' : 'Seller capability inactive'}
            </span>
          </div>

          <div className="p-6 rounded-[24px] bg-surface border border-border">
            <span className="text-[11px] font-medium text-muted uppercase tracking-wide block mb-2">
              Account Standing
            </span>
            <div className="text-2xl sm:text-3xl font-light text-success tracking-tight capitalize mt-1">
              {user?.accountStatus?.replace('_', ' ') || 'Active'}
            </div>
            <span className="text-[10px] text-muted mt-2 block">Good standing</span>
          </div>
        </div>

        {/* Multi-Role Capabilities Management Card (Spec 3.4) */}
        {!hasCapability('seller') && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 p-6 sm:p-8 rounded-[24px] bg-surface border border-border">
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-[16px] bg-tile text-muted shrink-0">
                <Car className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-[18px] font-normal text-text">
                  Want to sell or rent your personal vehicle?
                </h3>
                <p className="text-[13px] text-muted mt-1 leading-relaxed max-w-xl">
                  Roam supports multi-role accounts. You don&apos;t need a separate login. Enable the{' '}
                  <strong className="text-text">Seller</strong> capability to list personal vehicles for sale, rent, or both.
                </p>
              </div>
            </div>

            <Button
              variant="primary"
              size="lg"
              disabled={isUpgrading}
              onClick={handleAddSeller}
              className="shrink-0"
            >
              <span>{isUpgrading ? 'Enabling...' : 'Become a Seller'}</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        {/* Activity Feed Placeholder */}
        <div className="p-6 sm:p-8 rounded-[24px] bg-surface border border-border">
          <div className="flex items-center justify-between pb-6 border-b border-border">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-muted" />
              <h2 className="text-[16px] font-medium text-text">Recent Activity & Notices</h2>
            </div>
            <span className="text-[11px] text-muted flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Live session
            </span>
          </div>

          <EmptyState
            title="No activity recorded yet"
            description="When you enquire on vehicles, receive purchase offers, or request rental bookings, they will appear in this timeline."
            actionLabel="View Design System Showcase"
            onAction={() => window.location.assign('/design-system')}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}

export default DashboardPage;
