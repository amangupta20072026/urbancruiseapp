/**
 * ------------------------------------------------------------------
 * Current-user mock — v1 fixture
 * ------------------------------------------------------------------
 * Seeds `userSlice` before the real /me endpoint lands. Represents
 * "the person currently logged in as a customer" — Aman Gupta, the
 * name shown in the design mock.
 *
 * Later, when auth's /me call succeeds, dispatch userReceived(...)
 * with the API payload. Delete this file once the endpoint ships.
 * ------------------------------------------------------------------
 */

import { asISODateTime } from '@app-types/datetime';

export type MockCurrentUser = {
  id: string;
  displayName: string;
  email: string;
  phoneIndia: string;
  phoneGlobal: string;
  memberSince: ReturnType<typeof asISODateTime>;
};

export const mockCurrentUser: MockCurrentUser = {
  id: 'USR-CUST-000001',
  displayName: 'Aman Gupta',
  email: 'aman.gupta@example.com',
  phoneIndia: '+91 9812345000',
  phoneGlobal: '+1 415 555 0000',
  memberSince: asISODateTime('2025-06-14T08:30:00Z'),
};
