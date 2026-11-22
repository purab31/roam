import { useState } from 'react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { ShieldCheck, User as UserIcon } from 'lucide-react';

export function ProfilePage() {
  const { user, updateProfile, addCapability } = useAuth();
  const { addToast } = useToast();

  const [formData, setFormData] = useState({
    fullName: user?.fullName || '',
    mobile: user?.mobile || '',
    contactVisibility: {
      email: user?.contactVisibility?.email || false,
      mobile: user?.contactVisibility?.mobile || false,
    },
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setErrors({});
    setIsSubmitting(true);

    try {
      await updateProfile(formData);
      addToast({
        type: 'success',
        title: 'Profile Updated',
        message: 'Your personal details have been saved.',
      });
    } catch (err) {
      if (err.fields) {
        setErrors(err.fields);
      } else {
        setErrors({ root: err.message || 'Update failed' });
      }
      addToast({
        type: 'error',
        title: 'Update Error',
        message: err.message || 'Could not update profile.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-reading mx-auto flex flex-col gap-8">
        <div>
          <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">
            Account Management
          </span>
          <h1 className="text-3xl font-light tracking-tight text-text mt-1">
            Personal Profile
          </h1>
          <p className="text-[13px] text-muted mt-1">
            Manage your personal contact details, roles, and public contact visibility.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {errors.root && (
            <div className="p-3 rounded-[12px] bg-[rgba(220,38,38,0.12)] border border-danger/20 text-danger text-[12px]">
              {errors.root}
            </div>
          )}

          {/* Profile Photo Tile */}
          <div className="flex items-center gap-5 p-6 rounded-[24px] bg-surface border border-border">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-tile text-text text-xl font-bold border border-border">
              {user?.fullName?.charAt(0) || <UserIcon className="w-8 h-8 text-muted" />}
            </div>
            <div>
              <h3 className="text-[15px] font-medium text-text">{user?.fullName}</h3>
              <p className="text-[11px] text-muted">
                Profile photo upload will integrate with Cloudinary media storage in Sprint 2.
              </p>
            </div>
          </div>

          {/* Contact Details Card */}
          <div className="flex flex-col gap-5 p-6 sm:p-8 rounded-[24px] bg-surface border border-border">
            <h2 className="text-[16px] font-medium text-text border-b border-border pb-3">
              Basic Information
            </h2>

            <Input
              label="Full Name"
              required
              value={formData.fullName}
              onChange={e => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
              error={errors.fullName}
            />

            <Input
              label="Email Address"
              value={user?.email || ''}
              disabled
              helperText="Email cannot be changed directly. Contact support for identity updates."
            />

            <Input
              label="Mobile Number"
              required
              value={formData.mobile}
              onChange={e => setFormData(prev => ({ ...prev, mobile: e.target.value }))}
              error={errors.mobile}
              helperText="Must be unique across all Roam accounts."
            />
          </div>

          {/* Contact Visibility Controls (Spec 3.3) */}
          <div className="flex flex-col gap-4 p-6 sm:p-8 rounded-[24px] bg-surface border border-border">
            <h2 className="text-[16px] font-medium text-text border-b border-border pb-3">
              Public Contact Visibility
            </h2>
            <p className="text-[12px] text-muted -mt-1 leading-relaxed">
              Choose whether your contact details appear on vehicle listings and public profiles.
            </p>

            <div className="flex flex-col gap-3 pt-2">
              <label className="flex items-center justify-between p-3.5 rounded-[16px] bg-tile cursor-pointer hover:bg-bg-subtle transition-colors">
                <div>
                  <span className="text-[13px] font-medium text-text block">
                    Show Email on Public Listings
                  </span>
                  <span className="text-[11px] text-muted">
                    Allows visitors to see your registered email on your vehicle detail page.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.contactVisibility.email}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      contactVisibility: {
                        ...prev.contactVisibility,
                        email: e.target.checked,
                      },
                    }))
                  }
                  className="w-4 h-4 rounded border-border text-primary cursor-pointer accent-primary"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 rounded-[16px] bg-tile cursor-pointer hover:bg-bg-subtle transition-colors">
                <div>
                  <span className="text-[13px] font-medium text-text block">
                    Show Mobile Number on Public Listings
                  </span>
                  <span className="text-[11px] text-muted">
                    Allows potential buyers and renters to reach your mobile phone directly.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.contactVisibility.mobile}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      contactVisibility: {
                        ...prev.contactVisibility,
                        mobile: e.target.checked,
                      },
                    }))
                  }
                  className="w-4 h-4 rounded border-border text-primary cursor-pointer accent-primary"
                />
              </label>
            </div>
          </div>

          {/* Capabilities Card */}
          <div className="flex flex-col gap-4 p-6 sm:p-8 rounded-[24px] bg-surface border border-border">
            <h2 className="text-[16px] font-medium text-text border-b border-border pb-3">
              Enabled Capabilities (Spec 3.4)
            </h2>

            <div className="flex flex-wrap gap-2 pt-1">
              {user?.capabilities?.map(c => (
                <span
                  key={c}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-medium bg-tile text-text capitalize"
                >
                  <ShieldCheck className="w-4 h-4 text-muted" />
                  <span>{c}</span>
                </span>
              ))}
            </div>

            {!user?.capabilities?.includes('seller') && (
              <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                <div>
                  <span className="text-[13px] font-medium text-text block">
                    Add Seller Capability
                  </span>
                  <span className="text-[11px] text-muted">
                    Enables you to list your vehicles for sale or rent.
                  </span>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  onClick={async () => {
                    await addCapability('seller');
                    addToast({
                      type: 'success',
                      title: 'Role Added',
                      message: 'Seller capability enabled.',
                    });
                  }}
                >
                  Enable Seller
                </Button>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving changes...' : 'Save Profile Changes'}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}

export default ProfilePage;
