import { Skeleton, SkeletonCircle } from './Skeleton';

/**
 * Skeleton loading state for KidCard component
 * Matches the layout of the actual kid card
 */
export function SkeletonKidCard() {
  return (
    <div className="bg-bg-accent rounded-2xl p-6 animate-pulse">
      {/* Header with name and avatar */}
      <div className="flex items-center justify-between mb-4">
        <Skeleton width={120} height={28} rounded="lg" />
        <SkeletonCircle size={40} />
      </div>

      {/* Points display */}
      <div className="bg-white/10 rounded-xl p-4 mb-4">
        <div className="text-center">
          <Skeleton width={80} height={48} rounded="lg" className="mx-auto mb-2" />
          <Skeleton width={60} height={20} rounded="md" className="mx-auto" />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/10 rounded-xl p-3 text-center">
          <Skeleton width={40} height={28} rounded="md" className="mx-auto mb-1" />
          <Skeleton width={50} height={16} rounded="sm" className="mx-auto" />
        </div>
        <div className="bg-white/10 rounded-xl p-3 text-center">
          <Skeleton width={40} height={28} rounded="md" className="mx-auto mb-1" />
          <Skeleton width={50} height={16} rounded="sm" className="mx-auto" />
        </div>
      </div>
    </div>
  );
}

/**
 * Multiple skeleton kid cards for list loading state
 */
export function SkeletonKidCardList({ count = 2 }: { count?: number }) {
  return (
    <div className="grid gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonKidCard key={i} />
      ))}
    </div>
  );
}

export default SkeletonKidCard;
