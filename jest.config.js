/**
 * ------------------------------------------------------------------
 * Jest configuration — UrbanCruise (RN 0.86 / React 19 / TypeScript)
 * ------------------------------------------------------------------
 * Extends @react-native/jest-preset with:
 *   - moduleNameMapper for every tsconfig/babel path alias
 *   - asset stubs (image/font/svg) so requires don't blow up
 *   - transformIgnorePatterns whitelist for ESM/Flow packages
 *   - one setupFilesAfterEnv installing every native-module mock
 *   - coverage collection scoped to src/, boilerplate excluded
 *   - CI-aware reporters and worker cap
 *
 * The setup file (jest.setup.ts) is where all jest.mock(...) calls
 * live so this file stays about *config*, not fixtures.
 * ------------------------------------------------------------------
 */

/** @type {import('jest').Config} */
module.exports = {
  preset: '@react-native/jest-preset',

  rootDir: __dirname,

  // ---------------------------------------------------------------
  // Where tests live
  // ---------------------------------------------------------------
  testMatch: [
    '<rootDir>/__tests__/**/*.(test|spec).(ts|tsx|js|jsx)',
    '<rootDir>/__tests__/**/*.(ts|tsx|js|jsx)',
    '<rootDir>/src/**/*.(test|spec).(ts|tsx|js|jsx)',
    '<rootDir>/src/**/__tests__/**/*.(ts|tsx|js|jsx)',
  ],

  testPathIgnorePatterns: [
    '/node_modules/',
    '/android/',
    '/ios/',
    '/dist/',
    '<rootDir>/src/mocks/', // fixtures, not tests
  ],

  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // ---------------------------------------------------------------
  // Runs AFTER the jest framework is loaded — safe place for
  // jest.mock, jest.fn, custom matchers, etc.
  // ---------------------------------------------------------------
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],

  // ---------------------------------------------------------------
  // Path aliases — MUST mirror tsconfig.json + babel.config.js.
  // Bare-word aliases (@theme, @store) come before wildcard forms
  // so the more specific pattern always wins.
  // ---------------------------------------------------------------
  moduleNameMapper: {
    // Assets — return a plain stub instead of trying to parse binary/svg.
    '\\.(png|jpg|jpeg|gif|webp|bmp|ttf|otf|woff|woff2)$':
      '<rootDir>/__mocks__/fileMock.js',
    '\\.svg$': '<rootDir>/__mocks__/svgMock.js',

    // Exact-match aliases
    '^@theme$': '<rootDir>/src/theme',
    '^@store$': '<rootDir>/src/store',

    // Wildcard aliases
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@app/(.*)$': '<rootDir>/src/app/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@constants/(.*)$': '<rootDir>/src/constants/$1',
    '^@theme/(.*)$': '<rootDir>/src/theme/$1',
    '^@assets/(.*)$': '<rootDir>/src/assets/$1',
    '^@shared/(.*)$': '<rootDir>/src/features/shared/$1',
    '^@api/(.*)$': '<rootDir>/src/api/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@store/(.*)$': '<rootDir>/src/store/$1',
    '^@rbac/(.*)$': '<rootDir>/src/rbac/$1',
    '^@navigation/(.*)$': '<rootDir>/src/navigation/$1',
    '^@app-types/(.*)$': '<rootDir>/src/types/$1',
    '^@features/(.*)$': '<rootDir>/src/features/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@mocks/(.*)$': '<rootDir>/src/mocks/$1',
  },

  // ---------------------------------------------------------------
  // The RN preset sets the transform; we only extend the ignore
  // pattern. Every package that ships untranspiled ESM / Flow types
  // MUST be listed here or Jest throws SyntaxError on first import.
  // ---------------------------------------------------------------
  transformIgnorePatterns: [
    'node_modules/(?!(' +
      [
        'react-native',
        '@react-native',
        '@react-native-community',
        '@react-native-firebase',
        '@react-navigation',
        '@notifee/react-native',
        '@gorhom/bottom-sheet',
        '@gorhom/portal',
        '@shopify/flash-list',
        '@tanstack/react-query',
        '@tanstack/react-query-persist-client',
        '@tanstack/query-async-storage-persister',
        '@reduxjs/toolkit', 
        'immer', 
        'reselect', 
        'redux', 
        'redux-thunk', 
        'react-native-gesture-handler',
        'react-native-reanimated',
        'react-native-worklets',
        'react-native-keyboard-controller',
        'react-native-mmkv',
        'react-native-keychain',
        'react-native-svg',
        'react-native-safe-area-context',
        'react-native-screens',
        'react-native-pager-view',
        'react-native-permissions',
        'react-native-device-info',
        'react-native-config',
        'react-native-capture-protection',
        'react-native-geolocation-service',
        'react-native-image-picker',
        'react-native-blob-util',
        'react-native-file-viewer',
        'react-native-pdf',
        'react-native-nitro-modules',
        'react-native-gifted-charts',
        'lottie-react-native',
        'lucide-react-native',
        'react-redux',
        'redux-persist',
      ].join('|') +
      ')/)',
  ],

  // ---------------------------------------------------------------
  // Coverage — scoped to src/, boilerplate and generated code out.
  // ---------------------------------------------------------------
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/**/types.ts',
    '!src/types/**',
    '!src/mocks/**',
    '!src/assets/**',
    '!src/theme/**',
    '!src/constants/**',
    '!src/native/**',
  ],

  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text-summary', 'lcov', 'html', 'json-summary'],

  // Modest floor — tune upward as suites grow. Prevents regressions.
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 60,
      statements: 60,
    },
  },

  // ---------------------------------------------------------------
  // Isolation between tests. clearMocks + restoreMocks together
  // means spies reset call history AND revert to original impls
  // between every test — cross-test pollution can't hide a bug.
  // ---------------------------------------------------------------
  clearMocks: true,
  restoreMocks: true,

  // ---------------------------------------------------------------
  // CI-friendly output + worker cap. Local dev stays unlimited.
  // ---------------------------------------------------------------
  reporters: process.env.CI ? ['default', 'github-actions'] : ['default'],
  maxWorkers: process.env.CI ? 2 : '50%',

  // ---------------------------------------------------------------
  // Timers — @react-native/jest-preset already sets 'modern'.
  // Snapshot serializers — none needed; Reanimated is fully mocked.
  // ---------------------------------------------------------------
};
