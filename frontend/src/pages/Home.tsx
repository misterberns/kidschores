import { useQuery } from '@tanstack/react-query';
import { kidsApi } from '../api/client';
import type { Kid } from '../api/client';

function KidCard({ kid }: { kid: Kid }) {
  // Alternate colors for different kids
  const colors = [
    'from-pink-400 to-pink-600',
    'from-purple-400 to-purple-600',
    'from-blue-400 to-blue-600',
    'from-green-400 to-green-600',
  ];
  const colorIndex = kid.name.charCodeAt(0) % colors.length;

  return (
    <div className={`bg-gradient-to-br ${colors[colorIndex]} rounded-2xl p-6 text-white shadow-xl`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">{kid.name}</h2>
        <span className="text-3xl">
          {kid.name.toLowerCase().includes('stella') ? '👧🏻' : '👧🏼'}
        </span>
      </div>

      {/* Points Display */}
      <div className="bg-white/20 rounded-xl p-4 mb-4">
        <div className="text-center">
          <span className="text-5xl font-bold">{Math.floor(kid.points)}</span>
          <p className="text-lg opacity-90">⭐ Points</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="bg-white/20 rounded-lg p-3 text-center">
          <span className="text-2xl font-bold">{kid.completed_chores_today}</span>
          <p className="opacity-90">Today</p>
        </div>
        <div className="bg-white/20 rounded-lg p-3 text-center">
          <span className="text-2xl font-bold">{kid.overall_chore_streak}</span>
          <p className="opacity-90">🔥 Streak</p>
        </div>
      </div>

      {/* Badges */}
      {kid.badges && kid.badges.length > 0 && (
        <div className="mt-4">
          <p className="text-sm opacity-90 mb-2">Badges:</p>
          <div className="flex gap-2">
            {kid.badges.map((_badge, i) => (
              <span key={i} className="text-2xl">🏅</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function Home() {
  const { data: kids, isLoading, error } = useQuery({
    queryKey: ['kids'],
    queryFn: () => kidsApi.list().then(res => res.data),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-4xl animate-bounce">🌟</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 text-red-700 p-4 rounded-xl">
        <p className="font-bold">Oops! Something went wrong.</p>
        <p className="text-sm">Make sure the backend is running.</p>
      </div>
    );
  }

  if (!kids || kids.length === 0) {
    return (
      <div className="text-center py-12">
        <span className="text-6xl">👶</span>
        <h2 className="text-2xl font-bold mt-4 text-gray-700">No kids yet!</h2>
        <p className="text-gray-500 mt-2">
          Add kids from the Parent section to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-700 text-center">
        👋 Welcome back!
      </h2>

      <div className="grid gap-6">
        {kids.map((kid) => (
          <KidCard key={kid.id} kid={kid} />
        ))}
      </div>
    </div>
  );
}
