/**
 * ------------------------------------------------------------------
 * Customer Quotations — mock fixture
 * ------------------------------------------------------------------
 * Seeds the Quotations tab list. Matches the redesign spec (Image 1
 * of the mockup set) 1:1 so the screen renders exactly what product
 * signed off on:
 *
 *   All: 6, Pending: 2, Accepted: 3, Expired: 1
 *
 * NOTE ON COUNTS:
 *   The header chip strip renders live counts derived from this
 *   array. If you edit an item's `status`, verify the chip numbers
 *   still line up with the design (or update the design copy). The
 *   screen has no hard-coded totals — it always trusts the data.
 *
 * DATES:
 *   Fixed (not derived from `now()`) because "created on" and travel
 *   dates should feel stable across demo sessions — shifting them
 *   daily makes screenshots hard to align with product copy. When
 *   the /customer/quotations endpoint ships, delete this file.
 * ------------------------------------------------------------------
 */

import { asQuotationId } from '@app-types/ids';
import type { CustomerQuotationListItem } from './types';

export const MOCK_CUSTOMER_QUOTATIONS: readonly CustomerQuotationListItem[] = [
  {
    id: asQuotationId('q_10257'),
    quotationNumber: 'QU10257',
    status: 'accepted',
    stops: ['Delhi', 'Agra', 'Jaipur', 'Delhi'],
    travelDateStart: '2026-08-12',
    travelDateEnd: '2026-08-15',
    nights: 3,
    days: 4,
    adults: 2,
    children: 1,
    amount: 35200,
    createdAt: '2026-08-10T09:00:00Z',
  },
  {
    id: asQuotationId('q_10245'),
    quotationNumber: 'QU10245',
    status: 'accepted',
    stops: ['Mumbai', 'Goa', 'Mumbai'],
    travelDateStart: '2026-08-20',
    travelDateEnd: '2026-08-27',
    nights: 7,
    days: 8,
    adults: 2,
    children: 2,
    amount: 58400,
    createdAt: '2026-08-08T07:30:00Z',
  },
  {
    id: asQuotationId('q_10230'),
    quotationNumber: 'QU10230',
    status: 'pending',
    stops: ['Bangalore', 'Mysore', 'Ooty', 'Bangalore'],
    travelDateStart: '2026-09-10',
    travelDateEnd: '2026-09-14',
    nights: 4,
    days: 5,
    adults: 2,
    children: 0,
    amount: 28750,
    createdAt: '2026-08-05T12:00:00Z',
  },
  {
    id: asQuotationId('q_10218'),
    quotationNumber: 'QU10218',
    status: 'expired',
    stops: ['Chennai', 'Pondicherry', 'Chennai'],
    travelDateStart: '2026-09-18',
    travelDateEnd: '2026-09-20',
    nights: 2,
    days: 3,
    adults: 2,
    children: 1,
    amount: 19600,
    createdAt: '2026-08-02T08:15:00Z',
  },
  {
    id: asQuotationId('q_10205'),
    quotationNumber: 'QU10205',
    status: 'accepted',
    stops: ['Hyderabad', 'Ramoji', 'Hyderabad'],
    travelDateStart: '2026-10-05',
    travelDateEnd: '2026-10-07',
    nights: 2,
    days: 3,
    adults: 2,
    children: 0,
    amount: 24900,
    createdAt: '2026-07-28T14:45:00Z',
  },
  {
    id: asQuotationId('q_10198'),
    quotationNumber: 'QU10198',
    status: 'pending',
    stops: ['Kolkata', 'Darjeeling', 'Gangtok', 'Kolkata'],
    travelDateStart: '2026-10-12',
    travelDateEnd: '2026-10-18',
    nights: 6,
    days: 7,
    adults: 2,
    children: 1,
    amount: 46200,
    createdAt: '2026-07-25T11:20:00Z',
  },
];
