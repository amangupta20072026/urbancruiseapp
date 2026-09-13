/**
 * ------------------------------------------------------------------
 * Customer Referrals — types
 * ------------------------------------------------------------------
 * SSoT for the Referral & Rewards screen. Kept role-scoped because
 * referrals are a customer-only surface today (vendor / driver / uc
 * don't have this feature). If a second role ever ships one, promote
 * to /shared/ rather than forking.
 *
 * When the /customer/referrals + /customer/rewards endpoints ship,
 * this file is the DTO contract.
 * ------------------------------------------------------------------
 */

/**
 * What triggered the reward. Drives the leading icon glyph + tint
 * on the recent-rewards list row.
 *
 *   friend_booking    — a referred friend completed their 1st trip
 *   special_campaign  — a marketing / seasonal bonus
 *   other             — catch-all for future kinds (adjustments,
 *                       corrections) so the mapping stays exhaustive
 *                       without a lint break every quarter
 */
export type RewardKind = 'friend_booking' | 'special_campaign' | 'other';

export type RewardItem = {
  id: string;
  kind: RewardKind;
  title: string;
  subtitle: string;
  /** ISO date the reward was credited. */
  date: string;
  /** Rupees for the demo; switch to Money + rupeesToMoney later. */
  amount: number;
};

/**
 * Top-of-screen summary. Everything that isn't per-row lives here so
 * the hero card + summary rail can render off a single object.
 */
export type ReferralSummary = {
  /** The customer's short shareable code, e.g. "AMAN123". */
  code: string;
  /** Total rupees ever credited across all rewards. */
  totalEarned: number;
};
