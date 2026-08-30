/**
 * ------------------------------------------------------------------
 * logError — Centralised error sink
 * ------------------------------------------------------------------
 * Every place that catches an error — React ErrorBoundaries, axios
 * error interceptor, background task handlers, push notification
 * callbacks — funnels through this function so future telemetry
 * (Sentry / Crashlytics / DataDog / whatever) has ONE surface to
 * wire in.
 *
 * The current implementation logs to the JS console in development
 * and no-ops in production. When telemetry lands, swap the body —
 * no caller has to change.
 *
 * Design contract:
 *   - MUST NEVER throw. Telemetry that crashes is worse than none.
 *     Wrap the entire body in try/catch as a defensive shell once
 *     real telemetry is wired.
 *   - MUST accept `unknown` for the error — callers may forward
 *     values from catch blocks, which are unknown by TS convention.
 *   - MUST accept optional context so a boundary can identify itself
 *     (screen name, feature module, etc.) without callers having to
 *     hand-assemble log lines.
 * ------------------------------------------------------------------
 */

export type ErrorContext = {
  /** Where the error was captured — e.g. 'RootBoundary', 'axios.401'. */
  boundary?: string;
  /** React componentStack when the source is an ErrorBoundary. */
  componentStack?: string;
  /** Free-form extra data (route params, request URL, feature flags…). */
  extra?: Record<string, unknown>;
};

/**
 * Send an error to the telemetry sink. Safe to call from anywhere.
 * In production, this call is a no-op today — swap the body when a
 * telemetry SDK is added.
 */
export function logError(error: unknown, context: ErrorContext = {}): void {
  if (__DEV__) {
    console.group(`[error]${context.boundary ? ` ${context.boundary}` : ''}`);
    console.error(error);
    if (context.componentStack) {
      console.log('componentStack:', context.componentStack);
    }
    if (context.extra) {
      console.log('extra:', context.extra);
    }
    console.groupEnd();
    return;
  }
  // TODO(telemetry): forward to Sentry / Crashlytics / DataDog here.
}
