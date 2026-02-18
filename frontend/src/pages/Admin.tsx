import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, User, ClipboardList, Gift, Users, Settings, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { approvalsApi } from '../api/client';
import { ApprovalsList, KidsSection, ChoresSection, RewardsSection, ParentsSection } from '../components/admin';

type Tab = 'approvals' | 'kids' | 'chores' | 'rewards' | 'parents';

export function Admin() {
  const [activeTab, setActiveTab] = useState<Tab>('approvals');

  const { data: pendingCount } = useQuery({
    queryKey: ['approvals-count'],
    queryFn: () => approvalsApi.count().then(res => res.data),
    refetchInterval: 30000,
  });

  const tabs: { id: Tab; label: string; Icon: typeof CheckCircle2; badge?: number }[] = [
    { id: 'approvals', label: 'Approve', Icon: CheckCircle2, badge: pendingCount?.total },
    { id: 'kids', label: 'Kids', Icon: User },
    { id: 'chores', label: 'Chores', Icon: ClipboardList },
    { id: 'rewards', label: 'Rewards', Icon: Gift },
    { id: 'parents', label: 'Parents', Icon: Users },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2 text-text-primary">
          <Settings size={24} className="text-primary-500" />
          Parent Dashboard
        </h2>
        <Link
          to="/help"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors"
        >
          <HelpCircle size={18} />
          <span className="hidden sm:inline">Help</span>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map((tab) => {
          const IconComponent = tab.Icon;
          return (
            <button
              key={tab.id}
              data-testid={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium whitespace-nowrap transition-all
                ${activeTab === tab.id
                  ? 'shadow-md'
                  : 'bg-bg-surface text-text-secondary border border-bg-accent hover:border-primary-500'
                }`}
              style={activeTab === tab.id ? { backgroundColor: 'var(--primary-600)', color: 'white' } : undefined}
            >
              <IconComponent size={18} />
              <span>{tab.label}</span>
              {tab.badge && tab.badge > 0 && (
                <span data-testid="pending-badge" className="bg-accent-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'approvals' && <ApprovalsList />}
      {activeTab === 'kids' && <KidsSection />}
      {activeTab === 'chores' && <ChoresSection />}
      {activeTab === 'rewards' && <RewardsSection />}
      {activeTab === 'parents' && <ParentsSection />}
    </div>
  );
}
