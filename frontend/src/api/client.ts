import axios from 'axios';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Global error interceptor — auto-toast for network/server errors
// 401 is NOT toasted here (AuthContext handles token refresh)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      toast.error('Connection error', {
        description: 'Could not reach the server. Check your connection.',
      });
    } else if (error.response.status === 403) {
      toast.error('Access denied', {
        description: "You don't have permission for this action.",
      });
    } else if (error.response.status >= 500) {
      toast.error('Server error', {
        description: 'Something went wrong. Please try again.',
      });
    }
    return Promise.reject(error);
  }
);

// Types
export interface Kid {
  id: string;
  name: string;
  points: number;
  points_multiplier: number;
  overall_chore_streak: number;
  longest_streak_ever: number;
  streak_freeze_count: number;
  completed_chores_today: number;
  completed_chores_weekly: number;
  completed_chores_monthly: number;
  completed_chores_total: number;
  badges: string[];
  enable_notifications: boolean;
  google_email?: string;
  created_at: string;
}

export interface StreakInfo {
  overall_streak: number;
  longest_streak_ever: number;
  streak_freeze_count: number;
  chore_streaks: Record<string, number>;
  is_streak_at_risk: boolean;
  next_milestone?: number;
  days_to_next_milestone?: number;
}

export interface DailyProgress {
  kid_id: string;
  date: string;
  total_chores: number;
  completed_chores: number;
  completion_percentage: number;
  all_completed: boolean;
  bonus_eligible: boolean;
  bonus_awarded: boolean;
  bonus_points: number;
  multiplier: number;
}

export interface TodaysChore extends Chore {
  streak_count: number;
  is_recurring: boolean;
}

export interface Chore {
  id: string;
  name: string;
  description?: string;
  icon: string;
  default_points: number;
  assigned_kids: string[];
  shared_chore: boolean;
  recurring_frequency: string;
  custom_interval?: number;
  custom_interval_unit?: string;
  applicable_days?: number[]; // 0=Mon..6=Sun (Python weekday() convention — see utils/days.ts)
  due_date?: string;
  allow_multiple_claims_per_day: boolean;
  partial_allowed?: boolean;
  status?: string;
  claimed_by?: string;
  category_id?: string;
}

export interface Reward {
  id: string;
  name: string;
  description?: string;
  icon: string;
  cost: number;
  eligible_kids: string[];
  requires_approval: boolean;
}

export interface PendingChoreClaim {
  id: string;
  kid_id: string;
  chore_id: string;
  status: string;
  points_awarded: number | null;
  claimed_at: string;
  approved_at: string | null;
  approved_by: string | null;
}

export interface PendingRewardClaim {
  id: string;
  kid_id: string;
  reward_id: string;
  status: string;
  points_spent: number | null;
  requested_at: string;
  approved_at: string | null;
  approved_by: string | null;
}

export interface PendingApprovals {
  chores: PendingChoreClaim[];
  rewards: PendingRewardClaim[];
}

export interface Parent {
  id: string;
  name: string;
  // Write-only: `pin` is sent on create/update but is NEVER returned by the API
  // (ParentResponse omits it), so it is always undefined on reads. Do not render it.
  pin?: string;
  associated_kids: string[];
  enable_notifications: boolean;
  created_at: string;
}

// API Functions
export const kidsApi = {
  list: () => api.get<Kid[]>('/kids'),
  get: (id: string) => api.get<Kid>(`/kids/${id}`),
  create: (data: Partial<Kid>) => api.post<Kid>('/kids', data),
  update: (id: string, data: Partial<Kid>) => api.put<Kid>(`/kids/${id}`, data),
  delete: (id: string) => api.delete(`/kids/${id}`),
  adjustPoints: (id: string, points: number, reason?: string) =>
    api.post<Kid>(`/kids/${id}/points`, { points, ...(reason ? { reason } : {}) }),
  getStreaks: (id: string) => api.get<StreakInfo>(`/kids/${id}/streaks`),
  getDailyProgress: (id: string) => api.get<DailyProgress>(`/kids/${id}/daily-progress`),
  useStreakFreeze: (id: string) => api.post<Kid>(`/kids/${id}/streak-freeze`),
  linkGoogle: (id: string, email: string) =>
    api.put(`/kids/${id}/link-google`, { email }),
  unlinkGoogle: (id: string) =>
    api.delete(`/kids/${id}/link-google`),
};

export const choresApi = {
  list: () => api.get<Chore[]>('/chores'),
  get: (id: string) => api.get<Chore>(`/chores/${id}`),
  create: (data: Partial<Chore>) => api.post<Chore>('/chores', data),
  update: (id: string, data: Partial<Chore>) => api.put<Chore>(`/chores/${id}`, data),
  delete: (id: string) => api.delete(`/chores/${id}`),
  forKid: (kidId: string) => api.get<Chore[]>(`/chores/kid/${kidId}`),
  todayForKid: (kidId: string) => api.get<TodaysChore[]>(`/chores/today/${kidId}`),
  claim: (choreId: string, kidId: string) =>
    api.post(`/chores/${choreId}/claim`, { kid_id: kidId }),
  // kidId disambiguates which kid's claim to approve/deny on shared chores;
  // omitted, the backend acts on the oldest pending claim.
  approve: (choreId: string, parentName: string, points?: number, kidId?: string) =>
    api.post(`/chores/${choreId}/approve`, { parent_name: parentName, points_awarded: points, kid_id: kidId }),
  disapprove: (choreId: string, parentName: string, kidId?: string) =>
    api.post(`/chores/${choreId}/disapprove`, { parent_name: parentName, kid_id: kidId }),
};

export const rewardsApi = {
  list: () => api.get<Reward[]>('/rewards'),
  get: (id: string) => api.get<Reward>(`/rewards/${id}`),
  create: (data: Partial<Reward>) => api.post<Reward>('/rewards', data),
  update: (id: string, data: Partial<Reward>) => api.put<Reward>(`/rewards/${id}`, data),
  delete: (id: string) => api.delete(`/rewards/${id}`),
  redeem: (rewardId: string, kidId: string) =>
    api.post(`/rewards/${rewardId}/redeem`, { kid_id: kidId }),
  approve: (rewardId: string, parentName: string) =>
    api.post(`/rewards/${rewardId}/approve`, { parent_name: parentName }),
  disapprove: (rewardId: string, parentName: string) =>
    api.post(`/rewards/${rewardId}/disapprove`, { parent_name: parentName }),
};

export const approvalsApi = {
  pending: () => api.get<PendingApprovals>('/approvals/pending'),
  count: () => api.get<{ total: number }>('/approvals/pending/count'),
  history: (limit = 50) => api.get(`/approvals/history?limit=${limit}`),
};

export const parentsApi = {
  list: () => api.get<Parent[]>('/parents'),
  get: (id: string) => api.get<Parent>(`/parents/${id}`),
  create: (data: Partial<Parent> & { email?: string; send_invite?: boolean }) =>
    api.post<Parent>('/parents', data),
  update: (id: string, data: Partial<Parent>) => api.put<Parent>(`/parents/${id}`, data),
  delete: (id: string) => api.delete(`/parents/${id}`),
  verifyPin: (id: string, pin: string) => api.post(`/parents/${id}/verify-pin`, { pin }),
  invite: (parentId: string, email: string) =>
    api.post(`/parents/${parentId}/invite`, { email }),
};

// Notification types
export interface NotificationPreferences {
  email_chore_claimed: boolean;
  email_chore_approved: boolean;
  email_daily_summary: boolean;
  push_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
}

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  kid_id?: string;
}

// Category types
export interface ChoreCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  sort_order: number;
  chore_count?: number;
}

export const categoriesApi = {
  list: () => api.get<ChoreCategory[]>('/categories'),
  get: (id: string) => api.get<ChoreCategory>(`/categories/${id}`),
  create: (data: Partial<ChoreCategory>) => api.post<ChoreCategory>('/categories', data),
  update: (id: string, data: Partial<ChoreCategory>) =>
    api.put<ChoreCategory>(`/categories/${id}`, data),
  delete: (id: string) => api.delete(`/categories/${id}`),
  getPredefined: () => api.get<Partial<ChoreCategory>[]>('/categories/predefined'),
  seedDefaults: () => api.post('/categories/seed-defaults'),
  reorder: (id: string, newOrder: number) =>
    api.put(`/categories/${id}/reorder`, null, { params: { new_order: newOrder } }),
};

export const notificationsApi = {
  getVapidKey: () => api.get<{ public_key: string }>('/notifications/vapid-key'),
  subscribe: (subscription: PushSubscription) =>
    api.post('/notifications/subscribe', subscription),
  unsubscribe: (endpoint: string) =>
    api.delete('/notifications/unsubscribe', { params: { endpoint } }),
  sendTest: (endpoint: string) =>
    api.post('/notifications/test', null, { params: { endpoint } }),
  getPreferences: (userId: string) =>
    api.get<NotificationPreferences>(`/notifications/preferences/${userId}`),
  updatePreferences: (userId: string, prefs: Partial<NotificationPreferences>) =>
    api.put<NotificationPreferences>(`/notifications/preferences/${userId}`, prefs),
};

// Allowance types
export interface AllowanceSettings {
  id: string;
  kid_id: string;
  points_per_dollar: number;
  auto_payout: boolean;
  payout_day: number; // 0=Sunday, 6=Saturday
  minimum_payout: number;
  kid_points: number;
  dollar_equivalent: number;
}

export interface AllowancePayout {
  id: string;
  kid_id: string;
  points_converted: number;
  dollar_amount: number;
  payout_method: string;
  status: 'pending' | 'paid' | 'cancelled';
  notes?: string;
  requested_at: string;
  paid_at?: string;
  paid_by?: string;
}

export interface AllowanceSummary {
  kid_id: string;
  kid_name: string;
  current_points: number;
  dollar_equivalent: number;
  points_per_dollar: number;
  pending_payouts: number;
  pending_amount: number;
  total_paid: number;
  total_paid_count: number;
}

export const allowanceApi = {
  getSettings: (kidId: string) =>
    api.get<AllowanceSettings>(`/allowance/settings/${kidId}`),
  updateSettings: (kidId: string, data: Partial<AllowanceSettings>) =>
    api.put<AllowanceSettings>(`/allowance/settings/${kidId}`, data),
  requestPayout: (kidId: string, data: { points_to_convert: number; payout_method?: string; notes?: string }) =>
    api.post<AllowancePayout>(`/allowance/convert/${kidId}`, data),
  getPayouts: (kidId: string, status?: string) =>
    api.get<AllowancePayout[]>(`/allowance/payouts/${kidId}`, { params: status ? { status } : {} }),
  getAllPending: () =>
    api.get<AllowancePayout[]>('/allowance/pending'),
  markPaid: (payoutId: string, data: { paid_by: string; notes?: string }) =>
    api.post<AllowancePayout>(`/allowance/payouts/${payoutId}/pay`, data),
  cancelPayout: (payoutId: string) =>
    api.post<AllowancePayout>(`/allowance/payouts/${payoutId}/cancel`),
  getSummary: (kidId: string) =>
    api.get<AllowanceSummary>(`/allowance/summary/${kidId}`),
};

// History types
export interface HistoryItem {
  id: string;
  chore_id: string;
  chore_name: string;
  chore_icon: string;
  category_name?: string;
  category_color?: string;
  status: string;
  points_awarded?: number;
  claimed_at: string;
  approved_at?: string;
  approved_by?: string;
  notes?: string;
}

export interface HistoryResponse {
  items: HistoryItem[];
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
}

export interface DailyStats {
  date: string;
  completed: number;
  total_points: number;
}

export interface CategoryStats {
  category_id?: string;
  category_name: string;
  category_color: string;
  count: number;
  points: number;
}

export interface Analytics {
  kid_id: string;
  kid_name: string;
  total_chores_completed: number;
  total_points_earned: number;
  average_points_per_chore: number;
  chores_today: number;
  chores_this_week: number;
  chores_this_month: number;
  points_today: number;
  points_this_week: number;
  points_this_month: number;
  current_streak: number;
  longest_streak: number;
  daily_stats: DailyStats[];
  category_stats: CategoryStats[];
  top_chores: Array<{ chore_id: string; chore_name: string; chore_icon: string; count: number; points: number }>;
}

export const historyApi = {
  getHistory: (kidId: string, params?: { page?: number; per_page?: number; status?: string; category_id?: string }) =>
    api.get<HistoryResponse>(`/history/${kidId}`, { params }),
  getAnalytics: (kidId: string, days?: number) =>
    api.get<Analytics>(`/history/stats/${kidId}`, { params: days ? { days } : {} }),
  exportCsv: (kidId: string) =>
    api.get(`/history/export/${kidId}`, { responseType: 'blob' }),
};

// --- Badges & Challenges (gamification engine) ---

export interface BadgeInfo {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  threshold_type: string;
  threshold_value: number;
  points_multiplier_bonus: number;
}

export interface ChallengeProgressEntry {
  kid_id: string;
  kid_name: string;
  progress: number;
  target: number;
  completed: boolean;
}

export interface Challenge {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  target_type: 'chore_count' | 'points_earned';
  target_value: number;
  start_date: string;
  end_date: string;
  kid_ids: string[];
  badge_id: string | null;
  bonus_points: number;
  completed_kids: string[];
  active: boolean;
  progress: ChallengeProgressEntry[];
}

export interface ChallengeTemplate {
  name: string;
  description: string;
  icon: string;
  target_type: 'chore_count' | 'points_earned';
  target_value: number;
  start_date: string;
  end_date: string;
  badge_id?: string;
  bonus_points: number;
}

export const badgesApi = {
  list: () => api.get<BadgeInfo[]>('/badges'),
  award: (badgeId: string, kidId: string) => api.post(`/badges/${badgeId}/award/${kidId}`),
};

export const challengesApi = {
  list: (activeOnly = false) =>
    api.get<Challenge[]>('/challenges', { params: activeOnly ? { active_only: true } : {} }),
  templates: () => api.get<ChallengeTemplate[]>('/challenges/templates'),
  create: (data: Omit<ChallengeTemplate, never> & { kid_ids?: string[] }) =>
    api.post<Challenge>('/challenges', data),
  delete: (id: string) => api.delete(`/challenges/${id}`),
};

// Savings goals (v0.16.0) — denominated in points, rendered as $ via the
// points_per_dollar carried on the list response
export interface SavingsGoalBase {
  id: string;
  kid_id: string;
  name: string;
  icon: string;
  target_points: number;
  target_date: string | null;
  status: 'active' | 'completed';
  payout_id: string | null;
  completed_at: string | null;
  created_at: string;
}

// List items carry server-derived live progress
export interface SavingsGoal extends SavingsGoalBase {
  progress_pct: number; // clamped 0-100
  reached: boolean;     // active && balance >= target
}

export interface GoalsListResponse {
  kid_id: string;
  current_points: number;
  points_per_dollar: number;
  goals: SavingsGoal[];
}

export interface GoalConvertResponse {
  goal: SavingsGoalBase;
  payout: AllowancePayout;
}

export const goalsApi = {
  list: (kidId: string) => api.get<GoalsListResponse>(`/goals/${kidId}`),
  create: (kidId: string, data: { name: string; icon?: string; target_points: number; target_date?: string | null }) =>
    api.post<SavingsGoalBase>(`/goals/${kidId}`, data),
  update: (kidId: string, goalId: string, data: Partial<{ name: string; icon: string; target_points: number; target_date: string | null }>) =>
    api.put<SavingsGoalBase>(`/goals/${kidId}/${goalId}`, data),
  delete: (kidId: string, goalId: string) => api.delete(`/goals/${kidId}/${goalId}`),
  convert: (kidId: string, goalId: string, payoutMethod = 'cash') =>
    api.post<GoalConvertResponse>(`/goals/${kidId}/${goalId}/convert`, { payout_method: payoutMethod }),
};
