/**
 * ------------------------------------------------------------------
 * React Native CLI Configuration
 * ------------------------------------------------------------------
 * Tells `react-native-asset` where to find custom assets (fonts,
 * static images) so they can be linked into the native iOS and
 * Android projects.
 *
 * After editing this file, run:
 *   npx react-native-asset
 * ------------------------------------------------------------------
 */

module.exports = {
  project: {
    ios: {},
    android: {},
  },
  assets: ['./src/assets/fonts/'],
};