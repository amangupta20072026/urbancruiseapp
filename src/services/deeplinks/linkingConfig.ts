/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * ------------------------------------------------------------------
 * React Navigation `linking` config
 * ------------------------------------------------------------------
 * OS-delivered URLs (custom-scheme + Universal / App Links) reach
 * the container through this object. FCM notification taps do NOT
 * reach it — those come through the messaging listeners and are
 * bridged in `src/services/notifications/deeplink.ts`. Both paths
 * funnel into the same resolver so behaviour cannot diverge.
 *
 * DESIGN DECISION — no declarative `config.screens` map:
 *   React Navigation supports a static path-to-screen mapping via
 *   `config.screens`. It doesn't fit this app because:
 *
 *   1. RootNavigator mounts EXACTLY ONE role branch at a time.
 *      A static map targets a single tree — it can't express
 *      "if role === customer, /trip/:id goes here; else it goes
 *      there."
 *
 *   2. Our resolver already validates URLs against a security
 *      allow-list. Using `config.screens` would give React
 *      Navigation a second, less strict path parser to worry
 *      about — two sources of truth.
 *
 *   3. `getStateFromPath` lets us delegate to our resolver and
 *      keep ONE code path for every entry point.
 *
 * INITIAL URL — trusted-only pass:
 *   `getInitialURL` and `subscribe` both consult the resolver
 *   first. A URL our allow-list rejects is invisible to React
 *   Navigation, so the app opens on the normal home destination
 *   instead of trying to render an unknown route.
 * ------------------------------------------------------------------
 */

import type { LinkingOptions } from '@react-navigation/native';
import { Linking } from 'react-native';

import type { RootStackParamList } from '@navigation/types';

import { resolveUrl } from './resolve';
import { stash } from './pending';
import { targetToNavigatePayload } from './toNavigate';

/* ================================================================
 * Prefixes — MUST match the AndroidManifest intent-filters and the
 * iOS `com.apple.developer.associated-domains` entitlement.
 *
 * Add staging hosts here AND to `ALLOWED_HTTPS_HOSTS` in resolve.ts,
 * gated by ENV.
 * ================================================================ */

const PREFIXES = ['urbancruise://', 'https://app.urbancruise.in'] as const;

/* ================================================================
 * buildLinkingConfig
 * ================================================================ */

export function buildLinkingConfig(): LinkingOptions<RootStackParamList> {
  return {
    prefixes: [...PREFIXES],

    /**
     * Cold-start: called ONCE by NavigationContainer before mounting
     * any screen. If the OS launched the app from a URL, we return
     * it so React Navigation can set the initial route accordingly.
     *
     * We also stash the resolved target here — this is what unblocks
     * the "cold-start from Universal Link" flow when the role/auth
     * gate would defer. React Navigation would otherwise fall back
     * to the default initial route silently.
     */
    async getInitialURL(): Promise<string | null> {
      try {
        const url = await Linking.getInitialURL();
        // console.log('[deeplink] getInitialURL raw =', url);  
        if (!url) return null;
        const r = resolveUrl(url);
        // console.log('[deeplink] getInitialURL resolve =', r); 
        if (!r.ok) return null;
        stash(r.target);
        return url;
      } catch (e) {
        // Linking API failure — treat as no URL. Don't propagate.
        // console.log('[deeplink] getInitialURL threw:', e); 
        return null;
      }
    },

    /**
     * Warm subscription: OS-delivered URLs while the app is running
     * (foreground or background). Same gate as above.
     */
    subscribe(listener) {
      const sub = Linking.addEventListener('url', ({ url }) => {
        // console.log('[deeplink] subscribe url =', url);  
        const r = resolveUrl(url);
        // console.log('[deeplink] subscribe resolve =', r);
        if (!r.ok) return;
        stash(r.target);
        listener(url);
      });
      return () => sub.remove();
    },

    /**
     * URL → React Navigation state.
     *
     * We construct a minimal, single-screen state referencing the
     * target screen name. React Navigation resolves it against the
     * currently mounted navigator tree; when a role branch owns the
     * screen, it navigates there. Screens that aren't currently
     * mounted (because the wrong role is active, or the user isn't
     * authenticated) produce no navigation — the target is still in
     * the pending queue and `drain()` will pick it up after the
     * relevant state transition.
     */
    getStateFromPath: (path: string) => {
      // React Navigation may pass a bare path ("/bookings/…") or a
      // path with a query string. Normalise to a full URL for the
      // resolver's WHATWG parser.
      const asUrl = path.startsWith('/')
        ? `https://app.urbancruise.in${path}`
        : path;
      const r = resolveUrl(asUrl);
      if (!r.ok) return undefined;

      const p = targetToNavigatePayload(r.target);
      return {
        routes: [
          p.params === undefined
            ? { name: p.screen }
            : { name: p.screen, params: p.params },
        ],
      };
    },
  };
}
