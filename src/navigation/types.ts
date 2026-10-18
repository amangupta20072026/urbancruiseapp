// src/navigation/types.ts
import type { NavigatorScreenParams } from '@react-navigation/native';
import type { BookingId, QuotationId } from '@app-types/ids';
import type { UserRole } from '@rbac/roles';
import type { VehicleTierKey } from '@features/customer/quotations/vehicleTierOptions';
// Value import (not `import type`) — the tab param list types below use
// `[MORE_ROUTE_NAME]` as a computed key so that renaming the constant
// is a single-point-of-truth change caught by TypeScript everywhere.
import { MORE_ROUTE_NAME } from './tabs/shared/routeNames';

/* ---------------------- Root ---------------------- */
export type RootStackParamList = {
  SplashIntro: undefined;
  OnboardingFlow: NavigatorScreenParams<OnboardingParamList>;
  AuthFlow: NavigatorScreenParams<AuthParamList>;
  CustomerFlow: NavigatorScreenParams<CustomerStackParamList>;
  VendorFlow: NavigatorScreenParams<VendorStackParamList>;
  DriverFlow: NavigatorScreenParams<DriverStackParamList>;
  UcFlow: NavigatorScreenParams<UcStackParamList>;
};

/* -------------------- Onboarding -------------------- */
// SplashIntro is now handled at the ROOT level (bootstrap gate),
// not inside OnboardingFlow.
export type OnboardingParamList = {
  Onboarding: undefined;
};

/* --------------------- Auth ------------------------- */
export type AuthParamList = {
  Login: { role: UserRole };
  OtpVerify: {
    role: UserRole;
    phone: string;
    /** Handle returned by /auth/otp/request; echoed back on verify. */
    requestId?: string;
    /** Server-suggested resend cooldown; overrides RESEND_SECONDS if present. */
    resendAfterSeconds?: number;
    /**
     * Delivery channel the server used. Currently always `'sms'` —
     * kept as a union type for forward compatibility.
     */
    channel?: 'sms';
    /**
     * True when the number matched a QA test mobile and the server
     * did not dispatch a real OTP. The screen shows a hint so QA
     * enters the fixed test code.
     */
    testMode?: boolean;
  };
  Support: undefined;
};

/* ------------------ Customer stack ------------------ */
export type CustomerStackParamList = {
  CustomerTabs: NavigatorScreenParams<CustomerTabParamList>;
  // "Plan your next journey" flow (customer-initiated enquiry).
  // RequestQuotation → QuotationSuccess uses navigation.replace()
  // so pressing Back from success does not return to a completed form.
  // In this pass QuotationSuccess.requestId is a client-generated
  // placeholder; once /customer/enquiries is wired, the same param
  // will carry the server's enquiry id — no route-shape change.
  RequestQuotation: undefined;
  QuotationSuccess: { requestId: string };
  QuotationDetail: {
    quotationId: QuotationId;
    /**
     * When true, the QuotationDetail screen auto-presents its
     * ContinueToBookingSheet on landing. Used by the Payments tab's
     * pending-payment "Pay Now" CTA — tapping it should route the
     * customer straight to the confirm-and-continue sheet for the
     * parent quotation, not just to the quotation screen. Default
     * (undefined / false) = normal open, no sheet.
     */
    openContinueSheet?: boolean;
    /**
     * When true, QuotationDetail auto-presents its NeedChangesSheet on
     * landing. Used by the Quotations list's "Need Changes" button on
     * pending cards. Default (undefined / false) = normal open.
     */
    openNeedChangesSheet?: boolean;
    /**
     * One-shot: select this vehicle option in "Choose Your Vehicle"
     * on arrival. Set by VehicleVideo / CompareVehicles via
     * `popTo('QuotationDetail', …, { merge: true })`; the screen clears
     * it after applying it.
     */
    selectVehicleOptionId?: string;
  };

  // -----------------------------------------------------------------
  // Vehicle brochures (YouTube videos + compare). Reached from
  // QuotationDetail only.
  // -----------------------------------------------------------------
  /** Grouped list: vehicle type → seater → tier. Pending quotations only. */
  VehicleBrochures: { quotationId: QuotationId };
  /**
   * One brochure's videos and facilities. `select` is present only
   * when exactly one vehicle option of a pending quotation is being
   * viewed; it shows the price and the "Select this vehicle" CTA.
   */
  VehicleVideo: {
    groupKey: string;
    tier: VehicleTierKey;
    select?: { quotationId: QuotationId; optionId: string };
  };
  /** Every vehicle option side by side; `focusOptionId` is highlighted. */
  CompareVehicles: { quotationId: QuotationId; focusOptionId: string };

  BookingDetail: { bookingId: BookingId };
  Feedback: { bookingId: BookingId };
  NotificationCentre: undefined;
  Support: undefined;
  /**
   * Rich "Help & Support" hub reached from the More sheet. Kept
   * distinct from the pre-auth `Support` route (used by the login
   * screen's "Contact Support" link) so each entry point retains
   * its own tailored surface — the pre-auth SupportScreen is a
   * three-channel contact card, while HelpSupport is a full hub
   * with contact channels + topic browsing.
   */
  HelpSupport: undefined;
  /**
   * Per-topic FAQ list reached from a "Get Help With" tile inside
   * HelpSupport. Ships one screen per topic (QuotationHelp,
   * BookingHelp, PaymentsHelp, AccountHelp, SafetyHelp,
   * FeedbackHelp) — each is a shared component registered on every
   * role stack that also has HelpSupport.
   *
   * NB: FeedbackHelp is a SUBMISSION FORM, not an FAQ list — feedback
   * has no "questions with answers" set to browse, only a place to
   * write in. Route name follows the topic-tile naming convention
   * so `handleTopicPress` reads uniformly. See FeedbackHelpScreen
   * header for full rationale.
   */
  QuotationHelp: undefined;
  BookingHelp: undefined;
  PaymentsHelp: undefined;
  AccountHelp: undefined;
  SafetyHelp: undefined;
  FeedbackHelp: undefined;
  // General customer feedback (from More sheet — no booking scope).
  // Distinct from booking-scoped `Feedback` above.
  CustomerFeedback: undefined;

  // -----------------------------------------------------------------
  // More-sheet destinations. Shared screens (Profile, Settings,
  // NotificationCentre above) live under features/shared/*; role-
  // scoped ones (Referrals) live under features/customer/*. When a
  // real UI ships, only the component reference in CustomerNavigator
  // changes — route names and this param list stay stable.
  // -----------------------------------------------------------------
  Profile: undefined;
  Settings: undefined;
  /**
   * "About Urban Cruise" — reached from the Support & Legal section
   * inside SettingsScreen. Static content screen: app version + brand,
   * expandable About / Services / Mission / Why Choose Us / Contact
   * sections and a Legal Information entry.
   */
  AboutUrbanCruise: undefined;
  NotificationPreferences: undefined;
  Referrals: undefined;
};

export type CustomerTabParamList = {
  Home: undefined;
  Quotations: undefined;
  Bookings: undefined;
  Payments: undefined;
  [MORE_ROUTE_NAME]: undefined;
};

/* ------------------- Vendor stack ------------------- */
export type VendorStackParamList = {
  VendorTabs: NavigatorScreenParams<VendorTabParamList>;
  Support: undefined;
  /** Rich "Help & Support" hub from the More sheet. See CustomerStackParamList for rationale. */
  HelpSupport: undefined;
  /** Per-topic FAQ list from HelpSupport. See CustomerStackParamList. */
  QuotationHelp: undefined;
  BookingHelp: undefined;
  PaymentsHelp: undefined;
  AccountHelp: undefined;
  SafetyHelp: undefined;
  FeedbackHelp: undefined;
};

export type VendorTabParamList = {
  Dashboard: undefined;
  Bookings: undefined;
  Fleet: undefined;
  Drivers: undefined;
  [MORE_ROUTE_NAME]: undefined;
};

/* ------------------- Driver stack ------------------- */
export type DriverStackParamList = {
  DriverTabs: NavigatorScreenParams<DriverTabParamList>;
  Support: undefined;
  /** Rich "Help & Support" hub from the More sheet. See CustomerStackParamList for rationale. */
  HelpSupport: undefined;
  /** Per-topic FAQ list from HelpSupport. See CustomerStackParamList. */
  QuotationHelp: undefined;
  BookingHelp: undefined;
  PaymentsHelp: undefined;
  AccountHelp: undefined;
  SafetyHelp: undefined;
  FeedbackHelp: undefined;
};

export type DriverTabParamList = {
  Home: undefined;
  MyTrips: undefined;
  Emergency: undefined;
  Earnings: undefined;
  [MORE_ROUTE_NAME]: undefined;
};

/* --------------------- UC stack --------------------- */
export type UcStackParamList = {
  UcTabs: NavigatorScreenParams<UcTabParamList>;
  CustomersList: { reopenCustomerId?: string } | undefined;
  CustomerDetail: { customerId: string };
  NotificationCentre: undefined;
  Support: undefined;

  // -----------------------------------------------------------------
  // More-sheet destinations. Some bodies are still the shared
  // ComingSoon component; real screens land in `features/uc/<domain>/`
  // without touching the navigator wiring.
  // -----------------------------------------------------------------
  Profile: undefined;
  Settings: undefined;
  /**
   * "About Urban Cruise" — reached from Settings. See
   * CustomerStackParamList for the same route's rationale.
   */
  AboutUrbanCruise: undefined;
  VendorsList: undefined;
  Payments: undefined;
  DriversList: undefined;
  Performance: undefined;

  /**
   * Directory hub — hosts the Customers / Vendors / UC Staff / Drivers
   * top tabs. Replaces the four separate More-sheet entries.
   */
  Directory: undefined;
};

export type UcTabParamList = {
  Dashboard: undefined;
  Quotations: undefined;
  Bookings: undefined;
  Trips: undefined;
  [MORE_ROUTE_NAME]: undefined;
};

/* ================================================================
 * React Navigation global typing
 * ================================================================ */
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
