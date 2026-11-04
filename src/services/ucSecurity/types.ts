/**
 * UC device security — wire types. Mirror the backend DTOs in
 * urbancruisebackend/src/modules/auth/types.ts (UcChallengeResponseDto,
 * UcSecurityStatusDto, RefreshResponseDto). Change both together.
 */

export type UcChallengePurpose =
  | 'register'
  | 'enable-biometric'
  | 'disable-biometric'
  | 'unlock-mpin'
  | 'unlock-biometric'
  | 'change-mpin'
  | 'refresh';

export type UcChallenge = {
  challengeId: string;
  nonce: string;
  expiresInSeconds: number;
};

export type UcSecurityStatus = {
  deviceRegistered: boolean;
  biometricEnabled: boolean;
  setupAllowed: boolean;
  unlockFresh: boolean;
};

export type UcTokens = {
  accessToken: string;
  refreshToken: string;
};

/** Error codes from the backend's AUTH_ERROR that this feature handles. */
export const UC_ERROR = {
  CHALLENGE_INVALID: 'uc_challenge_invalid',
  SIGNATURE_INVALID: 'uc_signature_invalid',
  KEY_INVALID: 'uc_key_invalid',
  DEVICE_UNKNOWN: 'uc_device_unknown',
  DEVICE_NOT_REGISTERED: 'uc_device_not_registered',
  SETUP_EXPIRED: 'uc_setup_expired',
  MPIN_WEAK: 'uc_mpin_weak',
  MPIN_INVALID: 'uc_mpin_invalid',
  MPIN_SAME: 'uc_mpin_same',
  MPIN_LOCKED: 'uc_mpin_locked',
  BIOMETRIC_NOT_ENABLED: 'uc_biometric_not_enabled',
  UNLOCK_REQUIRED: 'uc_unlock_required',
  DEVICE_PROOF_REQUIRED: 'uc_device_proof_required',
  ROLE_MISMATCH: 'uc_role_mismatch',
  SESSION_REVOKED: 'session_revoked',
  REFRESH_INVALID: 'refresh_invalid',
  ACCOUNT_SUSPENDED: 'account_suspended',
} as const;
