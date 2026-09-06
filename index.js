/**
 * @format
 */
// MUST be imported before anything else — Notifee's background handler
// has to be registered before AppRegistry.registerComponent so headless
// (app-killed) notification taps can wake the process and route.
import '@services/notifications/backgroundHandler';

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
