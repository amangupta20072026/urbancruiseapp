/**
 * ------------------------------------------------------------------
 * UC device security — the flows the screens call
 * ------------------------------------------------------------------
 * Each flow: get a single-use challenge (60 s), sign the exact text
 * with the right key, send it. Contract and rules: backend
 * service/uc-security.ts and service/uc-refresh-gate.ts.
 *
 * Tokens returned by an unlock are saved to Keychain here, so a
 * caller can never forget to.
 * ------------------------------------------------------------------
 */
import { getRefreshToken, saveTokens } from '@services/storage/secureStorage';
import { getDeviceInfo } from '@services/device';
import { ucChallengeMessage } from './challenge';
import {
  createBiometricKey,
  createDeviceKey,
  deleteBiometricKey,
  hasBiometricKey,
  isBiometricSupported,
  signWithBiometricKey,
  signWithDeviceKey,
  type BiometricSignResult,
} from './keys';
import { getBiometricPreference, setBiometricPreference } from './preference';
import * as api from './api';
import type { UcChallengePurpose, UcSecurityStatus } from './types';

export class NoSessionError extends Error {
  constructor() {
    super('No saved session on this phone.');
    this.name = 'NoSessionError';
  }
}

async function requireRefreshToken(): Promise<string> {
  const token = await getRefreshToken();
  if (!token) throw new NoSessionError();
  return token;
}

async function challengeMessage(
  refreshToken: string,
  purpose: UcChallengePurpose,
): Promise<{ challengeId: string; message: string }> {
  const c = await api.postChallenge(refreshToken, purpose);
  return {
    challengeId: c.challengeId,
    message: ucChallengeMessage(purpose, c.challengeId, c.nonce),
  };
}

/* ---------------- Status ---------------- */

export async function fetchSecurityStatus(): Promise<UcSecurityStatus> {
  return api.postSecurityStatus(await requireRefreshToken());
}

/* ---------------- Setup (after OTP login) ---------------- */

/**
 * Creates this phone's device key and sets the MPIN. Allowed by the
 * server only within 10 minutes of an OTP login. The server clears any
 * old fingerprint key, so the local one is removed too, and the
 * preference goes back to 'auto' (fingerprint is set up again).
 */
export async function registerDevice(mpin: string): Promise<UcSecurityStatus> {
  const refreshToken = await requireRefreshToken();
  const devicePublicKey = await createDeviceKey();
  const { challengeId, message } = await challengeMessage(
    refreshToken,
    'register',
  );
  const deviceSignature = await signWithDeviceKey(message);
  const status = await api.postRegisterDevice({
    refreshToken,
    challengeId,
    devicePublicKey,
    deviceSignature,
    mpin,
  });
  await deleteBiometricKey();
  setBiometricPreference('auto');
  return status;
}

/* ---------------- Unlock ---------------- */

export async function unlockWithMpin(mpin: string): Promise<void> {
  const refreshToken = await requireRefreshToken();
  const [device, { challengeId, message }] = await Promise.all([
    getDeviceInfo(),
    challengeMessage(refreshToken, 'unlock-mpin'),
  ]);
  const deviceSignature = await signWithDeviceKey(message);
  const tokens = await api.postUnlockMpin({
    refreshToken,
    challengeId,
    deviceSignature,
    mpin,
    device,
  });
  await saveTokens(tokens);
}

export type BiometricUnlockResult =
  | { ok: true }
  | Exclude<BiometricSignResult, { ok: true }>;

export async function unlockWithBiometric(): Promise<BiometricUnlockResult> {
  const refreshToken = await requireRefreshToken();
  const [device, { challengeId, message }] = await Promise.all([
    getDeviceInfo(),
    challengeMessage(refreshToken, 'unlock-biometric'),
  ]);
  const signed = await signWithBiometricKey(message, {
    title: 'Unlock Urban Cruise',
    subtitle: 'Touch the fingerprint sensor',
  });
  if (!signed.ok) {
    if (signed.reason === 'key_unusable') await deleteBiometricKey();
    return signed;
  }
  const tokens = await api.postUnlockBiometric({
    refreshToken,
    challengeId,
    biometricSignature: signed.signature,
    device,
  });
  await saveTokens(tokens);
  return { ok: true };
}

/* ---------------- Fingerprint on / off ---------------- */

export type EnableBiometricResult =
  | 'enabled'
  | 'cancelled'
  | 'unsupported'
  | 'failed';

/**
 * Turns fingerprint on: creates the fingerprint key, then signs one
 * challenge with BOTH keys (the phone shows its fingerprint popup).
 * Any failure removes the half-made local key. Never throws.
 */
export async function enableBiometric(): Promise<EnableBiometricResult> {
  if (!(await isBiometricSupported())) return 'unsupported';
  try {
    const refreshToken = await requireRefreshToken();
    const biometricPublicKey = await createBiometricKey();
    const { challengeId, message } = await challengeMessage(
      refreshToken,
      'enable-biometric',
    );
    const deviceSignature = await signWithDeviceKey(message);
    const signed = await signWithBiometricKey(message, {
      title: 'Turn on fingerprint unlock',
      subtitle: 'Touch the fingerprint sensor',
    });
    if (!signed.ok) {
      await deleteBiometricKey();
      return signed.reason === 'cancelled' ? 'cancelled' : 'failed';
    }
    await api.postEnableBiometric({
      refreshToken,
      challengeId,
      biometricPublicKey,
      deviceSignature,
      biometricSignature: signed.signature,
    });
    return 'enabled';
  } catch {
    await deleteBiometricKey();
    return 'failed';
  }
}

export type AutoEnableResult =
  | EnableBiometricResult
  | 'already_on'
  | 'turned_off_by_user';

/**
 * Called after MPIN setup and after every MPIN unlock: turns fingerprint
 * on without asking (product decision) unless the user switched it off
 * in Settings. If they cancel the popup, the next app open asks again.
 */
export async function autoEnableBiometric(
  serverBiometricEnabled: boolean,
): Promise<AutoEnableResult> {
  if (getBiometricPreference() === 'off') return 'turned_off_by_user';
  if (serverBiometricEnabled && (await hasBiometricKey())) return 'already_on';
  return enableBiometric();
}

/**
 * Turns fingerprint off. The caller must have checked the MPIN first
 * (product decision) — see verifyMpin().
 */
export async function disableBiometric(): Promise<UcSecurityStatus> {
  const refreshToken = await requireRefreshToken();
  const { challengeId, message } = await challengeMessage(
    refreshToken,
    'disable-biometric',
  );
  const deviceSignature = await signWithDeviceKey(message);
  const status = await api.postDisableBiometric({
    refreshToken,
    challengeId,
    deviceSignature,
  });
  await deleteBiometricKey();
  setBiometricPreference('off');
  return status;
}

/**
 * Checks the MPIN on the server. The backend has no "check only"
 * endpoint, so this is an MPIN unlock: a wrong MPIN uses one of the 5
 * attempts (same as unlock), and success rotates the tokens.
 */
export const verifyMpin = unlockWithMpin;

/* ---------------- Change MPIN ---------------- */

export async function changeMpin(
  currentMpin: string,
  newMpin: string,
): Promise<UcSecurityStatus> {
  const refreshToken = await requireRefreshToken();
  const { challengeId, message } = await challengeMessage(
    refreshToken,
    'change-mpin',
  );
  const deviceSignature = await signWithDeviceKey(message);
  return api.postChangeMpin({
    refreshToken,
    challengeId,
    deviceSignature,
    currentMpin,
    newMpin,
  });
}
