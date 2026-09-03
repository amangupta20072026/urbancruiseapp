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
 * Module mocks — must be declared BEFORE the imports below.
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
      ACCESS_BACKGROUND_LOCATION:
        'android.permission.ACCESS_BACKGROUND_LOCATION',
    },
    IOS: {
      CAMERA: 'ios.permission.CAMERA',
      LOCATION_WHEN_IN_USE: 'ios.permission.LOCATION_WHEN_IN_USE',
      LOCATION_ALWAYS: 'ios.permission.LOCATION_ALWAYS',
    },
  },
}));

jest.mock('react-native', () => ({
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
}));

// Redux store — the service dispatches statusChanged; capture calls.
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

// logEvent spy — assert that the funnel emits.
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

const mockedCheck = check as jest.Mock;
const mockedRequest = request as jest.Mock;
const mockedCheckNotifications = checkNotifications as jest.Mock;
const mockedRequestNotifications = requestNotifications as jest.Mock;
const mockedOpenSettings = rnpOpenSettings as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  resetSheetHandlers();
});

/* =================================================================
 * 1 — RBAC gate
 * ================================================================= */

test('RBAC: customer cannot request driver-only backgroundLocation', async () => {
  const result = await ensureCapability('backgroundLocation', 'customer');

  expect(result).toEqual({ status: 'unavailable', reason: 'rbac' });
  expect(mockedCheck).not.toHaveBeenCalled();
  expect(mockedRequest).not.toHaveBeenCalled();
  // RBAC violation must be recorded so we can catch broken screens.
  expect(mockLogEvent).toHaveBeenCalledWith(
    'permission.background_location.rbac_violation',
    expect.objectContaining({ role: 'customer' }),
  );
});

test('RBAC: null role blocks everything', async () => {
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
 * 4 — Background location: two-step incremental flow
 * ================================================================= */

test('backgroundLocation: foreground denial short-circuits — no BG request fires', async () => {
  // First call = foreground; second call would be background but must NOT happen.
  mockedCheck.mockResolvedValueOnce('denied'); // foreground check
  // Rationale dismissed for the foreground rationale.
  configureSheetHandlers({
    showRationale: async () => 'dismiss',
  });

  const result = await ensureCapability('backgroundLocation', 'driver');

  expect(result).toEqual({ status: 'denied', canRetry: true });
  // Only one check() call — foreground. Background never queried.
  expect(mockedCheck).toHaveBeenCalledTimes(1);
  expect(mockedRequest).not.toHaveBeenCalled();
});

test('backgroundLocation: prominent disclosure ALWAYS precedes the OS prompt', async () => {
  // Foreground already granted → skip that flow, jump to BG.
  mockedCheck
    .mockResolvedValueOnce('granted') // foreground check
    .mockResolvedValueOnce('denied'); // background check
  mockedRequest.mockResolvedValue('granted');

  const events: string[] = [];
  configureSheetHandlers({
    showProminentDisclosure: async () => {
      events.push('prominent_disclosure');
      return 'continue';
    },
  });
  mockedRequest.mockImplementation(async () => {
    events.push('os_prompt');
    return 'granted';
  });

  const result = await ensureCapability('backgroundLocation', 'driver');

  expect(result).toEqual({ status: 'granted' });
  // The critical Play-policy invariant: prominent disclosure BEFORE OS.
  expect(events).toEqual(['prominent_disclosure', 'os_prompt']);

  // And it must be logged, so we can prove compliance if audited.
  expect(mockLogEvent).toHaveBeenCalledWith(
    'permission.background_location.prominent_disclosure_shown',
    expect.anything(),
  );
});

test('backgroundLocation: dismissing prominent disclosure skips OS request', async () => {
  mockedCheck
    .mockResolvedValueOnce('granted') // foreground
    .mockResolvedValueOnce('denied'); // background
  configureSheetHandlers({
    showProminentDisclosure: async () => 'dismiss',
  });

  const result = await ensureCapability('backgroundLocation', 'driver');

  expect(result).toEqual({ status: 'denied', canRetry: true });
  expect(mockedRequest).not.toHaveBeenCalled();
  expect(mockLogEvent).toHaveBeenCalledWith(
    'permission.background_location.prominent_disclosure_dismissed',
    expect.anything(),
  );
});

/* =================================================================
 * 5 — Notifications (dedicated RNP API path)
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

/* =================================================================
 * 6 — Zero-permission capabilities
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

test('foregroundLocation granted with GPS off resolves preconditionFailed', async () => {
  mockedCheck.mockResolvedValue('granted');
  // Also mock isDeviceLocationEnabled to return false — needs a mock
  // on '@services/driverLocation' at the top of the file.
  jest.mock('@services/driverLocation', () => ({
    isDeviceLocationEnabled: jest.fn().mockResolvedValue(false),
  }));

  const result = await ensureCapability('foregroundLocation', 'driver');
  expect(result).toEqual({ status: 'preconditionFailed', reason: 'gpsOff' });
  expect(mockLogEvent).toHaveBeenCalledWith(
    'permission.foreground_location.gps_off',
    expect.anything(),
  );
});
