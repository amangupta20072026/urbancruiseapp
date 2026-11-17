/**
 * ------------------------------------------------------------------
 * logEvent — Centralised event sink (non-error signals)
 * ------------------------------------------------------------------
 * Sibling of logError, for things that AREN'T failures but that we
 * still want to record — user-behaviour signals, security-relevant
 * events (screenshot attempts, backgrounding during payment), etc.
 *
 * Contract:
 *   - MUST NEVER throw (analytics.ts catches internally)
 *   - Structured: name + optional properties
 *   - Name is a closed union (EventName) — typos caught at compile
 *
 * Wired to Firebase Analytics via services/telemetry/analytics.ts.
 * If we ever change analytics vendors, only analytics.ts changes.
 *
 * ── Firebase Analytics name compliance ─────────────────────────────
 * Per Firebase's official rules (event/param names: [a-zA-Z0-9_],
 * ≤40 chars, must start with a letter, reserved prefixes 'firebase_',
 * 'google_', 'ga_', '_') our dot-namespaced names like
 * 'fcm.notification_received' are transparently sanitised by
 * analytics.ts (→ 'fcm_notification_received') before hitting the
 * SDK. Callers get the readable dotted form; Firebase gets the
 * sanitised form. Keep names ≤40 chars AFTER sanitisation.
 * ------------------------------------------------------------------
 */

import type { PermissionTelemetryKey } from '@rbac/capabilities';
import { sendAnalyticsEvent } from './analytics';

/* -----------------------------------------------------------------
 * Permission events — funnel telemetry from PermissionService.
 * ----------------------------------------------------------------- */

export type PermissionTelemetryVerb =
  | 'check'
  | 'rationale_shown'
  | 'rationale_dismissed'
  | 'prominent_disclosure_shown'
  | 'prominent_disclosure_dismissed'
  | 'prompt_shown'
  | 'granted'
  | 'denied'
  | 'blocked'
  | 'blocked_recovery_shown'
  | 'settings_opened'
  | 'gps_off'
  | 'rbac_violation';

export type PermissionEventName =
  `permission.${PermissionTelemetryKey}.${PermissionTelemetryVerb}`;

/* -----------------------------------------------------------------
 * The closed EventName union
 *
 * Trip lifecycle names (`trip.*`) are intentionally not listed —
 * add them in the same shape when their emitters land in
 * DriverLocationService.ts.
 * ----------------------------------------------------------------- */

export type EventName =
  // ── Security ──────────────────────────────────────────
  | 'security.screenshot_detected'
  | 'security.recording_started'
  | 'security.background_while_sensitive'

  // ── Permissions (funnel) ──────────────────────────────
  | PermissionEventName

  // ── Auth ──────────────────────────────────────────────
  | 'auth.otp_sent'
  | 'auth.otp_verified'
  | 'auth.otp_failed'
  | 'auth.login_success'
  | 'auth.logout'
  // New-customer profile form. `_completed` on 2xx with properties
  // { customer_type, is_new_account, city_source: 'detected' | 'typed' };
  // `_failed` with { reason } (server code or error kind). Never the
  // name, email or city themselves (PII).
  | 'auth.onboarding_completed'
  | 'auth.onboarding_failed'
  // "Use my location" outcome on that form. Properties: { status }
  // from DetectCityResult — never coordinates or the city.
  | 'auth.city_detect_result'

  // ── Home CTAs ─────────────────────────────────────────
  | 'home.cta_tapped'
  | 'home.service_mode_changed'
  // The "Spiritual Tours" tile on Home. It opens the in-app catalog;
  // there is no separate app and no store to send anyone to.
  | 'home.spiritual_tours_opened'
  // A tour card tapped on the catalog. Properties: { tourId, region }.
  // Against 'home.spiritual_tours_opened' this gives the browse-to-
  // open rate, and which regions earn their place on the screen.
  | 'spiritual_tours.tour_opened'
  // "Talk to a Travel Advisor" (list) or "Talk to Travel Advisory"
  // (a tour's detail). Properties: { from } — 'list' or 'detail' —
  // plus { tourId } from the detail screen. The only action on either
  // screen besides opening a tour, so this against
  // 'home.spiritual_tours_opened' is the whole funnel.
  | 'spiritual_tours.advisor_called'
  // REMOVED: 'spiritual_tours.quotation_requested', '.save_toggled',
  // '.shared' and '.help_tapped' belonged to the detail screen's old
  // Enquire / Book Now button, heart, share icon and Need Help block,
  // none of which exist in the current design. Events already
  // recorded under those names stay in Firebase; nothing in the app
  // emits them now.
  // REMOVED: 'spiritual_tours.notify_me_tapped' belonged to the
  // Coming Soon page, which no longer exists. Historical events
  // already recorded under that name stay in Firebase; nothing in
  // the app emits it now.

  // The "Booking process" explainer on Quotation Details.
  // Properties: { status } — the quotation's state when opened.
  // A high rate on pending quotations says the screen is not
  // explaining itself well enough on its own.
  | 'quotation.booking_process_opened'

  // ── Customer feedback ─────────────────────────────────
  // Booking-scoped post-trip feedback flow. `_started` fires when
  // the user opens the form (useful funnel signal — many users open
  // and abandon), `_submitted` on 2xx, `_failed` on 4xx/5xx/network.
  | 'customer.feedback_started'
  | 'customer.feedback_submitted'
  | 'customer.feedback_failed'

  // ── Support (self-service) ────────────────────────────
  // Per-question "Was this helpful?" vote on the topic FAQ screens
  // (QuotationHelp, BookingHelp, ...). Properties: { topic, faqId,
  // helpful: boolean }. Aggregation on `helpful` gives per-topic
  // deflection rate; drilling on `faqId` surfaces the specific
  // answers that need rewriting.
  | 'support.faq_helpful_voted'
  // App-level (non-booking-scoped) feedback form on the "Feedback &
  // Suggestions" support-topic screen. `_started` fires when the
  // user taps Submit (useful funnel: how many drafts get discarded
  // before submit), `_submitted` on 2xx, `_failed` on 4xx/5xx/
  // network. Properties: { category, subjectLength, bodyLength,
  // attachmentCount } — never the free-text content.
  | 'support.feedback_submit_started'
  | 'support.feedback_submitted'
  | 'support.feedback_failed'

  // ── Vehicle brochures ─────────────────────────────────
  // `brochure.opened` fires when a brochure video is opened.
  // Properties: { groupKey, seater, tier, videoIndex, source }.
  // `brochure.open_failed` when the video could not be opened.
  // `brochure.list_opened` / `brochure.compare_opened` are screen
  // views. Properties never include customer data.
  | 'brochure.opened'
  | 'brochure.open_failed'
  | 'brochure.list_opened'
  | 'brochure.compare_opened'

  // ── Push (FCM) ────────────────────────────────────────
  | 'fcm.notification_received'
  | 'fcm.notification_tapped'
  | 'fcm.token_registered'
  | 'fcm.token_refreshed'
  | 'fcm.token_unregistered'
  | 'fcm.token_unavailable'

  // ── Deeplinks ─────────────────────────────────────────
  | 'deeplink.opened'
  | 'deeplink.rejected'

  // ── Unfinished features ───────────────────────────────
  // Fires every time the "Coming soon" toast is shown. Properties:
  // { feature: ComingSoonFeature, source: ComingSoonSource } — both
  // bounded literals (see services/comingSoon). Aggregating on
  // `feature` shows which unfinished features users try to reach
  // most, which is a direct input to roadmap priority.
  | 'feature.coming_soon_shown';

export type EventProperties = Record<string, unknown>;

/**
 * Record a structured telemetry event. Safe to call from anywhere.
 * Fires in BOTH dev (with console echo) and prod. Never throws.
 */
export function logEvent(
  name: EventName,
  properties: EventProperties = {},
): void {
  if (__DEV__) {
    console.log(`[event] ${name}`, properties);
  }
  sendAnalyticsEvent(name, properties);
}
