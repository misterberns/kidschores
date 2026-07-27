import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, User, ClipboardList, Gift, Users, Settings, HelpCircle, Wand2, Target, Bug } from 'lucide-react';
import { Link } from 'react-router-dom';
import { approvalsApi } from '../api/client';
import { ApprovalsList, KidsSection, ChoresSection, RewardsSection, ParentsSection, ChallengesSection, FeedbackSection } from '../components/admin';
import { Tab as TabButton, TabList } from '../components/ui';

type Tab = 'approvals' | 'kids' | 'chores' | 'rewards' | 'challenges' | 'parents' | 'feedback';

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
    { id: 'challenges', label: 'Challenges', Icon: Target },
    { id: 'parents', label: 'Parents', Icon: Users },
    { id: 'feedback', label: 'Reports', Icon: Bug },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2 text-text-primary">
          <Settings size={24} className="text-primary-500" />
          Parent Dashboard
        </h2>
        <div className="flex items-center gap-2">
          <Link
            to="/onboarding"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors"
          >
            <Wand2 size={18} />
            <span className="hidden sm:inline">Setup Wizard</span>
          </Link>
          <Link
            to="/help"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors"
          >
            <HelpCircle size={18} />
            <span className="hidden sm:inline">Help</span>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <TabList label="Admin sections" className="pb-2">
        {tabs.map((tab) => {
          const IconComponent = tab.Icon;
          return (
            <TabButton
              key={tab.id}
              shape="card"
              selected={activeTab === tab.id}
              data-testid={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <IconComponent size={18} />
              <span>{tab.label}</span>
              {tab.badge && tab.badge > 0 && (
                <span data-testid="pending-badge" className="bg-accent-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {tab.badge}
                </span>
              )}
            </TabButton>
          );
        })}
      </TabList>

      {/* Tab Content */}
      {activeTab === 'approvals' && <ApprovalsList />}
      {activeTab === 'kids' && <KidsSection />}
      {activeTab === 'chores' && <ChoresSection />}
      {activeTab === 'rewards' && <RewardsSection />}
      {activeTab === 'challenges' && <ChallengesSection />}
      {activeTab === 'parents' && <ParentsSection />}
      {activeTab === 'feedback' && <FeedbackSection />}
    </div>
  );
}
