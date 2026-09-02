/**
 * ------------------------------------------------------------------
 * Redux Store
 * ------------------------------------------------------------------
 * redux-persist backed by MMKV. A slice-level transform ensures only
 * durable identity fields survive process kills. Bootstrap-controlled
 * fields (bootstrapped, appConfig, authStatus) are recomputed on
 * every launch by the bootstrap orchestrator — persisting them would
 * be wrong (stale) and slightly wasteful.
 *
 * `hasSeenOnboarding` is persisted DIRECTLY to MMKV by the bootstrap
 * orchestrator (not through redux-persist) so it's readable
 * synchronously during cold start.
 * ------------------------------------------------------------------
 */

import {
  combineReducers,
  configureStore,
  type Reducer,
} from '@reduxjs/toolkit';
import {
  FLUSH,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
  REHYDRATE,
  createTransform,
  persistReducer,
  persistStore,
} from 'redux-persist';
import { deeplinkListenerMiddleware } from './listeners/deeplinkDrainListener';
import appReducer, { type AppState } from './slices/appSlice';
import userReducer from './slices/userSlice';
import { reduxMmkvStorage } from './mmkvStorage';

/* -----------------------------------------------------------------
 * Root reducer
 * ----------------------------------------------------------------- */

const rootReducer = combineReducers({
  app: appReducer,
  user: userReducer,
});

type RootReducerState = ReturnType<typeof rootReducer>;

/* -----------------------------------------------------------------
 * Persist transform — whitelist only durable identity fields
 * ----------------------------------------------------------------- */

type PersistedAppSubset = Pick<
  AppState,
  'userId' | 'userRole' | 'subRole' | 'entityId'
>;

const SESSION_DEFAULTS = {
  bootstrapped: false,
  hasSeenOnboardingThisSession: false, // session-only — resets every cold start
  selectedRole: null,
  authStatus: 'unauthenticated' as const,
  isAuthenticated: false,
  appConfig: null,
};

const appSliceTransform = createTransform<AppState, PersistedAppSubset>(
  (inbound): PersistedAppSubset => ({
    userId: inbound.userId,
    userRole: inbound.userRole,
    subRole: inbound.subRole,
    entityId: inbound.entityId,
  }),
  (outbound): AppState => ({
    ...SESSION_DEFAULTS,
    userId: outbound.userId,
    userRole: outbound.userRole,
    subRole: outbound.subRole,
    entityId: outbound.entityId,
  }),
  { whitelist: ['app'] },
);

/* -----------------------------------------------------------------
 * Persist config
 * ----------------------------------------------------------------- */

const persistConfig = {
  key: 'urbancruise-root',
  version: 3, // bumped: shape changed vs previous release
  storage: reduxMmkvStorage,
  transforms: [appSliceTransform],
};

const persistedReducer = persistReducer(
  persistConfig,
  rootReducer as unknown as Reducer<RootReducerState>,
);

/* -----------------------------------------------------------------
 * Store
 * ----------------------------------------------------------------- */

export const store = configureStore({
  reducer: persistedReducer,
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }).prepend(deeplinkListenerMiddleware.middleware),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
