/**
 * ------------------------------------------------------------------
 * Plan a Trip — dummy data
 * ------------------------------------------------------------------
 * Used until the manager approves the flow and the backend is
 * connected. Then:
 *   - MOCK_PLAN_TRIP_TYPES  → comes from the backend (dropdown list)
 *   - MOCK_TRIP_REQUESTS    → comes from the customer's open leads
 * ------------------------------------------------------------------
 */

import type { CustomerTripRequest, PlanTripTypeOption } from './types';

export const MOCK_PLAN_TRIP_TYPES: readonly PlanTripTypeOption[] = [
  { value: 'One Way', label: 'One Way', needsReturnDate: false },
  { value: 'Round Trip', label: 'Round Trip', needsReturnDate: true },
  { value: 'Pickup & Drop', label: 'Pickup & Drop', needsReturnDate: false },
  { value: 'Local', label: 'Local', needsReturnDate: false },
  {
    value: 'Airport Transfer',
    label: 'Airport Transfer',
    needsReturnDate: false,
  },
];

/** Builds an ISO date a number of days from now at a fixed time. */
function daysFromNow(days: number, hours: number, minutes = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

export const MOCK_TRIP_REQUESTS: readonly CustomerTripRequest[] = [
  {
    id: 'trip_mock_1',
    requestNumber: 'ENQ-2026-00124',
    tripType: 'Round Trip',
    tripTypeLabel: 'Round Trip',
    pickupCity: 'Delhi',
    dropCity: 'Jaipur',
    pickupAt: daysFromNow(17, 9),
    returnAt: daysFromNow(19, 0),
    passengers: 4,
    notes: null,
    status: 'received',
    createdAt: daysFromNow(0, 10),
  },
];
