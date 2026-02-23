import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Plus, Check, Sparkles, X } from 'lucide-react';
import { kidsApi, choresApi, rewardsApi, categoriesApi } from '../api/client';
import type { ChoreCategory } from '../api/client';
import { useToast } from '../hooks/useToast';
import { useTheme } from '../theme';
import { ChorbiePresets } from '../components/mascot';
import { FormInput, FormSelect } from '../components/admin/FormElements';
import { CHORE_SUGGESTIONS } from '../data/chore-suggestions';
import type { ChoreSuggestion } from '../data/chore-suggestions';
import { REWARD_SUGGESTIONS } from '../data/reward-suggestions';
import type { RewardSuggestion } from '../data/reward-suggestions';

const TOTAL_STEPS = 6;

const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 200 : -200,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({
    x: direction > 0 ? -200 : 200,
    opacity: 0,
  }),
};

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="flex gap-1.5 mb-6">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <div
          key={i}
          className="h-2 flex-1 rounded-full transition-all duration-300"
          style={{
            backgroundColor: i < step ? 'var(--primary-500)' : i === step ? 'var(--primary-300)' : 'var(--bg-accent)',
          }}
        />
      ))}
    </div>
  );
}

// Step 1: Welcome
function WelcomeStep() {
  const { seasonal } = useTheme();
  return (
    <div className="text-center py-6">
      <div className="mx-auto mb-6">
        <ChorbiePresets.Welcome size={120} season={seasonal} />
      </div>
      <h2 className="text-3xl font-bold text-text-primary mb-3">
        Welcome to KidsChores!
      </h2>
      <p className="text-text-secondary text-lg max-w-md mx-auto">
        Let's set up your family's chore system in just a few steps. You'll add your kids, pick some chores, and set up rewards.
      </p>
    </div>
  );
}

// Step 2: Add Kids
function AddKidsStep({ kidNames, setKidNames }: {
  kidNames: string[];
  setKidNames: (names: string[]) => void;
}) {
  const { seasonal } = useTheme();

  const addKid = () => setKidNames([...kidNames, '']);
  const removeKid = (index: number) => setKidNames(kidNames.filter((_, i) => i !== index));
  const updateKid = (index: number, name: string) => {
    const updated = [...kidNames];
    updated[index] = name;
    setKidNames(updated);
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <ChorbiePresets.Encourage size={48} season={seasonal} />
        <div>
          <h2 className="text-2xl font-bold text-text-primary">Add Your Kids</h2>
          <p className="text-text-secondary text-sm">Who will be doing chores?</p>
        </div>
      </div>

      <div className="space-y-3">
        {kidNames.map((name, i) => (
          <div key={i} className="flex gap-2 items-end">
            <div className="flex-1">
              <FormInput
                label={`Kid ${i + 1}`}
                type="text"
                value={name}
                onChange={(e) => updateKid(i, e.target.value)}
                placeholder="Enter name"
                autoFocus={i === kidNames.length - 1}
              />
            </div>
            {kidNames.length > 1 && (
              <button
                onClick={() => removeKid(i)}
                className="mb-3 p-2.5 rounded-xl text-text-muted hover:text-error-500 hover:bg-error-50 transition-colors"
              >
                <X size={18} />
              </button>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={addKid}
        className="mt-2 flex items-center gap-2 text-primary-500 hover:text-primary-600 font-medium text-sm"
      >
        <Plus size={16} /> Add another kid
      </button>
    </div>
  );
}

// Step 3: Categories
function CategoriesStep({ categories, seeded, onSeed, selectedCategories, onToggleCategory }: {
  categories: ChoreCategory[];
  seeded: boolean;
  onSeed: () => void;
  selectedCategories: Set<string>;
  onToggleCategory: (id: string) => void;
}) {
  const { seasonal } = useTheme();

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <ChorbiePresets.Excited size={48} season={seasonal} />
        <div>
          <h2 className="text-2xl font-bold text-text-primary">Chore Categories</h2>
          <p className="text-text-secondary text-sm">Organize chores by room or type</p>
        </div>
      </div>

      {!seeded && categories.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-text-secondary mb-4">We have 8 preset categories ready to go!</p>
          <button onClick={onSeed} className="btn btn-primary px-6 py-3 text-lg">
            <Sparkles size={20} className="inline mr-2" />
            Load Default Categories
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            {categories.map((cat) => {
              const isSelected = selectedCategories.has(cat.id);
              return (
                <button
                  key={cat.id}
                  onClick={() => onToggleCategory(cat.id)}
                  className="card p-3 flex items-center gap-3 border text-left transition-all"
                  style={{
                    borderColor: isSelected ? cat.color : 'var(--border-primary)',
                    backgroundColor: isSelected ? `${cat.color}15` : undefined,
                    opacity: isSelected ? 1 : 0.5,
                  }}
                >
                  <span className="text-2xl">{cat.icon}</span>
                  <span className="font-bold text-text-primary flex-1">{cat.name}</span>
                  {isSelected && <Check size={18} style={{ color: cat.color }} />}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-text-muted text-center mt-3">Tap to deselect categories you don't need</p>
        </>
      )}
    </div>
  );
}

// Step 4: Add Chores (Accordion layout)
function AddChoresStep({ categories, createdKidIds, addedChores, setAddedChores }: {
  categories: ChoreCategory[];
  createdKidIds: string[];
  addedChores: AddedChore[];
  setAddedChores: (chores: AddedChore[]) => void;
}) {
  const { seasonal } = useTheme();
  const [expandedCategory, setExpandedCategory] = useState<string | null>(categories[0]?.name || null);
  const [customName, setCustomName] = useState('');
  const [customIcon, setCustomIcon] = useState('🧹');
  const [customPoints, setCustomPoints] = useState(10);
  const [customFrequency, setCustomFrequency] = useState('daily');
  const [customCategoryId, setCustomCategoryId] = useState('');
  const [showCustomForm, setShowCustomForm] = useState(false);

  const addedNames = new Set(addedChores.map((c) => c.name));

  const addSuggestion = (s: ChoreSuggestion, categoryId: string) => {
    if (addedNames.has(s.name)) return;
    setAddedChores([...addedChores, {
      name: s.name,
      icon: s.icon,
      default_points: s.points,
      recurring_frequency: s.frequency,
      shared_chore: s.shared || false,
      category_id: categoryId,
      assigned_kids: createdKidIds,
    }]);
  };

  const addAllSuggestions = (catName: string, catId: string) => {
    const catSuggestions = CHORE_SUGGESTIONS[catName] || [];
    const newChores = catSuggestions
      .filter(s => !addedNames.has(s.name))
      .map(s => ({
        name: s.name,
        icon: s.icon,
        default_points: s.points,
        recurring_frequency: s.frequency,
        shared_chore: s.shared || false,
        category_id: catId,
        assigned_kids: createdKidIds,
      }));
    if (newChores.length > 0) {
      setAddedChores([...addedChores, ...newChores]);
    }
  };

  const addCustom = () => {
    if (!customName.trim() || !customCategoryId) return;
    setAddedChores([...addedChores, {
      name: customName.trim(),
      icon: customIcon,
      default_points: customPoints,
      recurring_frequency: customFrequency,
      shared_chore: false,
      category_id: customCategoryId,
      assigned_kids: createdKidIds,
    }]);
    setCustomName('');
    setShowCustomForm(false);
  };

  const removeChore = (index: number) => {
    setAddedChores(addedChores.filter((_, i) => i !== index));
  };

  const choresByCategory = (catId: string) => addedChores.filter(c => c.category_id === catId);

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <ChorbiePresets.Encourage size={48} season={seasonal} />
        <div>
          <h2 className="text-2xl font-bold text-text-primary">Add Chores</h2>
          <p className="text-text-secondary text-sm">Expand a category to add chores</p>
        </div>
      </div>

      {/* Accordion categories */}
      <div className="space-y-2 mb-4">
        {categories.map((cat) => {
          const isExpanded = expandedCategory === cat.name;
          const suggestions = CHORE_SUGGESTIONS[cat.name] || [];
          const catChores = choresByCategory(cat.id);
          const allSuggestionsAdded = suggestions.length > 0 && suggestions.every(s => addedNames.has(s.name));

          return (
            <div
              key={cat.id}
              className="card overflow-hidden border transition-colors"
              style={{ borderColor: isExpanded ? cat.color : 'var(--border-primary)' }}
            >
              {/* Accordion header */}
              <button
                onClick={() => setExpandedCategory(isExpanded ? null : cat.name)}
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-bg-accent/50 transition-colors"
              >
                <span className="text-xl">{cat.icon}</span>
                <span className="font-bold text-text-primary flex-1">{cat.name}</span>
                {catChores.length > 0 && (
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                  >
                    {catChores.length}
                  </span>
                )}
                <motion.span
                  animate={{ rotate: isExpanded ? 90 : 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  className="text-text-secondary"
                >
                  <ChevronRight size={18} />
                </motion.span>
              </button>

              {/* Accordion content */}
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 pb-3 border-t border-border-primary pt-3">
                      {/* Suggestion chips */}
                      {suggestions.length > 0 && (
                        <div className="mb-3">
                          <div className="flex flex-wrap gap-2 mb-2">
                            {suggestions.map((s) => {
                              const isAdded = addedNames.has(s.name);
                              return (
                                <button
                                  key={s.name}
                                  onClick={() => addSuggestion(s, cat.id)}
                                  disabled={isAdded}
                                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all border ${
                                    isAdded
                                      ? 'bg-primary-50 border-primary-300 text-primary-600'
                                      : 'bg-bg-surface border-bg-accent text-text-primary hover:border-primary-400'
                                  }`}
                                >
                                  <span>{s.icon}</span>
                                  <span>{s.name}</span>
                                  <span className="text-text-muted text-xs">{s.points}pts</span>
                                  {isAdded && <Check size={14} className="text-primary-500" />}
                                </button>
                              );
                            })}
                          </div>
                          {!allSuggestionsAdded && (
                            <button
                              onClick={() => addAllSuggestions(cat.name, cat.id)}
                              className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors hover:bg-bg-accent/50"
                              style={{ color: cat.color }}
                            >
                              <Sparkles size={14} /> Add All Suggestions
                            </button>
                          )}
                        </div>
                      )}

                      {/* Added chores from this category */}
                      {catChores.length > 0 && (
                        <div className="space-y-1.5">
                          {catChores.map((chore) => {
                            const globalIdx = addedChores.indexOf(chore);
                            return (
                              <div key={globalIdx} className="flex items-center justify-between bg-bg-surface rounded-lg px-3 py-2">
                                <div className="flex items-center gap-2">
                                  <Check size={14} className="text-primary-500" />
                                  <span className="text-sm font-medium text-text-primary">{chore.icon} {chore.name}</span>
                                  <span className="text-xs text-text-muted">{chore.default_points}pts</span>
                                </div>
                                <button onClick={() => removeChore(globalIdx)} className="text-text-muted hover:text-error-500">
                                  <X size={14} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {suggestions.length === 0 && catChores.length === 0 && (
                        <p className="text-sm text-text-muted">No suggestions available. Use "Create Custom Chore" below.</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Custom chore form - always accessible */}
      {!showCustomForm ? (
        <button
          onClick={() => {
            setShowCustomForm(true);
            if (!customCategoryId && categories.length > 0) setCustomCategoryId(categories[0].id);
          }}
          className="flex items-center gap-2 text-primary-500 hover:text-primary-600 font-medium text-sm mb-4"
        >
          <Plus size={16} /> Create Custom Chore
        </button>
      ) : (
        <div className="card p-4 mb-4 border border-primary-200">
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Name" value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="Chore name" />
            <FormInput label="Icon" value={customIcon} onChange={(e) => setCustomIcon(e.target.value)} placeholder="Emoji" />
            <FormInput label="Points" type="number" value={customPoints} onChange={(e) => setCustomPoints(Number(e.target.value))} />
            <FormSelect label="Frequency" value={customFrequency} onChange={(e) => setCustomFrequency(e.target.value)}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="none">One-time</option>
            </FormSelect>
            <div className="col-span-2">
              <FormSelect label="Category" value={customCategoryId} onChange={(e) => setCustomCategoryId(e.target.value)}>
                <option value="">Select category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                ))}
              </FormSelect>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={addCustom} disabled={!customName.trim() || !customCategoryId} className="btn btn-primary flex-1">Add</button>
            <button onClick={() => setShowCustomForm(false)} className="btn btn-secondary flex-1">Cancel</button>
          </div>
        </div>
      )}

      {/* Total counter */}
      {addedChores.length > 0 && (
        <div className="text-center text-sm font-medium text-text-secondary pt-2 border-t border-border-primary">
          Total: {addedChores.length} chore{addedChores.length !== 1 ? 's' : ''} added
        </div>
      )}
    </div>
  );
}

// Step 5: Add Rewards
function AddRewardsStep({ addedRewards, setAddedRewards }: {
  addedRewards: AddedReward[];
  setAddedRewards: (rewards: AddedReward[]) => void;
}) {
  const { seasonal } = useTheme();
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customIcon, setCustomIcon] = useState('🎁');
  const [customCost, setCustomCost] = useState(50);
  const [customApproval, setCustomApproval] = useState(true);

  const addedNames = new Set(addedRewards.map((r) => r.name));

  const addSuggestion = (s: RewardSuggestion) => {
    if (addedNames.has(s.name)) return;
    setAddedRewards([...addedRewards, {
      name: s.name,
      icon: s.icon,
      cost: s.cost,
      requires_approval: s.requiresApproval,
    }]);
  };

  const addCustom = () => {
    if (!customName.trim()) return;
    setAddedRewards([...addedRewards, {
      name: customName.trim(),
      icon: customIcon,
      cost: customCost,
      requires_approval: customApproval,
    }]);
    setCustomName('');
    setShowCustomForm(false);
  };

  const removeReward = (index: number) => {
    setAddedRewards(addedRewards.filter((_, i) => i !== index));
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <ChorbiePresets.Excited size={48} season={seasonal} />
        <div>
          <h2 className="text-2xl font-bold text-text-primary">Add Rewards</h2>
          <p className="text-text-secondary text-sm">What can kids spend their points on?</p>
        </div>
      </div>

      {/* Suggestions grid */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {REWARD_SUGGESTIONS.map((s) => {
          const isAdded = addedNames.has(s.name);
          return (
            <button
              key={s.name}
              onClick={() => addSuggestion(s)}
              disabled={isAdded}
              className={`flex items-center gap-2 p-3 rounded-xl text-left text-sm font-medium transition-all border ${
                isAdded
                  ? 'bg-primary-50 border-primary-300 text-primary-600'
                  : 'bg-bg-surface border-bg-accent text-text-primary hover:border-primary-400'
              }`}
            >
              <span className="text-xl">{s.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="truncate">{s.name}</div>
                <div className="text-xs text-text-muted">{s.cost} pts</div>
              </div>
              {isAdded && <Check size={14} className="text-primary-500 flex-shrink-0" />}
            </button>
          );
        })}
      </div>

      {/* Custom reward form */}
      {!showCustomForm ? (
        <button
          onClick={() => setShowCustomForm(true)}
          className="flex items-center gap-2 text-primary-500 hover:text-primary-600 font-medium text-sm mb-4"
        >
          <Plus size={16} /> Create custom reward
        </button>
      ) : (
        <div className="card p-4 mb-4 border border-primary-200">
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Name" value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="Reward name" />
            <FormInput label="Icon" value={customIcon} onChange={(e) => setCustomIcon(e.target.value)} placeholder="Emoji" />
            <FormInput label="Cost (points)" type="number" value={customCost} onChange={(e) => setCustomCost(Number(e.target.value))} />
            <FormSelect label="Approval" value={customApproval ? 'yes' : 'no'} onChange={(e) => setCustomApproval(e.target.value === 'yes')}>
              <option value="yes">Requires approval</option>
              <option value="no">Auto-approve</option>
            </FormSelect>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={addCustom} disabled={!customName.trim()} className="btn btn-primary flex-1">Add</button>
            <button onClick={() => setShowCustomForm(false)} className="btn btn-secondary flex-1">Cancel</button>
          </div>
        </div>
      )}

      {/* Added rewards list */}
      {addedRewards.length > 0 && (
        <div>
          <p className="text-xs font-medium text-text-muted mb-2">
            Added ({addedRewards.length})
          </p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {addedRewards.map((reward, i) => (
              <div key={i} className="flex items-center justify-between bg-bg-surface rounded-xl px-3 py-2 border border-bg-accent">
                <div className="flex items-center gap-2">
                  <span>{reward.icon}</span>
                  <span className="font-medium text-text-primary text-sm">{reward.name}</span>
                  <span className="text-xs text-text-muted">{reward.cost}pts</span>
                </div>
                <button onClick={() => removeReward(i)} className="text-text-muted hover:text-error-500">
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Step 6: Done
function DoneStep({ summary }: { summary: { kids: number; chores: number; rewards: number } }) {
  const { seasonal } = useTheme();
  return (
    <div className="text-center py-6">
      <div className="mx-auto mb-6">
        <ChorbiePresets.Success size={120} season={seasonal} />
      </div>
      <h2 className="text-3xl font-bold text-text-primary mb-3">
        You're All Set!
      </h2>
      <div className="flex justify-center gap-6 my-6">
        <div className="text-center">
          <div className="text-3xl font-bold text-primary-500">{summary.kids}</div>
          <div className="text-sm text-text-muted">Kids</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-primary-500">{summary.chores}</div>
          <div className="text-sm text-text-muted">Chores</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-primary-500">{summary.rewards}</div>
          <div className="text-sm text-text-muted">Rewards</div>
        </div>
      </div>
      <p className="text-text-secondary">
        Head to the dashboard to start tracking chores!
      </p>
    </div>
  );
}

// Types for collected data
interface AddedChore {
  name: string;
  icon: string;
  default_points: number;
  recurring_frequency: string;
  shared_chore: boolean;
  category_id: string;
  assigned_kids: string[];
}

interface AddedReward {
  name: string;
  icon: string;
  cost: number;
  requires_approval: boolean;
}

export function Onboarding() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

  // Wizard state
  const [kidNames, setKidNames] = useState<string[]>(['']);
  const [createdKidIds, setCreatedKidIds] = useState<string[]>([]);
  const [categoriesSeeded, setCategoriesSeeded] = useState(false);
  const [addedChores, setAddedChores] = useState<AddedChore[]>([]);
  const [addedRewards, setAddedRewards] = useState<AddedReward[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  // Fetch categories (refreshed after seeding)
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list().then((r) => r.data),
  });

  // Initialize selectedCategories when categories load
  useEffect(() => {
    if (categories.length > 0 && selectedCategories.size === 0) {
      setSelectedCategories(new Set(categories.map(c => c.id)));
    }
  }, [categories]);

  const toggleCategory = (id: string) => {
    setSelectedCategories(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Mutations
  const seedCategories = useMutation({
    mutationFn: () => categoriesApi.seedDefaults(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setCategoriesSeeded(true);
      toast.success('Categories loaded!');
    },
    onError: () => toast.error('Failed to seed categories'),
  });

  const goNext = () => {
    setDirection(1);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  };

  const goBack = () => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0));
  };

  // Step 2 → 3: Create kids via API
  const saveKids = async () => {
    const validNames = kidNames.filter((n) => n.trim());
    if (validNames.length === 0) {
      toast.error('Add at least one kid');
      return;
    }

    setSaving(true);
    try {
      const ids: string[] = [];
      for (const name of validNames) {
        const res = await kidsApi.create({ name: name.trim() });
        ids.push(res.data.id);
      }
      setCreatedKidIds(ids);
      queryClient.invalidateQueries({ queryKey: ['kids'] });
      toast.success(`Added ${ids.length} kid${ids.length > 1 ? 's' : ''}!`);
      goNext();
    } catch {
      toast.error('Failed to create kids');
    } finally {
      setSaving(false);
    }
  };

  // Step 3 → 4: Delete deselected categories
  const saveCategories = async () => {
    const deselected = categories.filter(c => !selectedCategories.has(c.id));
    if (deselected.length > 0) {
      setSaving(true);
      try {
        for (const cat of deselected) {
          await categoriesApi.delete(cat.id);
        }
        queryClient.invalidateQueries({ queryKey: ['categories'] });
      } catch {
        toast.error('Failed to remove categories');
      } finally {
        setSaving(false);
      }
    }
    goNext();
  };

  // Step 4 → 5: Create chores via API
  const saveChores = async () => {
    if (addedChores.length === 0) {
      goNext(); // Skip is OK
      return;
    }

    setSaving(true);
    try {
      for (const chore of addedChores) {
        await choresApi.create(chore);
      }
      queryClient.invalidateQueries({ queryKey: ['chores'] });
      toast.success(`Created ${addedChores.length} chore${addedChores.length > 1 ? 's' : ''}!`);
      goNext();
    } catch {
      toast.error('Failed to create some chores');
    } finally {
      setSaving(false);
    }
  };

  // Step 5 → 6: Create rewards via API
  const saveRewards = async () => {
    if (addedRewards.length === 0) {
      goNext();
      return;
    }

    setSaving(true);
    try {
      for (const reward of addedRewards) {
        await rewardsApi.create({
          name: reward.name,
          icon: reward.icon,
          cost: reward.cost,
          requires_approval: reward.requires_approval,
          eligible_kids: createdKidIds,
        });
      }
      queryClient.invalidateQueries({ queryKey: ['rewards'] });
      toast.success(`Created ${addedRewards.length} reward${addedRewards.length > 1 ? 's' : ''}!`);
      goNext();
    } catch {
      toast.error('Failed to create some rewards');
    } finally {
      setSaving(false);
    }
  };

  const finish = () => {
    queryClient.invalidateQueries();
    navigate('/', { replace: true });
  };

  const skipSetup = () => {
    goNext();
  };

  // Can proceed from current step?
  const canProceed = () => {
    if (step === 1) return kidNames.some((n) => n.trim());
    if (step === 2) return categories.length > 0;
    return true;
  };

  // Next button handler per step
  const handleNext = () => {
    if (step === 1) return saveKids();
    if (step === 2) return saveCategories();
    if (step === 3) return saveChores();
    if (step === 4) return saveRewards();
    if (step === 5) return finish();
    goNext();
  };

  const nextLabel = () => {
    if (saving) return 'Saving...';
    if (step === 0) return "Let's Go!";
    if (step === 1) return `Create ${kidNames.filter((n) => n.trim()).length} Kid${kidNames.filter((n) => n.trim()).length !== 1 ? 's' : ''}`;
    if (step === 2) return 'Next: Add Chores';
    if (step === 3) return addedChores.length > 0 ? `Save ${addedChores.length} Chore${addedChores.length !== 1 ? 's' : ''}` : 'Skip Chores';
    if (step === 4) return addedRewards.length > 0 ? `Save ${addedRewards.length} Reward${addedRewards.length !== 1 ? 's' : ''}` : 'Skip Rewards';
    return 'Go to Dashboard';
  };

  return (
    <div className="max-w-lg mx-auto py-4">
      <ProgressBar step={step} />

      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={step}
          custom={direction}
          variants={stepVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.25, ease: 'easeInOut' }}
        >
          {step === 0 && <WelcomeStep />}
          {step === 1 && <AddKidsStep kidNames={kidNames} setKidNames={setKidNames} />}
          {step === 2 && (
            <CategoriesStep
              categories={categories}
              seeded={categoriesSeeded}
              onSeed={() => seedCategories.mutate()}
              selectedCategories={selectedCategories}
              onToggleCategory={toggleCategory}
            />
          )}
          {step === 3 && (
            <AddChoresStep
              categories={categories.filter(c => selectedCategories.has(c.id))}
              createdKidIds={createdKidIds}
              addedChores={addedChores}
              setAddedChores={setAddedChores}
            />
          )}
          {step === 4 && (
            <AddRewardsStep
              addedRewards={addedRewards}
              setAddedRewards={setAddedRewards}
            />
          )}
          {step === 5 && (
            <DoneStep summary={{ kids: createdKidIds.length, chores: addedChores.length, rewards: addedRewards.length }} />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation buttons */}
      <div className="flex gap-3 mt-8">
        {step > 0 && step < 5 && (
          <button
            onClick={goBack}
            disabled={saving}
            className="btn btn-secondary flex items-center gap-1.5"
          >
            <ChevronLeft size={18} /> Back
          </button>
        )}
        <button
          onClick={handleNext}
          disabled={!canProceed() || saving}
          className="btn btn-primary flex-1 flex items-center justify-center gap-1.5 py-3 text-lg"
        >
          {nextLabel()}
          {step < 5 && <ChevronRight size={18} />}
        </button>
      </div>
      {step < 5 && (
        <div className="mt-3 text-center">
          <button
            onClick={skipSetup}
            className="text-sm text-text-muted hover:text-text-secondary transition-colors py-2 px-4"
          >
            Skip for now
          </button>
        </div>
      )}
    </div>
  );
}
