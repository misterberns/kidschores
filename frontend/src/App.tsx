import { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Home as HomeIcon, ClipboardList, Gift, Users, LogOut, Bell, Wallet, History as HistoryIcon } from 'lucide-react';
import { lazyWithRetry } from './utils/lazyWithRetry';
import { createQueryClient } from './queryClient';
import { AuthProvider, useAuth, ProtectedRoute } from './auth';
import { ThemeProvider, ThemeToggle } from './theme';
import { useReducedMotion } from './hooks/useReducedMotion';
import { pageVariants } from './utils/animations';
import { Logo } from './components/Logo';
import { ToastProvider } from './components/notifications/ToastProvider';
import ErrorBoundary from './components/ErrorBoundary';

// Route pages are code-split (v0.15.1): each loads on demand behind Suspense,
// via lazyWithRetry (reload-once on a stale post-deploy chunk hash, then the
// ErrorBoundary). Pages are imported NOWHERE else — keep it that way or the
// static import folds the page back into the entry chunk (contract-tested).
const Home = lazyWithRetry(() => import('./pages/Home').then(m => ({ default: m.Home })));
const Chores = lazyWithRetry(() => import('./pages/Chores').then(m => ({ default: m.Chores })));
const Rewards = lazyWithRetry(() => import('./pages/Rewards').then(m => ({ default: m.Rewards })));
const Admin = lazyWithRetry(() => import('./pages/Admin').then(m => ({ default: m.Admin })));
const Login = lazyWithRetry(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Register = lazyWithRetry(() => import('./pages/Register').then(m => ({ default: m.Register })));
const ForgotPassword = lazyWithRetry(() => import('./pages/ForgotPassword').then(m => ({ default: m.ForgotPassword })));
const ResetPassword = lazyWithRetry(() => import('./pages/ResetPassword').then(m => ({ default: m.ResetPassword })));
const AcceptInvitation = lazyWithRetry(() => import('./pages/AcceptInvitation').then(m => ({ default: m.AcceptInvitation })));
const GoogleCallback = lazyWithRetry(() => import('./pages/GoogleCallback').then(m => ({ default: m.GoogleCallback })));
const SelectKid = lazyWithRetry(() => import('./pages/SelectKid').then(m => ({ default: m.SelectKid })));
const NotificationSettings = lazyWithRetry(() => import('./pages/NotificationSettings'));
const Allowance = lazyWithRetry(() => import('./pages/Allowance').then(m => ({ default: m.Allowance })));
const History = lazyWithRetry(() => import('./pages/History').then(m => ({ default: m.History })));
const Help = lazyWithRetry(() => import('./pages/Help'));
const Onboarding = lazyWithRetry(() => import('./pages/Onboarding').then(m => ({ default: m.Onboarding })));

/** Full-screen spinner — the Suspense fallback while a page chunk loads
 *  (same visual as the auth-loading state). */
function PageSpinner() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

const queryClient = createQueryClient();

function NavBar() {
  const location = useLocation();
  const prefersReducedMotion = useReducedMotion();
  const { role } = useAuth();

  const allNavItems = [
    { path: '/', icon: HomeIcon, label: 'Home', testId: 'nav-home' },
    { path: '/chores', icon: ClipboardList, label: 'Chores', testId: 'nav-chores' },
    { path: '/rewards', icon: Gift, label: 'Rewards', testId: 'nav-rewards' },
    { path: '/allowance', icon: Wallet, label: 'Allowance', testId: 'nav-allowance' },
    { path: '/history', icon: HistoryIcon, label: 'History', testId: 'nav-history' },
    { path: '/admin', icon: Users, label: 'Parent', testId: 'nav-admin' },
  ];

  // Hide Parent tab for kid sessions
  const navItems = role === 'kid' ? allNavItems.filter(item => item.path !== '/admin') : allNavItems;

  const activeIndex = navItems.findIndex(item => item.path === location.pathname);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 border-t-2 border-[var(--border-color)] transition-colors duration-200 bg-bg-surface z-50"
      style={{
        isolation: 'isolate',
        backgroundColor: 'var(--bg-surface)',
      }}
    >
      <div className="flex justify-around items-center h-16 relative">
        {/* Animated indicator - green dot above active item */}
        {!prefersReducedMotion && activeIndex >= 0 && (
          <motion.div
            style={{ backgroundColor: 'var(--primary-500)', left: `calc(${(activeIndex + 0.5) * (100 / navItems.length)}% - 3px)` }}
            className="absolute top-1 h-1.5 w-1.5 rounded-full"
            initial={false}
            animate={{ left: `calc(${(activeIndex + 0.5) * (100 / navItems.length)}% - 3px)` }}
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
          />
        )}
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              data-testid={item.testId}
              aria-current={isActive ? 'page' : undefined}
              className="flex flex-col items-center justify-center w-full h-full touch-target transition-colors duration-200 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-500/40 rounded-lg"
            >
              <motion.div
                style={isActive ? { backgroundColor: 'var(--primary-100)' } : undefined}
                className="p-2 rounded-xl transition-colors duration-200"
                whileHover={prefersReducedMotion ? {} : { scale: 1.1 }}
                whileTap={prefersReducedMotion ? {} : { scale: 0.9 }}
              >
                <Icon
                  size={24}
                  style={isActive ? { color: 'var(--primary-500)' } : undefined}
                  className={isActive ? '' : 'text-text-muted'}
                />
              </motion.div>
              <span
                style={isActive ? { color: 'var(--primary-500)' } : undefined}
                className={`text-xs font-bold mt-0.5 ${isActive ? '' : 'text-text-muted'}`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  const prefersReducedMotion = useReducedMotion();
  const { role } = useAuth();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        variants={prefersReducedMotion ? undefined : pageVariants}
        initial={prefersReducedMotion ? false : 'initial'}
        animate="animate"
        exit={prefersReducedMotion ? undefined : 'exit'}
      >
        {/* Suspense INSIDE the motion.div: a suspending lazy page swaps to the
            spinner without unmounting the AnimatePresence tree. */}
        <Suspense fallback={<PageSpinner />}>
          <Routes location={location}>
            <Route path="/" element={<Home />} />
            <Route path="/chores" element={<Chores />} />
            <Route path="/rewards" element={<Rewards />} />
            <Route path="/allowance" element={<Allowance />} />
            <Route path="/history" element={<History />} />
            {role === 'parent' && <Route path="/admin" element={<Admin />} />}
            {role === 'parent' && <Route path="/onboarding" element={<Onboarding />} />}
            <Route path="/notifications" element={<NotificationSettings />} />
            <Route path="/help" element={<Help />} />
          </Routes>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
}

// Auth-aware routing wrapper
function AppRoutes() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-bg-base">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-text-muted">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-[100dvh] flex items-center justify-center bg-bg-base">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
    <Routes location={location}>
      {/* Public routes */}
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        path="/register"
        element={isAuthenticated ? <Navigate to="/" replace /> : <Register />}
      />
      <Route
        path="/forgot-password"
        element={isAuthenticated ? <Navigate to="/" replace /> : <ForgotPassword />}
      />
      <Route
        path="/reset-password"
        element={isAuthenticated ? <Navigate to="/" replace /> : <ResetPassword />}
      />
      <Route
        path="/accept-invitation"
        element={isAuthenticated ? <Navigate to="/" replace /> : <AcceptInvitation />}
      />
      <Route
        path="/auth/google/callback"
        element={<GoogleCallback />}
      />

      {/* Kid selector (authenticated but before main app) */}
      <Route
        path="/select-kid"
        element={
          <ProtectedRoute>
            <SelectKid />
          </ProtectedRoute>
        }
      />

      {/* Protected routes - main app */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppContent />
          </ProtectedRoute>
        }
      />
    </Routes>
    </Suspense>
  );
}

function AppContent() {
  const { user, activeKidId, kids, logout } = useAuth();

  // Find active kid name if selected
  const activeKid = kids.find((k) => k.id === activeKidId);

  return (
    <div className="min-h-[100dvh] pb-20 transition-colors duration-200 bg-bg-base">
      {/* Electric accent hairline at top */}
      <div className="h-1.5 bg-primary-500" />

      {/* Header */}
      <header className="p-4 transition-colors duration-200 bg-bg-surface border-b-2 border-[var(--border-color)]">
        <div className="flex items-center justify-between max-w-4xl lg:max-w-6xl mx-auto">
          {/* User indicator */}
          <Link
            to="/select-kid"
            className="flex items-center gap-2 text-sm text-text-muted hover:opacity-80 transition-colors"
          >
            <div
              style={{ backgroundColor: 'var(--primary-500)' }}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
            >
              {activeKid ? activeKid.name.charAt(0).toUpperCase() : user?.display_name?.charAt(0)?.toUpperCase() || 'P'}
            </div>
            <span className="hidden sm:inline">
              {activeKid ? activeKid.name : user?.display_name || 'Parent'}
            </span>
          </Link>

          <h1 className="text-2xl font-bold text-center flex items-center gap-2">
            <Logo variant="horizontal" size={180} alt="KidsChores" />
          </h1>

          <div className="flex items-center gap-2">
            <Link
              to="/notifications"
              aria-label="Notification settings"
              className="p-2 rounded-lg hover:bg-bg-accent text-text-muted hover:text-primary-500 transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-500/40"
              title="Notification settings"
            >
              <Bell size={18} />
            </Link>
            <ThemeToggle />
            <button
              onClick={logout}
              aria-label="Sign out"
              className="p-2 rounded-lg hover:bg-bg-accent text-text-muted hover:text-error-500 transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-500/40"
              title="Sign out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content with Page Transitions — wider on desktop (UX-REVIEW §4.5) */}
      <main className="p-4 md:p-6 max-w-4xl lg:max-w-6xl mx-auto">
        <AnimatedRoutes />
      </main>

      {/* Bottom Navigation */}
      <NavBar />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ToastProvider />
          <BrowserRouter>
            <AuthProvider>
              <AppRoutes />
            </AuthProvider>
          </BrowserRouter>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
