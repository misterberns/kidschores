import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  DollarSign,
  Wallet,
  Clock,
  CheckCircle2,
  XCircle,
  Send,
  Settings,
  History,
  User,
  Banknote,
  CreditCard,
  Gift,
} from 'lucide-react';
import { kidsApi, allowanceApi } from '../api/client';
import type { AllowancePayout } from '../api/client';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useToast } from '../hooks/useToast';

const PAYOUT_METHODS = [
  { id: 'cash', label: 'Cash', icon: Banknote },
  { id: 'bank', label: 'Bank Transfer', icon: CreditCard },
  { id: 'gift_card', label: 'Gift Card', icon: Gift },
];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

interface PayoutCardProps {
  payout: AllowancePayout;
  kidName?: string;
  onMarkPaid?: (id: string) => void;
  onCancel?: (id: string) => void;
  showActions?: boolean;
}

function PayoutCard({ payout, kidName, onMarkPaid, onCancel, showActions = false }: PayoutCardProps) {
  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    paid: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  };

  const statusIcons = {
    pending: Clock,
    paid: CheckCircle2,
    cancelled: XCircle,
  };

  const StatusIcon = statusIcons[payout.status];
  const method = PAYOUT_METHODS.find(m => m.id === payout.payout_method);
  const MethodIcon = method?.icon || Banknote;

  return (
    <motion.div
      className="card p-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
            <DollarSign size={20} className="text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="font-bold text-lg text-text-primary">
              {formatCurrency(payout.dollar_amount)}
            </p>
            <p className="text-sm text-text-secondary">
              {payout.points_converted.toLocaleString()} points
              {kidName && <span className="ml-2">({kidName})</span>}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${statusColors[payout.status]}`}>
            <StatusIcon size={12} />
            {payout.status.charAt(0).toUpperCase() + payout.status.slice(1)}
          </span>
          <div className="flex items-center gap-1 text-xs text-text-muted">
            <MethodIcon size={12} />
            {method?.label || payout.payout_method}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-sm text-text-secondary">
        <span>Requested {formatDate(payout.requested_at)}</span>
        {payout.paid_at && (
          <span>Paid {formatDate(payout.paid_at)} by {payout.paid_by}</span>
        )}
      </div>

      {showActions && payout.status === 'pending' && (
        <div className="mt-3 pt-3 border-t border-bg-accent flex gap-2">
          <button
            onClick={() => onMarkPaid?.(payout.id)}
            className="btn btn-primary flex-1 text-sm"
          >
            <CheckCircle2 size={16} />
            Mark Paid
          </button>
          <button
            onClick={() => onCancel?.(payout.id)}
            className="btn bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50 text-sm"
          >
            <XCircle size={16} />
            Cancel
          </button>
        </div>
      )}

      {payout.notes && (
        <p className="mt-2 text-sm text-text-muted italic">{payout.notes}</p>
      )}
    </motion.div>
  );
}

export function Allowance() {
  const queryClient = useQueryClient();
  const prefersReducedMotion = useReducedMotion();
  const toast = useToast();

  const [selectedKid, setSelectedKid] = useState<string | null>(null);
  const [pointsToConvert, setPointsToConvert] = useState<string>('');
  const [payoutMethod, setPayoutMethod] = useState('cash');
  const [showSettings, setShowSettings] = useState(false);

  // Fetch kids
  const { data: kids = [] } = useQuery({
    queryKey: ['kids'],
    queryFn: () => kidsApi.list().then(res => res.data),
  });

  const activeKid = selectedKid ? kids.find(k => k.id === selectedKid) : kids[0];
  const activeKidId = activeKid?.id;

  // Fetch allowance summary
  const { data: summary } = useQuery({
    queryKey: ['allowance-summary', activeKidId],
    queryFn: () => activeKidId ? allowanceApi.getSummary(activeKidId).then(res => res.data) : null,
    enabled: !!activeKidId,
  });

  // Fetch payout history
  const { data: payouts = [] } = useQuery({
    queryKey: ['allowance-payouts', activeKidId],
    queryFn: () => activeKidId ? allowanceApi.getPayouts(activeKidId).then(res => res.data) : [],
    enabled: !!activeKidId,
  });

  // Fetch all pending payouts (for parent view)
  const { data: allPending = [] } = useQuery({
    queryKey: ['allowance-pending'],
    queryFn: () => allowanceApi.getAllPending().then(res => res.data),
  });

  // Request payout mutation
  const requestPayoutMutation = useMutation({
    mutationFn: (data: { kidId: string; points: number; method: string }) =>
      allowanceApi.requestPayout(data.kidId, {
        points_to_convert: data.points,
        payout_method: data.method,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['allowance-summary'] });
      queryClient.invalidateQueries({ queryKey: ['allowance-payouts'] });
      queryClient.invalidateQueries({ queryKey: ['allowance-pending'] });
      queryClient.invalidateQueries({ queryKey: ['kids'] });
      setPointsToConvert('');
      toast.success(`Requested ${formatCurrency(data.data.dollar_amount)} payout!`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to request payout');
    },
  });

  // Mark paid mutation
  const markPaidMutation = useMutation({
    mutationFn: (payoutId: string) =>
      allowanceApi.markPaid(payoutId, { paid_by: 'Parent' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allowance-payouts'] });
      queryClient.invalidateQueries({ queryKey: ['allowance-pending'] });
      toast.success('Marked as paid!');
    },
  });

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: (payoutId: string) => allowanceApi.cancelPayout(payoutId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allowance-summary'] });
      queryClient.invalidateQueries({ queryKey: ['allowance-payouts'] });
      queryClient.invalidateQueries({ queryKey: ['allowance-pending'] });
      queryClient.invalidateQueries({ queryKey: ['kids'] });
      toast.success('Payout cancelled, points refunded');
    },
  });

  const handleRequestPayout = () => {
    const points = parseInt(pointsToConvert, 10);
    if (!activeKidId || isNaN(points) || points <= 0) return;

    requestPayoutMutation.mutate({
      kidId: activeKidId,
      points,
      method: payoutMethod,
    });
  };

  const dollarPreview = summary
    ? parseInt(pointsToConvert, 10) / summary.points_per_dollar || 0
    : 0;

  if (!activeKid) {
    return (
      <div className="text-center py-12">
        <Wallet size={48} className="mx-auto text-text-muted mb-4" />
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
          <Wallet size={24} className="text-green-500" />
          Allowance
        </h2>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="btn bg-bg-accent text-text-secondary hover:bg-bg-elevated"
        >
          <Settings size={18} />
        </button>
      </div>

      {/* Kid selector */}
      {kids.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {kids.map(kid => (
            <motion.button
              key={kid.id}
              onClick={() => setSelectedKid(kid.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeKidId === kid.id
                  ? 'bg-green-500 text-white'
                  : 'bg-bg-accent text-text-secondary hover:bg-bg-elevated'
              }`}
              whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
              whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
            >
              {kid.name}
            </motion.button>
          ))}
        </div>
      )}

      {/* Balance Card */}
      {summary && (
        <motion.div
          className="card p-6 bg-gradient-to-br from-green-500 to-emerald-600 text-white"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <User size={28} />
            </div>
            <div>
              <p className="text-lg font-bold">{summary.kid_name}</p>
              <p className="text-sm opacity-80">Current Balance</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold">{Math.floor(summary.current_points).toLocaleString()}</p>
              <p className="text-sm opacity-80">Points</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold">{formatCurrency(summary.dollar_equivalent)}</p>
              <p className="text-sm opacity-80">Value</p>
            </div>
          </div>

          {summary.pending_payouts > 0 && (
            <div className="mt-4 bg-yellow-500/20 rounded-lg p-3 flex items-center gap-2">
              <Clock size={18} />
              <span className="text-sm">
                {summary.pending_payouts} pending payout{summary.pending_payouts > 1 ? 's' : ''}: {formatCurrency(summary.pending_amount)}
              </span>
            </div>
          )}

          <p className="mt-4 text-xs text-center opacity-70">
            {summary.points_per_dollar} points = $1.00 | Total earned: {formatCurrency(summary.total_paid)}
          </p>
        </motion.div>
      )}

      {/* Request Payout */}
      <div className="card p-4">
        <h3 className="font-bold text-lg text-text-primary flex items-center gap-2 mb-4">
          <Send size={20} className="text-green-500" />
          Request Payout
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Points to convert
            </label>
            <div className="relative">
              <input
                type="number"
                value={pointsToConvert}
                onChange={(e) => setPointsToConvert(e.target.value)}
                placeholder="Enter points"
                className="input w-full pr-24"
                min={0}
                max={summary?.current_points || 0}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
                = {formatCurrency(dollarPreview)}
              </span>
            </div>
            {summary && (
              <div className="flex gap-2 mt-2">
                {[25, 50, 100].map(pct => (
                  <button
                    key={pct}
                    onClick={() => setPointsToConvert(String(Math.floor(summary.current_points * pct / 100)))}
                    className="px-2 py-1 text-xs rounded bg-bg-accent text-text-secondary hover:bg-bg-elevated"
                  >
                    {pct}%
                  </button>
                ))}
                <button
                  onClick={() => setPointsToConvert(String(Math.floor(summary.current_points)))}
                  className="px-2 py-1 text-xs rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 hover:opacity-80"
                >
                  Max
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Payout method
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PAYOUT_METHODS.map(method => {
                const Icon = method.icon;
                return (
                  <button
                    key={method.id}
                    onClick={() => setPayoutMethod(method.id)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-colors ${
                      payoutMethod === method.id
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'border-bg-accent bg-bg-surface hover:border-bg-elevated'
                    }`}
                  >
                    <Icon size={20} className={payoutMethod === method.id ? 'text-green-500' : 'text-text-muted'} />
                    <span className={`text-xs font-medium ${payoutMethod === method.id ? 'text-green-700 dark:text-green-300' : 'text-text-secondary'}`}>
                      {method.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={handleRequestPayout}
            disabled={
              !pointsToConvert ||
              parseInt(pointsToConvert, 10) <= 0 ||
              requestPayoutMutation.isPending ||
              !!(summary && parseInt(pointsToConvert, 10) > summary.current_points)
            }
            className="btn btn-primary w-full"
          >
            {requestPayoutMutation.isPending ? 'Requesting...' : 'Request Payout'}
          </button>
        </div>
      </div>

      {/* Pending Payouts (Parent View) */}
      {allPending.length > 0 && (
        <div className="card p-4">
          <h3 className="font-bold text-lg text-text-primary flex items-center gap-2 mb-4">
            <Clock size={20} className="text-yellow-500" />
            Pending Approvals
            <span className="ml-auto bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 px-2 py-0.5 rounded-full text-sm">
              {allPending.length}
            </span>
          </h3>
          <div className="space-y-3">
            {allPending.map(payout => {
              const kid = kids.find(k => k.id === payout.kid_id);
              return (
                <PayoutCard
                  key={payout.id}
                  payout={payout}
                  kidName={kid?.name}
                  showActions
                  onMarkPaid={(id) => markPaidMutation.mutate(id)}
                  onCancel={(id) => cancelMutation.mutate(id)}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Payout History */}
      <div className="card p-4">
        <h3 className="font-bold text-lg text-text-primary flex items-center gap-2 mb-4">
          <History size={20} className="text-text-muted" />
          Payout History
        </h3>
        {payouts.length === 0 ? (
          <p className="text-center text-text-secondary py-8">No payouts yet</p>
        ) : (
          <div className="space-y-3">
            {payouts.map(payout => (
              <PayoutCard key={payout.id} payout={payout} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
