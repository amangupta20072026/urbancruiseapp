/**
 * UC device security — HTTP calls (POST /auth/uc/*).
 *
 * Every call carries the REFRESH token in the body, not the access
 * token (the backend design: at a cold start the access token has
 * usually expired). These paths are in publicEndpoints.ts, so the
 * interceptors never attach a bearer token and never run the refresh
 * dance on their 401s — the caller handles every error code.
 */
import { apiClient } from '@api/axios';
import { endpoints } from '@api/endpoints';
import type { DeviceInfoPayload } from '@services/device';
import type {
  UcChallenge,
  UcChallengePurpose,
  UcSecurityStatus,
  UcTokens,
} from './types';

export async function postChallenge(
  refreshToken: string,
  purpose: UcChallengePurpose,
): Promise<UcChallenge> {
  const { data } = await apiClient.post<UcChallenge>(
    endpoints.auth.uc.challenge(),
    { refreshToken, purpose },
  );
  return data;
}

export async function postSecurityStatus(
  refreshToken: string,
): Promise<UcSecurityStatus> {
  const { data } = await apiClient.post<UcSecurityStatus>(
    endpoints.auth.uc.securityStatus(),
    { refreshToken },
  );
  return data;
}

export async function postRegisterDevice(body: {
  refreshToken: string;
  challengeId: string;
  devicePublicKey: string;
  deviceSignature: string;
  mpin: string;
}): Promise<UcSecurityStatus> {
  const { data } = await apiClient.post<UcSecurityStatus>(
    endpoints.auth.uc.registerDevice(),
    body,
  );
  return data;
}

export async function postEnableBiometric(body: {
  refreshToken: string;
  challengeId: string;
  biometricPublicKey: string;
  deviceSignature: string;
  biometricSignature: string;
}): Promise<UcSecurityStatus> {
  const { data } = await apiClient.post<UcSecurityStatus>(
    endpoints.auth.uc.enableBiometric(),
    body,
  );
  return data;
}

export async function postDisableBiometric(body: {
  refreshToken: string;
  challengeId: string;
  deviceSignature: string;
}): Promise<UcSecurityStatus> {
  const { data } = await apiClient.post<UcSecurityStatus>(
    endpoints.auth.uc.disableBiometric(),
    body,
  );
  return data;
}

export async function postUnlockMpin(body: {
  refreshToken: string;
  challengeId: string;
  deviceSignature: string;
  mpin: string;
  device: DeviceInfoPayload;
}): Promise<UcTokens> {
  const { data } = await apiClient.post<UcTokens>(
    endpoints.auth.uc.unlockMpin(),
    body,
  );
  return data;
}

export async function postUnlockBiometric(body: {
  refreshToken: string;
  challengeId: string;
  biometricSignature: string;
  device: DeviceInfoPayload;
}): Promise<UcTokens> {
  const { data } = await apiClient.post<UcTokens>(
    endpoints.auth.uc.unlockBiometric(),
    body,
  );
  return data;
}

export async function postChangeMpin(body: {
  refreshToken: string;
  challengeId: string;
  deviceSignature: string;
  currentMpin: string;
  newMpin: string;
}): Promise<UcSecurityStatus> {
  const { data } = await apiClient.post<UcSecurityStatus>(
    endpoints.auth.uc.changeMpin(),
    body,
  );
  return data;
}
