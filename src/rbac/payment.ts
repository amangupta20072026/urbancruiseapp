/**
 * ------------------------------------------------------------------
 * RBAC Payment Rules
 * ------------------------------------------------------------------
 * Payment ceiling — customer can never pay more than the current
 * booking amount. Server enforces; client mirrors for UX.
 * ------------------------------------------------------------------
 */

import {
  subtractMoney,
  isPositiveMoney,
  isZeroMoney,
  type Money,
} from '@app-types/currency';

export type PaymentSummary = {
  bookingAmount: Money;
  paid: Money;
};

export function remainingPayable(summary: PaymentSummary): Money {
  return subtractMoney(summary.bookingAmount, summary.paid);
}

export function canPayAmount(summary: PaymentSummary, attempt: Money): boolean {
  const remaining = remainingPayable(summary);
  if (!isPositiveMoney(remaining)) return false;
  if (attempt.amount <= 0) return false;
  return attempt.amount <= remaining.amount;
}

export function isFullyPaid(summary: PaymentSummary): boolean {
  return isZeroMoney(remainingPayable(summary));
}
