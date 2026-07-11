import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { ICON_CATALOG } from '../data/icon-catalog';

interface IconPickerProps {
  value: string;
  onChange: (iconId: string) => void;
  label?: string;
}

/**
 * Curated lucide icon picker — replaces the free-text emoji input
 * (Midnight+Electric doctrine: line icons, no emoji as UI).
 * Searchable, keyboard navigable (radiogroup semantics), 48px touch targets.
 */
export function IconPicker({ value, onChange, label = 'Icon' }: IconPickerProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ICON_CATALOG;
    return ICON_CATALOG.filter(
      e => e.label.toLowerCase().includes(q) || e.keywords.includes(q) || e.id.includes(q)
    );
  }, [query]);

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-text-secondary">{label}</span>
        <div className="relative">
          <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-text-muted" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search icons"
            aria-label="Search icons"
            className="input !py-1 !pl-7 !pr-2 !text-xs w-36"
          />
        </div>
      </div>
      <div
        role="radiogroup"
        aria-label={label}
        className="grid grid-cols-6 gap-1.5 max-h-44 overflow-y-auto p-1 rounded-xl border border-border-primary bg-bg-base"
      >
        {filtered.map(entry => {
          const Icon = entry.Component;
          const selected = entry.id === value;
          return (
            <button
              key={entry.id}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={entry.label}
              title={entry.label}
              onClick={() => onChange(entry.id)}
              className={`touch-target flex items-center justify-center rounded-lg transition-colors
                ${selected
                  ? 'bg-primary-50 text-primary-500 ring-2 ring-primary-500'
                  : 'text-text-secondary hover:bg-bg-accent hover:text-text-primary'}`}
            >
              <Icon size={20} />
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="col-span-6 text-center text-xs text-text-muted py-3">
            No icons match "{query}"
          </p>
        )}
      </div>
    </div>
  );
}

export default IconPicker;
