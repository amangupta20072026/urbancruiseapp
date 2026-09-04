/**
 * ------------------------------------------------------------------
 * Deep-link resolver — pure URL / FCM payload → typed target
 * ------------------------------------------------------------------
 * This module has NO side effects and NO dependencies on Redux,
 * navigation, or the network. Every path from an incoming URL or
 * FCM click payload to a `DeepLinkTarget` funnels through here.
 * The output is either:
 *
 *   { ok: true,  entry, target }   -- ready for gating + navigation
 *   { ok: false, reason: '…'    }   -- rejected; caller logs & drops
 *
 * Security invariants enforced here:
 *   1. Scheme allow-list. Only `urbancruise:` and `https:` accepted.
 *   2. Host allow-list. HTTPS host must be in ALLOWED_HTTPS_HOSTS;
 *      custom-scheme host must equal `open` (matches Android manifest).
 *   3. Exact path segment count. No wildcards, no path traversal —
 *      `/bookings/../etc/passwd` fails because segment count and
 *      literal segments do not match `/bookings/:id`.
 *   4. Zod validation. Params go through the schema union before
 *      leaving the module.
 *   5. Query & fragment ignored. Intent lives in the path.
 *
 * These invariants exist because a deep link is untrusted input —
 * it can arrive from any app, any browser, any share sheet.
 * ------------------------------------------------------------------
 */

import { DeepLinkTarget } from './schema';
import { CATALOG, findCatalogEntryByKind, type CatalogEntry } from './catalog';

/* ================================================================
 * Result types
 * ================================================================ */

export type ResolveOk = {
  ok: true;
  entry: CatalogEntry;
  target: DeepLinkTarget;
};

export type ResolveError = {
  ok: false;
  reason:
    | 'malformed_url'
    | 'unknown_scheme'
    | 'unknown_host'
    | 'no_match'
    | 'invalid_params';
};

export type ResolveResult = ResolveOk | ResolveError;

/* ================================================================
 * Allow-lists
 *
 * Kept as `Set` (not exported) so the resolver's trust boundary
 * is visible in one file. If a new domain / scheme is needed:
 *   - staging host → guard by ENV.environment (see linkingConfig)
 *   - new scheme    → deliberate ADR-level decision, not a drive-by
 * ================================================================ */

const ALLOWED_SCHEMES = new Set<string>(['urbancruise:', 'https:']);

// TODO(env): pull staging host from ENV.environment in dev/staging
// builds. Keep production locked to the canonical host.
const ALLOWED_HTTPS_HOSTS = new Set<string>(['app.urbancruise.in']);

// Custom scheme host — a placeholder to keep intents unambiguous on
// Android. See §9.1 of the design doc. Users never see it.
const ALLOWED_CUSTOM_HOSTS = new Set<string>(['open']);

/* ================================================================
 * Custom-scheme parsing shim
 *
 * Hermes' WHATWG URL parser (and Node's, and older browsers')
 * treats non-special schemes as OPAQUE. For anything that isn't
 * http/https/ftp/ws/wss/file, `new URL(...)` collapses:
 *
 *   new URL('urbancruise://open/bookings/BKG123')
 *     → hostname: '',  host: '',  pathname: '/'
 *
 * That would make every `urbancruise://` link fail the host and
 * path checks below, even though the URL is syntactically fine.
 *
 * Workaround: rewrite the scheme to `https:` for parsing only,
 * then re-attribute the original scheme when we run the allow-list
 * checks. `https:` is a "special" scheme so the parser cleanly
 * splits host and path.
 *
 * Trade-off: we cannot use `URL.protocol` after this rewrite —
 * we use `effectiveProtocol` (returned from the shim) everywhere
 * an allow-list check runs.
 * ================================================================ */

const CUSTOM_SCHEME_PREFIX = 'urbancruise://';

function parseUrlSafe(
  rawUrl: string,
): { url: URL; effectiveProtocol: string } | null {
  const isCustomScheme = rawUrl.startsWith(CUSTOM_SCHEME_PREFIX);
  const parseInput = isCustomScheme
    ? 'https://' + rawUrl.slice(CUSTOM_SCHEME_PREFIX.length)
    : rawUrl;

  try {
    const url = new URL(parseInput);
    return {
      url,
      effectiveProtocol: isCustomScheme ? 'urbancruise:' : url.protocol,
    };
  } catch {
    return null;
  }
}

/* ================================================================
 * resolveUrl — URL (custom scheme or Universal / App Link)
 * ================================================================ */

export function resolveUrl(rawUrl: string): ResolveResult {
  const parsed = parseUrlSafe(rawUrl);
  if (!parsed) {
    return { ok: false, reason: 'malformed_url' };
  }
  const { url, effectiveProtocol } = parsed;

  if (!ALLOWED_SCHEMES.has(effectiveProtocol)) {
    return { ok: false, reason: 'unknown_scheme' };
  }

  if (effectiveProtocol === 'https:' && !ALLOWED_HTTPS_HOSTS.has(url.host)) {
    return { ok: false, reason: 'unknown_host' };
  }

  // Custom scheme uses `.hostname` (case-insensitive) instead of
  // `.host` because there is no port.
  if (
    effectiveProtocol === 'urbancruise:' &&
    !ALLOWED_CUSTOM_HOSTS.has(url.hostname.toLowerCase())
  ) {
    return { ok: false, reason: 'unknown_host' };
  }

  const pathname = url.pathname;

  for (const entry of CATALOG) {
    const params = matchPath(entry.path, pathname);
    if (!params) continue;

    let raw: unknown;
    try {
      raw = entry.build(params);
    } catch {
      // A `build` throwing is a bug, not user input — but treat as
      // invalid_params rather than letting it crash the caller.
      return { ok: false, reason: 'invalid_params' };
    }

    const zParsed = DeepLinkTarget.safeParse(raw);
    if (!zParsed.success) return { ok: false, reason: 'invalid_params' };
    return { ok: true, entry, target: zParsed.data };
  }

  return { ok: false, reason: 'no_match' };
}

/* ================================================================
 * resolveFcmClick — structured payload from an FCM data push
 *
 * The backend serialises the target as JSON in the `click` field
 * (see the notifications design doc, §8.3). This resolver parses
 * it through the exact same Zod union that resolveUrl produces,
 * so downstream code cannot tell the two entry points apart.
 * ================================================================ */

export function resolveFcmClick(clickRaw: string | undefined): ResolveResult {
  if (typeof clickRaw !== 'string' || clickRaw.length === 0) {
    return { ok: false, reason: 'malformed_url' };
  }

  let obj: unknown;
  try {
    obj = JSON.parse(clickRaw);
  } catch {
    return { ok: false, reason: 'malformed_url' };
  }

  const parsed = DeepLinkTarget.safeParse(obj);
  if (!parsed.success) return { ok: false, reason: 'invalid_params' };

  const entry = findCatalogEntryByKind(parsed.data.kind);
  if (!entry) return { ok: false, reason: 'no_match' };

  return { ok: true, entry, target: parsed.data };
}

/* ================================================================
 * matchPath — exact segment matcher
 *
 * Supports only ':name' params. No wildcards, no optional segments,
 * no regex. This is the ENTIRE reason path traversal is impossible:
 * the segment counts must match, and literal segments must match
 * character-for-character. There is no code path from user input
 * to `path.join()` or a file API anywhere downstream.
 * ================================================================ */

function matchPath(
  pattern: string,
  actual: string,
): Record<string, string> | null {
  const p = pattern.split('/').filter(Boolean);
  const a = actual.split('/').filter(Boolean);
  if (p.length !== a.length) return null;

  const out: Record<string, string> = {};
  for (let i = 0; i < p.length; i++) {
    const patSeg = p[i]!;
    const actSeg = a[i]!;

    if (patSeg.startsWith(':')) {
      const key = patSeg.slice(1);
      // Empty and dot-segments are rejected — they would map to
      // nonsensical ids and are the classic path-traversal shapes.
      if (actSeg.length === 0 || actSeg === '.' || actSeg === '..') return null;
      let decoded: string;
      try {
        decoded = decodeURIComponent(actSeg);
      } catch {
        // Malformed percent-encoding — reject rather than pass raw.
        return null;
      }
      out[key] = decoded;
    } else if (patSeg !== actSeg) {
      return null;
    }
  }

  return out;
}
