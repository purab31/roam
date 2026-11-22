import { useState } from 'react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { StatusChip } from '../../components/ui/StatusChip';
import { Modal } from '../../components/ui/Modal';
import { AlertTriangle, KeyRound } from 'lucide-react';

export function SettingsPage() {
  const { user, changePassword, requestDeactivation } = useAuth();
  const { addToast } = useToast();

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const handlePasswordSubmit = async e => {
    e.preventDefault();
    setPasswordError('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long');
      return;
    }

    setIsChangingPassword(true);
    try {
      await changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

      addToast({
        type: 'success',
        title: 'Password Updated',
        message: 'Your password was changed successfully.',
      });

      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err) {
      setPasswordError(err.message || 'Failed to update password');
      addToast({
        type: 'error',
        title: 'Password Error',
        message: err.message || 'Incorrect current password.',
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeactivate = async () => {
    setIsDeactivating(true);
    try {
      await requestDeactivation();
      setIsModalOpen(false);
      addToast({
        type: 'warning',
        title: 'Deactivation Requested',
        message: 'Your request has been submitted for administrative review.',
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Error',
        message: err.message || 'Could not request deactivation.',
      });
    } finally {
      setIsDeactivating(false);
    }
  };

  const isDeactivationRequested = user?.accountStatus === 'deactivation_requested';

  return (
    <DashboardLayout>
      <div className="max-w-reading mx-auto flex flex-col gap-8">
        <div>
          <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">
            Security & Controls
          </span>
          <h1 className="text-3xl font-light tracking-tight text-text mt-1">
            Account Settings
          </h1>
          <p className="text-[13px] text-muted mt-1">
            Manage your credentials, login security, and account lifecycle status.
          </p>
        </div>

        {/* Change Password Form */}
        <div className="p-6 sm:p-8 rounded-[24px] bg-surface border border-border">
          <div className="flex items-center gap-2 pb-4 border-b border-border mb-5">
            <KeyRound className="w-4 h-4 text-muted" />
            <h2 className="text-[16px] font-medium text-text">Change Password</h2>
          </div>

          <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
            {passwordError && (
              <div className="p-3 rounded-[12px] bg-[rgba(220,38,38,0.12)] border border-danger/20 text-danger text-[12px]">
                {passwordError}
              </div>
            )}

            <Input
              label="Current Password"
              type="password"
              required
              placeholder="••••••••"
              value={passwordData.currentPassword}
              onChange={e =>
                setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))
              }
            />

            <Input
              label="New Password"
              type="password"
              required
              placeholder="Minimum 8 characters"
              value={passwordData.newPassword}
              onChange={e =>
                setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))
              }
            />

            <Input
              label="Confirm New Password"
              type="password"
              required
              placeholder="Re-enter new password"
              value={passwordData.confirmPassword}
              onChange={e =>
                setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))
              }
            />

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={isChangingPassword}
              >
                {isChangingPassword ? 'Updating...' : 'Update Password'}
              </Button>
            </div>
          </form>
        </div>

        {/* Account Lifecycle & Deactivation (Spec 3.3) */}
        <div className="p-6 sm:p-8 rounded-[24px] bg-surface border border-border">
          <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
            <div>
              <h2 className="text-[16px] font-medium text-text">Account Lifecycle</h2>
              <span className="text-[11px] text-muted">
                Current Standing: <strong className="text-text capitalize">{user?.accountStatus?.replace('_', ' ')}</strong>
              </span>
            </div>
            <StatusChip
              status={isDeactivationRequested ? 'Pending' : 'Available'}
              label={isDeactivationRequested ? 'Deactivation Requested' : 'Active Account'}
            />
          </div>

          <p className="text-[13px] text-muted leading-relaxed mb-6">
            When an account is deactivated, you will not be able to create new listings, offers, or rental bookings. Existing records are retained where needed for ongoing bookings, dispute resolution, or legal transaction history per Spec Section 3.3.
          </p>

          {isDeactivationRequested ? (
            <div className="flex items-center gap-3 p-4 rounded-[16px] bg-tile border border-border text-[12px] text-muted">
              <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
              <span>
                Your deactivation request is currently pending administrative review. You can continue accessing your historical data.
              </span>
            </div>
          ) : (
            <Button
              variant="destructive"
              size="lg"
              onClick={() => setIsModalOpen(true)}
            >
              Request Account Deactivation
            </Button>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Confirm Deactivation Request"
        description="Are you sure you want to request deactivation for your Roam account?"
      >
        <div className="flex flex-col gap-4 py-2">
          <p className="text-[13px] text-muted leading-relaxed">
            Upon administrative approval, your public listings will be deactivated and you will be restricted from placing new offers or rental bookings.
          </p>

          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={isDeactivating}
              onClick={handleDeactivate}
            >
              {isDeactivating ? 'Submitting...' : 'Confirm Request'}
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}

export default SettingsPage;
