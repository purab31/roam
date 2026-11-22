import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../context/ToastContext';

export function ForgotPasswordPage() {
  const { addToast } = useToast();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      setSubmitted(true);
      addToast({
        type: 'info',
        title: 'Reset Link Dispatched',
        message: data.data?.message || 'Check your email (or server console in development).',
      });
    } catch {
      addToast({
        type: 'error',
        title: 'Request Failed',
        message: 'Could not process password reset request.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your account email address and we'll dispatch a single-use recovery link."
    >
      {submitted ? (
        <div className="flex flex-col gap-4 p-5 rounded-[20px] bg-tile text-center">
          <h3 className="text-[16px] font-medium text-text">Link Sent</h3>
          <p className="text-[12px] text-muted leading-relaxed">
            If an account is associated with <strong className="text-text">{email}</strong>, a recovery link has been created.
            In development mode, check your server console for the link.
          </p>
          <Button variant="secondary" size="lg" className="w-full mt-2" onClick={() => setSubmitted(false)}>
            Send another link
          </Button>
          <Link to="/login" className="text-[12px] text-muted hover:text-text hover:underline mt-2">
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Registered Email"
            type="email"
            required
            autoComplete="email"
            placeholder="e.g. name@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={isSubmitting}
            className="w-full mt-2"
          >
            {isSubmitting ? 'Dispatching link...' : 'Send reset link'}
          </Button>

          <Link
            to="/login"
            className="text-center text-[12px] text-muted hover:text-text hover:underline mt-2"
          >
            Remembered your password? Sign in
          </Link>
        </form>
      )}
    </AuthLayout>
  );
}

export default ForgotPasswordPage;
