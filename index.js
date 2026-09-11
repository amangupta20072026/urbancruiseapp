/**
 * @format
 */
// MUST be imported before anything else — Notifee's background handler
// has to be registered before AppRegistry.registerComponent so headless
// (app-killed) notification taps can wake the process and route.
import '@services/notifications/backgroundHandler';

// Same rule applies to FCM's background message RECEIVE handler:
// setBackgroundMessageHandler must run at module scope, before
// AppRegistry.registerComponent, or background/quit messages get
// dropped on Android's headless task.
// Source: rnfirebase.io/messaging/usage → Background & Quit state.
import '@services/notifications/fcmBackgroundHandler';

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);