import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { ChorbiePresets } from '../components/mascot';
import { api } from '../api/client';

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenValid, setTokenValid] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);

  // Validate token on mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setError('No reset token provided. Please request a new password reset.');
        setIsValidating(false);
        return;
      }

      try {
        const response = await api.get(`/auth/verify-reset-token?token=${encodeURIComponent(token)}`);
        if (response.data.valid) {
          setTokenValid(true);
          setMaskedEmail(response.data.email);
        } else {
          setError('This reset link is invalid or has expired. Please request a new password reset.');
        }
      } catch (err) {
        setError('This reset link is invalid or has expired. Please request a new password reset.');
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const passwordRequirements = [
    { met: password.length >= 8, text: 'At least 8 characters' },
    { met: password === confirmPassword && password.length > 0, text: 'Passwords match' },
  ];

  const allRequirementsMet = passwordRequirements.every((req) => req.met);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);

    try {
      await api.post('/auth/reset-password', {
        token,
        new_password: password,
      });
      setIsSuccess(true);
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          'Failed to reset password. The link may have expired.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state while validating token
  if (isValidating) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center p-4 bg-bg-base">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-text-muted">Validating reset link...</p>
        </div>
      </div>
    );
  }

  // Invalid token state
  if (!tokenValid && !isSuccess) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center p-4 bg-bg-base">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          <div className="bg-bg-surface rounded-md border-2 border-[var(--border-color)] shadow-[var(--neo-shadow)] p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-error-100 dark:bg-error-900/30 flex items-center justify-center">
              <AlertCircle size={32} className="text-error-500" />
            </div>
            <h2 className="text-xl font-bold text-text-primary mb-2">Invalid Reset Link</h2>
            <p className="text-text-muted mb-6">{error}</p>
            <Link
              to="/forgot-password"
              style={{ backgroundColor: 'var(--primary-500)' }}
              className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl text-white font-semibold hover:opacity-90 transition-colors"
            >
              Request New Reset Link
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 mt-3 rounded-xl text-text-muted hover:text-text-primary transition-colors"
            >
              <ArrowLeft size={20} />
              Back to Login
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // Success state
  if (isSuccess) {
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
            <h2 className="text-xl font-bold text-text-primary mb-2">Password Reset!</h2>
            <p className="text-text-muted mb-6">
              Your password has been successfully changed. You can now log in with your new password.
            </p>
            <Link
              to="/login"
              style={{ backgroundColor: 'var(--primary-500)' }}
              className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl text-white font-semibold hover:opacity-90 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // Password reset form
  return (
    <div className="h-full w-full flex flex-col items-center justify-center p-4 bg-bg-base">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center mb-8"
      >
        <div className="w-20 h-20 mb-4">
          <ChorbiePresets.Excited size={80} />
        </div>
        <h1 style={{ color: 'var(--primary-500)' }} className="text-3xl font-bold">
          Create New Password
        </h1>
        {maskedEmail && (
          <p className="text-text-muted mt-2 text-center">
            for <strong className="text-text-primary">{maskedEmail}</strong>
          </p>
        )}
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
              className="flex items-center gap-2 p-3 rounded-lg bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400"
            >
              <AlertCircle size={20} />
              <span className="text-sm">{error}</span>
            </motion.div>
          )}

          {/* New Password Input */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-text-secondary mb-1">
              New Password
            </label>
            <div className="relative">
              <Lock
                size={20}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
              />
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="w-full pl-10 pr-12 py-3 rounded-md border-2 border-[var(--border-color)] bg-bg-base text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:shadow-[var(--neo-shadow-sm)]"
                placeholder="Enter new password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Confirm Password Input */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-text-secondary mb-1">
              Confirm Password
            </label>
            <div className="relative">
              <Lock
                size={20}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
              />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="w-full pl-10 pr-12 py-3 rounded-md border-2 border-[var(--border-color)] bg-bg-base text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:shadow-[var(--neo-shadow-sm)]"
                placeholder="Confirm new password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Password Requirements */}
          <div className="space-y-2">
            {passwordRequirements.map((req, index) => (
              <div
                key={index}
                className={`flex items-center gap-2 text-sm ${
                  req.met ? 'text-success-600 dark:text-success-400' : 'text-text-muted'
                }`}
              >
                <CheckCircle size={16} className={req.met ? 'opacity-100' : 'opacity-30'} />
                <span>{req.text}</span>
              </div>
            ))}
          </div>

          {/* Submit Button */}
          <motion.button
            type="submit"
            disabled={isLoading || !allRequirementsMet}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{ backgroundColor: 'var(--primary-500)' }}
            className="w-full py-3 px-4 rounded-xl text-white font-semibold flex items-center justify-center gap-2 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Lock size={20} />
                Reset Password
              </>
            )}
          </motion.button>
        </form>

        {/* Back to Login Link */}
        <p className="text-center mt-6 text-text-muted">
          <Link
            to="/login"
            className="hover:opacity-80 font-medium flex items-center justify-center gap-1"
            style={{ color: 'var(--primary-500)' }}
          >
            <ArrowLeft size={16} />
            Back to Login
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

export default ResetPassword;
