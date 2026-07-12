import { motion } from 'framer-motion';
import { HelpCircle, Rocket, ListChecks, CheckCircle2, Wallet, Gift, Trophy, Bell, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AccordionItem, AccordionSection } from '../components/Accordion';
import { InstallAppCard } from '../components/InstallAppCard';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { staggerContainer, cardVariants } from '../utils/animations';

/**
 * Parent Help page with FAQ sections.
 *
 * Accuracy contract: every claim here must describe REAL app behavior.
 * The v0.14.0 audit (2026-07-12) rewrote this page against the actual
 * backend/UI — when a feature changes, update the matching item.
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

      {/* Install as an app (hidden once running standalone) */}
      <motion.div variants={prefersReducedMotion ? undefined : cardVariants}>
        <InstallAppCard />
      </motion.div>

      {/* Getting Started */}
      <motion.div variants={prefersReducedMotion ? undefined : cardVariants}>
        <AccordionSection title="Getting Started" icon={<Rocket size={20} className="text-primary-500" />}>
          <AccordionItem question="How do I add a new kid?">
            <ol className="list-decimal list-inside space-y-2">
              <li>Go to the <strong>Parent</strong> tab (bottom right)</li>
              <li>Select the <strong>Kids</strong> tab at the top</li>
              <li>Tap <strong>Add Kid</strong>, enter the kid's name, and tap <strong>Add</strong></li>
            </ol>
            <p className="mt-2">Each kid gets their own profile with points, streaks, and badges. Use <strong>Edit</strong> on a kid to pick their accent color or link a Google email so they can sign in on their own device.</p>
          </AccordionItem>

          <AccordionItem question="How do I set up my first chore?">
            <ol className="list-decimal list-inside space-y-2">
              <li>Go to <strong>Parent</strong> → <strong>Chores</strong> tab</li>
              <li>Tap <strong>Add Chore</strong> and enter a name</li>
              <li>Pick an icon and (optionally) a category</li>
              <li>Set the point value</li>
              <li>Assign it to one or more kids (adults can take chores too)</li>
              <li>Choose how it repeats: Daily, Weekly, Biweekly, or Monthly</li>
              <li>Optionally set a due date and toggle the days of the week it applies</li>
            </ol>
          </AccordionItem>

          <AccordionItem question="What's the difference between kid mode and parent mode?">
            <p className="mb-2"><strong>Kid Mode:</strong> Kids can view their chores, claim completed chores, check their points, and redeem rewards. They see a simplified, gamified interface.</p>
            <p className="mb-2"><strong>Parent Mode:</strong> Parents can manage kids, create/edit chores, approve claims, run challenges, configure allowance, and access all settings. Accessed via the Parent tab.</p>
            <p>On a shared device, the profile picker chooses whose view to show. A kid with a linked Google email can sign in on their own device and only sees their own stuff.</p>
          </AccordionItem>

          <AccordionItem question="Can I change how the app looks?">
            <p className="mb-2">Yes — the theme toggle offers <strong>Light</strong>, <strong>Dark</strong>, and <strong>System</strong> (dark is the default).</p>
            <p>Each kid also has their own accent color (set via <strong>Parent</strong> → <strong>Kids</strong> → <strong>Edit</strong>) that tints their cards, avatar ring, and progress bars.</p>
          </AccordionItem>
        </AccordionSection>
      </motion.div>

      {/* Managing Chores */}
      <motion.div variants={prefersReducedMotion ? undefined : cardVariants}>
        <AccordionSection title="Managing Chores" icon={<ListChecks size={20} className="text-accent-500" />}>
          <AccordionItem question="How do recurring chores work?">
            <p className="mb-2">Recurring chores automatically reset overnight so kids can complete them again:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Daily:</strong> Resets every night</li>
              <li><strong>Weekly / Biweekly:</strong> Resets on the days you toggle under "Applicable Days"</li>
              <li><strong>Monthly:</strong> Resets on the 1st of the month</li>
            </ul>
            <p className="mt-2">Old claims are marked as "expired" when the chore resets.</p>
          </AccordionItem>

          <AccordionItem question="What are chore categories and how do I use them?">
            <p className="mb-2">Categories organize chores by room or type. The built-in set:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>🛏️ Bedroom</li>
              <li>🍳 Kitchen</li>
              <li>🚿 Bathroom</li>
              <li>🛋️ Living Room</li>
              <li>🌳 Outdoor</li>
              <li>📚 School</li>
              <li>🐾 Pet Care</li>
            </ul>
            <p className="mt-2">Pick a category when creating or editing a chore. Kids can filter their Chores page by category.</p>
          </AccordionItem>

          <AccordionItem question="Can I limit a chore to specific days of the week?">
            <p>Yes! Every chore has an <strong>Applicable Days</strong> row (Sun–Sat toggles) in the create/edit form:</p>
            <ol className="list-decimal list-inside space-y-2 mt-2">
              <li>Toggle the days the chore should appear (e.g., Mon, Wed, Fri)</li>
              <li>Leave all days untoggled to make it apply every day</li>
            </ol>
            <p className="mt-2">This works with any recurrence — a weekly chore with Mon/Wed/Fri toggled shows up only on those days.</p>
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
              <li>Go to <strong>Parent</strong> → <strong>Approve</strong> tab (it opens there by default)</li>
              <li>You'll see all pending claims and reward requests</li>
              <li>Tap ✓ to approve or ✗ to disapprove</li>
              <li>Points are awarded immediately upon approval</li>
            </ol>
          </AccordionItem>

          <AccordionItem question="How do daily bonuses and multipliers work?">
            <p className="mb-2">Two ways kids earn extra:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Daily completion bonus:</strong> finishing <strong>all</strong> of the day's chores earns a <strong>+10 point bonus</strong>, awarded automatically overnight. The Daily Progress bar shows how close they are.</li>
              <li><strong>Badge multipliers:</strong> the Monthly Master (30-day streak) and Legend (2,500 points) badges each permanently boost that kid's points by 10% on every chore.</li>
            </ul>
          </AccordionItem>

          <AccordionItem question="How do streaks work?">
            <p className="mb-2">Streaks track consecutive days where all chores got done:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Complete every chore for the day to keep the streak going (counted overnight)</li>
              <li>Streaks are displayed with a 🔥 flame icon</li>
              <li>Milestone celebrations at 3, 7, 14, 30, and 100 days</li>
              <li>Streak badges unlock at 3, 7, and 30 days</li>
              <li>Personal best streak is tracked</li>
            </ul>
          </AccordionItem>

          <AccordionItem question="What happens if my kid misses a day?">
            <p className="mb-2">If the day's chores aren't all completed:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>A <strong>streak freeze</strong> is used automatically (if the kid has one) and the streak survives</li>
              <li>Otherwise the streak counter resets to 0</li>
            </ul>
            <p className="mt-2">Kids <strong>earn a streak freeze at every streak milestone from 7 days up</strong> (7, 14, 30, …) and can stockpile up to 3. The ❄️ count shows next to their streak.</p>
          </AccordionItem>
        </AccordionSection>
      </motion.div>

      {/* Badges & Challenges */}
      <motion.div variants={prefersReducedMotion ? undefined : cardVariants}>
        <AccordionSection title="Badges & Challenges" icon={<Trophy size={20} className="text-accent-500" />}>
          <AccordionItem question="What are badges and how are they earned?">
            <p className="mb-2">Badges are permanent trophies that unlock automatically — no setup needed. Examples:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>First Steps:</strong> complete a first chore</li>
              <li><strong>On Fire / Week Warrior / Monthly Master:</strong> 3, 7, and 30-day streaks</li>
              <li><strong>Goal Crusher / Legend:</strong> reach 1,000 / 2,500 lifetime points</li>
              <li><strong>Champion:</strong> redeem a first reward</li>
            </ul>
            <p className="mt-2">Badges show on each kid's Home card (tap one for details), unlock with a full-screen celebration, and the rarest ones permanently boost the kid's point multiplier.</p>
          </AccordionItem>

          <AccordionItem question="How do challenges work?">
            <ol className="list-decimal list-inside space-y-2">
              <li>Go to <strong>Parent</strong> → <strong>Challenges</strong> tab</li>
              <li>Create a time-boxed goal: complete <em>N</em> chores or earn <em>N</em> points by a deadline</li>
              <li>Attach a reward — bonus points and/or a badge</li>
              <li>Kids watch their live progress bars on the Chores page</li>
            </ol>
            <p className="mt-2"><strong>Quick start:</strong> the three one-tap templates — Weekend Warrior (5 chores), Point Sprint (100 points), and Perfect Week (7 chores) — set everything up for you.</p>
          </AccordionItem>
        </AccordionSection>
      </motion.div>

      {/* Allowance System */}
      <motion.div variants={prefersReducedMotion ? undefined : cardVariants}>
        <AccordionSection title="Allowance System" icon={<Wallet size={20} className="text-green-500" />}>
          <AccordionItem question="How do I set up allowance for my kid?">
            <ol className="list-decimal list-inside space-y-2">
              <li>Go to the <strong>Allowance</strong> page and pick a kid (tabs at the top)</li>
              <li>Tap the <strong>gear icon</strong> to open Allowance Settings</li>
              <li>Set <strong>Points per dollar</strong> (default: 100 points = $1) and the <strong>minimum payout</strong></li>
            </ol>
          </AccordionItem>

          <AccordionItem question="How does point-to-dollar conversion work?" defaultOpen>
            <p className="mb-2">Kids can convert their points to real money:</p>
            <ol className="list-decimal list-inside space-y-2">
              <li>Kid goes to the <strong>Allowance</strong> page</li>
              <li>Enters how many points to convert and sees the dollar equivalent</li>
              <li>Picks how they'd like it: Cash, Bank Transfer, or Gift Card</li>
              <li>Submits the request — <strong>points are deducted right away</strong></li>
              <li>The request appears for parents under <strong>Pending Approvals</strong></li>
            </ol>
            <p className="mt-2"><strong>Example:</strong> With 100 points/dollar, 250 points = $2.50</p>
          </AccordionItem>

          <AccordionItem question="How do I pay out (or cancel) a request?">
            <ol className="list-decimal list-inside space-y-2">
              <li>Go to <strong>Allowance</strong> → <strong>Pending Approvals</strong></li>
              <li>Hand over the money, then tap <strong>Mark Paid</strong> to record it</li>
              <li>Or tap <strong>Cancel</strong> — the points go straight back to the kid</li>
            </ol>
            <p className="mt-2">The points were already deducted when the kid made the request, so Mark Paid just records that you've paid.</p>
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
              <li>Enter a name and point cost, and choose an icon</li>
              <li>Tick or untick <strong>Requires approval</strong></li>
            </ol>
            <p className="mt-2"><strong>Ideas:</strong> Screen time, treats, outings, toys, special privileges</p>
          </AccordionItem>

          <AccordionItem question="How do kids redeem rewards?">
            <ol className="list-decimal list-inside space-y-2">
              <li>Kid goes to the <strong>Rewards</strong> page</li>
              <li>Browses available rewards</li>
              <li>Taps <strong>Redeem</strong> on one they can afford</li>
              <li>If approval is required, the request appears in Parent → Approve and points are held until you approve</li>
              <li>Instant rewards deduct points immediately</li>
            </ol>
          </AccordionItem>

          <AccordionItem question="Can I require approval for reward redemptions?">
            <p className="mb-2">Yes — every reward has a <strong>Requires approval</strong> setting (on by default) in the add/edit form.</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>With approval:</strong> Request appears in Parent → Approve</li>
              <li><strong>Without approval:</strong> Points deducted immediately ("instant")</li>
            </ul>
            <p className="mt-2">Tip: Require approval for big rewards (toys, outings) but not small ones (extra screen time).</p>
          </AccordionItem>
        </AccordionSection>
      </motion.div>

      {/* Notifications */}
      <motion.div variants={prefersReducedMotion ? undefined : cardVariants}>
        <AccordionSection title="Notifications" icon={<Bell size={20} className="text-primary-500" />}>
          <AccordionItem question="How do I turn on push notifications?">
            <ol className="list-decimal list-inside space-y-2">
              <li>Open <strong>Notification Settings</strong> (the bell icon)</li>
              <li>Choose who this device belongs to: <strong>Parent</strong> (all notifications) or a specific kid (only theirs)</li>
              <li>Tap <strong>Enable Push Notifications</strong> and allow the browser prompt</li>
              <li>Use <strong>Send Test</strong> to confirm it works</li>
            </ol>
            <p className="mt-2">Do this on each device — subscriptions are per-device.</p>
          </AccordionItem>

          <AccordionItem question="Who gets notified about what?">
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Parents:</strong> when a kid claims a chore</li>
              <li><strong>Kids:</strong> when their chore is approved, when they unlock a badge</li>
              <li><strong>Everyone:</strong> streak milestone celebrations (7, 14, 30+ days)</li>
            </ul>
          </AccordionItem>

          <AccordionItem question="Notifications aren't arriving — what should I check?">
            <ul className="list-disc list-inside space-y-1">
              <li>Chrome works out of the box; <strong>Brave</strong> needs "Use Google services for push messaging" enabled in its privacy settings</li>
              <li>Make sure the site (or installed app) is allowed to send notifications in your phone's settings</li>
              <li>Re-enable on the Notification Settings page and use <strong>Send Test</strong></li>
            </ul>
          </AccordionItem>
        </AccordionSection>
      </motion.div>

      {/* App Version + attribution */}
      <motion.div variants={prefersReducedMotion ? undefined : cardVariants} className="mt-8 text-center">
        <p className="text-xs text-text-muted font-mono opacity-60">
          KidsChores v{__APP_VERSION__}
        </p>
        <p className="text-[11px] text-text-muted opacity-60 mt-1">
          Emoji artwork:{' '}
          <a
            href="https://github.com/jdecked/twemoji"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            Twemoji
          </a>{' '}
          © Twitter, Inc and contributors,{' '}
          <a
            href="https://creativecommons.org/licenses/by/4.0/"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            CC-BY 4.0
          </a>
        </p>
      </motion.div>
    </motion.div>
  );
}
