/**
 * ------------------------------------------------------------------
 * Customer Referrals — mock fixture
 * ------------------------------------------------------------------
 * Seeds the Referral & Rewards screen with a code, a total, and a
 * short recent-rewards list. Fixed dates so demo screenshots stay
 * stable across sessions.
 *
 * DELETE when the referrals + rewards endpoints ship.
 * ------------------------------------------------------------------
 */

import type { ReferralSummary, RewardItem } from './types';

export const MOCK_REFERRAL_SUMMARY: ReferralSummary = {
  code: 'AMAN123',
  totalEarned: 2_500,
};

export const MOCK_RECENT_REWARDS: readonly RewardItem[] = [
  {
    id: 'r_001',
    kind: 'friend_booking',
    title: 'Friend Booking Reward',
    subtitle: 'Rahul Sharma completed first booking',
    date: '2026-09-12',
    amount: 500,
  },
  {
    id: 'r_002',
    kind: 'friend_booking',
    title: 'Friend Booking Reward',
    subtitle: 'Priya Verma completed first booking',
    date: '2026-08-28',
    amount: 500,
  },
  {
    id: 'r_003',
    kind: 'special_campaign',
    title: 'Special Campaign Reward',
    subtitle: 'Monsoon Travel Offer',
    date: '2026-08-15',
    amount: 1_000,
  },
];
