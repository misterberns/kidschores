import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { AlertCircle } from 'lucide-react';

export function GoogleCallback() {
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const code = searchParams.get('code');
    if (!code) {
      setError('No authorization code received from Google.');
      return;
    }

    loginWithGoogle(code)
      .then(() => navigate('/', { replace: true }))
      .catch((err: any) => {
        setError(
          err.response?.data?.detail || 'Google sign-in failed. Please try again.'
        );
      });
  }, [searchParams, loginWithGoogle, navigate]);

  if (error) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-4 bg-bg-base">
        <div className="w-full max-w-md bg-bg-surface rounded-md border-2 border-[var(--border-color)] shadow-[var(--neo-shadow)] p-6 text-center">
          <AlertCircle size={48} className="mx-auto mb-4 text-error-500" />
          <h2 className="text-xl font-bold text-text-primary mb-2">Sign-in Failed</h2>
          <p className="text-text-muted mb-4">{error}</p>
          <a
            href="/login"
            style={{ backgroundColor: 'var(--primary-500)' }}
            className="inline-block py-2 px-6 rounded-md border-2 border-[var(--border-color)] text-white font-bold uppercase tracking-wide text-sm shadow-[var(--neo-shadow-sm)] hover:-translate-y-0.5 hover:shadow-[5px_5px_0_var(--border-color)] transition-all"
          >
            Back to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-bg-base">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-text-muted">Signing in with Google...</p>
      </div>
    </div>
  );
}

export default GoogleCallback;
