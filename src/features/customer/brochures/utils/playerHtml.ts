/**
 * ------------------------------------------------------------------
 * In-app YouTube player — page and identity
 * ------------------------------------------------------------------
 * The player runs inside a WebView from a local HTML string loaded
 * with a `baseUrl`. YouTube's Required Minimum Functionality says an
 * embedded player must identify the app through the HTTP Referer;
 * for "a mobile app with the player in a local HTML file", setting
 * `baseUrl` (Android `loadDataWithBaseURL`, which react-native-webview
 * uses for `source={{ html, baseUrl }}`) sets that Referer. The
 * Referer must be `https://` + the store app id. Without it YouTube
 * answers with player error 153.
 *
 * The page only creates the official IFrame Player API player and
 * forwards its events to React Native. It adds nothing on top of the
 * player (no overlays — also an RMF rule).
 * ------------------------------------------------------------------
 */
import DeviceInfo from 'react-native-device-info';

/**
 * `https://<application id>`, e.g. `https://app.urbancruise`.
 * Read from the running app rather than hard-coded, so it always
 * matches the id the Play Store installed (RMF: "retrieve the app ID
 * from the environment").
 */
export function getYouTubePlayerBaseUrl(): string {
  return `https://${DeviceInfo.getBundleId().toLowerCase()}`;
}

/** Messages the page posts to React Native. */
export type PlayerMessage =
  | { type: 'ready' }
  | { type: 'state'; state: number }
  | { type: 'error'; code: number | string };

/** YT.PlayerState.PLAYING in the IFrame Player API. */
export const PLAYER_STATE_PLAYING = 1;

/**
 * Parses a WebView message. Anything that is not one of our messages
 * returns null (the page is ours, but never trust a bridge blindly).
 */
export function parsePlayerMessage(raw: string): PlayerMessage | null {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null) return null;
  const msg = value as Record<string, unknown>;
  if (msg.type === 'ready') return { type: 'ready' };
  if (msg.type === 'state' && typeof msg.state === 'number') {
    return { type: 'state', state: msg.state };
  }
  if (
    msg.type === 'error' &&
    (typeof msg.code === 'number' || typeof msg.code === 'string')
  ) {
    return { type: 'error', code: msg.code };
  }
  return null;
}

/**
 * The player page for one video. `videoId` and `origin` are inserted
 * with JSON.stringify (and `<` escaped), so they can never break out
 * of the script.
 *
 * Player parameters (all documented IFrame player parameters):
 *   playsinline=1     play inline, not forced fullscreen
 *   rel=0             related videos from the same channel only
 *   origin            the page's origin (= baseUrl)
 *   widget_referrer   the app identity, as RMF asks wrappers to set
 */
export function buildYouTubePlayerHtml(
  videoId: string,
  origin: string,
): string {
  const js = (v: string) => JSON.stringify(v).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<style>
  html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: #000; overflow: hidden; }
  #player { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
</style>
</head>
<body>
<div id="player"></div>
<script>
  function send(message) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify(message));
    }
  }
  var api = document.createElement('script');
  api.src = 'https://www.youtube.com/iframe_api';
  api.onerror = function () { send({ type: 'error', code: 'api_load_failed' }); };
  document.head.appendChild(api);

  function onYouTubeIframeAPIReady() {
    new YT.Player('player', {
      width: '100%',
      height: '100%',
      videoId: ${js(videoId)},
      playerVars: {
        playsinline: 1,
        rel: 0,
        origin: ${js(origin)},
        widget_referrer: ${js(origin)}
      },
      events: {
        onReady: function () { send({ type: 'ready' }); },
        onStateChange: function (e) { send({ type: 'state', state: e.data }); },
        onError: function (e) { send({ type: 'error', code: e.data }); }
      }
    });
  }
</script>
</body>
</html>`;
}
