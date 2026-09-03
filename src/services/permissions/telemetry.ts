/**
 * ------------------------------------------------------------------
 * Permission telemetry helper
 * ------------------------------------------------------------------
 * Thin wrapper over @services/telemetry/logEvent that composes
 * capability + verb into the closed EventName template-literal type.
 *
 * All permission events go through here — grep-friendly funnel:
 *   permission.<telemetryKey>.<verb>
 *
 * TYPE SAFETY:
 *   Because `CapabilityDescriptor.telemetryKey` is typed as the
 *   closed `PermissionTelemetryKey` union (see @rbac/capabilities),
 *   the template literal below is inferred as a subset of
 *   `PermissionEventName` — no cast, no `as string`, no lie. If a
 *   descriptor's telemetryKey ever drifts to a value outside the
 *   union, the registry itself will fail to compile.
 * ------------------------------------------------------------------
 */

import type { Capability } from '@rbac/capabilities';
import { getCapability } from '@rbac/capabilities';

import {
  logEvent,
  type EventProperties,
  type PermissionEventName,
  type PermissionTelemetryVerb,
} from '@services/telemetry/logEvent';

export function emitPermissionEvent(
  cap: Capability,
  verb: PermissionTelemetryVerb,
  properties: EventProperties = {},
): void {
  const key = getCapability(cap).telemetryKey;
  const name: PermissionEventName = `permission.${key}.${verb}`;
  logEvent(name, { capability: cap, ...properties });
}
