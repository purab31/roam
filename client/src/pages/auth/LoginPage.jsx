import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export function LoginPage() {
  const { login } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/dashboard';

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setErrors({});
    setIsSubmitting(true);

    try {
      await login(formData);
      addToast({
        type: 'success',
        title: 'Welcome Back',
        message: 'Signed in successfully.',
      });
      navigate(redirectUrl);
    } catch (err) {
      setErrors({ root: err.message || 'Invalid credentials' });
      addToast({
        type: 'error',
        title: 'Authentication Failed',
        message: err.message || 'Invalid email or password.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Sign in to your account"
      subtitle="Access your listings, saved searches, purchase offers, and rental requests."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {errors.root && (
          <div className="p-3 rounded-[12px] bg-[rgba(220,38,38,0.12)] border border-danger/20 text-danger text-[12px]">
            {errors.root}
          </div>
        )}

        <Input
          label="Email Address"
          type="email"
          required
          autoComplete="email"
          placeholder="e.g. name@example.com"
          value={formData.email}
          onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
          error={errors.email}
        />

        <div>
          <Input
            label="Password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
            value={formData.password}
            onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
            error={errors.password}
          />
          <div className="flex justify-end mt-1.5">
            <Link
              to="/forgot-password"
              className="text-[11px] text-muted hover:text-text hover:underline"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={isSubmitting}
          className="w-full mt-2"
        >
          {isSubmitting ? 'Signing in...' : 'Sign in'}
        </Button>

        <p className="text-center text-[12px] text-muted mt-4">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="font-semibold text-text hover:underline">
            Create an account
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

export default LoginPage;
