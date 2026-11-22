import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Car, ShoppingBag, Building2, Check } from 'lucide-react';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export function RegisterPage() {
  const { register } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/dashboard';

  // Role onboarding options (UI 8.10)
  const roleTiles = [
    {
      id: 'buyer',
      title: 'Buyer / Renter',
      desc: 'Discover and purchase or rent verified vehicles.',
      icon: ShoppingBag,
      capabilities: ['buyer', 'renter'],
    },
    {
      id: 'seller',
      title: 'Individual Seller',
      desc: 'List your personally owned car for sale, rent, or both.',
      icon: Car,
      capabilities: ['buyer', 'renter', 'seller'],
    },
    {
      id: 'dealer',
      title: 'Registered Dealer',
      desc: 'Manage dealership inventory and acquire vehicles from owners.',
      icon: Building2,
      capabilities: ['buyer', 'renter', 'dealer'],
    },
  ];

  const [selectedRole, setSelectedRole] = useState('buyer');
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    mobile: '',
    password: '',
    passwordConfirm: '',
    acceptTerms: true,
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setErrors({});
    setIsSubmitting(true);

    const activeTile = roleTiles.find(r => r.id === selectedRole);

    try {
      await register({
        ...formData,
        capabilities: activeTile?.capabilities || ['buyer', 'renter'],
      });

      addToast({
        type: 'success',
        title: 'Registration Complete',
        message: 'Account created and authenticated.',
      });

      navigate(redirectUrl);
    } catch (err) {
      if (err.fields) {
        setErrors(err.fields);
      } else {
        setErrors({ root: err.message || 'Registration failed' });
      }
      addToast({
        type: 'error',
        title: 'Registration Error',
        message: err.message || 'Could not complete registration.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Join Roam to browse, buy, rent, or list verified pre-owned vehicles."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {errors.root && (
          <div className="p-3 rounded-[12px] bg-[rgba(220,38,38,0.12)] border border-danger/20 text-danger text-[12px]">
            {errors.root}
          </div>
        )}

        {/* Onboarding Role Selection Tiles (UI 8.10) */}
        <div>
          <label className="text-[11px] font-medium text-muted tracking-wide block mb-2">
            Select your primary intent (you can add more roles later)
          </label>
          <div className="grid grid-cols-1 gap-2.5">
            {roleTiles.map(tile => {
              const Icon = tile.icon;
              const isSelected = selectedRole === tile.id;
              return (
                <div
                  key={tile.id}
                  onClick={() => setSelectedRole(tile.id)}
                  role="radio"
                  aria-checked={isSelected}
                  tabIndex={0}
                  className={`flex items-start gap-3 p-3.5 rounded-[16px] border cursor-pointer transition-all select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text ${
                    isSelected
                      ? 'bg-tile border-text'
                      : 'bg-surface border-border hover:border-text/60'
                  }`}
                >
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0 ${
                      isSelected
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-tile text-muted'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-medium text-text">
                        {tile.title}
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-text" />}
                    </div>
                    <p className="text-[11px] text-muted mt-0.5 leading-normal">
                      {tile.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <Input
          label="Full Name"
          required
          autoComplete="name"
          placeholder="e.g. Jane Buyer"
          value={formData.fullName}
          onChange={e => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
          error={errors.fullName}
        />

        <Input
          label="Email Address"
          type="email"
          required
          autoComplete="email"
          placeholder="e.g. jane@example.com"
          value={formData.email}
          onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
          error={errors.email}
        />

        <Input
          label="Mobile Number"
          type="tel"
          required
          autoComplete="tel"
          placeholder="e.g. +1234567890"
          value={formData.mobile}
          onChange={e => setFormData(prev => ({ ...prev, mobile: e.target.value }))}
          error={errors.mobile}
          helperText="Unique mobile number required for vehicle handover notices."
        />

        <Input
          label="Password"
          type="password"
          required
          autoComplete="new-password"
          placeholder="Min 8 characters"
          value={formData.password}
          onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
          error={errors.password}
        />

        <Input
          label="Confirm Password"
          type="password"
          required
          autoComplete="new-password"
          placeholder="Re-enter password"
          value={formData.passwordConfirm}
          onChange={e => setFormData(prev => ({ ...prev, passwordConfirm: e.target.value }))}
          error={errors.passwordConfirm}
        />

        <div className="flex items-start gap-2.5 pt-1">
          <input
            id="terms"
            type="checkbox"
            required
            checked={formData.acceptTerms}
            onChange={e => setFormData(prev => ({ ...prev, acceptTerms: e.target.checked }))}
            className="w-4 h-4 mt-0.5 rounded border-border text-primary cursor-pointer accent-primary"
          />
          <label htmlFor="terms" className="text-[12px] text-muted leading-tight">
            I accept the{' '}
            <span className="text-text font-medium underline">Terms & Conditions</span>{' '}
            and acknowledge that legal settlement happens outside the platform.
          </label>
        </div>
        {errors.acceptTerms && (
          <span className="text-[11px] text-danger font-medium -mt-2">
            {errors.acceptTerms}
          </span>
        )}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={isSubmitting}
          className="w-full mt-2"
        >
          {isSubmitting ? 'Creating account...' : 'Create account'}
        </Button>

        <p className="text-center text-[12px] text-muted">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-text hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

export default RegisterPage;
