/**
 * Caller ID — types. The snapshot mirrors the backend exactly
 * (urbancruiseappbackend/src/modules/uc/caller_id/types.ts).
 */

export type CallerIdCustomerType = 'personal' | 'corporate' | 'agent';

/** One phone number → one customer. */
export type CallerIdEntry = {
  /** E.164, e.g. '+919812345678'. */
  phone: string;
  customerId: string;
  name: string;
  type: CallerIdCustomerType | null;
  /** null when empty or 'Unknown' (the card then hides the city). */
  city: string | null;
};

/** GET /api/v1/uc/caller-id/snapshot → data */
export type CallerIdSnapshot = {
  version: string;
  generatedAt: string;
  entries: CallerIdEntry[];
  /** Numbers left out because two or more customers share them. */
  ambiguousCount: number;
};

/** What one sync did. */
export type CallerIdSyncResult =
  /** Not Android 10+, or the native module isn't built in. */
  | 'unsupported'
  /** Caller ID is off on this phone; nothing downloaded. */
  | 'off'
  /** Checked too recently; nothing done. */
  | 'skipped'
  /** Server said nothing changed (304). */
  | 'unchanged'
  /** A new list was saved. */
  | 'updated'
  /** The server refused (no longer Active); the list was deleted. */
  | 'revoked'
  /** Network or server trouble; the previous list is kept. */
  | 'failed';
