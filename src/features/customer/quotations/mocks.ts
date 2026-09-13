/**
 * ------------------------------------------------------------------
 * Customer Quotations — mock fixture
 * ------------------------------------------------------------------
 * Seeds the Quotations tab list. One item per status kind so every
 * filter chip has at least one hit during demo, plus enough variety
 * (round trip, single day, no-vehicle) to exercise the card
 * conditionals.
 *
 * Dates are fixed (not derived from now()) because "requested on"
 * and "travel date" should feel stable across demo sessions —
 * shifting them daily makes screenshots hard to align with product
 * copy. When the endpoint ships, delete this file.
 * ------------------------------------------------------------------
 */

import { asQuotationId } from '@app-types/ids';
import type { CustomerQuotationListItem } from './types';

export const MOCK_CUSTOMER_QUOTATIONS: readonly CustomerQuotationListItem[] = [
  {
    id: asQuotationId('q_28996'),
    requestNumber: 'QREQ-2026-28996',
    status: 'ready',
    from: 'Delhi',
    to: 'Jaipur',
    travelDateStart: '2026-09-15',
    travelDateEnd: '2026-09-17',
    passengers: 20,
    vehicle: null,
    requestedAt: '2026-09-10T09:00:00Z',
  },
  {
    id: asQuotationId('q_28991'),
    requestNumber: 'QREQ-2026-28991',
    status: 'under_review',
    from: 'Gurugram',
    to: 'Agra',
    travelDateStart: '2026-09-22',
    travelDateEnd: null,
    passengers: 10,
    vehicle: 'Car (Sedan)',
    requestedAt: '2026-09-08T07:30:00Z',
  },
  {
    id: asQuotationId('q_28985'),
    requestNumber: 'QREQ-2026-28985',
    status: 'sent',
    from: 'Mumbai',
    to: 'Pune',
    travelDateStart: '2026-10-05',
    travelDateEnd: null,
    passengers: 15,
    vehicle: 'Urbania',
    requestedAt: '2026-09-03T12:00:00Z',
  },
  {
    id: asQuotationId('q_28972'),
    requestNumber: 'QREQ-2026-28972',
    status: 'accepted',
    from: 'Delhi',
    to: 'Manali',
    travelDateStart: '2026-10-10',
    travelDateEnd: '2026-10-12',
    passengers: 12,
    vehicle: 'Tempo Traveller',
    requestedAt: '2026-08-28T08:15:00Z',
  },
  {
    id: asQuotationId('q_28960'),
    requestNumber: 'QREQ-2026-28960',
    status: 'rejected',
    from: 'Noida',
    to: 'Rishikesh',
    travelDateStart: '2026-08-18',
    travelDateEnd: null,
    passengers: 8,
    vehicle: 'Car (SUV)',
    requestedAt: '2026-08-15T14:45:00Z',
  },
];
