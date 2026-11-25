/**
 * ------------------------------------------------------------------
 * Plan a Trip — in-memory store (dummy data only)
 * ------------------------------------------------------------------
 * Lets a request submitted from the form show up straight away in the
 * Quotations tab, so the full flow can be shown with dummy data.
 * Nothing is saved: the list goes back to the mock data when the app
 * restarts.
 *
 * When the backend is connected, replace this file with a mutation
 * (POST) for `submitTripRequest` and a query for `useTripRequests`.
 * The screens only use the three exported functions below.
 * ------------------------------------------------------------------
 */

import { useSyncExternalStore } from 'react';

import { MOCK_TRIP_REQUESTS } from './mocks';
import type { CustomerTripRequest, PlanTripInput } from './types';

let requests: readonly CustomerTripRequest[] = MOCK_TRIP_REQUESTS;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach(listener => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): readonly CustomerTripRequest[] {
  return requests;
}

/** Placeholder number in the same shape the backend will use. */
function makeRequestNumber(now: Date): string {
  const n = Math.floor(10_000 + Math.random() * 90_000);
  return `TRIP-${now.getFullYear()}-${String(n).padStart(5, '0')}`;
}

/** All trip requests of the customer, newest first. */
export function useTripRequests(): readonly CustomerTripRequest[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function getTripRequest(id: string): CustomerTripRequest | null {
  return requests.find(r => r.id === id) ?? null;
}

export function submitTripRequest(input: PlanTripInput): CustomerTripRequest {
  const now = new Date();
  const request: CustomerTripRequest = {
    ...input,
    id: `trip_${now.getTime()}`,
    requestNumber: makeRequestNumber(now),
    status: 'received',
    createdAt: now.toISOString(),
  };
  requests = [request, ...requests];
  emit();
  return request;
}
