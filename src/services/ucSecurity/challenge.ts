import type { UcChallengePurpose } from './types';

/**
 * The exact text the phone signs. MUST equal the backend's
 * ucChallengeMessage() in service/uc-crypto.ts byte for byte (UTF-8),
 * otherwise every signature fails with `uc_signature_invalid`.
 */
export function ucChallengeMessage(
  purpose: UcChallengePurpose,
  challengeId: string,
  nonce: string,
): string {
  return `urbancruise:uc-security:v1|${purpose}|${challengeId}|${nonce}`;
}
