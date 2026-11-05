/**
 * Fixture transform: adapts legacy mock rows (from mocks/data/customers.ts)
 * to sample customers (category / customerType / phoneIndia /
 * phoneGlobal / companyName).
 *
 * NOT used by the UC Directory any more: the Customers tab reads the real
 * GET /uc/customers. These samples only feed the mock trip history
 * (mocks/data/customerHistory.ts) and the mock UC Bookings list, until
 * those are connected to the backend. Delete this module then.
 */

import type { ISODateTime } from '@app-types/datetime';
import {
  mockCustomers as legacy,
  type LegacyCustomerRow,
} from '@mocks/data/customers';
import type {
  CorporateCustomerType,
  CustomerCategory,
  CustomerSubType,
} from '@features/uc/customers/types';
import { fixtureUcAgents } from './ucAgents';

/**
 * A sample customer, in the shape the mock history / bookings need
 * (always-present values plus booking counts). Separate from the real
 * Directory `Customer`, which comes from the backend.
 */
export type MockUcCustomer = {
  id: string;
  category: CustomerCategory;
  customerType: CustomerSubType;
  name: string;
  phoneIndia: string;
  phoneGlobal: string;
  email: string;
  city: string;
  companyName?: string;
  gstin?: string;
  createdAt: ISODateTime;
  totalBookings: number;
  lastBookingAt: ISODateTime | null;
};

/* Rotating pools so corporate rows get plausible person names +
 * sub-types without us having to hand-tag 80 entries. Deterministic
 * (by index) so the same row always gets the same values. */

const PERSON_NAMES = [
  'Amit Verma',
  'Priya Malhotra',
  'Rahul Sharma',
  'Neha Iyer',
  'Karan Mehta',
  'Divya Nair',
  'Suresh Rao',
  'Anita Deshmukh',
  'Vikram Sethi',
  'Kavya Menon',
];

const CORP_SUBTYPES: CorporateCustomerType[] = [
  'company',
  'company',
  'company',
  'ngo',
  'educational_institute',
  'sporting_company',
  'government',
];

function migrate(entry: LegacyCustomerRow, index: number): MockUcCustomer {
  const base = {
    id: entry.id,
    phoneIndia: entry.phone,
    // Every legacy row gets a deterministic global number derived
    // from the sequence index — same input always yields same output,
    // so the mock stays stable across reloads.
    phoneGlobal: '+1 415 555 ' + String(1000 + index).slice(-4),
    email: entry.email,
    city: entry.city,
    gstin: entry.gstin,
    createdAt: entry.createdAt as MockUcCustomer['createdAt'],
    totalBookings: entry.totalBookings,
    lastBookingAt: entry.lastBookingAt as MockUcCustomer['lastBookingAt'],
  };

  if (entry.type === 'personal') {
    return {
      ...base,
      category: 'personal',
      customerType: 'personal',
      name: entry.name,
    };
  }

  // Corporate. Old `name` is the company name; generate a contact
  // person from the rotating pool, park the company in companyName.
  return {
    ...base,
    category: 'corporate',
    customerType: CORP_SUBTYPES[index % CORP_SUBTYPES.length],
    name: PERSON_NAMES[index % PERSON_NAMES.length],
    companyName: entry.name,
  };
}

const migrated: MockUcCustomer[] = legacy.map(migrate);

export const fixtureUcCustomersAll: MockUcCustomer[] = [
  ...migrated,
  ...fixtureUcAgents,
];

export const fixtureUcCustomersEmpty: MockUcCustomer[] = [];

export const fixtureUcCustomersPersonalOnly: MockUcCustomer[] =
  fixtureUcCustomersAll.filter(c => c.category === 'personal');

export const fixtureUcCustomersCorporateOnly: MockUcCustomer[] =
  fixtureUcCustomersAll.filter(c => c.category === 'corporate');

export const fixtureUcCustomersAgentOnly: MockUcCustomer[] =
  fixtureUcCustomersAll.filter(c => c.category === 'agent');
