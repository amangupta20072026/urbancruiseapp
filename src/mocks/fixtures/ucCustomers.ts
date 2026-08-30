/* eslint-disable import-x/no-unresolved */
/**
 * Fixture transform: adapts legacy mock rows (from mocks/data/customers.ts)
 * to the new Customer schema (category / customerType / phoneIndia /
 * phoneGlobal / companyName). This lets us evolve the
 * schema without hand-editing the 2600-line raw file.
 *
 * When the backend goes live, this whole module is deleted.
 */

import {
  mockCustomers as legacy,
  type LegacyCustomerRow,
} from '@mocks/data/customers';
import type {
  Customer,
  CorporateCustomerType,
} from '@features/uc/customers/types';
import { fixtureUcAgents } from './ucAgents';

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

function migrate(entry: LegacyCustomerRow, index: number): Customer {
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
    createdAt: entry.createdAt as Customer['createdAt'],
    totalBookings: entry.totalBookings,
    lastBookingAt: entry.lastBookingAt as Customer['lastBookingAt'],
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

const migrated: Customer[] = legacy.map(migrate);

export const fixtureUcCustomersAll: Customer[] = [
  ...migrated,
  ...fixtureUcAgents,
];

export const fixtureUcCustomersEmpty: Customer[] = [];

export const fixtureUcCustomersPersonalOnly: Customer[] =
  fixtureUcCustomersAll.filter(c => c.category === 'personal');

export const fixtureUcCustomersCorporateOnly: Customer[] =
  fixtureUcCustomersAll.filter(c => c.category === 'corporate');

export const fixtureUcCustomersAgentOnly: Customer[] =
  fixtureUcCustomersAll.filter(c => c.category === 'agent');
