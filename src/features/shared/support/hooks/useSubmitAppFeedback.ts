/**
 * ------------------------------------------------------------------
 * useSubmitAppFeedback — POST /support/feedback
 * ------------------------------------------------------------------
 * Non-booking-scoped app feedback submit. Distinct from the booking-
 * scoped `useSubmitFeedback` (features/customer/feedback), which
 * captures post-trip ratings tied to a specific BookingId. This hook
 * handles the free-text feedback form on the "Feedback & Suggestions"
 * support topic screen: category + subject + body + up to 4
 * screenshots.
 *
 * IDEMPOTENCY:
 *   The caller mints ONE `Idempotency-Key` per submit tap and forwards
 *   it here. Any internal retry (TanStack's own retry logic, a
 *   user-tapped "Retry" on an inline error) reuses the same key so
 *   the server returns the original response instead of writing a
 *   second feedback row. A NEW tap must generate a NEW key.
 *
 *   Rationale mirrors useSubmitFeedback / useRequestOtp — see
 *   idempotency.ts header.
 *
 * CACHE INVALIDATION:
 *   None today. App feedback is a write-only surface — no list of
 *   "your submitted feedback" is rendered (unlike booking-scoped
 *   feedback which drives the My Feedback tab). If a history
 *   surface ships later, invalidate `queryKeys.support.feedback.list()`
 *   here.
 *
 * ERROR SURFACE (typed via ApiError.kind / .code):
 *   - kind 'validation'          → server-side rejected payload
 *                                    (should be unreachable if the
 *                                    client zod schema stays in sync;
 *                                    the server remains authoritative)
 *   - kind 'network' | 'timeout' → transient, surface Retry
 *   - anything else              → generic error toast
 *
 * BACKEND SWAP:
 *   The mock in `mutationFn` just calls `delayLikeApi()` and returns
 *   a fake ticket id — enough to exercise the loading / success /
 *   navigation paths. Delete the mock branch and uncomment the
 *   `apiClient.post` block when /support/feedback lands; no other
 *   file changes.
 *
 * SCREENSHOTS:
 *   The caller passes local file URIs (from `react-native-image-picker`).
 *   When the real endpoint lands, the request body becomes
 *   `multipart/form-data` — one form-field per screenshot plus the
 *   JSON payload as an `application/json` part. That transport-level
 *   change lives in this hook only; the screen's form model does
 *   not change.
 * ------------------------------------------------------------------
 */

import { useMutation } from '@tanstack/react-query';

// import { apiClient } from '@api/axios';
// import { endpoints } from '@api/endpoints';
import { ApiError } from '@api/errors';
import { logEvent } from '@services/telemetry/logEvent';
import { delayLikeApi } from '@mocks/helpers/delay';

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

export type FeedbackCategory = 'general' | 'suggestion' | 'issue' | 'app';

/** One picked screenshot. Shape matches react-native-image-picker's `Asset`. */
export type FeedbackAttachment = {
  uri: string;
  type?: string;
  fileName?: string;
  fileSize?: number;
};

export type SubmitAppFeedbackInput = {
  category: FeedbackCategory;
  subject: string;
  body: string;
  attachments: readonly FeedbackAttachment[];
};

export type SubmitAppFeedbackResponse = {
  /** Server-side ticket id, echoed back on success for support follow-up. */
  ticketId: string;
};

/* ------------------------------------------------------------------ */
/* Mock                                                               */
/* ------------------------------------------------------------------ */

async function mockSubmit(
  input: SubmitAppFeedbackInput,
): Promise<SubmitAppFeedbackResponse> {
  await delayLikeApi();

  // Defensive belt-and-braces validation — the client zod schema is
  // authoritative, but if a caller ever hand-crafts the payload, we
  // still throw the same `validation` shape a real server would.
  if (!input.subject.trim() || !input.body.trim()) {
    throw new ApiError(
      'validation',
      'Subject and feedback body are required.',
      400,
    );
  }

  return { ticketId: `TICKET-${Date.now().toString(36).toUpperCase()}` };
}

/* ------------------------------------------------------------------ */
/* Hook                                                               */
/* ------------------------------------------------------------------ */

export function useSubmitAppFeedback() {
  return useMutation<
    SubmitAppFeedbackResponse,
    ApiError,
    { input: SubmitAppFeedbackInput; idempotencyKey: string }
  >({
    mutationFn: async ({ input /* , idempotencyKey */ }) => {
      // ── Mock branch (delete when the endpoint ships) ─────────
      return mockSubmit(input);

      // ── Real branch (uncomment when the endpoint ships) ──────
      // The wire format is multipart/form-data when there are
      // attachments, plain JSON otherwise. The server dedupes on
      // Idempotency-Key.
      //
      // const form = new FormData();
      // form.append(
      //   'payload',
      //   JSON.stringify({
      //     category: input.category,
      //     subject: input.subject,
      //     body: input.body,
      //   }),
      // );
      // input.attachments.forEach((a, i) => {
      //   form.append(`screenshots[${i}]`, {
      //     uri: a.uri,
      //     type: a.type ?? 'image/jpeg',
      //     name: a.fileName ?? `screenshot-${i}.jpg`,
      //   } as unknown as Blob);
      // });
      // const { data } = await apiClient.post<SubmitAppFeedbackResponse>(
      //   endpoints.support.feedback(),
      //   form,
      //   {
      //     headers: {
      //       'Content-Type': 'multipart/form-data',
      //       'Idempotency-Key': idempotencyKey,
      //     },
      //   },
      // );
      // return data;
    },

    onSuccess: (_res, { input }) => {
      logEvent('support.feedback_submitted', {
        category: input.category,
        subjectLength: input.subject.length,
        bodyLength: input.body.length,
        attachmentCount: input.attachments.length,
      });
    },

    onError: (err, { input }) => {
      logEvent('support.feedback_failed', {
        category: input.category,
        errorKind: err.kind,
        httpStatus: err.status,
      });
    },
  });
}
