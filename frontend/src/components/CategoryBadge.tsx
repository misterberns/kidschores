/**
 * CategoryBadge - Display a chore category with icon and color
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
      className={`inline-flex items-center gap-1 rounded-full font-medium ${sizeClasses[size]}`}
      style={{
        backgroundColor: `${category.color}20`, // 20 = 12% opacity in hex
        color: category.color,
      }}
    >
      <span className={iconSizes[size]}>{category.icon}</span>
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
            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
        }`}
        style={selected === null ? { color: 'var(--text-inverse)' } : undefined}
      >
        All
      </button>
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onSelect(category.id)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${
            selected === category.id
              ? ''
              : 'hover:opacity-80'
          }`}
          style={{
            backgroundColor: selected === category.id ? category.color : `${category.color}20`,
            color: selected === category.id ? 'var(--text-inverse)' : category.color,
          }}
        >
          <span>{category.icon}</span>
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
