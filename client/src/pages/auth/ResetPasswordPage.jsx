import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../context/ToastContext';

export function ResetPasswordPage() {
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const urlToken = searchParams.get('token');
    if (urlToken) {
      setToken(urlToken);
    }
  }, [searchParams]);

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');

    if (password !== passwordConfirm) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'Password reset failed');
      }

      addToast({
        type: 'success',
        title: 'Password Updated',
        message: 'Your password was successfully reset. You may now sign in.',
      });

      navigate('/login');
    } catch (err) {
      setError(err.message || 'Invalid or expired token.');
      addToast({
        type: 'error',
        title: 'Reset Failed',
        message: err.message || 'Token expired or invalid.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Create new password"
      subtitle="Enter your recovery token and choose a secure replacement password."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="p-3 rounded-[12px] bg-[rgba(220,38,38,0.12)] border border-danger/20 text-danger text-[12px]">
            {error}
          </div>
        )}

        <Input
          label="Reset Token"
          required
          placeholder="Paste token from email/console"
          value={token}
          onChange={e => setToken(e.target.value)}
        />

        <Input
          label="New Password"
          type="password"
          required
          placeholder="Minimum 8 characters"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />

        <Input
          label="Confirm New Password"
          type="password"
          required
          placeholder="Re-enter new password"
          value={passwordConfirm}
          onChange={e => setPasswordConfirm(e.target.value)}
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={isSubmitting}
          className="w-full mt-2"
        >
          {isSubmitting ? 'Updating password...' : 'Update password'}
        </Button>

        <Link
          to="/login"
          className="text-center text-[12px] text-muted hover:text-text hover:underline mt-2"
        >
          Cancel and return to sign in
        </Link>
      </form>
    </AuthLayout>
  );
}

export default ResetPasswordPage;
