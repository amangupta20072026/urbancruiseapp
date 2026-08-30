/**
 * ==================================================================
 * ErrorBoundary — React error boundary with pluggable fallback
 * ==================================================================
 *
 * WHAT IT CATCHES:
 *   - Errors thrown in the render phase of any descendant component.
 *   - Errors thrown in lifecycle methods of any descendant class.
 *   - Errors thrown inside useEffect setup (surface as a render error
 *     on next render).
 *
 * WHAT IT DOES NOT CATCH (React's documented limitations):
 *   - Errors inside event handlers — those propagate as unhandled
 *     Promise rejections; hook via a global error handler if needed.
 *   - Errors inside async code (setTimeout, fetch, etc.).
 *   - Errors in the boundary itself.
 *   - Server-side rendering errors (N/A in React Native).
 *
 * PLACEMENT STRATEGY:
 *   ONE app-level boundary sits above NavigationContainer inside
 *   App.tsx (see the wiring there). A crash in any screen shows the
 *   fallback UI instead of a blank / crashed app. Because the
 *   boundary is BELOW the store providers, the fallback still has
 *   access to Redux — logout/reset dispatches from the fallback UI
 *   remain possible.
 *
 *   Screen-level boundaries can be added later inside individual
 *   screens if we want per-screen recovery without losing navigation
 *   state. This class is designed to be reused there — pass a
 *   `name` prop for boundary-tagged telemetry.
 *
 * TELEMETRY:
 *   Every caught error flows to `logError` from the shared telemetry
 *   sink, tagged with the boundary's `name`. That's the ONE place
 *   Sentry / Crashlytics / DataDog gets wired in — no change to
 *   this file needed when telemetry lands.
 *
 * WHY A CLASS COMPONENT:
 *   React (through v19) implements error boundaries via the class
 *   methods `getDerivedStateFromError` and `componentDidCatch`.
 *   There is no functional-component / hooks-based error boundary
 *   API. This is not a stylistic choice — it's what the framework
 *   requires. (react-error-boundary wraps the same class internally.)
 * ==================================================================
 */

import React, { type ErrorInfo, type ReactNode } from 'react';

import { logError } from '@services/telemetry';

import { ErrorFallback } from './ErrorFallback';

type Props = {
  children: ReactNode;
  /**
   * Boundary identifier for telemetry. Examples: 'RootBoundary',
   * 'CustomerHomeBoundary', 'CheckoutFlowBoundary'. Recommended
   * whenever more than one boundary is mounted in the tree, so
   * telemetry can attribute errors to the right subtree.
   */
  name?: string;
  /**
   * Optional custom fallback renderer. Receives the caught error and
   * a `reset` callback; calling `reset` clears the boundary state and
   * re-mounts children. Defaults to the built-in <ErrorFallback>.
   */
  fallback?: (error: Error, reset: () => void) => ReactNode;
};

type State = { error: Error | null };

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    // Fires during render — mutate state, do NOT log here.
    // Side-effects belong in componentDidCatch below.
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    logError(error, {
      boundary: this.props.name ?? 'ErrorBoundary',
      // React 19 typed componentStack as string | null. Normalise
      // to undefined for the telemetry contract.
      componentStack: info.componentStack ?? undefined,
    });
  }

  private readonly handleReset = (): void => {
    // Clearing state re-mounts descendants. If the underlying cause
    // is deterministic (e.g. bad route params still in memory), the
    // next render will re-throw and the fallback will show again —
    // that's expected. The user can then close and reopen the app.
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (error !== null) {
      if (this.props.fallback) {
        return this.props.fallback(error, this.handleReset);
      }
      return <ErrorFallback error={error} onReset={this.handleReset} />;
    }
    return this.props.children;
  }
}
