/**
 * ------------------------------------------------------------------
 * RBAC Roles — SSoT for the app's user model
 * ------------------------------------------------------------------
 * Type surface matches the backend's `src/shared/rbac/roles.ts` exactly, so
 * JWT payloads round-trip cleanly and role checks never diverge between
 * client and server.
 *
 * All four roles are typed; the backend gates non-customer roles at its auth
 * middleware until their features ship. The RN app gates them at the UI
 * layer (tabs/screens the role can access).
 * ------------------------------------------------------------------
 */

// ── Top-level role ────────────────────────────────────────────────
export type UserRole = 'customer' | 'vendor' | 'driver' | 'uc';

// ── Customer taxonomy ─────────────────────────────────────────────
// The customer domain has two levels:
//   Category — high-level classification (personal / corporate / agent)
//   Type     — specific sub-classification within a category
//
// Category and type are NOT independent. A "personal" customer can only have
// type "personal"; a "corporate" customer picks from the corporate types;
// an "agent" picks from the agent types. Modeling them as a discriminated
// union (`CustomerClassification` below) makes invalid combinations
// impossible to construct at compile time.
//
// `companyName` is required for corporate + agent, absent for personal —
// same discriminated union expresses that constraint.

export type CustomerCategory = 'personal' | 'corporate' | 'agent';

// Only value for category='personal'.
export type PersonalCustomerType = 'personal';

// Sub-types under category='corporate'.
export type CorporateCustomerType =
  | 'company'
  | 'ngo'
  | 'educationalInstitute'
  | 'sportingCompany'
  | 'government';

// Sub-types under category='agent'.
export type AgentCustomerType =
  | 'travelAgent'
  | 'tourOperator'
  | 'hotel'
  | 'weddingPlanner'
  | 'dmc';

// Union of every legal customer-type value, regardless of category.
export type CustomerType =
  | PersonalCustomerType
  | CorporateCustomerType
  | AgentCustomerType;

/**
 * The customer classification block. Use wherever a customer's category /
 * type / company name appear together — form state, DTOs, redux slices,
 * profile screens. TypeScript refuses any of these bad shapes:
 *   { category: 'personal', type: 'company' }         // wrong type for personal
 *   { category: 'corporate', companyName: null }      // company name required
 *   { category: 'agent', type: 'ngo' }                // ngo isn't an agent type
 */
export type CustomerClassification =
  | { category: 'personal'; type: PersonalCustomerType; companyName: null }
  | { category: 'corporate'; type: CorporateCustomerType; companyName: string }
  | { category: 'agent'; type: AgentCustomerType; companyName: string };

// ── Sub-roles ─────────────────────────────────────────────────────
// Corporate customers can have multiple logins under the same CustomerId
// with different privileges — a booking-person places bookings, an admin
// can also manage seats / cancel / pay. Personal customers and agents have
// no sub-role today (agent sub-roles TBD).
//
// Vendor has 4 operational roles sharing one VendorId.
// Driver + UC are single-role.
export type CorporateSubRole = 'bookingPerson' | 'admin';
export type VendorSubRole =
  | 'owner'
  | 'bookingManager'
  | 'opsManager'
  | 'accountsManager';

export type SubRole = CorporateSubRole | VendorSubRole | null;

// ── Identity ──────────────────────────────────────────────────────
// Populated from a decoded JWT. Mirrors the backend Identity shape.
export type Identity = {
  userId: string;
  role: UserRole;
  subRole: SubRole;
  entityId: string; // customerId / vendorId / driverId / ucUserId
};
