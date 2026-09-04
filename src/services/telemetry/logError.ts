/**
 * ------------------------------------------------------------------
 * logError — Centralised error sink
 * ------------------------------------------------------------------
 * Every place that catches an error — React ErrorBoundaries, axios
 * error interceptor, background task handlers, push notification
 * callbacks — funnels through this function so telemetry has ONE
 * surface to wire in.
 *
 * Behaviour:
 *   __DEV__          → pretty console output, no upload
 *   Production build → forwards to Firebase Crashlytics as a
 *                      non-fatal recordError()
 *
 * Design contract:
 *   - MUST NEVER throw. Telemetry that crashes is worse than none.
 *   - MUST accept `unknown` for the error — callers may forward
 *     values from catch blocks, which are `unknown` by TS convention.
 *   - MUST accept optional context so a boundary can identify itself
 *     without callers hand-assembling log lines.
 *
 * Crashlytics attribute limits (as of Aug 2024, per official docs):
 *   - 64 custom attributes per report
 *   - Key ≤ 64 chars, value ≤ 1024 chars
 * We defensively truncate values to stay under the limit.
 * ------------------------------------------------------------------
 */

import {
  getCrashlytics,
  recordError,
  log as crashlyticsLog,
  setAttribute,
} from '@react-native-firebase/crashlytics';

export type ErrorContext = {
  /** Where the error was captured — e.g. 'RootBoundary', 'axios.401'. */
  boundary?: string;
  /** React componentStack when the source is an ErrorBoundary. */
  componentStack?: string;
  /** Free-form extra data (route params, request URL, feature flags…). */
  extra?: Record<string, unknown>;
};

const MAX_ATTR_VALUE_LEN = 1000;

function toError(value: unknown): Error {
  if (value instanceof Error) return value;
  if (typeof value === 'string') return new Error(value);
  try {
    return new Error(JSON.stringify(value));
  } catch {
    return new Error(String(value));
  }
}

function safeStringify(value: unknown): string {
  try {
    if (typeof value === 'string') return value;
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function logError(error: unknown, context: ErrorContext = {}): void {
  if (__DEV__) {
    console.group(`[error]${context.boundary ? ` ${context.boundary}` : ''}`);
    console.error(error);
    if (context.componentStack) {
      // console.log('componentStack:', context.componentStack);
    }
    if (context.extra) {
      // console.log('extra:', context.extra);
    }
    console.groupEnd();
    return;
  }

  try {
    const c = getCrashlytics();
    const err = toError(error);

    if (context.boundary) {
      setAttribute(c, 'boundary', context.boundary);
    }

    if (context.componentStack) {
      crashlyticsLog(
        c,
        `componentStack: ${context.componentStack.slice(
          0,
          MAX_ATTR_VALUE_LEN,
        )}`,
      );
    }

    if (context.extra) {
      for (const [k, v] of Object.entries(context.extra)) {
        const safeKey = k.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 60);
        const safeValue = safeStringify(v).slice(0, MAX_ATTR_VALUE_LEN);
        setAttribute(c, safeKey, safeValue);
      }
    }

    recordError(c, err);
  } catch {
    // Telemetry MUST NEVER take the app down.
  }
}
