[![HACS Custom](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://github.com/custom-components/hacs)
![GitHub Release (latest SemVer including pre-releases)](https://img.shields.io/github/v/release/ad-ha/kidschores-ha?include_prereleases)
![GitHub Downloads (all assets, latest release)](https://img.shields.io/github/downloads/ad-ha/kidschores-ha/latest/total)

[![GitHub Actions](https://github.com/ad-ha/kidschores-ha/actions/workflows/validate.yaml/badge.svg)](https://github.com/ad-ha/kidschores-ha/actions/workflows/validate.yaml)
[![Hassfest](https://github.com/ad-ha/kidschores-ha/actions/workflows/hassfest.yaml/badge.svg)](https://github.com/ad-ha/kidschores-ha/actions/workflows/hassfest.yaml)


<h1>KidsChores</h1>

<p align="center">
  <img src="https://github.com/user-attachments/assets/e95bdb54-2c4c-4a84-96b4-f47a46a1228a" alt="KidsChores logo" width="300">
</p>
<p align="center">
  <a href="https://buymeacoffee.com/varetas3d" target="_blank">
    <img src="https://cdn.buymeacoffee.com/buttons/default-orange.png" alt="Buy Me A Coffee" height="41" width="174">
  </a>
</p>
<p>
  <br>
</p>

**Important Notes:**  
- **This integration is in beta.** Bugs and unexpected behaviors may occur. Please report any issues via [GitHub Issues](https://github.com/ad-ha/kidschores-ha/issues).  
- **Setup:** The integration must be configured through the Home Assistant wizard. Follow the installation steps carefully.

---

## INSTALLATION

### - **HACS (Home Assistant Community Store)**

1. **Ensure HACS is installed.** If you haven't yet installed HACS, follow the [HACS installation guide](https://hacs.xyz/docs/installation/manual).
2. In Home Assistant, navigate to **HACS**.
3. Click the three-dot menu in the top-right corner and select **"Custom repositories"**.  
   ![Add Repository](https://github.com/user-attachments/assets/0c36fafb-8b1f-424f-b9bb-3b32f674c0ea)
4. Enter the repository URL:  
   `https://github.com/ad-ha/kidschores-ha`
5. Select **"Integration"** from the Category dropdown and click **"ADD"**.  
![Select Category](https://github.com/user-attachments/assets/d5480cc6-efb1-4238-b5d1-a31193d3353d)
6. Search for **"KidsChores"** in HACS and install the integration.
7. **Restart Home Assistant** to apply the changes.

### - **Manual Installation**

1. Download the latest release from the [KidsChores GitHub repository](https://github.com/ad-ha/kidschores-ha/releases).
2. Unzip the downloaded file and copy the `kidschores` directory to the `custom_components` folder in your Home Assistant configuration directory.
3. **Restart Home Assistant** to recognize the new integration.

---

## CONFIGURATION

[<img src="https://github.com/user-attachments/assets/36459daa-a780-448a-82a5-19ee07ccd3f6" alt="Configuration Flow">](https://my.home-assistant.io/redirect/config_flow_start?domain=kidschores)

1. Go to **Configuration > Integrations** in Home Assistant.
2. Click **"+ Add Integration"** and search for **"KidsChores"**.
3. Follow the setup wizard:
- **Define Points Label:** Choose your points name (e.g., Stars, Bucks, Coins).
- **Add Kids & Parents:** Create profiles for your kids and assign parents.
- **Define Chores, Badges, Rewards, Penalties, Achievements, and Challenges:** Provide detailed settings such as names, descriptions, points, icons, due dates, and recurring schedules.
4. Finish the setup to start managing your kids’ chores and rewards directly from Home Assistant.
5. Use the **Options Flow** to edit, add, or delete any entities as needed.

---

## KIDSCHORES FEATURES

### 🌟 **Core Features**

* 👧👦 **Multi-User Management:**  
  - Create and manage profiles for multiple kids.  
  - Track individual progress and achievements.

* 🧹 **Chore Management:**  
  - **Assign & Track:** Define chores with descriptions, icons, due dates, and recurring schedules (daily/weekly/monthly).  
  - **Chore States:** Monitor each chore's status *(pending, claimed, approved, overdue, etc.)* both individually and globally (for shared chores).

* 🏅 **Rewards, Badges, & Achievements:**  
  - **Reward Redemption:** Kids can claim rewards that require parental approval before points are deducted.  
  - **Badge Awards:** Automatically award badges when milestones are reached.  
  - **Achievements & Challenges:** Track streaks and overall totals with progress sensors.

* ⚖️ **Penalty Application:**  
  - Apply penalties for missed chores and adjust points accordingly.

* 🔄 **Recurring Chores:**  
  - Schedule recurring chores with automated due date resets.

* 📢 **Actionable Notifications:**  
  - **Context-Encoded Actions:** Notifications include actionable buttons. 
  - **Reminder Actions:** 30 minute Reminder buttons for pending approvals.

* 🎯 **Points Customization:**  
  - Personalize the points system by choosing custom names and icons (e.g., Stars, Bucks, Coins).

* 📈 **Detailed Statistics:**
  - Comprehensive sensors track daily, weekly, monthly, and total metrics for chores, points, rewards, badges, penalties, achievements, and challenges.
  - Build your own statistics from the sensors available and options inside Home Assistant.

* 🔧 **Dynamic Buttons & Actions:**  
  - Use buttons to claim, approve, disapprove, redeem, adjust points, and more—all with built-in authorization checks.

* 🔐 **Security & Privacy:**  
  - All data is stored locally on your Home Assistant instance with no external data sharing.

---

## AVAILABLE SENSORS

### **Kid & Points Sensors**
- **KidPointsSensor:** Displays each kid's total points.
- **KidPointsEarnedDailySensor:** Net points earned by a kid today.
- **KidPointsEarnedWeeklySensor:** Points earned during the week.
- **KidPointsEarnedMonthlySensor:** Points earned during the month.
- **KidMaxPointsEverSensor:** The highest points total ever reached by a kid.

### **Chore Sensors**
- **CompletedChoresTotalSensor:** Total chores completed by a kid.
- **CompletedChoresDailySensor:** Chores completed today.
- **CompletedChoresWeeklySensor:** Chores completed this week.
- **CompletedChoresMonthlySensor:** Chores completed this month.
- **ChoreStatusSensor:** For each (kid, chore) – shows current status (pending, claimed, approved, overdue).
- **ChoreStreakSensor:** Current streak (in days) for a chore per kid.
- **SharedChoreGlobalStateSensor:** Global state for shared chores.

### **Badge, Reward & Penalty Sensors**
- **KidBadgesSensor:** Number of badges earned by a kid.
- **KidHighestBadgeSensor:** The highest badge achieved by a kid (by threshold).
- **BadgeSensor:** One sensor per badge (threshold value, who earned it).
- **RewardClaimsSensor:** Number of times a reward has been claimed.
- **RewardApprovalsSensor:** Number of times a reward has been approved.
- **RewardStatusSensor:** Current reward status per kid *(Not Claimed, Claimed, Approved)*.
- **ChoreClaimsSensor:** Number of times a chore has been claimed.
- **ChoreApprovalsSensor:** Number of times a chore has been approved.
- **PenaltyAppliesSensor:** Tracks how many times each penalty was applied.

### **Approval & Progress Sensors**
- **PendingChoreApprovalsSensor:** Lists chores awaiting approval.
- **PendingRewardApprovalsSensor:** Lists rewards awaiting approval.
- **AchievementSensor:** Details an achievement (name, target, reward, kids awarded).
- **ChallengeSensor:** Details a challenge (name, target, reward, completion count).
- **AchievementProgressSensor:** Progress (in percentage) toward an achievement per kid.
- **ChallengeProgressSensor:** Progress (in percentage) toward a challenge per kid.
- **KidHighestStreakSensor:** Highest current streak among streak achievements.

---

## AVAILABLE BUTTONS

Dynamic buttons are provided for direct actions from the Home Assistant UI:
- **Chore Buttons:** Claim, Approve, and Disapprove chores.
- **Reward Buttons:** Redeem, Approve, and Disapprove rewards.
- **Penalty Buttons:** Apply penalties.
- **Points Adjust Buttons:** Increment or decrement points (e.g., +1, -1, +10, -10).
- **Workflow Buttons:** For parental approval and reward workflows.

*Note: All buttons enforce authorization via Home Assistant user IDs and provide contextual actionable notifications with encoded context (e.g., `REMIND_30|kid123|chore456`).*

---

## OPTIONS FLOW

The integration includes an interactive Options Flow that allows you to add, edit, or delete:
- Kids  
- Parents  
- Chores  
- Badges  
- Rewards  
- Penalties  
- Achievements  
- Challenges  

This flow uses internal IDs for consistency and to preserve historical data, making configuration and updates seamless.

---

## SECURITY & PRIVACY

- **Local Data Storage:** All data is stored on your Home Assistant instance.
- **No External Data Sharing:** Your family's information remains local and private.

---

## CONTRIBUTING

Contributions are very welcome! If you have suggestions or encounter any issues:
- Open an [issue](https://github.com/ad-ha/kidschores-ha/issues).
- Submit a [pull request](https://github.com/ad-ha/kidschores-ha/pulls).


---

## LICENSE

This project is licensed under the [GPL-3.0 license](LICENSE). See the LICENSE file for details.

---

## DISCLAIMER

THIS PROJECT IS NOT AFFILIATED WITH OR ENDORSED BY ANY OFFICIAL ENTITY. The information provided is for educational purposes only, and the developers assume no legal responsibility for the functionality or security of your devices.

   
