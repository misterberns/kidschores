import { toast } from 'sonner';
import { CheckCircle2, XCircle, AlertTriangle, Info, Star, Flame, Gift, Trophy } from 'lucide-react';
import { createElement } from 'react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastOptions {
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function useToast() {
  const showToast = (type: ToastType, message: string, options?: ToastOptions) => {
    const icons = {
      success: CheckCircle2,
      error: XCircle,
      warning: AlertTriangle,
      info: Info,
    };

    toast[type](message, {
      description: options?.description,
      duration: options?.duration,
      action: options?.action ? {
        label: options.action.label,
        onClick: options.action.onClick,
      } : undefined,
      icon: createElement(icons[type], { size: 18 }),
    });
  };

  // Chore-specific toasts
  const choreClaimed = (choreName: string, points: number) => {
    toast.success(`Claimed: ${choreName}`, {
      description: `+${points} points pending approval`,
      icon: createElement(Star, { size: 18, fill: 'currentColor' }),
    });
  };

  const choreApproved = (choreName: string, points: number) => {
    toast.success(`Approved: ${choreName}`, {
      description: `You earned ${points} points!`,
      icon: createElement(CheckCircle2, { size: 18 }),
    });
  };

  const choreDenied = (choreName: string) => {
    toast.error(`Denied: ${choreName}`, {
      description: 'Try again tomorrow!',
      icon: createElement(XCircle, { size: 18 }),
    });
  };

  // Streak-specific toasts
  const streakMilestone = (days: number) => {
    const milestoneMessages: Record<number, string> = {
      3: 'Great start! Keep it going!',
      7: 'One week strong!',
      14: 'Two weeks of consistency!',
      30: 'A whole month! Amazing!',
      50: 'Halfway to 100!',
      100: 'LEGENDARY! 100 days!',
      365: 'ONE YEAR CHAMPION!',
    };

    toast.success(`${days} Day Streak!`, {
      description: milestoneMessages[days] || `${days} days in a row!`,
      icon: createElement(Flame, { size: 18 }),
      duration: 5000,
    });
  };

  const streakAtRisk = () => {
    toast.warning('Streak at Risk!', {
      description: 'Complete a chore today to keep your streak going!',
      icon: createElement(AlertTriangle, { size: 18 }),
      duration: 6000,
    });
  };

  const streakLost = (previousStreak: number) => {
    toast.error('Streak Lost', {
      description: `Your ${previousStreak}-day streak has been reset.`,
      icon: createElement(Flame, { size: 18 }),
    });
  };

  const streakFreezeUsed = () => {
    toast.info('Streak Freeze Used', {
      description: 'Your streak is protected for today!',
      duration: 4000,
    });
  };

  // Reward-specific toasts
  const rewardRedeemed = (rewardName: string, cost: number) => {
    toast.success(`Redeemed: ${rewardName}`, {
      description: `${cost} points spent`,
      icon: createElement(Gift, { size: 18 }),
    });
  };

  const rewardApproved = (rewardName: string) => {
    toast.success(`Reward Ready: ${rewardName}`, {
      description: 'Your reward has been approved!',
      icon: createElement(Trophy, { size: 18 }),
    });
  };

  // Daily completion bonus
  const dailyBonusEarned = (bonusPoints: number) => {
    toast.success('Daily Bonus!', {
      description: `All chores complete! +${bonusPoints} bonus points!`,
      icon: createElement(Star, { size: 18, fill: 'currentColor' }),
      duration: 5000,
    });
  };

  // Error toasts
  const networkError = () => {
    toast.error('Connection Error', {
      description: 'Please check your internet connection.',
      action: {
        label: 'Retry',
        onClick: () => window.location.reload(),
      },
    });
  };

  const serverError = () => {
    toast.error('Server Error', {
      description: 'Something went wrong. Please try again.',
    });
  };

  return {
    // Generic toasts
    success: (message: string, options?: ToastOptions) => showToast('success', message, options),
    error: (message: string, options?: ToastOptions) => showToast('error', message, options),
    warning: (message: string, options?: ToastOptions) => showToast('warning', message, options),
    info: (message: string, options?: ToastOptions) => showToast('info', message, options),

    // Domain-specific toasts
    choreClaimed,
    choreApproved,
    choreDenied,
    streakMilestone,
    streakAtRisk,
    streakLost,
    streakFreezeUsed,
    rewardRedeemed,
    rewardApproved,
    dailyBonusEarned,
    networkError,
    serverError,
  };
}

export default useToast;
