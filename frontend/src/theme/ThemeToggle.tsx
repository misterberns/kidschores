import { useState } from 'react';
import { Sun, Moon, Monitor, ChevronDown } from 'lucide-react';
import { useTheme, type ThemeMode } from './ThemeContext';
import { seasonalThemes, type SeasonalTheme } from './seasonal';

export function ThemeToggle() {
  const { mode, setMode, isDark, seasonal, setSeasonal } = useTheme();
  const [showMenu, setShowMenu] = useState(false);

  const modeOptions: { value: ThemeMode; label: string; Icon: typeof Sun }[] = [
    { value: 'light', label: 'Light', Icon: Sun },
    { value: 'dark', label: 'Dark', Icon: Moon },
    { value: 'system', label: 'System', Icon: Monitor },
  ];

  const seasonOptions = (Object.entries(seasonalThemes) as [SeasonalTheme, typeof seasonalThemes.default][]).map(
    ([key, theme]) => ({
      value: key as SeasonalTheme,
      label: theme.name,
      Icon: theme.icon,
      color: theme.iconColor,
    })
  );

  const currentSeasonTheme = seasonalThemes[seasonal];
  const SeasonIcon = currentSeasonTheme.icon;

  return (
    <div className="relative">
      {/* Toggle Button */}
      <button
        data-testid="theme-toggle-btn"
        onClick={() => setShowMenu(!showMenu)}
        className={`
          flex items-center gap-1.5 px-3 py-2 rounded-xl
          transition-all duration-200
          bg-bg-elevated hover:bg-bg-accent text-text-primary
          border border-bg-accent shadow-sm
        `}
        title="Theme settings"
      >
        {isDark ? <Moon size={18} /> : <Sun size={18} />}
        {seasonal !== 'default' && (
          <SeasonIcon size={16} style={{ color: currentSeasonTheme.iconColor }} />
        )}
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
            className="absolute right-0 top-full mt-2 z-50 rounded-2xl shadow-xl p-4 min-w-[240px] border fade-in border-bg-accent text-text-primary"
            style={{ backgroundColor: 'var(--bg-surface)' }}
          >
            {/* Mode Selection */}
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-wide mb-2 text-text-muted">
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
                      style={mode === opt.value ? { backgroundColor: 'var(--primary-500)', color: 'white' } : undefined}
                    >
                      <IconComponent size={16} />
                      <span className="hidden sm:inline">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Season Selection */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2 text-text-muted">
                Season
              </p>
              <div className="grid grid-cols-1 gap-1">
                {seasonOptions.map((opt) => {
                  const IconComponent = opt.Icon;
                  return (
                    <button
                      key={opt.value}
                      data-testid={`theme-season-${opt.value}`}
                      onClick={() => setSeasonal(opt.value)}
                      className={`
                        flex items-center gap-3 py-2.5 px-3 rounded-xl
                        text-sm font-medium transition-all duration-200
                        ${seasonal === opt.value
                          ? ''
                          : 'text-text-secondary hover:text-text-primary hover:bg-bg-accent'
                        }
                      `}
                      style={seasonal === opt.value ? { backgroundColor: 'var(--primary-500)', color: 'white' } : undefined}
                    >
                      <IconComponent
                        size={18}
                        style={{ color: seasonal === opt.value ? 'white' : opt.color }}
                      />
                      <span>{opt.label}</span>
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
