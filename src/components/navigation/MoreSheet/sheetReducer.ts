/**
 * ==================================================================
 * MoreSheet — Intent-Queue State Machine (PURE, TESTABLE)
 * ==================================================================
 *
 * This module is the single source of truth for how the MoreSheet's
 * animation phase and user-intent queue evolve over time. It is a
 * pure function — no React, no refs, no side-effects. All non-pure
 * work (calling into @gorhom/bottom-sheet's imperative API, arming
 * watchdogs, invoking parent callbacks) happens in MoreSheet.tsx by
 * inspecting the `sideEffect` field of the reducer's result.
 *
 * ------------------------------------------------------------------
 * CORE PRINCIPLE — "User's latest intent always wins."
 * ------------------------------------------------------------------
 *
 * The state machine has FOUR phases:
 *
 *   closed ──PRESENT──▶ opening ──SETTLED_OPEN──▶ opened
 *     ▲                    │                        │
 *     │                    ▼                        ▼
 *     └──SETTLED_CLOSED── closing ◀────DISMISS─────┘
 *
 * The two problem areas — 'opening' and 'closing' — are transient
 * animation states. If the user presses again while in one of them,
 * we DO NOT interrupt the in-flight animation (that's what the
 * previous implementations tried, in both directions, and both
 * created bugs). Instead we QUEUE the new intent and drain it the
 * moment the animation settles.
 *
 * That's it. Two rules:
 *   1. Never interrupt an animation.
 *   2. Always execute the user's latest intent, eventually.
 *
 * Together they mean the sheet and the tab bar can never disagree
 * about "what the user asked for last." That's the class of bug this
 * design permanently closes.
 *
 * ------------------------------------------------------------------
 * TRANSITION TABLE
 * ------------------------------------------------------------------
 *
 *   Event: PRESENT                                       sideEffect
 *   ───────────────────────────────────────────────────────────────
 *   { closed,  * }        → { opening, null      }   call_present
 *   { opening, * }        → { opening, null      }   -
 *   { opened,  * }        → { opened,  null      }   -
 *   { closing, * }        → { closing, 'open'    }   -
 *
 *   Event: DISMISS
 *   ───────────────────────────────────────────────────────────────
 *   { closed,  * }        → { closed,  null      }   -
 *   { opening, * }        → { opening, 'close'   }   -
 *   { opened,  * }        → { closing, null      }   call_dismiss
 *   { closing, * }        → { closing, null      }   -
 *
 *   Event: SETTLED_OPEN     (fires from gorhom onChange(0))
 *   ───────────────────────────────────────────────────────────────
 *   { *, 'close' }        → { closing, null      }   call_dismiss
 *   { *, else }           → { opened,  null      }   -
 *
 *   Event: SETTLED_CLOSED   (fires from gorhom onChange(-1))
 *   ───────────────────────────────────────────────────────────────
 *   { *, 'open' }         → { opening, null      }   call_present
 *   { *, else }           → { closed,  null      }   -
 *
 *   Event: RESET            (unmount, focus-blur, watchdog)
 *   ───────────────────────────────────────────────────────────────
 *   { closed, null }      → { closed,  null      }   -
 *   { else,   * }         → { closed,  null      }   call_dismiss
 *
 * Notes on drains: when a settle event finds a queued opposite
 * intent, we do NOT pass through the settled phase — we go directly
 * to the requeued transient phase. This avoids a wasted 'opened'
 * frame when the user has already asked to close.
 *
 * ==================================================================
 */

/** Animation phase reported to us by gorhom's onChange plus our transitions. */
export type SheetPhase = 'closed' | 'opening' | 'opened' | 'closing';

/** User intent that arrived mid-animation and is waiting to fire. */
export type SheetIntent = 'open' | 'close';

/** Full state of the sheet's intent machine. */
export type SheetState = {
  phase: SheetPhase;
  pending: SheetIntent | null;
};

/** Events consumed by the reducer. See file header for semantics. */
export type SheetEvent =
  | { type: 'PRESENT' }
  | { type: 'DISMISS' }
  | { type: 'SETTLED_OPEN' }
  | { type: 'SETTLED_CLOSED' }
  | { type: 'RESET' };

/**
 * Non-pure work the caller must perform after applying the new state.
 * The reducer itself never touches gorhom or the DOM.
 */
export type SheetSideEffect = 'call_present' | 'call_dismiss' | null;

export type SheetReducerResult = {
  state: SheetState;
  sideEffect: SheetSideEffect;
};

/** Canonical initial state — sheet is closed, no queued intent. */
export const INITIAL_SHEET_STATE: SheetState = {
  phase: 'closed',
  pending: null,
};

/**
 * Pure state transition. Given a state and an event, returns the
 * next state and any side effect the caller must execute.
 *
 * Never throws. Never mutates its inputs. Deterministic.
 */
export function reduceSheet(
  state: SheetState,
  event: SheetEvent,
): SheetReducerResult {
  switch (event.type) {
    case 'PRESENT': {
      switch (state.phase) {
        case 'closed':
          return {
            state: { phase: 'opening', pending: null },
            sideEffect: 'call_present',
          };
        case 'opening':
        case 'opened':
          // 'open' is the current or in-flight state. Cancel any
          // queued 'close' — user's latest intent overrides.
          return {
            state: { phase: state.phase, pending: null },
            sideEffect: null,
          };
        case 'closing':
          // Queue open to fire when close settles.
          return {
            state: { phase: 'closing', pending: 'open' },
            sideEffect: null,
          };
      }
      // Exhaustive — unreachable but keeps TS happy.
      return { state, sideEffect: null };
    }

    case 'DISMISS': {
      switch (state.phase) {
        case 'opened':
          return {
            state: { phase: 'closing', pending: null },
            sideEffect: 'call_dismiss',
          };
        case 'closed':
        case 'closing':
          // Already closed or on our way. Cancel any queued 'open'.
          return {
            state: { phase: state.phase, pending: null },
            sideEffect: null,
          };
        case 'opening':
          // Queue close to fire when open settles.
          return {
            state: { phase: 'opening', pending: 'close' },
            sideEffect: null,
          };
      }
      return { state, sideEffect: null };
    }

    case 'SETTLED_OPEN': {
      if (state.pending === 'close') {
        // Skip 'opened' — drain the queue immediately.
        return {
          state: { phase: 'closing', pending: null },
          sideEffect: 'call_dismiss',
        };
      }
      return {
        state: { phase: 'opened', pending: null },
        sideEffect: null,
      };
    }

    case 'SETTLED_CLOSED': {
      if (state.pending === 'open') {
        // Skip 'closed' — drain the queue immediately.
        return {
          state: { phase: 'opening', pending: null },
          sideEffect: 'call_present',
        };
      }
      return {
        state: { phase: 'closed', pending: null },
        sideEffect: null,
      };
    }

    case 'RESET': {
      // Idempotent: if already at initial state, no side effect.
      if (state.phase === 'closed' && state.pending === null) {
        return { state, sideEffect: null };
      }
      return {
        state: { phase: 'closed', pending: null },
        sideEffect: 'call_dismiss',
      };
    }
  }
}
