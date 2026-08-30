/**
 * ------------------------------------------------------------------
 * Money
 * ------------------------------------------------------------------
 * Stored as INTEGER PAISE, never as float rupees. Floats round
 * unpredictably and cause payment-reconciliation bugs.
 *
 * ₹1234.56 → { amount: 123456, currency: 'INR' }
 * ------------------------------------------------------------------
 */

export type Money = {
  amount: number; // paise, always integer
  currency: 'INR';
};

export const money = (amountInPaise: number): Money => ({
  amount: Math.round(amountInPaise),
  currency: 'INR',
});

export const rupeesToMoney = (rupees: number): Money =>
  money(Math.round(rupees * 100));

export const moneyToRupees = (m: Money): number => m.amount / 100;

export const addMoney = (a: Money, b: Money): Money => {
  if (a.currency !== b.currency) throw new Error('Currency mismatch');
  return money(a.amount + b.amount);
};

export const subtractMoney = (a: Money, b: Money): Money => {
  if (a.currency !== b.currency) throw new Error('Currency mismatch');
  return money(a.amount - b.amount);
};

export const isZeroMoney = (m: Money): boolean => m.amount === 0;
export const isPositiveMoney = (m: Money): boolean => m.amount > 0;
export const isNegativeMoney = (m: Money): boolean => m.amount < 0;

/** Format for display, e.g. 123456 → "₹1,234.56". */
export const formatMoney = (m: Money): string => {
  const rupees = moneyToRupees(m);
  return `₹${rupees.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};
