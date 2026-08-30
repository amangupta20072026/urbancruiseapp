/**
 * ISO-8601 datetime strings.
 * All API datetimes should be UTC.
 * Convert to Date only at rendering boundaries.
 */

type Brand<T, K extends string> = T & { readonly __brand: K };

export type ISODateTime = Brand<string, 'ISODateTime'>;
export type ISODate = Brand<string, 'ISODate'>; // 'YYYY-MM-DD'

export const asISODateTime = (s: string): ISODateTime => s as ISODateTime;
export const asISODate = (s: string): ISODate => s as ISODate;

export const isoNow = (): ISODateTime =>
  new Date().toISOString() as ISODateTime;
