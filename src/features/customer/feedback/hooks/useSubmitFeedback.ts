/**
 * ------------------------------------------------------------------
 * useSubmitFeedback — POST /customer/bookings/:id/feedback
 * ------------------------------------------------------------------
 * Booking-scoped feedback submit. Wraps `useMutation` so screens
 * get the same ergonomics as the other write hooks in the app
 * (useRequestOtp, useVerifyOtp) — `mutate` + `isPending` + typed
 * `ApiError`.
 *
 * IDEMPOTENCY:
 *   The caller mints ONE `Idempotency-Key` per submit tap and forwards
 *   it here. Any internal retry (TanStack's own retry logic, a
 *   user-tapped "Retry" on an inline error) reuses the same key so
 *   the server returns the original response instead of writing a
 *   second feedback row. A NEW tap must generate a NEW key.
 *
 *   Rationale mirrors useRequestOtp — see idempotency.ts header.
 *
 * CACHE INVALIDATION:
 *   On success we invalidate:
 *     - `queryKeys.customer.feedback.list()`     → "My Feedback" tab refreshes
 *     - `queryKeys.customer.feedback.eligible()` → the submitted trip
 *                                                  drops off the
 *                                                  "Select a Booking"
 *                                                  list
 *   We do NOT touch bookings/detail — feedback is a sibling record,
 *   not a mutation of the booking itself.
 *
 * ERROR SURFACE (typed via ApiError.kind / .code):
 *   - kind 'notFound'    → booking gone / not eligible → hard fail, close screen
 *   - kind 'conflict'    + code 'feedback_exists'      → already submitted
 *   - kind 'validation'  → server-side rejected payload (should be
 *                          unreachable if the client zod schema is
 *                          in sync; the server is still authoritative)
 *   - kind 'network' | 'timeout'                       → transient, retry surface
 *   - anything else                                    → generic
 *
 * BACKEND SWAP:
 *   The mock in `mutationFn` reads/writes MOCK_SUBMITTED_BOOKING_IDS
 *   so screens can be exercised against the conflict path. Delete
 *   the mock branch when /customer/bookings/:id/feedback lands —
 *   nothing else in this file changes.
 * ------------------------------------------------------------------
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

// import { apiClient } from '@api/axios';
// import { endpoints } from '@api/endpoints';
import { ApiError } from '@api/errors';
import { queryKeys } from '@constants/queryKeys';
import { logEvent } from '@services/telemetry/logEvent';
import { delayLikeApi } from '@mocks/helpers/delay';
import type { BookingId } from '@app-types/ids';

import type { LikeTag, RatingCategories, SubmittedFeedback } from '../types';
import { MOCK_SUBMITTED_BOOKING_IDS } from '../mocks';

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

export type SubmitFeedbackInput = {
  bookingId: BookingId;
  ratings: RatingCategories;
  tags: readonly LikeTag[];
  comment: string;
  /** ONE per submit intent (mint at the CALLER, not here). */
  idempotencyKey: string;
};

/**
 * Server's success response — the persisted feedback row, echoed
 * back so the client can hydrate the "My Feedback" list without a
 * second round-trip. Mirrors SubmittedFeedback so the tab list's
 * item shape doesn't diverge.
 */
export type SubmitFeedbackResponse = SubmittedFeedback;

/* ------------------------------------------------------------------ */
/* Fetcher (mock — swap for real POST when endpoint ships)            */
/* ------------------------------------------------------------------ */

async function submitFeedback(
  input: SubmitFeedbackInput,
): Promise<SubmitFeedbackResponse> {
  // TODO(backend): swap for:
  //   const { data } = await apiClient.post<SubmitFeedbackResponse>(
  //     endpoints.customer.feedback.submit(input.bookingId),
  //     {
  //       ratings: input.ratings,
  //       tags: input.tags,
  //       comment: input.comment,
  //     },
  //     { headers: { 'Idempotency-Key': input.idempotencyKey } },
  //   );
  //   return data;

  await delayLikeApi();

  // Simulate the server's dedupe branch. Without this the client
  // can't be exercised against the `conflict` code path.
  if (MOCK_SUBMITTED_BOOKING_IDS.has(input.bookingId)) {
    throw new ApiError(
      'conflict',
      'Feedback has already been submitted for this trip.',
      409,
      undefined,
      'feedback_exists',
    );
  }

  MOCK_SUBMITTED_BOOKING_IDS.add(input.bookingId);

  const now = new Date().toISOString();
  return {
    id: `fb_mock_${Date.now()}`,
    bookingId: input.bookingId,
    bookingFrom: '',
    bookingTo: '',
    bookingDate: now,
    rating: input.ratings.overall,
    ratings: input.ratings,
    tags: [...input.tags],
    comment: input.comment,
    submittedAt: now,
  };
}

/* ------------------------------------------------------------------ */
/* Hook                                                               */
/* ------------------------------------------------------------------ */

export function useSubmitFeedback() {
  const queryClient = useQueryClient();

  const mutation = useMutation<
    SubmitFeedbackResponse,
    ApiError,
    SubmitFeedbackInput
  >({
    mutationKey: queryKeys.customer.feedback.submit(),
    mutationFn: submitFeedback,
    /* One retry only, and only for transient failures. Never retry
     * validation / conflict / notFound — the server's answer is
     * definitive on those and a retry just wastes a round-trip and
     * doubles the toast noise. */
    retry: (failureCount, error) => {
      if (failureCount >= 1) return false;
      return error.kind === 'network' || error.kind === 'timeout';
    },
    onSuccess: async (data, variables) => {
      logEvent('customer.feedback_submitted', {
        bookingId: variables.bookingId,
        overall: variables.ratings.overall,
        executive: variables.ratings.executive,
        driver: variables.ratings.driver,
        tag_count: variables.tags.length,
        // Bucketed length so we can spot "always empty" without
        // storing the free text. PII-safe.
        comment_length_bucket:
          variables.comment.length === 0
            ? 'empty'
            : variables.comment.length < 50
            ? 'short'
            : variables.comment.length < 200
            ? 'medium'
            : 'long',
      });

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.customer.feedback.list(),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.customer.feedback.eligible(),
        }),
      ]);

      return data;
    },
    onError: (err, variables) => {
      logEvent('customer.feedback_failed', {
        bookingId: variables.bookingId,
        reason: err.code ?? err.kind,
      });
    },
  });

  return {
    submitFeedback: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}
