import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  History as HistoryIcon,
  BarChart3,
  List,
  Calendar,
  Star,
  Flame,
  Trophy,
  Download,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react';
import { kidsApi, historyApi } from '../api/client';
import type { HistoryItem, Analytics } from '../api/client';
import { useReducedMotion } from '../hooks/useReducedMotion';

type ViewMode = 'stats' | 'list' | 'calendar';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function StatCard({
  title,
  value,
  subValue,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  subValue?: string;
  icon: any;
  color: string;
}) {
  return (
    <motion.div
      className="card p-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon size={20} style={{ color }} />
        </div>
        <div>
          <p className="text-2xl font-bold text-text-primary">{value}</p>
          <p className="text-sm text-text-muted">{title}</p>
          {subValue && (
            <p className="text-xs text-text-secondary">{subValue}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function HistoryItemCard({ item }: { item: HistoryItem }) {
  const statusColors = {
    approved: 'text-green-500',
    claimed: 'text-yellow-500',
    pending: 'text-blue-500',
    disapproved: 'text-red-500',
    expired: 'text-gray-400',
  };

  const statusIcons = {
    approved: CheckCircle2,
    claimed: Clock,
    pending: Clock,
    disapproved: XCircle,
    expired: XCircle,
  };

  const StatusIcon = statusIcons[item.status as keyof typeof statusIcons] || Clock;

  return (
    <motion.div
      className="card p-4"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-bg-accent rounded-lg flex items-center justify-center text-xl">
          {item.chore_icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-text-primary truncate">{item.chore_name}</p>
            {item.category_name && (
              <span
                className="px-2 py-0.5 rounded-full text-xs"
                style={{
                  backgroundColor: `${item.category_color}20`,
                  color: item.category_color,
                }}
              >
                {item.category_name}
              </span>
            )}
          </div>
          <p className="text-sm text-text-secondary">
            {formatDate(item.claimed_at)}
            {item.approved_by && ` · Approved by ${item.approved_by}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {item.points_awarded && (
            <span className="flex items-center gap-1 text-accent-500 font-medium">
              <Star size={14} fill="currentColor" />
              +{item.points_awarded}
            </span>
          )}
          <StatusIcon
            size={18}
            className={statusColors[item.status as keyof typeof statusColors] || 'text-gray-400'}
          />
        </div>
      </div>
    </motion.div>
  );
}

function CompletionChart({ dailyStats }: { dailyStats: Analytics['daily_stats'] }) {
  const maxCompleted = Math.max(...dailyStats.map(d => d.completed), 1);
  const last14Days = dailyStats.slice(-14);

  return (
    <div className="card p-4">
      <h3 className="font-bold text-text-primary mb-4 flex items-center gap-2">
        <BarChart3 size={18} className="text-primary-500" />
        Daily Completions (Last 14 Days)
      </h3>
      <div className="flex items-end gap-1 h-32">
        {last14Days.map((day, i) => (
          <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
            <motion.div
              className="w-full bg-primary-500 rounded-t"
              initial={{ height: 0 }}
              animate={{ height: `${(day.completed / maxCompleted) * 100}%` }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              style={{ minHeight: day.completed > 0 ? 4 : 0 }}
            />
            <span className="text-xs text-text-muted rotate-45 origin-left">
              {new Date(day.date).getDate()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CategoryChart({ categoryStats }: { categoryStats: Analytics['category_stats'] }) {
  const total = categoryStats.reduce((sum, c) => sum + c.count, 0) || 1;

  return (
    <div className="card p-4">
      <h3 className="font-bold text-text-primary mb-4">By Category</h3>
      <div className="space-y-3">
        {categoryStats.map((cat) => (
          <div key={cat.category_id || 'uncategorized'}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-text-primary">{cat.category_name}</span>
              <span className="text-text-muted">{cat.count} chores</span>
            </div>
            <div className="h-2 bg-bg-accent rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: cat.category_color }}
                initial={{ width: 0 }}
                animate={{ width: `${(cat.count / total) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CalendarView({ dailyStats }: { dailyStats: Analytics['daily_stats'] }) {
  const [monthOffset, setMonthOffset] = useState(0);

  const { weeks, monthName, year } = useMemo(() => {
    const today = new Date();
    const targetDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    const monthName = targetDate.toLocaleDateString('en-US', { month: 'long' });

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Build lookup of completions by date
    const completionMap = new Map(
      dailyStats.map(d => [d.date, d.completed])
    );

    // Build weeks array
    const weeks: Array<Array<{ date: number; completed: number } | null>> = [];
    let currentWeek: Array<{ date: number; completed: number } | null> = [];

    // Fill in empty days at start
    for (let i = 0; i < firstDay.getDay(); i++) {
      currentWeek.push(null);
    }

    // Fill in days
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const completed = completionMap.get(dateStr) || 0;
      currentWeek.push({ date: day, completed });

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    // Fill in remaining days
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeks.push(currentWeek);
    }

    return { weeks, monthName, year };
  }, [monthOffset, dailyStats]);

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setMonthOffset(m => m - 1)}
          className="p-2 rounded-lg hover:bg-bg-accent"
        >
          <ChevronLeft size={20} className="text-text-muted" />
        </button>
        <h3 className="font-bold text-text-primary">
          {monthName} {year}
        </h3>
        <button
          onClick={() => setMonthOffset(m => m + 1)}
          disabled={monthOffset >= 0}
          className="p-2 rounded-lg hover:bg-bg-accent disabled:opacity-50"
        >
          <ChevronRight size={20} className="text-text-muted" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
          <span key={i} className="text-xs text-text-muted font-medium">
            {day}
          </span>
        ))}
      </div>

      <div className="space-y-1">
        {weeks.map((week, i) => (
          <div key={i} className="grid grid-cols-7 gap-1">
            {week.map((day, j) => (
              <div
                key={j}
                className={`aspect-square rounded-lg flex items-center justify-center text-sm ${
                  day
                    ? day.completed > 0
                      ? 'bg-primary-500 font-medium'
                      : 'bg-bg-accent text-text-secondary'
                    : ''
                }`}
                style={day && day.completed > 0 ? { color: 'var(--text-inverse)' } : undefined}
              >
                {day?.date}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-4 text-xs text-text-muted">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-primary-500" />
          <span>Completed chores</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-bg-accent" />
          <span>No activity</span>
        </div>
      </div>
    </div>
  );
}

export function History() {
  const prefersReducedMotion = useReducedMotion();
  const [selectedKid, setSelectedKid] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('stats');
  const [page, setPage] = useState(1);

  // Fetch kids
  const { data: kids = [] } = useQuery({
    queryKey: ['kids'],
    queryFn: () => kidsApi.list().then(res => res.data),
  });

  const activeKid = selectedKid ? kids.find(k => k.id === selectedKid) : kids[0];
  const activeKidId = activeKid?.id;

  // Fetch analytics
  const { data: analytics } = useQuery({
    queryKey: ['analytics', activeKidId],
    queryFn: () => activeKidId ? historyApi.getAnalytics(activeKidId, 60).then(res => res.data) : null,
    enabled: !!activeKidId,
  });

  // Fetch history
  const { data: history, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['history', activeKidId, page],
    queryFn: () => activeKidId ? historyApi.getHistory(activeKidId, { page, per_page: 20 }).then(res => res.data) : null,
    enabled: !!activeKidId && viewMode === 'list',
  });

  const handleExport = async () => {
    if (!activeKidId) return;
    try {
      const response = await historyApi.exportCsv(activeKidId);
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeKid?.name || 'kid'}_chore_history.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  if (!activeKid) {
    return (
      <div className="text-center py-12">
        <HistoryIcon size={48} className="mx-auto text-text-muted mb-4" />
        <h2 className="text-xl font-bold text-text-primary">No Kids Yet</h2>
        <p className="text-text-secondary mt-2">Add kids from the Parent section to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2 text-text-primary">
          <HistoryIcon size={24} className="text-primary-500" />
          History & Stats
        </h2>
        <button
          onClick={handleExport}
          className="btn bg-bg-accent text-text-secondary hover:bg-bg-elevated"
        >
          <Download size={18} />
          <span className="hidden sm:inline">Export</span>
        </button>
      </div>

      {/* Kid selector */}
      {kids.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {kids.map(kid => (
            <motion.button
              key={kid.id}
              onClick={() => {
                setSelectedKid(kid.id);
                setPage(1);
              }}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeKidId === kid.id
                  ? 'bg-primary-500'
                  : 'bg-bg-accent text-text-secondary hover:bg-bg-elevated'
              }`}
              style={activeKidId === kid.id ? { color: 'var(--text-inverse)' } : undefined}
              whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
              whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
            >
              {kid.name}
            </motion.button>
          ))}
        </div>
      )}

      {/* View toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setViewMode('stats')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            viewMode === 'stats'
              ? 'bg-primary-500'
              : 'bg-bg-accent text-text-secondary hover:bg-bg-elevated'
          }`}
          style={viewMode === 'stats' ? { color: 'var(--text-inverse)' } : undefined}
        >
          <BarChart3 size={16} />
          Stats
        </button>
        <button
          onClick={() => setViewMode('calendar')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            viewMode === 'calendar'
              ? 'bg-primary-500'
              : 'bg-bg-accent text-text-secondary hover:bg-bg-elevated'
          }`}
          style={viewMode === 'calendar' ? { color: 'var(--text-inverse)' } : undefined}
        >
          <Calendar size={16} />
          Calendar
        </button>
        <button
          onClick={() => setViewMode('list')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            viewMode === 'list'
              ? 'bg-primary-500'
              : 'bg-bg-accent text-text-secondary hover:bg-bg-elevated'
          }`}
          style={viewMode === 'list' ? { color: 'var(--text-inverse)' } : undefined}
        >
          <List size={16} />
          List
        </button>
      </div>

      {/* Stats View */}
      {viewMode === 'stats' && analytics && (
        <div className="space-y-4">
          {/* Summary stats */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              title="Total Completed"
              value={analytics.total_chores_completed}
              subValue="all time"
              icon={CheckCircle2}
              color="#10b981"
            />
            <StatCard
              title="Total Points"
              value={Math.floor(analytics.total_points_earned)}
              subValue={`${analytics.average_points_per_chore} avg`}
              icon={Star}
              color="#f59e0b"
            />
            <StatCard
              title="Current Streak"
              value={analytics.current_streak}
              subValue={`Best: ${analytics.longest_streak}`}
              icon={Flame}
              color="#f97316"
            />
            <StatCard
              title="This Week"
              value={analytics.chores_this_week}
              subValue={`+${Math.floor(analytics.points_this_week)} pts`}
              icon={Trophy}
              color="#8b5cf6"
            />
          </div>

          {/* Charts */}
          <CompletionChart dailyStats={analytics.daily_stats} />
          <CategoryChart categoryStats={analytics.category_stats} />

          {/* Top Chores */}
          {analytics.top_chores.length > 0 && (
            <div className="card p-4">
              <h3 className="font-bold text-text-primary mb-4">Top Chores</h3>
              <div className="space-y-2">
                {analytics.top_chores.map((chore, i) => (
                  <div key={chore.chore_id} className="flex items-center gap-3">
                    <span className="text-lg font-bold text-text-muted w-6">{i + 1}</span>
                    <span className="text-xl">{chore.chore_icon}</span>
                    <div className="flex-1">
                      <p className="font-medium text-text-primary">{chore.chore_name}</p>
                      <p className="text-sm text-text-muted">{chore.count} times</p>
                    </div>
                    <span className="flex items-center gap-1 text-accent-500">
                      <Star size={14} fill="currentColor" />
                      {chore.points}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Calendar View */}
      {viewMode === 'calendar' && analytics && (
        <CalendarView dailyStats={analytics.daily_stats} />
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="space-y-3">
          {isLoadingHistory ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="card p-4 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-bg-accent rounded-lg" />
                    <div className="flex-1">
                      <div className="h-4 bg-bg-accent rounded w-32 mb-2" />
                      <div className="h-3 bg-bg-accent rounded w-24" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : history && history.items.length > 0 ? (
            <>
              {history.items.map(item => (
                <HistoryItemCard key={item.id} item={item} />
              ))}

              {/* Pagination */}
              <div className="flex items-center justify-between pt-4">
                <button
                  onClick={() => setPage(p => p - 1)}
                  disabled={page === 1}
                  className="btn bg-bg-accent text-text-secondary hover:bg-bg-elevated disabled:opacity-50"
                >
                  <ChevronLeft size={18} />
                  Previous
                </button>
                <span className="text-sm text-text-muted">
                  Page {history.page} of {Math.ceil(history.total / history.per_page)}
                </span>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={!history.has_more}
                  className="btn bg-bg-accent text-text-secondary hover:bg-bg-elevated disabled:opacity-50"
                >
                  Next
                  <ChevronRight size={18} />
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <HistoryIcon size={48} className="mx-auto text-text-muted mb-4" />
              <p className="text-text-secondary">No history yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
