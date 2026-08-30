/**
 * ------------------------------------------------------------------
 * NavigationService
 * ------------------------------------------------------------------
 * Enables navigation from outside React components — e.g. axios
 * interceptors handling 401, FCM notification handlers, deep-link
 * resolvers. Wire the ref onto NavigationContainer in App.tsx.
 *
 * TYPING CONTRACT:
 *   - `navigate` accepts ANY route declared anywhere in the app.
 *     React Navigation's runtime `navigate('X')` searches the
 *     currently mounted navigator tree for a screen named X, so the
 *     honest type is the flat union of every ParamList — not just
 *     the root list. This is what closes the previous `as never`
 *     escape hatch in useMoreActions and any other cross-flow call
 *     site (Support, CustomersList, NotificationCentre, etc.).
 *
 *     Duplicate route names across ParamLists (e.g. Support in every
 *     role stack) must have identical params types — TypeScript will
 *     collapse them to `never` and fail callers if they diverge.
 *     Verified as of this commit; enforced structurally going forward.
 *
 *   - `replace` and `reset` stay typed against `RootStackParamList`.
 *     From outside React, only top-level transitions should be
 *     dispatched — nested replace / reset are ambiguous (which
 *     nested tree owns the operation?). Screen-level replace should
 *     go through the screen's own fully-typed `navigation.replace()`.
 *
 *   - `getCurrentRoute` returns a DISCRIMINATED UNION across every
 *     param list, so callers get `route.params` narrowed correctly
 *     by `route.name` without any casts.
 * ------------------------------------------------------------------
 */

import {
  CommonActions,
  StackActions,
  createNavigationContainerRef,
} from '@react-navigation/native';

import type {
  AuthParamList,
  CustomerStackParamList,
  CustomerTabParamList,
  DriverStackParamList,
  DriverTabParamList,
  OnboardingParamList,
  RootStackParamList,
  UcStackParamList,
  UcTabParamList,
  VendorStackParamList,
  VendorTabParamList,
} from './types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/** True once NavigationContainer has finished mounting. */
export const isReady = (): boolean => navigationRef.isReady();

/* =================================================================
 * Flat any-route param list
 *
 * Intersection of every ParamList in the app. `keyof` this type is
 * the set of all valid route names for a flat `navigate('X')` call —
 * matching React Navigation's runtime tree-search behaviour.
 *
 * Because it's an INTERSECTION, duplicate keys must have compatible
 * value types. Two routes with the same name and different params
 * would collapse to `never` for that key and fail callers — which is
 * the outcome we want, not something to work around.
 * ================================================================= */

type AllScreensParamList = RootStackParamList &
  OnboardingParamList &
  AuthParamList &
  CustomerStackParamList &
  CustomerTabParamList &
  VendorStackParamList &
  VendorTabParamList &
  DriverStackParamList &
  DriverTabParamList &
  UcStackParamList &
  UcTabParamList;

/* =================================================================
 * navigate
 * ================================================================= */

/**
 * Typed navigate to ANY route in the app.
 *
 * The overload requires params exactly when the target route needs
 * them and forbids them otherwise. Safe to call before the container
 * is ready — silently no-ops.
 *
 * Runtime semantics: React Navigation searches the currently mounted
 * navigator tree for a screen with the given name. If found, focuses
 * it (respecting the nesting). If not found, the call is a no-op.
 * Because every declared route is now also registered (see the
 * per-role navigators), that "not found" case cannot happen for any
 * name TypeScript accepts.
 */
export function navigate<RouteName extends keyof AllScreensParamList>(
  ...args: AllScreensParamList[RouteName] extends undefined
    ? [screen: RouteName]
    : [screen: RouteName, params: AllScreensParamList[RouteName]]
): void {
  if (!navigationRef.isReady()) return;
  // The overload above narrows callers correctly; the runtime call
  // just forwards positional args. The cast is confined here — no
  // caller sees `any`.
  (navigationRef.navigate as (...a: unknown[]) => void)(...args);
}

/* =================================================================
 * goBack
 * ================================================================= */

export function goBack(): void {
  if (!navigationRef.isReady() || !navigationRef.canGoBack()) return;
  navigationRef.goBack();
}

/* =================================================================
 * reset — hard-reset the whole root stack
 * ================================================================= */

/**
 * Use for auth transitions from outside React (e.g. axios 401 refresh
 * failure). Only accepts a top-level RootStackParamList route because
 * that's the level a reset makes sense at.
 */
export function reset(routeName: keyof RootStackParamList): void {
  if (!navigationRef.isReady()) return;
  navigationRef.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [{ name: routeName }],
    }),
  );
}

/* =================================================================
 * replace — replace the current screen (typed)
 * ================================================================= */

/**
 * Typed replace. Same shape as `navigate` — requires params exactly
 * when the target route needs them, forbids them otherwise. Closes
 * the previous `routeName: string, params?: object` escape hatch.
 *
 * Replace dispatches to the currently focused stack, which may be
 * nested. Typing against `RootStackParamList` keeps the imperative
 * surface consistent with `navigate` and `reset`; nested-stack
 * replacements should be done from inside a screen using the fully
 * typed `navigation` prop rather than through this service.
 */
export function replace<RouteName extends keyof RootStackParamList>(
  ...args: RootStackParamList[RouteName] extends undefined
    ? [screen: RouteName]
    : [screen: RouteName, params: RootStackParamList[RouteName]]
): void {
  if (!navigationRef.isReady()) return;
  const [screen, params] = args as [
    keyof RootStackParamList,
    object | undefined,
  ];
  navigationRef.dispatch(StackActions.replace(screen as string, params));
}

/* =================================================================
 * getCurrentRoute — typed with a discriminated union
 * ================================================================= */

/**
 * Maps a ParamList `L` to the union `{ name; params; key }` for every
 * entry in it. Concatenating one of these per app-wide param list
 * gives us `CurrentRoute` — a discriminated union that lets callers
 * write:
 *
 *   const r = getCurrentRoute();
 *   if (r?.name === 'BookingDetail') {
 *     r.params.bookingId; // typed as BookingId — no cast
 *   }
 */
type ParamListToRouteUnion<L> = {
  [K in keyof L]: { name: K & string; params: L[K]; key: string };
}[keyof L];

export type CurrentRoute =
  | ParamListToRouteUnion<RootStackParamList>
  | ParamListToRouteUnion<OnboardingParamList>
  | ParamListToRouteUnion<AuthParamList>
  | ParamListToRouteUnion<CustomerStackParamList>
  | ParamListToRouteUnion<CustomerTabParamList>
  | ParamListToRouteUnion<VendorStackParamList>
  | ParamListToRouteUnion<VendorTabParamList>
  | ParamListToRouteUnion<DriverStackParamList>
  | ParamListToRouteUnion<DriverTabParamList>
  | ParamListToRouteUnion<UcStackParamList>
  | ParamListToRouteUnion<UcTabParamList>;

/**
 * Returns the deepest currently focused route, typed as a
 * discriminated union across every app-wide param list. Returns
 * `undefined` when the container isn't ready or no route is active.
 *
 * The single `as CurrentRoute` cast is confined here — it's the
 * boundary between React Navigation's structurally-typed `Route`
 * and our declared union. Every registered route name in the app
 * is a variant of the union, so the runtime value is guaranteed to
 * match one; the cast just informs the compiler.
 */
export function getCurrentRoute(): CurrentRoute | undefined {
  if (!navigationRef.isReady()) return undefined;
  const route = navigationRef.getCurrentRoute();
  if (!route) return undefined;
  return {
    name: route.name,
    params: route.params,
    key: route.key,
  } as CurrentRoute;
}

/**
 * Convenience helper — returns just the current route name, narrowed
 * to the union of all known route names. Cheaper to use in feature
 * code that only cares about "am I on X?" checks.
 */
export function getCurrentRouteName(): CurrentRoute['name'] | undefined {
  return getCurrentRoute()?.name;
}
