import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireKidSelection?: boolean;
}

export function ProtectedRoute({ children, requireKidSelection = false }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, activeKidId, kids } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-base">
        <div className="flex flex-col items-center gap-4">
          <div
            style={{ borderColor: 'var(--primary-500)', borderTopColor: 'transparent' }}
            className="w-12 h-12 border-4 rounded-full animate-spin"
          />
          <p className="text-text-muted">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If kid selection required and no kid selected, redirect to kid selector
  if (requireKidSelection && kids.length > 0 && !activeKidId) {
    return <Navigate to="/select-kid" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;
