/**
 * ------------------------------------------------------------------
 * TanStack Query Keys — Hierarchical Factories
 * ------------------------------------------------------------------
 * All query keys live here. Hierarchical structure enables partial
 * cache invalidation:
 *
 *   queryClient.invalidateQueries({ queryKey: queryKeys.customer.all });
 *   queryClient.invalidateQueries({ queryKey: queryKeys.customer.bookings.detail(id) });
 * ------------------------------------------------------------------
 */

import type {
  BookingId,
  EnquiryId,
  QuotationId,
  TripId,
  VendorId,
  VehicleId,
} from '@app-types/ids';

export const queryKeys = {
  auth: {
    all: ['auth'] as const,
    me: () => ['auth', 'me'] as const,
  },

  customer: {
    all: ['customer'] as const,
    home: {
      all: () => ['customer', 'home'] as const,
      /**
       * Composite key for the home screen's fan-out queries. The
       * userId is embedded so cache entries are per-user — logging
       * out and back in as a different user surfaces a clean state.
       */
      quotation: (userId: string) =>
        ['customer', 'home', userId, 'quotation'] as const,
      upcomingTrip: (userId: string) =>
        ['customer', 'home', userId, 'upcoming-trip'] as const,
      recentActivity: (userId: string) =>
        ['customer', 'home', userId, 'recent-activity'] as const,
    },
    enquiries: {
      all: () => ['customer', 'enquiries'] as const,
      detail: (id: EnquiryId) =>
        ['customer', 'enquiries', 'detail', id] as const,
    },
    quotations: {
      all: () => ['customer', 'quotations'] as const,
      detail: (id: QuotationId) =>
        ['customer', 'quotations', 'detail', id] as const,
    },
    bookings: {
      all: () => ['customer', 'bookings'] as const,
      list: (filters: Record<string, unknown>) =>
        ['customer', 'bookings', 'list', filters] as const,
      detail: (id: BookingId) =>
        ['customer', 'bookings', 'detail', id] as const,
    },
    trip: {
      live: (id: TripId) => ['customer', 'trip', 'live', id] as const,
    },
    payments: {
      summary: (id: BookingId) =>
        ['customer', 'payments', 'summary', id] as const,
    },
  },

  vendor: {
    all: ['vendor'] as const,
    assignments: {
      all: () => ['vendor', 'assignments'] as const,
      list: () => ['vendor', 'assignments', 'list'] as const,
    },
    fleet: {
      vehicles: () => ['vendor', 'fleet', 'vehicles'] as const,
      vehicleDetail: (id: VehicleId) =>
        ['vendor', 'fleet', 'vehicles', id] as const,
      availability: (id: VehicleId) =>
        ['vendor', 'fleet', 'vehicles', id, 'availability'] as const,
      drivers: () => ['vendor', 'fleet', 'drivers'] as const,
    },
    trips: {
      all: () => ['vendor', 'trips'] as const,
      list: () => ['vendor', 'trips', 'list'] as const,
    },
    payments: {
      customerCollected: () =>
        ['vendor', 'payments', 'customer-collected'] as const,
      payout: () => ['vendor', 'payments', 'payout'] as const,
    },
  },

  driver: {
    all: ['driver'] as const,
    trips: {
      all: () => ['driver', 'trips'] as const,
      list: () => ['driver', 'trips', 'list'] as const,
      detail: (id: TripId) => ['driver', 'trips', 'detail', id] as const,
    },
    profile: () => ['driver', 'profile'] as const,
  },

  uc: {
    all: ['uc'] as const,
    customers: {
      all: () => ['uc', 'customers'] as const,
      list: (filters: Record<string, unknown>) =>
        ['uc', 'customers', 'list', filters] as const,
      detail: (id: string) => ['uc', 'customers', 'detail', id] as const,
      history: {
        all: (customerId: string) =>
          ['uc', 'customers', 'history', customerId] as const,
        list: (customerId: string, filters: Record<string, unknown>) =>
          ['uc', 'customers', 'history', customerId, 'list', filters] as const,
      },
    },
    vendors: {
      all: () => ['uc', 'vendors'] as const,
      detail: (id: VendorId) => ['uc', 'vendors', id] as const,
    },
  },

  notifications: {
    all: ['notifications'] as const,
    list: () => ['notifications', 'list'] as const,
  },
} as const;
