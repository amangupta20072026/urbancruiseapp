/**
 * ------------------------------------------------------------------
 * RBAC Roles
 * ------------------------------------------------------------------
 * 4 top-level roles + sub-roles per role.
 * Matches the RBAC-spec exactly.
 * ------------------------------------------------------------------
 */

export type UserRole = 'customer' | 'vendor' | 'driver' | 'uc';

// Customer — Personal is standalone; Corporate/Event share one CustomerId
// across 3 (or 4) logins with different permissions.
export type CustomerType = 'personal' | 'corporate';
export type CorporateSubRole = 'bookingPerson' | 'admin';

// Vendor — 4 logins share one VendorId.
export type VendorSubRole =
  | 'owner'
  | 'bookingManager'
  | 'opsManager'
  | 'accountsManager';

// Driver is single-role.
// UC is single-role.

export type SubRole = CorporateSubRole | VendorSubRole | null;

export type Identity = {
  userId: string;
  role: UserRole;
  subRole: SubRole;
  entityId: string; // customerId / vendorId / driverId / ucUserId
};
