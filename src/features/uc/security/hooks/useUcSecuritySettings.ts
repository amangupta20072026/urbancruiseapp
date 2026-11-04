/**
 * Settings › Security state for UC staff: is fingerprint available on
 * this phone, and is it on? "On" means the server has it AND this phone
 * still holds the key (a new fingerprint enrolment deletes the key).
 * Not persisted to disk (meta.persist = false).
 */
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@constants/queryKeys';
import {
  fetchSecurityStatus,
  hasBiometricKey,
  isBiometricSupported,
} from '@services/ucSecurity';

export type UcSecuritySettings = {
  biometricSupported: boolean;
  biometricOn: boolean;
};

async function load(): Promise<UcSecuritySettings> {
  const [supported, status, localKey] = await Promise.all([
    isBiometricSupported(),
    fetchSecurityStatus(),
    hasBiometricKey(),
  ]);
  return {
    biometricSupported: supported,
    biometricOn: supported && status.biometricEnabled && localKey,
  };
}

export function useUcSecuritySettings(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.uc.security.status(),
    queryFn: load,
    enabled,
    staleTime: 0,
    meta: { persist: false },
  });
}
