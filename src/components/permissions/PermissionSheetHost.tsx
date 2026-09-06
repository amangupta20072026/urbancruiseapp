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
import RichRationaleSheet from './RichRationaleSheet';
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
  const richSheetRef = useRef<PermissionSheetRef>(null);
  const resolverRef = useRef<Resolver | null>(null);
  const decidedRef = useRef<boolean>(false);

  const [mode, setMode] = useState<PermissionSheetMode>('rationale');
  const [copy, setCopy] = useState<RationaleCopy | null>(null);

  useEffect(() => {
    configureSheetHandlers({
      showRationale: copy =>
        new Promise<SheetChoice>(resolve => {
          if (resolverRef.current !== null) {
            resolve('dismiss');
            return;
          }

          decidedRef.current = false;
          resolverRef.current = { kind: 'sheetChoice', resolve };

          setMode('rationale');
          setCopy(copy);

          // Route by data shape: benefits present → rich sheet,
          // otherwise the existing minimal 2-button sheet.
          // Only notifications opts in today; other capabilities
          // continue to use the minimal layout unchanged.
          if (copy.benefits && copy.benefits.length > 0) {
            richSheetRef.current?.present();
          } else {
            sheetRef.current?.present();
          }
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
      // Nothing to resolve — just dismiss whichever sheet may be up.
      sheetRef.current?.dismiss();
      richSheetRef.current?.dismiss();
      return;
    }

    if (r.kind === 'blockedRecovery') {
      // Blocked flow can produce 'openSettings' or 'dismiss'.
      r.resolve(choice === 'openSettings' ? 'openSettings' : 'dismiss');
    } else {
      // Rationale / prominent flow: 'continue' or 'dismiss'.
      r.resolve(choice === 'continue' ? 'continue' : 'dismiss');
    }

    // Dismiss BOTH sheets — .dismiss() on an unmounted / not-presented
    // sheet is a safe no-op in gorhom v5, and we don't know from this
    // scope which sheet was actually presented for this request.
    sheetRef.current?.dismiss();
    richSheetRef.current?.dismiss();
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
    <>
      <PermissionSheet
        ref={sheetRef}
        mode={mode}
        copy={copy}
        onDecision={onDecision}
        onFullyDismissed={onFullyDismissed}
      />
      <RichRationaleSheet
        ref={richSheetRef}
        copy={copy}
        onDecision={onDecision}
        onFullyDismissed={onFullyDismissed}
      />
    </>
  );
};

export default PermissionSheetHost;
