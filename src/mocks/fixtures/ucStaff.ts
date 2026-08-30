/**
 * ------------------------------------------------------------------
 * Fixture — UC Staff
 * ------------------------------------------------------------------
 * 25 deterministic UC-staff rows for Directory > UC Staff. Used by
 * useStaffList until /uc/staff ships.
 *
 * When the backend goes live, this whole module is deleted.
 * ------------------------------------------------------------------
 */

import type { Staff } from '@features/uc/staff/types';
import { asISODateTime, type ISODateTime } from '@app-types/datetime';

const NAMES = [
  'Aditya Sharma',
  'Meera Krishnan',
  'Rajat Bhosale',
  'Sonal Kapoor',
  'Vikas Menon',
  'Preeti Rao',
  'Anup Chatterjee',
  'Nisha Pillai',
  'Harish Sundaram',
  'Rina Bhatt',
  'Yogesh Sinha',
  'Kavita Reddy',
  'Devendra Singh',
  'Aarti Verma',
  'Sameer Khanna',
  'Manisha Joshi',
  'Rohit Nair',
  'Tanvi Deshpande',
  'Nikhil Bansal',
  'Shruti Malhotra',
  'Ajay Iyer',
  'Pooja Ghosh',
  'Vivek Rathore',
  'Anjali Menon',
  'Kunal Sood',
];

const CITIES = ['Mumbai', 'Pune', 'Bengaluru', 'Delhi', 'Hyderabad'];

function phoneFor(index: number, offset = 0): string {
  const base = 98000000 + index * 4321 + offset * 13;
  return `+91${base}`;
}

function emailFor(name: string): string {
  const slug = name
    .toLowerCase()
    .split(/\s+/)
    .join('.')
    .replace(/[^a-z.]/g, '');
  return `${slug}@urbancruise.in`;
}

function daysAgo(days: number): ISODateTime {
  const d = new Date('2025-08-01T09:00:00Z');
  d.setUTCDate(d.getUTCDate() - days);
  return asISODateTime(d.toISOString());
}

export const fixtureUcStaffAll: Staff[] = NAMES.map((name, i) => ({
  id: `s_${i + 1}`,
  name,
  subRole: 'admin',
  phone: phoneFor(i),
  phoneAlt: i % 4 === 0 ? phoneFor(i, 1) : undefined,
  email: emailFor(name),
  city: CITIES[i % CITIES.length],
  active: i % 9 !== 0, // roughly ~1 inactive per 9
  joinedAt: daysAgo(i * 11 + 20),
}));
