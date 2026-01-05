import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, User, UserPlus, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { ChorbiePresets } from '../components/mascot';

export function Register() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  // Password validation
  const passwordChecks = [
    { label: 'At least 8 characters', valid: password.length >= 8 },
    { label: 'Contains a number', valid: /\d/.test(password) },
    { label: 'Passwords match', valid: password === confirmPassword && password.length > 0 },
  ];

  const isFormValid = passwordChecks.every((check) => check.valid) && email && displayName;

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
      await register(email, password, displayName);
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(
        err.response?.data?.detail || 'Registration failed. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-4 bg-bg-base">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center mb-6"
      >
        <div className="w-20 h-20 mb-4">
          <ChorbiePresets.Success size={80} />
        </div>
        <h1 style={{ color: 'var(--primary-500)' }} className="text-3xl font-bold">Join KidsChores</h1>
        <p className="text-text-muted mt-2">Create your family account</p>
      </motion.div>

      {/* Register Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="w-full max-w-md"
      >
        <form
          onSubmit={handleSubmit}
          className="bg-bg-surface rounded-2xl shadow-lg p-6 space-y-4"
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

          {/* Display Name Input */}
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-text-secondary mb-1">
              Your Name
            </label>
            <div className="relative">
              <User
                size={20}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
              />
              <input
                type="text"
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                autoComplete="name"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-bg-accent bg-bg-base text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Mom, Dad, etc."
              />
            </div>
          </div>

          {/* Email Input */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-1">
              Email
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
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-bg-accent bg-bg-base text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-text-secondary mb-1">
              Password
            </label>
            <div className="relative">
              <Lock
                size={20}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
              />
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-bg-accent bg-bg-base text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="••••••••"
              />
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
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-bg-accent bg-bg-base text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>
          </div>

          {/* Password Requirements */}
          {password.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-1"
            >
              {passwordChecks.map((check, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-2 text-sm ${
                    check.valid ? 'text-success-600' : 'text-text-muted'
                  }`}
                >
                  <CheckCircle size={16} className={check.valid ? 'opacity-100' : 'opacity-30'} />
                  <span>{check.label}</span>
                </div>
              ))}
            </motion.div>
          )}

          {/* Submit Button */}
          <motion.button
            type="submit"
            disabled={isLoading || !isFormValid}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{ backgroundColor: 'var(--primary-500)' }}
            className="w-full py-3 px-4 rounded-xl text-white font-semibold flex items-center justify-center gap-2 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <UserPlus size={20} />
                Create Account
              </>
            )}
          </motion.button>
        </form>

        {/* Login Link */}
        <p className="text-center mt-6 text-text-muted">
          Already have an account?{' '}
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

export default Register;
