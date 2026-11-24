/**
 * Caller ID — types. Mirror the backend exactly
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

/** GET /api/v1/uc/caller-id/snapshot → data (customers only; older builds). */
export type CallerIdSnapshot = {
  version: string;
  generatedAt: string;
  entries: CallerIdEntry[];
  /** Numbers left out because two or more customers share them. */
  ambiguousCount: number;
};

/**
 * Who a number belongs to. Also the priority when one number is in two
 * lists: customer → vendor → driver → staff (decided on the server).
 */
export type CallerIdKind = 'customer' | 'vendor' | 'driver' | 'staff';

/**
 * One phone number → one person (GET /uc/caller-id/contacts). Fields per
 * kind:
 *   customer  name; type + city
 *   vendor    owner name; subtitle = company; city
 *   driver    name; subtitle = 'Driver · <vendor>'; city
 *   staff     alias, else full name; department + branch
 */
export type CallerIdContact = {
  /** E.164, e.g. '+919812345678'. */
  phone: string;
  kind: CallerIdKind;
  id: string;
  name: string;
  subtitle: string | null;
  type: CallerIdCustomerType | null;
  city: string | null;
  department: string | null;
  branch: string | null;
  /** Small tag next to the name, e.g. 'Inactive'. Decided by the server. */
  badge: string | null;
};

/** GET /api/v1/uc/caller-id/contacts → data */
export type CallerIdContactsSnapshot = {
  version: string;
  generatedAt: string;
  entries: CallerIdContact[];
  /** Numbers left out because two people of the same kind share them. */
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
