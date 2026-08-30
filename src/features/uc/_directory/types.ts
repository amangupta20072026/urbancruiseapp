/**
 * ------------------------------------------------------------------
 * Directory — Shared types
 * ------------------------------------------------------------------
 * The Directory hub renders four independent tabs (Customers,
 * Vendors, UC Staff, Drivers). Each tab is backed by its own
 * feature module with its own list hook, filter sheet, card, and
 * contact sheet — because the four entities have genuinely different
 * fields and filter semantics, so a "generic list" abstraction
 * would trade real ergonomics for illusory reuse.
 *
 * BUT they DO share three things — hook-return shape, list infra
 * behaviour, and contact-sheet action semantics. Those live here.
 * Every domain hook returns `DirectoryListState<T>` so the shared
 * FlashList wrapper (`DirectoryListView`) can render any domain
 * without knowing which one it is.
 *
 * If a fifth entity gets added later, the recipe is:
 *   1. Define its Entity type + Filters + fixture
 *   2. Implement useXxxList → returns DirectoryListState<Xxx>
 *   3. Add an XxxCard + XxxContactSheet in that domain's folder
 *   4. Add a tab to DirectoryScreen
 *
 * No changes needed here.
 * ------------------------------------------------------------------
 */

/**
 * Uniform hook-return shape used by every directory-domain list hook.
 * `useCustomerList` already matches this — the type is extracted here
 * so vendors / UC staff / drivers hooks can be typed against the same
 * contract, and DirectoryListView can render any of them.
 *
 * `T` is the row entity (Customer, Vendor, Staff, Driver).
 */
export type DirectoryListState<T> = {
  data: T[];
  total: number;
  isLoading: boolean;
  isRefreshing: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean | undefined;
  fetchNextPage: () => void;
  error: Error | null;
  refetch: () => void;
  refresh: () => void;
};

/**
 * The four directory tab keys. Kept as a string-union so switch
 * statements over tabs stay exhaustive.
 */
export type DirectoryTab = 'customers' | 'vendors' | 'staff' | 'drivers';

export const DIRECTORY_TABS: readonly DirectoryTab[] = [
  'customers',
  'vendors',
  'staff',
  'drivers',
] as const;

export const DIRECTORY_TAB_LABEL: Record<DirectoryTab, string> = {
  customers: 'Customers',
  vendors: 'Vendors',
  staff: 'UC Staff',
  drivers: 'Drivers',
};
