import { Skeleton, SkeletonButton } from './Skeleton';

/**
 * Skeleton loading state for ChoreCard component
 * Matches the layout of the actual chore card
 */
export function SkeletonChoreCard() {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-4">
        {/* Left side: icon and text */}
        <div className="flex items-center gap-3 flex-1">
          {/* Chore icon */}
          <Skeleton width={48} height={48} rounded="xl" className="flex-shrink-0" />

          {/* Chore name and assigned kids */}
          <div className="min-w-0 flex-1">
            <Skeleton width="60%" height={24} rounded="md" className="mb-2" />
            <Skeleton width="40%" height={16} rounded="sm" />
          </div>
        </div>

        {/* Right side: points */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <Skeleton width={18} height={18} rounded="full" />
          <Skeleton width={40} height={24} rounded="md" />
        </div>
      </div>

      {/* Status and action row */}
      <div className="mt-4 flex items-center justify-between">
        {/* Status badge */}
        <Skeleton width={80} height={28} rounded="full" />

        {/* Claim button */}
        <SkeletonButton width={100} />
      </div>
    </div>
  );
}

/**
 * Multiple skeleton chore cards for list loading state
 */
export function SkeletonChoreCardList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonChoreCard key={i} />
      ))}
    </div>
  );
}

export default SkeletonChoreCard;
