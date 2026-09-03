/* eslint-disable @typescript-eslint/no-shadow */
/**
 * ------------------------------------------------------------------
 * PermissionSheetHost
 * ------------------------------------------------------------------
 * Bridges PermissionService's async handler contract to a single
 * `<PermissionSheet />` instance living in the app tree.
 *
 * Mount ONCE at the app root (inside <BottomSheetModalProvider>).
 * Do not remount on route changes — a re-mount would blow away the
 * currently-presented sheet mid-flow.
 *
 * How it works:
 *   1. On mount, calls `configureSheetHandlers` with three closures
 *      that each:
 *        a. store the requested (mode, copy)
 *        b. return a Promise
 *        c. present the sheet
 *   2. The user's tap (or backdrop dismiss) resolves the Promise.
 *   3. resolveRef + decidedRef guard against double-resolution:
 *        - primary/secondary tap → decidedRef=true → resolve → dismiss
 *        - backdrop/pan → onDismiss fires → if !decidedRef, resolve('dismiss')
 *
 * NOTE: sheetHandlers is a module-level singleton, so mounting two
 * hosts would race. Enforced by convention — the docs on
 * configureSheetHandlers spell this out. A defensive strict-mode
 * remount is safe because the handlers are idempotent: same closures
 * just get re-registered.
 * ------------------------------------------------------------------
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';

import type { RationaleCopy } from '@rbac/capabilities';
import {
  configureSheetHandlers,
  type BlockedRecoveryChoice,
  type SheetChoice,
} from '@services/permissions';

import PermissionSheet, {
  type PermissionSheetDecision,
  type PermissionSheetMode,
  type PermissionSheetRef,
} from './PermissionSheet';
import { resetSheetHandlers } from '@/services/permissions/sheetHandlers';

/**
 * Two resolver shapes, both narrow. We union them so a single ref can
 * hold whichever is in flight; only the corresponding present() ever
 * assigns.
 */
type Resolver =
  | { kind: 'sheetChoice'; resolve: (v: SheetChoice) => void }
  | { kind: 'blockedRecovery'; resolve: (v: BlockedRecoveryChoice) => void };

const PermissionSheetHost: React.FC = () => {
  const sheetRef = useRef<PermissionSheetRef>(null);
  const resolverRef = useRef<Resolver | null>(null);
  const decidedRef = useRef<boolean>(false);

  const [mode, setMode] = useState<PermissionSheetMode>('rationale');
  const [copy, setCopy] = useState<RationaleCopy | null>(null);

  useEffect(() => {
    configureSheetHandlers({
      showRationale: copy =>
        new Promise<SheetChoice>(resolve => {
          if (resolverRef.current !== null) {
            // Another permission sheet is already in progress.
            // Reject this overlapping request cleanly so the first
            // request can finish normally.
            resolve('dismiss');
            return;
          }

          decidedRef.current = false;
          resolverRef.current = { kind: 'sheetChoice', resolve };

          setMode('rationale');
          setCopy(copy);
          sheetRef.current?.present();
        }),

      showProminentDisclosure: copy =>
        new Promise<SheetChoice>(resolve => {
          if (resolverRef.current !== null) {
            // Another permission sheet is already in progress.
            resolve('dismiss');
            return;
          }

          decidedRef.current = false;
          resolverRef.current = { kind: 'sheetChoice', resolve };

          setMode('prominent');
          setCopy(copy);
          sheetRef.current?.present();
        }),

      showBlockedRecovery: copy =>
        new Promise<BlockedRecoveryChoice>(resolve => {
          if (resolverRef.current !== null) {
            // Another permission sheet is already in progress.
            resolve('dismiss');
            return;
          }

          decidedRef.current = false;
          resolverRef.current = { kind: 'blockedRecovery', resolve };

          setMode('blocked');
          setCopy(copy);
          sheetRef.current?.present();
        }),
    });

    return () => {
      resetSheetHandlers();
    };
  }, []);

  /* -----------------------------------------------------------------
   * Decision routing
   *
   * The sheet's onDecision emits one of three values. We must map
   * them to whichever resolver kind is currently registered, without
   * running the wrong resolver signature.
   * ----------------------------------------------------------------- */

  const onDecision = useCallback((choice: PermissionSheetDecision) => {
    if (decidedRef.current) return; // second tap during dismiss animation
    decidedRef.current = true;

    const r = resolverRef.current;
    if (r === null) {
      sheetRef.current?.dismiss();
      return;
    }

    if (r.kind === 'blockedRecovery') {
      // Blocked flow can produce 'openSettings' or 'dismiss'.
      // 'continue' would be a programming error (blocked mode has no
      // 'continue' CTA) — coerce to 'dismiss' defensively.
      r.resolve(choice === 'openSettings' ? 'openSettings' : 'dismiss');
    } else {
      // Rationale / prominent flow: 'continue' or 'dismiss'.
      // 'openSettings' shouldn't happen here — coerce to 'dismiss'.
      r.resolve(choice === 'continue' ? 'continue' : 'dismiss');
    }

    sheetRef.current?.dismiss();
  }, []);

  /* -----------------------------------------------------------------
   * Backdrop / pan dismissal — Gorhom fires onDismiss when the modal
   * fully closes for any reason. If no decision was recorded first,
   * treat as dismiss so pending promises don't hang.
   * ----------------------------------------------------------------- */

  const onFullyDismissed = useCallback(() => {
    if (!decidedRef.current) {
      decidedRef.current = true;
      const r = resolverRef.current;
      if (r !== null) {
        if (r.kind === 'blockedRecovery') r.resolve('dismiss');
        else r.resolve('dismiss');
      }
    }
    resolverRef.current = null;
    // decidedRef is reset by the next present() call, not here — a
    // stray onDismiss during transitions should still be a no-op.
  }, []);

  return (
    <PermissionSheet
      ref={sheetRef}
      mode={mode}
      copy={copy}
      onDecision={onDecision}
      onFullyDismissed={onFullyDismissed}
    />
  );
};

export default PermissionSheetHost;
