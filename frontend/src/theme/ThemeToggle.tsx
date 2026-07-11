import { useEffect, useRef, useState } from 'react';
import { Sun, Moon, Monitor, ChevronDown } from 'lucide-react';
import { useTheme, type ThemeMode } from './ThemeContext';

export function ThemeToggle() {
  const { mode, setMode, isDark } = useTheme();
  const [showMenu, setShowMenu] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  // Escape closes the menu and returns focus to the toggle
  useEffect(() => {
    if (!showMenu) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowMenu(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [showMenu]);

  const modeOptions: { value: ThemeMode; label: string; Icon: typeof Sun }[] = [
    { value: 'light', label: 'Light', Icon: Sun },
    { value: 'dark', label: 'Dark', Icon: Moon },
    { value: 'system', label: 'System', Icon: Monitor },
  ];

  return (
    <div className="relative">
      {/* Toggle Button */}
      <button
        ref={toggleRef}
        data-testid="theme-toggle-btn"
        onClick={() => setShowMenu(!showMenu)}
        aria-label="Theme settings"
        aria-haspopup="menu"
        aria-expanded={showMenu}
        className={`
          flex items-center gap-1.5 px-3 py-2 rounded-xl
          transition-all duration-200
          bg-bg-elevated hover:bg-bg-accent text-text-primary
          border border-bg-accent shadow-sm
          focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-500/40
        `}
        title="Theme settings"
      >
        {isDark ? <Moon size={18} /> : <Sun size={18} />}
        <ChevronDown size={14} className={`transition-transform ${showMenu ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {showMenu && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />

          {/* Menu */}
          <div
            data-testid="theme-menu"
            role="menu"
            aria-label="Theme settings"
            className="absolute right-0 top-full mt-2 z-50 rounded-2xl shadow-xl p-4 min-w-[220px] border fade-in border-bg-accent text-text-primary"
            style={{ backgroundColor: 'var(--bg-surface)' }}
          >
            {/* Mode Selection */}
            <div>
              <p className="text-xs font-semibold mb-2 text-text-muted">
                Appearance
              </p>
              <div className="flex gap-1 p-1 rounded-xl bg-bg-accent">
                {modeOptions.map((opt) => {
                  const IconComponent = opt.Icon;
                  return (
                    <button
                      key={opt.value}
                      data-testid={`theme-mode-${opt.value}`}
                      onClick={() => setMode(opt.value)}
                      className={`
                        flex-1 flex items-center justify-center gap-1.5
                        py-2 px-3 rounded-lg text-sm font-medium
                        transition-all duration-200
                        ${mode === opt.value
                          ? 'shadow-sm'
                          : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
                        }
                      `}
                      style={mode === opt.value ? { backgroundColor: 'var(--primary-500)', color: 'var(--text-inverse)' } : undefined}
                    >
                      <IconComponent size={16} />
                      <span className="hidden sm:inline">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
