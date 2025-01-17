[![hacs_badge](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://github.com/custom-components/hacs)
![GitHub Release (latest SemVer including pre-releases)](https://img.shields.io/github/v/release/ad-ha/kidschores-ha?include_prereleases)
![GitHub Downloads (all assets, latest release)](https://img.shields.io/github/downloads/ad-ha/kidschores-ha/latest/total)

[![GitHub Actions](https://github.com/ad-ha/kidschores-ha/actions/workflows/validate.yaml/badge.svg)](https://github.com/ad-ha/kidschores-ha/actions/workflows/validate.yaml)
[![Hassfest](https://github.com/ad-ha/kidschores-ha/actions/workflows/hassfest.yaml/badge.svg)](https://github.com/ad-ha/kidschores-ha/actions/workflows/hassfest.yaml)


<p align="center">
   <img src="https://github.com/user-attachments/assets/e95bdb54-2c4c-4a84-96b4-f47a46a1228a">
</p>


# **KidsChores**

<a href="https://buymeacoffee.com/varetas3d" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/default-orange.png" alt="Buy Me A Coffee" height="41" width="174"></a>

**Important Notes:** 
- **This integration is in beta. You may encounter bugs or unexpected behaviors. Please report any issues through [Issues](https://github.com/ad-ha/kidschores-ha/issues).**
- **The integration requires initial setup through the Home Assistant wizard. Ensure you follow the installation steps carefully.**

## **INSTALLATION**

### - **HACS (Home Assistant Community Store)**

1. **Ensure HACS is installed.** If you haven't installed HACS yet, follow the [HACS installation guide](https://hacs.xyz/docs/installation/manual).
2. **Navigate to HACS** in your Home Assistant interface.
3. **Click on the three-dot menu** in the top right corner and select "Custom repositories."
   
   ![Add Repository](https://github.com/user-attachments/assets/0c36fafb-8b1f-424f-b9bb-3b32f674c0ea)


4. **Enter the repository URL:** `https://github.com/ad-ha/kidschores-ha`
5. **Select "Integration"** from the "Category" dropdown and click "ADD."

   ![Select Category](https://github.com/user-attachments/assets/d5480cc6-efb1-4238-b5d1-a31193d3353d)


6. **Search for "KidsChores"** in HACS and install the integration.
7. **Restart Home Assistant** to apply the changes.

### - **Manual Installation**

1. **Download the latest release** from the [KidsChores GitHub repository](https://github.com/ad-ha/kidschores-ha/releases).
2. **Unzip the downloaded file** and copy the `kidschores` directory to the `custom_components` folder in your Home Assistant configuration directory.
3. **Restart Home Assistant** to recognize the new integration.

## **CONFIGURATION**

[<img src="https://github.com/user-attachments/assets/36459daa-a780-448a-82a5-19ee07ccd3f6">](https://my.home-assistant.io/redirect/config_flow_start?domain=kidschores)

1. **Go to `Configuration` > `Integrations`** in Home Assistant.
2. **Click on the "+ Add Integration"** button.
3. **Search for "KidsChores"** and select the integration.
4. **Follow the setup wizard:**
   - **Define Points Label:** Choose a label for points (e.g., Stars, Bucks).
   - **Add Kids:** Enter the number of kids and define each kid with their name and optionally link to a Home Assistant user.
   - **Add Parents:** Enter the number of parents that you want to manage this integration.
   - **Add Chores, Badges, Rewards, and Penalties:** Define each with relevant details like names, descriptions, points, icons, etc.
5. **Finish the setup** and start managing your kids' chores and rewards directly from Home Assistant.

## **KIDSCHORES FEATURES**

### 🌟 **KidsChores Features:**

* 👧👦 **Manage Multiple Kids Effortlessly**
  * Create and customize profiles for each child.
  * Track individual progress and achievements.
  * Manage multiple kids with ease.

* 🧹 **Assign & Track Chores:**
  * Define chores with detailed descriptions, icons, and due dates.
  * Assign tasks to one or multiple kids and monitor completion status.
  * Track the status of each chore *(pending, claimed, approved, overdue...)* with sensors for each chore and kid.

* 🏅 **Award Badges & Rewards:**
  * Set up badges based on chore completion milestones.
  * Automatically assign badges when milestones are achieved.
  * Allow kids to redeem rewards using their earned points, motivating them to stay engaged.
  * Reward your kids with badges and incentives.

* ⚖️ **Apply Penalties When Needed:**
  * Implement penalties for missed chores to encourage accountability.
  * Automatically adjust points based on performance.*Maintain accountability with penalties.*

* 🔄 **Recurring Chores:**
  * Schedule chores to recur daily, weekly, or monthly.

* 🔒 **Parents' Approval Workflows:**
  * **Chore Approval:** Kids can claim chores, which then require parental approval before points are awarded.
  * **Reward Approval:** Parents can review and approve reward redemptions to ensure fair usage.

* 📈 **Long-Term Statistics with Built-In Storage:**
  * Track historical data on chore completions, points earned, and rewards redeemed.
  * Analyze trends and patterns to better understand your kids' progress over time.

* 🛠 **Customizable Points Naming:**
  * Personalize the points system by choosing your own naming conventions (e.g., Stars, Bucks, Coins) to make it more relatable and motivating for your kids.

  #### 🎨 **Customizable & User-Friendly:**
   * 🔧 **Easy Setup:** UI Setup, with a step-by-step Wizard, and several menu options for UI configuration once the integration is set up.

  * 🌐 **Multilingual Support**

### 📸 **Stay Tuned for More!**

* I am aiming to finalize the integration for a beta release within the upcoming week. Can't wait to share it with you all. Keep an eye out for the release.

### 📢 **Community Feedback:** 
* Share your thoughts and feature requests to help shape **KidsChores** into the perfect family management tool.

Thank you all.

Cheers :beers:

## **AVAILABLE SENSORS**

**KidsChores** provides a variety of sensors and binary sensors to manage and track your children's chores and rewards directly from Home Assistant.

### **SENSORS**

#### **General**
- **Kid Points Sensor:** Total points balance for each child.
- **Completed Chores Sensors:** Daily, weekly, and monthly completed chores.
- **Kid Badges Sensor:** Number of badges earned by each child.
- **Kid Highest Badge Sensor:** Highest earned badge based on thresholds.
- **Reward Claims and Approvals Sensors:** Track how many times rewards have been claimed and approved.
- **Chore Claims and Approvals Sensors:** Track how many times chores have been claimed and approved.
- **Penalty Applies Sensors:** Track how many times penalties have been applied to each child.
- **Pending Chore Approvals Sensor:** Lists all chores pending approval.
- **Pending Reward Approvals Sensor:** Lists all rewards pending approval.

### **BINARY SENSORS**

#### **Chore Status**
- **Chore Status Binary Sensor:** Indicates if a chore is approved or not claimed for each child.

#### **Badges Earned**
- **Badges Earned Binary Sensor:** Indicates if a child has earned any badges.

## **AVAILABLE ACTIONS**

**KidsChores** offers various actions (services) that you can use to manage chores and rewards for your children directly from Home Assistant:

- **Claim Chore**
- **Approve Chore**
- **Disapprove Chore**
- **Redeem Reward**
- **Approve Reward**
- **Disapprove Reward**
- **Apply Penalty**

**Note:** Actions can be accessed and activated from the **Actions** menu under **Developer Tools**.


## **SECURITY AND PRIVACY**

- **Local Data Storage:** All **KidsChores** data is stored locally on your Home Assistant instance, ensuring your family's information is secure.
- **No External Data:** No data is sent to external servers or shared with third parties.


## **CONTRIBUTING**

Contributions are welcome! If you have suggestions or find any issues, please open an [issue](https://github.com/ad-ha/kidschores-ha/issues) or a [pull request](https://github.com/ad-ha/kidschores-ha/pulls).


## **CREDITS**

This integration was made possible thanks to the support and contributions of the Home Assistant community and dedicated developers.


## **LICENSE**

This project is licensed under the [MIT License](LICENSE). See the LICENSE file for details.


## **DISCLAIMER**

THIS PROJECT IS NOT IN ANY WAY ASSOCIATED WITH OR RELATED TO ANY OFFICIAL ENTITY. The information here and online is for educational and resource purposes only, and the developers do not endorse or condone any inappropriate use of it, and take no legal responsibility for the functionality or security of your devices.
