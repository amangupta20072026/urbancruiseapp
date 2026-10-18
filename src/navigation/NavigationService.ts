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
 *
 * ROLE-AWARE AVAILABILITY:
 *   The flat typing above means TypeScript accepts a route name if
 *   ANY role registers it — but at runtime only one role navigator
 *   is mounted. `isRouteAvailable` answers "would navigate(X) work
 *   right now?", and `navigateOrComingSoon` uses it to show the
 *   standard "Coming soon" toast instead of silently doing nothing
 *   when the current role doesn't have that screen.
 * ------------------------------------------------------------------
 */

import {
  CommonActions,
  StackActions,
  createNavigationContainerRef,
} from '@react-navigation/native';

import { notifyComingSoon, type ComingSoonFeature } from '@services/comingSoon';

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
 * Runtime semantics: React Navigation hands the action to the
 * focused navigator and bubbles it up through its parents until one
 * of them has a screen with that name. If none does, the call is a
 * no-op. Because only ONE role navigator is mounted at a time, a
 * name TypeScript accepts (registered by some role) can still be
 * missing for the current role — use `navigateOrComingSoon` when
 * that can happen.
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
 * isRouteAvailable — would navigate(name) succeed right now?
 * ================================================================= */

/**
 * Minimal structural view of a navigator state. Covers both full
 * `NavigationState` objects and the `PartialState` React Navigation
 * stores on a route before its child navigator has mounted (where
 * `routeNames` and `index` may be absent).
 */
type InspectableState = {
  readonly index?: number;
  readonly routeNames?: readonly string[];
  readonly routes: readonly { readonly state?: InspectableState }[];
};

/**
 * True when a `navigate(name)` dispatched from the container would be
 * handled. Mirrors React Navigation's own resolution: the action goes
 * to the FOCUSED navigator and bubbles up through its parents, so we
 * walk the focused chain from the root down and check each level's
 * registered `routeNames`.
 *
 * Returns false before the container is ready. Cost is O(nesting
 * depth) — three or four levels in this app — so it is safe to call
 * on every tap.
 */
export function isRouteAvailable(name: string): boolean {
  if (!navigationRef.isReady()) return false;

  let state: InspectableState | undefined = navigationRef.getRootState() as
    | InspectableState
    | undefined;

  while (state) {
    if (state.routeNames?.includes(name)) return true;
    const focused: { readonly state?: InspectableState } | undefined =
      state.routes[state.index ?? state.routes.length - 1];
    state = focused?.state;
  }
  return false;
}

/* =================================================================
 * navigateOrComingSoon
 * ================================================================= */

/**
 * Navigate if the current role has the screen; otherwise show the
 * standard "Coming soon" toast for `feature`.
 *
 * Use this for destinations that exist for some roles but not yet
 * for others (e.g. Profile is built for Customer and UC, not yet
 * for Vendor or Driver). For a feature no role has yet, call
 * `notifyComingSoon` directly instead — there is no route to try.
 *
 * Returns true when navigation was dispatched, false otherwise (the
 * toast was shown, or the container is not ready yet). Callers such
 * as the More sheet use this to decide whether the current screen is
 * about to blur.
 */
export function navigateOrComingSoon<
  RouteName extends keyof AllScreensParamList,
>(
  feature: ComingSoonFeature,
  ...args: AllScreensParamList[RouteName] extends undefined
    ? [screen: RouteName]
    : [screen: RouteName, params: AllScreensParamList[RouteName]]
): boolean {
  // Not ready is a timing condition, not a missing feature — stay
  // silent, exactly like navigate() does.
  if (!navigationRef.isReady()) return false;
  if (!isRouteAvailable(args[0] as string)) {
    notifyComingSoon(feature, 'navigation_guard');
    return false;
  }
  navigate<RouteName>(...args);
  return true;
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
