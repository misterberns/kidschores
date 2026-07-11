import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, LogOut } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { ChorbiePresets } from '../components/mascot';
import { KidAvatar } from '../components/KidAvatar';

export function SelectKid() {
  const { user, kids, setActiveKid, logout, role, kidId } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  // Kid sessions skip selection — auto-redirect
  if (role === 'kid' && kidId) {
    navigate(from, { replace: true });
    return null;
  }

  const handleSelectKid = (kidId: string) => {
    setActiveKid(kidId);
    navigate(from, { replace: true });
  };

  const handleContinueAsParent = () => {
    setActiveKid(null);
    navigate(from, { replace: true });
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-4 bg-bg-base">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center mb-8"
      >
        <div className="w-20 h-20 mb-4">
          <ChorbiePresets.Welcome size={80} />
        </div>
        <h1 className="text-2xl font-bold text-text-primary">Who's using KidsChores?</h1>
        <p className="text-text-muted mt-2">
          Welcome, {user?.display_name || 'Parent'}!
        </p>
      </motion.div>

      {/* Profile Selection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="w-full max-w-md"
      >
        {kids.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 mb-6">
            {kids.map((kid) => (
              <motion.button
                key={kid.id}
                onClick={() => handleSelectKid(kid.id)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex flex-col items-center p-6 rounded-lg border border-[var(--border-color)] bg-bg-surface shadow-card hover:shadow-xl transition-shadow"
              >
                <KidAvatar kidId={kid.id} kidName={kid.name} size="lg" className="mb-3" />
                <span className="font-semibold text-text-primary">{kid.name}</span>
                <span className="text-sm text-text-muted">{kid.points} points</span>
              </motion.button>
            ))}
          </div>
        ) : (
          <div className="text-center p-6 rounded-lg border border-[var(--border-color)] bg-bg-surface shadow-card mb-6">
            <p className="text-text-muted">
              No kids added yet. Go to the Parent section to add kids.
            </p>
          </div>
        )}

        {/* Continue as Parent (hidden for kid sessions) */}
        {role === 'parent' && (
          <motion.button
            onClick={handleContinueAsParent}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{ borderColor: 'var(--primary-500)', color: 'var(--primary-500)' }}
            className="w-full py-4 px-4 rounded-xl bg-bg-surface border font-semibold flex items-center justify-center gap-2 hover:opacity-80 transition-colors"
          >
            <User size={20} />
            Continue as Parent
          </motion.button>
        )}

        {/* Logout */}
        <button
          onClick={logout}
          className="w-full mt-4 py-3 text-text-muted hover:text-error-500 flex items-center justify-center gap-2 transition-colors"
        >
          <LogOut size={18} />
          <span className="text-sm">Sign out</span>
        </button>
      </motion.div>
    </div>
  );
}

export default SelectKid;
