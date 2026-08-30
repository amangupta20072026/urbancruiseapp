/**
 * ------------------------------------------------------------------
 * Tab Route Names — Central Constants
 * ------------------------------------------------------------------
 * The names of tab routes are duplicated across three surfaces:
 *   - the `<Tab.Screen name="…" />` prop
 *   - the CustomerTabParamList / VendorTabParamList / DriverTabParamList
 *     / UcTabParamList type keys in `src/navigation/types.ts`
 *   - the guard inside `useMoreTabController` that decides whether to
 *     dismiss the More sheet on a tabPress
 *
 * Promoting the strings to `as const` literals lets TypeScript enforce
 * that a rename in one place fails to compile everywhere else. This
 * prevents silent behavioural drift — the class of bug where a screen
 * gets renamed but a string comparison somewhere else keeps looking
 * for the old value.
 * ------------------------------------------------------------------
 */

export const MORE_ROUTE_NAME = 'More' as const;
export type MoreRouteName = typeof MORE_ROUTE_NAME;
