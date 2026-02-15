import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, Send, CheckCircle } from 'lucide-react';
import { ChorbiePresets } from '../components/mascot';
import { api } from '../api/client';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await api.post('/auth/forgot-password', { email });
      setIsSubmitted(true);
    } catch (err: any) {
      // Even on error, we show success to prevent user enumeration
      // The backend always returns success for security
      setIsSubmitted(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Success state - show confirmation
  if (isSubmitted) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center p-4 bg-bg-base">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          <div className="bg-bg-surface rounded-md border-2 border-[var(--border-color)] shadow-[var(--neo-shadow)] p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success-100 dark:bg-success-900/30 flex items-center justify-center">
              <CheckCircle size={32} className="text-success-500" />
            </div>
            <h2 className="text-xl font-bold text-text-primary mb-2">Check Your Email</h2>
            <p className="text-text-muted mb-6">
              If an account exists for <strong className="text-text-primary">{email}</strong>,
              you'll receive a password reset link shortly.
            </p>
            <p className="text-sm text-text-muted mb-6">
              The link will expire in 1 hour. If you don't see the email, check your spam folder.
            </p>
            <Link
              to="/login"
              style={{ backgroundColor: 'var(--primary-500)' }}
              className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl text-white font-semibold hover:opacity-90 transition-colors"
            >
              <ArrowLeft size={20} />
              Back to Login
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col items-center justify-center p-4 bg-bg-base">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center mb-8"
      >
        <div className="w-20 h-20 mb-4">
          <ChorbiePresets.Encourage size={80} />
        </div>
        <h1 style={{ color: 'var(--primary-500)' }} className="text-3xl font-bold">
          Forgot Password?
        </h1>
        <p className="text-text-muted mt-2 text-center">
          No worries! Enter your email and we'll send you a reset link.
        </p>
      </motion.div>

      {/* Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="w-full max-w-md"
      >
        <form
          onSubmit={handleSubmit}
          className="bg-bg-surface rounded-md border-2 border-[var(--border-color)] shadow-[var(--neo-shadow)] p-6 space-y-4"
        >
          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="p-3 rounded-lg bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400 text-sm"
            >
              {error}
            </motion.div>
          )}

          {/* Email Input */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail
                size={20}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
              />
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full pl-10 pr-4 py-3 rounded-md border-2 border-[var(--border-color)] bg-bg-base text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:shadow-[var(--neo-shadow-sm)]"
                placeholder="you@example.com"
              />
            </div>
          </div>

          {/* Submit Button */}
          <motion.button
            type="submit"
            disabled={isLoading || !email}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{ backgroundColor: 'var(--primary-500)' }}
            className="w-full py-3 px-4 rounded-xl text-white font-semibold flex items-center justify-center gap-2 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Send size={20} />
                Send Reset Link
              </>
            )}
          </motion.button>
        </form>

        {/* Back to Login Link */}
        <p className="text-center mt-6 text-text-muted">
          Remember your password?{' '}
          <Link
            to="/login"
            style={{ color: 'var(--primary-500)' }}
            className="hover:opacity-80 font-medium"
          >
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

export default ForgotPassword;
