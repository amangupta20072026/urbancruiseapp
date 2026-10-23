// src/navigation/types.ts
import type { NavigatorScreenParams } from '@react-navigation/native';
import type { BookingId, QuotationId } from '@app-types/ids';
import type { UserRole } from '@rbac/roles';
import type { SharedScreensFor } from '@rbac/screenAccess';
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
  /**
   * New customer only: /auth/otp/verify returned
   * 'onboarding_required'. The token is single-use, bound to this
   * device, and expires after `expiresInSeconds`. Kept in navigation
   * state (memory only, never persisted).
   */
  CustomerProfileSetup: {
    onboardingToken: string;
    expiresInSeconds: number;
    /** 10-digit verified mobile, display only (never sent again). */
    phone: string;
  };
  Support: undefined;
};

/* ------------------ Shared screens ------------------ */
/**
 * Screens built once and reused by several roles. WHICH roles get
 * each one is decided only by `SCREEN_ACCESS` in
 * src/rbac/screenAccess.ts; each role's ParamList below picks up its
 * share through `SharedParamsFor<role>`, and the navigators register
 * the same set through `renderSharedScreens`. All take no params.
 */
export type SharedStackParamList = {
  Settings: undefined;
  /**
   * Contact card (phone / WhatsApp / email). Also registered in the
   * Auth stack for the login screen's "Contact Support" link.
   */
  Support: undefined;
  AboutUrbanCruise: undefined;
  /** Signed-in user's own profile; data comes from the access token. */
  Profile: undefined;
  /** Signed-in user's own inbox; the backend scopes it by token. */
  NotificationCentre: undefined;
  /**
   * Rich "Help & Support" hub: contact channels + topic tiles. The
   * tiles shown are filtered by role with the same access table.
   */
  HelpSupport: undefined;
  /**
   * Per-topic help screens opened from HelpSupport tiles.
   * FeedbackHelp is a submission form, not an FAQ list.
   */
  QuotationHelp: undefined;
  BookingHelp: undefined;
  PaymentsHelp: undefined;
  AccountHelp: undefined;
  SafetyHelp: undefined;
  FeedbackHelp: undefined;
  /** Per-channel notification toggles, reached from Settings. */
  NotificationPreferences: undefined;
};

/** The shared screens role `R` has, as ParamList entries. */
export type SharedParamsFor<R extends UserRole> = Pick<
  SharedStackParamList,
  SharedScreensFor<R>
>;

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
  // General customer feedback (from More sheet — no booking scope).
  // Distinct from booking-scoped `Feedback` above.
  CustomerFeedback: undefined;
  Referrals: undefined;
} & SharedParamsFor<'customer'>;

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
} & SharedParamsFor<'vendor'>;

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
} & SharedParamsFor<'driver'>;

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

  // More-sheet destinations. Some bodies are still the shared
  // ComingSoon component; real screens land in `features/uc/<domain>/`
  // without touching the navigator wiring.
  VendorsList: undefined;
  Payments: undefined;
  DriversList: undefined;
  Performance: undefined;

  /**
   * Directory hub — hosts the Customers / Vendors / UC Staff / Drivers
   * top tabs. Replaces the four separate More-sheet entries.
   */
  Directory: undefined;
} & SharedParamsFor<'uc'>;

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
