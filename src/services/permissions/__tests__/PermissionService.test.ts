/**
 * ------------------------------------------------------------------
 * PermissionService tests — state machine behaviour
 * ------------------------------------------------------------------
 * Focused on the transitions that would silently break Play/App Store
 * compliance if regressed:
 *   1. RBAC gate rejects wrong role
 *   2. Rationale shown before OS prompt (not skipped)
 *   3. Rationale dismissal short-circuits the OS prompt
 *   4. Blocked state routes to recovery sheet + openSettings
 *   5. Background location: foreground REQUIRED first
 *   6. Background location: prominent disclosure ALWAYS before OS
 *      prompt (this is the Play policy line-item that fails review)
 *
 * Rendering, screen wiring, and store integration are out of scope
 * for this file — they're covered by the sheet component tests
 * (arriving in step 4) and by manual device QA.
 * ------------------------------------------------------------------
 */

/* -----------------------------------------------------------------
 * Module mocks — MUST be declared before the SUT imports below.
 * babel-plugin-jest-hoist lifts these above the `import` statements
 * so the SUT sees the mocked modules when it evaluates.
 *
 * jest.mock() calls inside a test body do NOT hoist and will silently
 * do nothing if the SUT has already imported the real module — see
 * the foregroundLocation test at the bottom for the correct
 * "override per-test" pattern.
 * ----------------------------------------------------------------- */

jest.mock('react-native-permissions', () => ({
  check: jest.fn(),
  request: jest.fn(),
  checkNotifications: jest.fn(),
  requestNotifications: jest.fn(),
  openSettings: jest.fn(),
  RESULTS: {
    UNAVAILABLE: 'unavailable',
    DENIED: 'denied',
    LIMITED: 'limited',
    GRANTED: 'granted',
    BLOCKED: 'blocked',
  },
  PERMISSIONS: {
    ANDROID: {
      CAMERA: 'android.permission.CAMERA',
      ACCESS_FINE_LOCATION: 'android.permission.ACCESS_FINE_LOCATION',
    },
    IOS: {
      CAMERA: 'ios.permission.CAMERA',
      LOCATION_WHEN_IN_USE: 'ios.permission.LOCATION_WHEN_IN_USE',
    },
  },
}));

/**
 * Full react-native surface used by the SUT and its transitive imports.
 * `NativeModules` is included as an empty object so any code path that
 * touches `NativeModules.SomeModule` gets `undefined` instead of
 * blowing up on `NativeModules` itself being undefined — see the
 * DriverLocationService bridge, which reads NativeModules directly.
 */
jest.mock('react-native', () => ({
  NativeModules: {},
  Platform: {
    OS: 'android',
    select: (spec: { android?: unknown; ios?: unknown }) => spec.android,
  },
  Linking: {
    sendIntent: jest.fn().mockResolvedValue(undefined),
    openURL: jest.fn().mockResolvedValue(undefined),
  },
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
  NativeEventEmitter: jest.fn().mockImplementation(() => ({
    addListener: jest.fn(() => ({ remove: jest.fn() })),
    removeAllListeners: jest.fn(),
  })),
}));

/**
 * driverLocation service — hoisted mock, defaults GPS to ON.
 * Individual tests override with `.mockResolvedValueOnce(false)` to
 * simulate a device with location services disabled at the OS level.
 */
jest.mock('@services/driverLocation', () => ({
  isDeviceLocationEnabled: jest.fn().mockResolvedValue(true),
}));

/**
 * Redux store — the service dispatches statusChanged; capture calls.
 * `mockDispatch` and `mockGetState` are prefixed with `mock` so
 * babel-plugin-jest-hoist allows them to be referenced from inside
 * the factory (its rule: identifiers used inside jest.mock factories
 * must be either allow-listed globals or start with `mock`).
 */
const mockDispatch = jest.fn();
const mockGetState = jest.fn(() => ({
  app: { userRole: 'driver' as const },
  permissions: { entries: {} },
}));
jest.mock('@store', () => ({
  store: {
    getState: () => mockGetState(),
    dispatch: (a: unknown) => mockDispatch(a),
  },
}));

/**
 * logEvent spy — assert that the funnel emits.
 * Same `mock`-prefix rule as above.
 */
const mockLogEvent = jest.fn();
jest.mock('@services/telemetry/logEvent', () => ({
  logEvent: (name: string, props: unknown) => mockLogEvent(name, props),
}));

/* -----------------------------------------------------------------
 * Now import the SUT and its collaborators.
 * ----------------------------------------------------------------- */

import {
  check,
  checkNotifications,
  openSettings as rnpOpenSettings,
  request,
  requestNotifications,
} from 'react-native-permissions';

import { ensureCapability } from '../PermissionService';
import { configureSheetHandlers, resetSheetHandlers } from '../sheetHandlers';

// Handle to the hoisted driverLocation mock so tests can override
// its return value per-test without re-declaring jest.mock.
import { isDeviceLocationEnabled } from '@services/driverLocation';

const mockedCheck = check as jest.Mock;
const mockedRequest = request as jest.Mock;
const mockedCheckNotifications = checkNotifications as jest.Mock;
const mockedRequestNotifications = requestNotifications as jest.Mock;
const mockedOpenSettings = rnpOpenSettings as jest.Mock;
const mockedIsDeviceLocationEnabled = isDeviceLocationEnabled as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  resetSheetHandlers();
  // Restore the default (GPS on) after clearAllMocks wiped it.
  mockedIsDeviceLocationEnabled.mockResolvedValue(true);
});

/* =================================================================
 * 1 — RBAC gate
 * ================================================================= */

test('RBAC: null role blocks everything, including camera which is otherwise open to all roles', async () => {
  const result = await ensureCapability('camera', null);
  expect(result).toEqual({ status: 'unavailable', reason: 'rbac' });
});

/* =================================================================
 * 2 — Rationale flow
 * ================================================================= */

test('rationale sheet is shown BEFORE the OS prompt when denied', async () => {
  mockedCheck.mockResolvedValue('denied');
  mockedRequest.mockResolvedValue('granted');

  const events: string[] = [];
  configureSheetHandlers({
    showRationale: async () => {
      events.push('rationale');
      return 'continue';
    },
  });
  mockedRequest.mockImplementation(async () => {
    events.push('os_prompt');
    return 'granted';
  });

  const result = await ensureCapability('camera', 'driver');

  expect(result).toEqual({ status: 'granted' });
  expect(events).toEqual(['rationale', 'os_prompt']);
  expect(mockDispatch).toHaveBeenCalled();
});

test('dismissing the rationale short-circuits the OS prompt', async () => {
  mockedCheck.mockResolvedValue('denied');
  configureSheetHandlers({
    showRationale: async () => 'dismiss',
  });

  const result = await ensureCapability('camera', 'driver');

  expect(result).toEqual({ status: 'denied', canRetry: true });
  expect(mockedRequest).not.toHaveBeenCalled();
  expect(mockLogEvent).toHaveBeenCalledWith(
    'permission.camera.rationale_dismissed',
    expect.anything(),
  );
});

/* =================================================================
 * 3 — Blocked recovery
 * ================================================================= */

test('blocked status routes to recovery sheet and openSettings on confirm', async () => {
  mockedCheck.mockResolvedValue('blocked');
  configureSheetHandlers({
    showBlockedRecovery: async () => 'openSettings',
  });

  const result = await ensureCapability('camera', 'driver');

  expect(result).toEqual({ status: 'blocked' });
  expect(mockedOpenSettings).toHaveBeenCalledTimes(1);
  expect(mockedRequest).not.toHaveBeenCalled();
});

test('blocked recovery dismissal does not open Settings', async () => {
  mockedCheck.mockResolvedValue('blocked');
  configureSheetHandlers({
    showBlockedRecovery: async () => 'dismiss',
  });

  const result = await ensureCapability('camera', 'driver');

  expect(result).toEqual({ status: 'blocked' });
  expect(mockedOpenSettings).not.toHaveBeenCalled();
});

/* =================================================================
 * 4 — Notifications (dedicated RNP API path)
 * ================================================================= */

test('notifications: uses checkNotifications/requestNotifications, not check/request', async () => {
  mockedCheckNotifications.mockResolvedValue({
    status: 'denied',
    settings: {},
  });
  mockedRequestNotifications.mockResolvedValue({
    status: 'granted',
    settings: {},
  });
  configureSheetHandlers({
    showRationale: async () => 'continue',
  });

  const result = await ensureCapability('notifications', 'customer');

  expect(result).toEqual({ status: 'granted' });
  expect(mockedCheckNotifications).toHaveBeenCalled();
  expect(mockedRequestNotifications).toHaveBeenCalledWith([
    'alert',
    'badge',
    'sound',
  ]);
  expect(mockedCheck).not.toHaveBeenCalled(); // Would be wrong on iOS.
  expect(mockedRequest).not.toHaveBeenCalled();
});

test('notifications: limited (iOS provisional) is surfaced, NOT coerced to granted', async () => {
  // iOS provisional authorisation lets the app deliver notifications
  // but only silently to the notification center. Coercing this to
  // `granted` would pollute the funnel and let callers show a full
  // "notifications are on" UI when the user has consented only to
  // silent delivery. The service must surface it explicitly so the
  // notifications feature can render "quiet mode" copy correctly.
  mockedCheckNotifications.mockResolvedValue({
    status: 'limited',
    settings: {},
  });

  const result = await ensureCapability('notifications', 'customer');

  expect(result).toEqual({ status: 'limited' });
  expect(mockedRequestNotifications).not.toHaveBeenCalled();
});

/* =================================================================
 * 5 — Zero-permission capabilities
 * ================================================================= */

test('phoneDialer: RBAC-passed → granted without any OS call', async () => {
  const result = await ensureCapability('phoneDialer', 'driver');

  expect(result).toEqual({ status: 'granted' });
  expect(mockedCheck).not.toHaveBeenCalled();
  expect(mockedRequest).not.toHaveBeenCalled();
  expect(mockedCheckNotifications).not.toHaveBeenCalled();
});

test('photoPicker: RBAC-passed → granted (real work happens in openPhotoPicker())', async () => {
  const result = await ensureCapability('photoPicker', 'customer');
  expect(result).toEqual({ status: 'granted' });
});

/* =================================================================
 * 6 — Foreground location precondition (GPS enabled on device)
 * ================================================================= */

test('foregroundLocation granted with GPS off resolves preconditionFailed', async () => {
  mockedCheck.mockResolvedValue('granted');
  // Override the hoisted @services/driverLocation mock for THIS test
  // only. Using mockResolvedValueOnce means the next call reverts to
  // the default (GPS on) set in beforeEach — no cross-test pollution.
  mockedIsDeviceLocationEnabled.mockResolvedValueOnce(false);

  const result = await ensureCapability('foregroundLocation', 'driver');

  expect(result).toEqual({ status: 'preconditionFailed', reason: 'gpsOff' });
  expect(mockLogEvent).toHaveBeenCalledWith(
    'permission.foreground_location.gps_off',
    expect.anything(),
  );
});