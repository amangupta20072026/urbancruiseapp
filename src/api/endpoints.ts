/**
 * ------------------------------------------------------------------
 * API Endpoints — Central Registry
 * ------------------------------------------------------------------
 * Every URL in the app lives here. Feature code calls these
 * functions — never builds URL strings inline.
 * ------------------------------------------------------------------
 */

import type {
  BookingId,
  EnquiryId,
  QuotationId,
  TripId,
  VendorId,
  VehicleId,
  DriverId,
} from '@app-types/ids';

export const endpoints = {
  auth: {
    requestOtp: () => '/auth/otp/request',
    verifyOtp: () => '/auth/otp/verify',
    refresh: () => '/auth/refresh',
    logout: () => '/auth/logout',
    me: () => '/auth/me',
  },

  customer: {
    enquiries: {
      list: () => '/customer/enquiries',
      detail: (id: EnquiryId) => `/customer/enquiries/${id}`,
    },
    quotations: {
      list: () => '/customer/quotations',
      detail: (id: QuotationId) => `/customer/quotations/${id}`,
      confirm: (id: QuotationId) => `/customer/quotations/${id}/confirm`,
      addRemark: (id: QuotationId) => `/customer/quotations/${id}/remarks`,
    },
    bookings: {
      list: () => '/customer/bookings',
      detail: (id: BookingId) => `/customer/bookings/${id}`,
      acknowledge: (id: BookingId) => `/customer/bookings/${id}/acknowledge`,
      requestModification: (id: BookingId) =>
        `/customer/bookings/${id}/modifications`,
      passengers: (id: BookingId) => `/customer/bookings/${id}/passengers`,
    },
    trips: {
      live: (id: TripId) => `/customer/trips/${id}/live`,
    },
    payments: {
      summary: (id: BookingId) => `/customer/bookings/${id}/payments`,
      pay: (id: BookingId) => `/customer/bookings/${id}/payments/pay`,
      gstInvoice: (id: BookingId) =>
        `/customer/bookings/${id}/payments/invoice`,
    },
  },

  vendor: {
    assignments: {
      list: () => '/vendor/assignments',
      accept: (id: BookingId) => `/vendor/assignments/${id}/accept`,
      reject: (id: BookingId) => `/vendor/assignments/${id}/reject`,
    },
    vehicles: {
      list: () => '/vendor/vehicles',
      create: () => '/vendor/vehicles',
      detail: (id: VehicleId) => `/vendor/vehicles/${id}`,
      availability: (id: VehicleId) => `/vendor/vehicles/${id}/availability`,
    },
    drivers: {
      list: () => '/vendor/drivers',
      create: () => '/vendor/drivers',
      approve: (id: DriverId) => `/vendor/drivers/${id}/approve`,
    },
    trips: {
      list: () => '/vendor/trips',
      assignVehicle: (id: TripId) => `/vendor/trips/${id}/vehicle`,
      changeVehicle: (id: TripId) =>
        `/vendor/trips/${id}/vehicle/change-request`,
    },
    payments: {
      customerCollected: () => '/vendor/payments/customer-collected',
      payout: () => '/vendor/payments/payouts',
    },
  },

  driver: {
    trips: {
      list: () => '/driver/trips',
      detail: (id: TripId) => `/driver/trips/${id}`,
      acknowledge: (id: TripId) => `/driver/trips/${id}/acknowledge`,
      decline: (id: TripId) => `/driver/trips/${id}/decline`,
      submitOtp: (id: TripId) => `/driver/trips/${id}/otp`,
      startLeg: (id: TripId, leg: number) =>
        `/driver/trips/${id}/legs/${leg}/start`,
      endLeg: (id: TripId, leg: number) =>
        `/driver/trips/${id}/legs/${leg}/end`,
    },
    profile: () => '/driver/profile',
    registration: () => '/driver/registration',
  },

  uc: {
    customers: {
      list: () => '/uc/customers',
      detail: (id: string) => `/uc/customers/${id}`,
    },
    enquiries: {
      list: () => '/uc/enquiries',
      create: () => '/uc/enquiries',
    },
    quotations: {
      list: () => '/uc/quotations',
      create: (enquiryId: EnquiryId) => `/uc/enquiries/${enquiryId}/quotations`,
    },
    assignments: {
      assign: (bookingId: BookingId) => `/uc/bookings/${bookingId}/assign`,
      approveVehicleChange: (tripId: TripId) =>
        `/uc/trips/${tripId}/vehicle-change/approve`,
    },
    vendors: {
      list: () => '/uc/vendors',
      approve: (id: VendorId) => `/uc/vendors/${id}/approve`,
    },
    finance: {
      payins: () => '/uc/finance/payins',
      payouts: () => '/uc/finance/payouts',
    },
  },

  notifications: {
    list: () => '/notifications',
    markRead: (id: string) => `/notifications/${id}/read`,
    markAllRead: () => '/notifications/read-all',
  },
} as const;
