/**
 * Contact service — Call / WhatsApp / Email launchers.
 *
 * All three use React Native's Linking API. WhatsApp has a native-scheme
 * primary path with an https://wa.me/ fallback for when the app isn't installed.
 *
 * Native config required (see docs §13):
 *   - Android: <queries> block in AndroidManifest.xml
 *   - iOS: LSApplicationQueriesSchemes in Info.plist
 */

import { Linking, Platform } from 'react-native';

export type ContactResult =
  | { ok: true }
  | { ok: false; reason: 'unsupported' | 'cancelled' | 'error'; error?: Error };

/** Normalize an Indian mobile to E.164 (+91XXXXXXXXXX). */
function normalisePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');

  // Already has country code — strip leading 0/00 if present.
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  if (digits.length === 13 && digits.startsWith('091'))
    return `+${digits.slice(1)}`;

  // Bare 10-digit Indian mobile → prepend +91.
  if (digits.length === 10) return `+91${digits}`;

  // Leave as-is with +.
  return digits.startsWith('+') ? raw : `+${digits}`;
}

async function safeOpen(url: string): Promise<ContactResult> {
  try {
    await Linking.openURL(url);
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: 'error', error: error as Error };
  }
}

/* -------------------- CALL -------------------- */

export async function makePhoneCall(phone: string): Promise<ContactResult> {
  const normalised = normalisePhone(phone);
  const url = `tel:${normalised}`;

  const supported = await Linking.canOpenURL(url).catch(() => false);
  if (!supported) return { ok: false, reason: 'unsupported' };

  return safeOpen(url);
}

/* -------------------- WHATSAPP -------------------- */

/**
 * Try native WhatsApp first, then fall back to https://wa.me/.
 * The web fallback works even on desktop and always opens something.
 */
export async function openWhatsApp(
  phone: string,
  message?: string,
): Promise<ContactResult> {
  const normalised = normalisePhone(phone);
  const cleanNumber = normalised.replace(/\D/g, ''); // wa.me wants digits only
  const text = message ? `&text=${encodeURIComponent(message)}` : '';

  const nativeUrl = `whatsapp://send?phone=${cleanNumber}${text.replace(
    '&',
    '&',
  )}`;
  const webUrl = `https://wa.me/${cleanNumber}${
    text ? `?${text.slice(1)}` : ''
  }`;

  const canOpenNative = await Linking.canOpenURL(nativeUrl).catch(() => false);
  if (canOpenNative) {
    const nativeResult = await safeOpen(nativeUrl);
    if (nativeResult.ok) return nativeResult;
  }

  // Fallback — always opens (browser or WhatsApp Web).
  return safeOpen(webUrl);
}

/* -------------------- EMAIL -------------------- */

export type EmailPayload = {
  to: string;
  subject?: string;
  body?: string;
  cc?: string[];
  bcc?: string[];
};

export async function sendEmail(payload: EmailPayload): Promise<ContactResult> {
  const params: string[] = [];
  if (payload.subject)
    params.push(`subject=${encodeURIComponent(payload.subject)}`);
  if (payload.body) params.push(`body=${encodeURIComponent(payload.body)}`);
  if (payload.cc?.length) params.push(`cc=${payload.cc.join(',')}`);
  if (payload.bcc?.length) params.push(`bcc=${payload.bcc.join(',')}`);

  const query = params.length ? `?${params.join('&')}` : '';
  const url = `mailto:${payload.to}${query}`;

  const supported = await Linking.canOpenURL(url).catch(() => false);
  if (!supported) return { ok: false, reason: 'unsupported' };

  return safeOpen(url);
}

/* -------------------- Platform helper -------------------- */

/** True on real devices where these actions are meaningful. */
export const canPerformContactActions = (): boolean => Platform.OS !== 'web';
