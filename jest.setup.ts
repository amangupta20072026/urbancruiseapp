/**
 * ------------------------------------------------------------------
 * jest.setup.ts — global mocks for every native module in the app
 * ------------------------------------------------------------------
 * Loaded via `setupFilesAfterEnv` (see jest.config.js). Runs once per
 * test file, AFTER the jest framework is installed, so jest.mock()
 * and jest.fn() are available.
 *
 * Rule of thumb: any package that reaches into the native bridge must
 * be mocked here or its first import will crash Jest. The mocks are
 * intentionally lightweight — just enough shape to satisfy imports
 * and typical usage. Tests that need richer behavior should override
 * with `jest.mock(...)` at the top of the individual test file.
 * ------------------------------------------------------------------
 */

// -----------------------------------------------------------------
// Gesture Handler — ships its own jestSetup that patches RN internals.
// Must run before any component using PanGesture / TapGesture mounts.
// -----------------------------------------------------------------
import 'react-native-gesture-handler/jestSetup';

// -----------------------------------------------------------------
// Reanimated — ships an official mock. Handles worklets, shared
// values, and useAnimatedStyle without a native runtime.
// -----------------------------------------------------------------
jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock'),
);

// react-native-worklets (v0.11) is Reanimated's runtime — stub the
// bits the codebase touches directly.
jest.mock('react-native-worklets', () => ({
  runOnJS: (fn: any) => fn,
  runOnUI: (fn: any) => fn,
  createWorkletRuntime: jest.fn(),
  scheduleOnRN: (fn: any, ...args: any[]) => fn(...args),
}));

// -----------------------------------------------------------------
// MMKV — the store used by redux-persist AND @tanstack query cache.
// Backed by an in-memory Map so tests get realistic get/set semantics.
// -----------------------------------------------------------------
jest.mock('react-native-mmkv', () => {
  const stores = new Map<string, Map<string, string | number | boolean>>();
  const store = (id: string) => {
    if (!stores.has(id)) stores.set(id, new Map());
    return stores.get(id)!;
  };
  const MMKV = jest.fn().mockImplementation((opts: { id?: string } = {}) => {
    const s = store(opts.id ?? 'default');
    const listeners = new Set<any>();
    const notify = (k: string) =>
      listeners.forEach((l: (key: string) => void) => l(k));
    return {
      set: (k: string, v: any) => {
        s.set(k, v);
        notify(k);
      },
      getString: (k: string) => (s.has(k) ? String(s.get(k)) : undefined),
      getNumber: (k: string) => (s.has(k) ? Number(s.get(k)) : undefined),
      getBoolean: (k: string) => (s.has(k) ? Boolean(s.get(k)) : undefined),
      contains: (k: string) => s.has(k),
      delete: (k: string) => {
        s.delete(k);
        notify(k);
      },
      getAllKeys: () => Array.from(s.keys()),
      clearAll: () => s.clear(),
      addOnValueChangedListener: (cb: (key: string) => void) => {
        listeners.add(cb);
        return { remove: () => listeners.delete(cb) };
      },
    };
  });
  return { MMKV };
});

// -----------------------------------------------------------------
// Keychain — token storage. All methods resolve, none actually
// persist. Tests wanting to simulate "stored token" override
// getGenericPassword per file.
// -----------------------------------------------------------------
jest.mock('react-native-keychain', () => ({
  setGenericPassword: jest.fn().mockResolvedValue(true),
  getGenericPassword: jest.fn().mockResolvedValue(false),
  resetGenericPassword: jest.fn().mockResolvedValue(true),
  ACCESSIBLE: {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'AccessibleWhenUnlockedThisDeviceOnly',
    WHEN_UNLOCKED: 'AccessibleWhenUnlocked',
    AFTER_FIRST_UNLOCK: 'AccessibleAfterFirstUnlock',
  },
  ACCESS_CONTROL: {},
  SECURITY_LEVEL: {},
  STORAGE_TYPE: {},
  AUTHENTICATION_TYPE: {},
  BIOMETRY_TYPE: {},
}));

// -----------------------------------------------------------------
// Firebase — app / messaging / crashlytics.
// Every module exports a callable factory (matches v20+ modular API
// used by @react-native-firebase v26).
// -----------------------------------------------------------------
jest.mock('@react-native-firebase/app', () => ({
  __esModule: true,
  default: () => ({}),
  firebase: { app: () => ({}), apps: [] },
}));

jest.mock('@react-native-firebase/messaging', () => {
  const AuthorizationStatus = {
    NOT_DETERMINED: -1,
    DENIED: 0,
    AUTHORIZED: 1,
    PROVISIONAL: 2,
    EPHEMERAL: 3,
  };
  const messaging: any = () => ({
    getToken: jest.fn().mockResolvedValue('mock-fcm-token'),
    deleteToken: jest.fn().mockResolvedValue(undefined),
    onMessage: jest.fn().mockReturnValue(() => {}),
    onNotificationOpenedApp: jest.fn().mockReturnValue(() => {}),
    getInitialNotification: jest.fn().mockResolvedValue(null),
    requestPermission: jest
      .fn()
      .mockResolvedValue(AuthorizationStatus.AUTHORIZED),
    hasPermission: jest.fn().mockResolvedValue(AuthorizationStatus.AUTHORIZED),
    setBackgroundMessageHandler: jest.fn(),
    onTokenRefresh: jest.fn().mockReturnValue(() => {}),
    subscribeToTopic: jest.fn().mockResolvedValue(undefined),
    unsubscribeFromTopic: jest.fn().mockResolvedValue(undefined),
  });
  messaging.AuthorizationStatus = AuthorizationStatus;
  return { __esModule: true, default: messaging };
});

jest.mock('@react-native-firebase/crashlytics', () => {
  const crashlytics = () => ({
    log: jest.fn(),
    recordError: jest.fn(),
    setAttribute: jest.fn().mockResolvedValue(undefined),
    setAttributes: jest.fn().mockResolvedValue(undefined),
    setUserId: jest.fn().mockResolvedValue(undefined),
    crash: jest.fn(),
    setCrashlyticsCollectionEnabled: jest.fn().mockResolvedValue(true),
    isCrashlyticsCollectionEnabled: true,
  });
  return { __esModule: true, default: crashlytics };
});

// -----------------------------------------------------------------
// Notifee — foreground notifications and channel management.
// -----------------------------------------------------------------
jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    requestPermission: jest.fn().mockResolvedValue({ authorizationStatus: 1 }),
    createChannel: jest.fn().mockResolvedValue('channel-id'),
    createChannelGroup: jest.fn().mockResolvedValue('group-id'),
    displayNotification: jest.fn().mockResolvedValue(undefined),
    cancelNotification: jest.fn().mockResolvedValue(undefined),
    cancelAllNotifications: jest.fn().mockResolvedValue(undefined),
    onForegroundEvent: jest.fn().mockReturnValue(() => {}),
    onBackgroundEvent: jest.fn(),
    getInitialNotification: jest.fn().mockResolvedValue(null),
    setBadgeCount: jest.fn().mockResolvedValue(undefined),
    getBadgeCount: jest.fn().mockResolvedValue(0),
    incrementBadgeCount: jest.fn().mockResolvedValue(undefined),
    decrementBadgeCount: jest.fn().mockResolvedValue(undefined),
  },
  EventType: {
    UNKNOWN: -1,
    DISMISSED: 0,
    PRESS: 1,
    ACTION_PRESS: 2,
    DELIVERED: 3,
    APP_BLOCKED: 4,
    CHANNEL_BLOCKED: 5,
    CHANNEL_GROUP_BLOCKED: 6,
    TRIGGER_NOTIFICATION_CREATED: 7,
    FG_ALREADY_EXIST: 8,
  },
  AndroidImportance: { HIGH: 4, DEFAULT: 3, LOW: 2, MIN: 1, NONE: 0 },
  AndroidVisibility: { PUBLIC: 1, PRIVATE: 0, SECRET: -1 },
  AuthorizationStatus: {
    NOT_DETERMINED: -1,
    DENIED: 0,
    AUTHORIZED: 1,
    PROVISIONAL: 2,
  },
  TriggerType: { TIMESTAMP: 0, INTERVAL: 1 },
}));

// -----------------------------------------------------------------
// NetInfo — network reachability.
// -----------------------------------------------------------------
jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    fetch: jest.fn().mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
    }),
    addEventListener: jest.fn().mockReturnValue(() => {}),
    configure: jest.fn(),
  },
  fetch: jest.fn().mockResolvedValue({
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
  }),
  addEventListener: jest.fn().mockReturnValue(() => {}),
  useNetInfo: () => ({
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
    details: null,
  }),
}));

// -----------------------------------------------------------------
// Permissions — every check/request resolves GRANTED by default.
// Tests targeting denied/blocked flows override per file.
// -----------------------------------------------------------------
jest.mock('react-native-permissions', () => {
  const RESULTS = {
    UNAVAILABLE: 'unavailable',
    DENIED: 'denied',
    LIMITED: 'limited',
    GRANTED: 'granted',
    BLOCKED: 'blocked',
  };
  return {
    __esModule: true,
    PERMISSIONS: { IOS: {}, ANDROID: {} },
    RESULTS,
    check: jest.fn().mockResolvedValue(RESULTS.GRANTED),
    request: jest.fn().mockResolvedValue(RESULTS.GRANTED),
    checkMultiple: jest.fn().mockResolvedValue({}),
    requestMultiple: jest.fn().mockResolvedValue({}),
    checkNotifications: jest
      .fn()
      .mockResolvedValue({ status: RESULTS.GRANTED, settings: {} }),
    requestNotifications: jest
      .fn()
      .mockResolvedValue({ status: RESULTS.GRANTED, settings: {} }),
    openSettings: jest.fn().mockResolvedValue(true),
  };
});

// -----------------------------------------------------------------
// Device info
// -----------------------------------------------------------------
jest.mock('react-native-device-info', () => ({
  getVersion: () => '1.0.0',
  getBuildNumber: () => '1',
  getBundleId: () => 'com.urbancruise.test',
  getUniqueId: () => Promise.resolve('mock-unique-id'),
  getSystemVersion: () => '17.0',
  getSystemName: () => 'iOS',
  getModel: () => 'Mock Device',
  getBrand: () => 'Mock',
  getDeviceId: () => 'mock-device-id',
  getReadableVersion: () => '1.0.0.1',
  isEmulator: () => Promise.resolve(false),
  hasNotch: () => false,
  hasDynamicIsland: () => false,
  getInstallerPackageName: () => Promise.resolve('unknown'),
}));

// -----------------------------------------------------------------
// Config (react-native-config) — empty env by default.
// Override per test file via `jest.mock('react-native-config', () => ({...}))`.
// -----------------------------------------------------------------
jest.mock('react-native-config', () => ({ __esModule: true, default: {} }));

// -----------------------------------------------------------------
// Capture protection (screenshot block)
// -----------------------------------------------------------------
jest.mock('react-native-capture-protection', () => ({
  CaptureProtection: {
    prevent: jest.fn().mockResolvedValue(undefined),
    allow: jest.fn().mockResolvedValue(undefined),
    allowScreenshot: jest.fn().mockResolvedValue(undefined),
    preventScreenshot: jest.fn().mockResolvedValue(undefined),
    addListener: jest.fn().mockReturnValue({ remove: () => {} }),
    removeListener: jest.fn(),
    getStatus: jest.fn().mockResolvedValue(0),
  },
  useCaptureProtection: () => ({ status: 0, isPrevent: false }),
  CaptureProtectionModuleStatus: {
    UNKNOWN: 0,
    ALLOW: 1,
    PREVENT: 2,
  },
}));

// -----------------------------------------------------------------
// Geolocation
// -----------------------------------------------------------------
jest.mock('react-native-geolocation-service', () => ({
  __esModule: true,
  default: {
    getCurrentPosition: jest.fn((cb: any) =>
      cb({
        coords: {
          latitude: 0,
          longitude: 0,
          accuracy: 5,
          altitude: 0,
          heading: 0,
          speed: 0,
        },
        timestamp: Date.now(),
      }),
    ),
    watchPosition: jest.fn().mockReturnValue(1),
    clearWatch: jest.fn(),
    stopObserving: jest.fn(),
    requestAuthorization: jest.fn().mockResolvedValue('granted'),
  },
}));

// -----------------------------------------------------------------
// Keyboard controller — passthrough shells; hooks return stable
// SharedValue-shaped objects Reanimated's mock understands.
// -----------------------------------------------------------------
jest.mock('react-native-keyboard-controller', () => {
  const React = require('react');
  return {
    KeyboardProvider: ({ children }: any) => children,
    KeyboardAvoidingView: ({ children }: any) =>
      React.createElement(React.Fragment, null, children),
    KeyboardStickyView: ({ children }: any) =>
      React.createElement(React.Fragment, null, children),
    useKeyboardHandler: jest.fn(),
    useReanimatedKeyboardAnimation: () => ({
      height: { value: 0 },
      progress: { value: 0 },
    }),
    useKeyboardAnimation: () => ({ height: 0, progress: 0 }),
    KeyboardController: {
      setInputMode: jest.fn(),
      setDefaultMode: jest.fn(),
      dismiss: jest.fn(),
    },
    KeyboardEvents: {
      addListener: jest.fn().mockReturnValue({ remove: () => {} }),
    },
  };
});

// -----------------------------------------------------------------
// @gorhom/bottom-sheet — passthrough Views so children render;
// hooks return jest.fn spies so tests can assert imperative calls.
// -----------------------------------------------------------------
jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');
  const { View, TextInput } = require('react-native');
  const passthrough = ({ children }: any) =>
    React.createElement(View, null, children);
  const forwardRef = (testID: string) =>
    React.forwardRef(({ children }: any, _ref: any) =>
      React.createElement(View, { testID }, children),
    );
  return {
    __esModule: true,
    default: forwardRef('BottomSheet'),
    BottomSheetModal: forwardRef('BottomSheetModal'),
    BottomSheetModalProvider: passthrough,
    BottomSheetView: passthrough,
    BottomSheetScrollView: passthrough,
    BottomSheetFlatList: passthrough,
    BottomSheetSectionList: passthrough,
    BottomSheetBackdrop: passthrough,
    BottomSheetHandle: passthrough,
    BottomSheetFooter: passthrough,
    BottomSheetTextInput: TextInput,
    useBottomSheet: () => ({
      close: jest.fn(),
      expand: jest.fn(),
      collapse: jest.fn(),
      snapToIndex: jest.fn(),
      snapToPosition: jest.fn(),
      forceClose: jest.fn(),
    }),
    useBottomSheetModal: () => ({
      present: jest.fn(),
      dismiss: jest.fn(),
      dismissAll: jest.fn(),
    }),
    useBottomSheetSpringConfigs: () => ({}),
    useBottomSheetTimingConfigs: () => ({}),
  };
});

// -----------------------------------------------------------------
// Safe area — insets always zero. Tests that need a specific safe
// area (e.g. notch simulation) override per file.
// -----------------------------------------------------------------
jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  const frame = { width: 0, height: 0, x: 0, y: 0 };
  const React = require('react');
  return {
    SafeAreaProvider: ({ children }: any) => children,
    SafeAreaConsumer: ({ children }: any) => children(inset),
    SafeAreaView: ({ children }: any) =>
      React.createElement(React.Fragment, null, children),
    useSafeAreaInsets: () => inset,
    useSafeAreaFrame: () => frame,
    initialWindowMetrics: { insets: inset, frame },
  };
});

// -----------------------------------------------------------------
// FlashList — drop-in FlatList so items still render in RTL queries.
// -----------------------------------------------------------------
jest.mock('@shopify/flash-list', () => {
  const { FlatList } = require('react-native');
  return {
    FlashList: FlatList,
    MasonryFlashList: FlatList,
    AnimatedFlashList: FlatList,
  };
});

// -----------------------------------------------------------------
// Lottie
// -----------------------------------------------------------------
jest.mock('lottie-react-native', () => 'LottieView');

// -----------------------------------------------------------------
// react-native-svg — proxy every named export to a passthrough
// so `<Path>`, `<Circle>`, etc. all render as inert host components.
// -----------------------------------------------------------------
jest.mock('react-native-svg', () => {
  const React = require('react');
  const stub = (name: string) => (props: any) =>
    React.createElement(name, props, props.children);
  const handler: ProxyHandler<any> = {
    get: (target, key: string) => target[key] ?? stub(String(key)),
  };
  return new Proxy({ __esModule: true, default: stub('Svg') }, handler);
});

// -----------------------------------------------------------------
// Lucide icons — every icon becomes a string component. Cheap.
// -----------------------------------------------------------------
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => 'Icon' }));

// -----------------------------------------------------------------
// Misc file / media modules
// -----------------------------------------------------------------
jest.mock('react-native-blob-util', () => ({
  __esModule: true,
  default: {
    fs: {
      dirs: {
        DocumentDir: '/tmp',
        CacheDir: '/tmp/cache',
        MainBundleDir: '/tmp/bundle',
      },
      exists: jest.fn().mockResolvedValue(false),
      unlink: jest.fn().mockResolvedValue(undefined),
      writeFile: jest.fn().mockResolvedValue(undefined),
      readFile: jest.fn().mockResolvedValue(''),
    },
    config: jest.fn(() => ({
      fetch: jest.fn().mockResolvedValue({ path: () => '/tmp/f' }),
    })),
  },
}));

jest.mock('react-native-file-viewer', () => ({
  open: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn().mockResolvedValue({ assets: [], didCancel: false }),
  launchImageLibrary: jest
    .fn()
    .mockResolvedValue({ assets: [], didCancel: false }),
}));

jest.mock('react-native-pdf', () => 'Pdf');

// -----------------------------------------------------------------
// Nitro modules — some newer RN libs (incl. keyboard-controller)
// depend on nitro. Stub the register/get calls.
// -----------------------------------------------------------------
jest.mock('react-native-nitro-modules', () => ({
  NitroModules: {
    createHybridObject: jest.fn(() => ({})),
    getHybridObjectConstructor: jest.fn(() => class {}),
  },
}));

// -----------------------------------------------------------------
// Silence known-noisy warnings so real failures stand out in CI.
// If you need to see them locally, set VERBOSE_WARNINGS=1.
// -----------------------------------------------------------------
if (!process.env.VERBOSE_WARNINGS) {
  const originalWarn = console.warn;
  const originalError = console.error;
  const NOISE = [
    /useNativeDriver/,
    /Animated: `useNativeDriver`/,
    /new NativeEventEmitter/,
    /RCTBridge required dispatch_sync/,
  ];
  const isNoise = (msg: unknown) =>
    typeof msg === 'string' && NOISE.some(re => re.test(msg));

  console.warn = (msg: any, ...rest: any[]) => {
    if (isNoise(msg)) return;
    originalWarn(msg, ...rest);
  };
  console.error = (msg: any, ...rest: any[]) => {
    if (isNoise(msg)) return;
    originalError(msg, ...rest);
  };
}
