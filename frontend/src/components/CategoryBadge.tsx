/**
 * CategoryBadge - Display a chore category with icon and color.
 *
 * Contrast rule (v0.10.1, axe-gated): the stored category color is decorative
 * only — a tinted background and a color dot/border. TEXT always uses theme
 * tokens; raw seeded hexes as text color measured 2–2.9:1 on the dark theme.
 */
import type { ChoreCategory } from '../api/client';

interface CategoryBadgeProps {
  category: ChoreCategory | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
}

export function CategoryBadge({
  category,
  size = 'md',
  showName = true,
}: CategoryBadgeProps) {
  if (!category) return null;

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const iconSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium text-text-primary ${sizeClasses[size]}`}
      style={{
        backgroundColor: `${category.color}20`, // 20 = 12% opacity in hex
        border: `1px solid ${category.color}55`,
      }}
    >
      <span className={iconSizes[size]} aria-hidden="true">{category.icon}</span>
      {showName && <span>{category.name}</span>}
    </span>
  );
}

interface CategoryFilterProps {
  categories: ChoreCategory[];
  selected: string | null;
  onSelect: (categoryId: string | null) => void;
}

export function CategoryFilter({
  categories,
  selected,
  onSelect,
}: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onSelect(null)}
        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
          selected === null
            ? 'bg-primary-500'
            : 'bg-bg-accent text-text-secondary hover:bg-bg-accent/80'
        }`}
        style={selected === null ? { color: 'var(--text-inverse)' } : undefined}
      >
        All
      </button>
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onSelect(category.id)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1 text-text-primary ${
            selected === category.id ? '' : 'hover:opacity-80'
          }`}
          style={{
            backgroundColor: `${category.color}${selected === category.id ? '40' : '20'}`,
            border: `1px solid ${category.color}${selected === category.id ? '' : '55'}`,
          }}
        >
          <span aria-hidden="true">{category.icon}</span>
          <span>{category.name}</span>
          {category.chore_count !== undefined && (
            <span className="opacity-70">({category.chore_count})</span>
          )}
        </button>
      ))}
    </div>
  );
}

export default CategoryBadge;
