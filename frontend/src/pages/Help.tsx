import { motion } from 'framer-motion';
import { HelpCircle, Rocket, ListChecks, CheckCircle2, Wallet, Gift, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AccordionItem, AccordionSection } from '../components/Accordion';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { staggerContainer, cardVariants } from '../utils/animations';

/**
 * Parent Help page with FAQ sections
 */
export default function Help() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      variants={prefersReducedMotion ? undefined : staggerContainer}
      initial={prefersReducedMotion ? false : 'hidden'}
      animate="visible"
      className="container max-w-2xl mx-auto p-4 pb-24"
    >
      {/* Header */}
      <motion.div variants={prefersReducedMotion ? undefined : cardVariants} className="mb-6">
        <Link
          to="/admin"
          className="inline-flex items-center gap-1 text-sm text-primary-500 hover:text-primary-600 mb-4"
        >
          <ArrowLeft size={16} />
          Back to Admin
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-xl">
            <HelpCircle className="w-8 h-8 text-primary-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Parent Guide</h1>
            <p className="text-text-secondary">How to use KidsChores</p>
          </div>
        </div>
      </motion.div>

      {/* Getting Started */}
      <motion.div variants={prefersReducedMotion ? undefined : cardVariants}>
        <AccordionSection title="Getting Started" icon={<Rocket size={20} className="text-primary-500" />}>
          <AccordionItem question="How do I add a new kid?">
            <ol className="list-decimal list-inside space-y-2">
              <li>Go to the <strong>Parent</strong> tab (bottom right)</li>
              <li>Select the <strong>Kids</strong> tab at the top</li>
              <li>Tap <strong>Add Kid</strong></li>
              <li>Enter the kid's name and save</li>
            </ol>
            <p className="mt-2">Each kid gets their own profile with points, streaks, and badges.</p>
          </AccordionItem>

          <AccordionItem question="How do I set up my first chore?">
            <ol className="list-decimal list-inside space-y-2">
              <li>Go to <strong>Parent</strong> → <strong>Chores</strong> tab</li>
              <li>Tap <strong>Add Chore</strong></li>
              <li>Enter a name, description, and point value</li>
              <li>Choose an icon and category</li>
              <li>Assign it to one or more kids</li>
              <li>Set up recurring schedule if needed</li>
            </ol>
          </AccordionItem>

          <AccordionItem question="What's the difference between kid mode and parent mode?">
            <p className="mb-2"><strong>Kid Mode:</strong> Kids can view their chores, claim completed chores, check their points, and redeem rewards. They see a simplified, gamified interface.</p>
            <p><strong>Parent Mode:</strong> Parents can manage kids, create/edit chores, approve claims, configure allowance, and access all settings. Accessed via the Parent tab.</p>
          </AccordionItem>
        </AccordionSection>
      </motion.div>

      {/* Managing Chores */}
      <motion.div variants={prefersReducedMotion ? undefined : cardVariants}>
        <AccordionSection title="Managing Chores" icon={<ListChecks size={20} className="text-accent-500" />}>
          <AccordionItem question="How do recurring chores work?">
            <p className="mb-2">Recurring chores automatically reset so kids can complete them again:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Daily:</strong> Resets every day at midnight</li>
              <li><strong>Weekly:</strong> Resets once per week (choose specific days)</li>
              <li><strong>Monthly:</strong> Resets once per month</li>
            </ul>
            <p className="mt-2">Old claims are marked as "expired" when the chore resets.</p>
          </AccordionItem>

          <AccordionItem question="What are chore categories and how do I use them?">
            <p className="mb-2">Categories help organize chores by room or type. Default categories include:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>🛏️ Bedroom</li>
              <li>🍳 Kitchen</li>
              <li>🚿 Bathroom</li>
              <li>🛋️ Living Room</li>
              <li>🌳 Outdoor</li>
              <li>📚 School</li>
              <li>🐾 Pet Care</li>
            </ul>
            <p className="mt-2">Kids can filter chores by category on the Chores page.</p>
          </AccordionItem>

          <AccordionItem question="Can I assign chores to specific days of the week?">
            <p>Yes! When creating or editing a chore:</p>
            <ol className="list-decimal list-inside space-y-2 mt-2">
              <li>Set <strong>Recurring</strong> to "Weekly"</li>
              <li>Select the specific days (e.g., Mon, Wed, Fri)</li>
              <li>The chore will only appear on those days</li>
            </ol>
          </AccordionItem>

          <AccordionItem question="How do I edit or delete a chore?">
            <ol className="list-decimal list-inside space-y-2">
              <li>Go to <strong>Parent</strong> → <strong>Chores</strong></li>
              <li>Find the chore and tap the <strong>Edit</strong> button</li>
              <li>Make your changes or tap <strong>Delete</strong></li>
            </ol>
            <p className="mt-2 text-status-warning">⚠️ Deleting a chore removes all its history and pending claims.</p>
          </AccordionItem>
        </AccordionSection>
      </motion.div>

      {/* Approvals & Points */}
      <motion.div variants={prefersReducedMotion ? undefined : cardVariants}>
        <AccordionSection title="Approvals & Points" icon={<CheckCircle2 size={20} className="text-status-success" />}>
          <AccordionItem question="How do I approve a chore claim?">
            <ol className="list-decimal list-inside space-y-2">
              <li>Go to <strong>Parent</strong> → <strong>Approvals</strong> tab</li>
              <li>You'll see all pending claims</li>
              <li>Tap ✓ to approve or ✗ to disapprove</li>
              <li>Points are awarded immediately upon approval</li>
            </ol>
          </AccordionItem>

          <AccordionItem question="What are point multipliers and how do they work?">
            <p className="mb-2">Kids earn bonus points when they complete <strong>all</strong> their daily chores:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>100% completion:</strong> 1.5x multiplier bonus</li>
              <li>Bonus is applied to total points earned that day</li>
            </ul>
            <p className="mt-2">The Daily Progress bar shows how close they are to the bonus.</p>
          </AccordionItem>

          <AccordionItem question="How do streaks work?">
            <p className="mb-2">Streaks track consecutive days of chore completion:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Complete at least one chore daily to maintain streak</li>
              <li>Streaks are displayed with a 🔥 flame icon</li>
              <li>Milestone celebrations at 3, 7, 14, 30, and 100 days</li>
              <li>Personal best streak is tracked</li>
            </ul>
          </AccordionItem>

          <AccordionItem question="What happens if my kid misses a day?">
            <p className="mb-2">If no chores are completed for a day:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>The streak counter resets to 0</li>
              <li>Streak freezes (if available) can prevent this</li>
              <li>Kids can earn streak freezes as rewards</li>
            </ul>
          </AccordionItem>
        </AccordionSection>
      </motion.div>

      {/* Allowance System */}
      <motion.div variants={prefersReducedMotion ? undefined : cardVariants}>
        <AccordionSection title="Allowance System" icon={<Wallet size={20} className="text-green-500" />}>
          <AccordionItem question="How do I set up allowance for my kid?">
            <ol className="list-decimal list-inside space-y-2">
              <li>Go to the <strong>Allowance</strong> page</li>
              <li>Select a kid from the dropdown</li>
              <li>Configure settings:
                <ul className="list-disc list-inside ml-4 mt-1">
                  <li><strong>Points per dollar:</strong> How many points = $1 (default: 100)</li>
                  <li><strong>Minimum payout:</strong> Smallest amount to convert</li>
                </ul>
              </li>
            </ol>
          </AccordionItem>

          <AccordionItem question="How does point-to-dollar conversion work?" defaultOpen>
            <p className="mb-2">Kids can request to convert their points to real money:</p>
            <ol className="list-decimal list-inside space-y-2">
              <li>Kid goes to <strong>Allowance</strong> page</li>
              <li>Enters how many points to convert</li>
              <li>Sees the dollar equivalent</li>
              <li>Submits a payout request</li>
              <li>Parent approves and pays out</li>
            </ol>
            <p className="mt-2"><strong>Example:</strong> With 100 points/dollar, 250 points = $2.50</p>
          </AccordionItem>

          <AccordionItem question="How do I mark a payout as paid?">
            <ol className="list-decimal list-inside space-y-2">
              <li>Go to <strong>Allowance</strong> → <strong>Pending Payouts</strong></li>
              <li>Find the payout request</li>
              <li>Tap <strong>Mark Paid</strong></li>
              <li>The points are deducted from the kid's balance</li>
            </ol>
          </AccordionItem>
        </AccordionSection>
      </motion.div>

      {/* Rewards */}
      <motion.div variants={prefersReducedMotion ? undefined : cardVariants}>
        <AccordionSection title="Rewards" icon={<Gift size={20} className="text-purple-500" />}>
          <AccordionItem question="How do I create a reward?">
            <ol className="list-decimal list-inside space-y-2">
              <li>Go to <strong>Parent</strong> → <strong>Rewards</strong> tab</li>
              <li>Tap <strong>Add Reward</strong></li>
              <li>Enter name, description, and point cost</li>
              <li>Choose an icon</li>
              <li>Set whether approval is required</li>
            </ol>
            <p className="mt-2"><strong>Ideas:</strong> Screen time, treats, outings, toys, special privileges</p>
          </AccordionItem>

          <AccordionItem question="How do kids redeem rewards?">
            <ol className="list-decimal list-inside space-y-2">
              <li>Kid goes to the <strong>Rewards</strong> page</li>
              <li>Browses available rewards</li>
              <li>Taps <strong>Redeem</strong> on one they can afford</li>
              <li>If approval required, parent sees request in Approvals</li>
              <li>Points are deducted when redeemed/approved</li>
            </ol>
          </AccordionItem>

          <AccordionItem question="Can I require approval for reward redemptions?">
            <p className="mb-2">Yes! When creating a reward, enable <strong>Requires Approval</strong>.</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>With approval:</strong> Request appears in Parent → Approvals</li>
              <li><strong>Without approval:</strong> Points deducted immediately</li>
            </ul>
            <p className="mt-2">Tip: Require approval for big rewards (toys, outings) but not small ones (extra screen time).</p>
          </AccordionItem>
        </AccordionSection>
      </motion.div>
    </motion.div>
  );
}
