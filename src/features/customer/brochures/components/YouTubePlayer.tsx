/**
 * ------------------------------------------------------------------
 * YouTubePlayer — the official YouTube embedded player in a WebView
 * ------------------------------------------------------------------
 * Android only for now (the iOS bundle id is not final; iOS keeps
 * opening YouTube — see BrochurePlayer).
 *
 * Compliance (YouTube API Services — Required Minimum Functionality):
 *   - Identity: local HTML loaded with baseUrl `https://<app id>`
 *     (see utils/playerHtml.ts). Missing identity = error 153.
 *   - Size: the parent gives a 16:9 box at full screen width; on any
 *     phone that is above the 200 × 200 px minimum viewport.
 *   - No overlays: nothing is drawn over the player once it is ready.
 *     The loading spinner shows only before the player exists.
 *   - No autoplay: the customer starts playback with YouTube's own
 *     play button.
 *   - OS WebView: react-native-webview uses Android's WebView.
 *
 * Links that leave the player (YouTube logo, "Watch on YouTube",
 * channel name) open in the YouTube app / browser instead of
 * replacing the player inside the WebView.
 *
 * Failures (player error codes, the API script not loading, the page
 * not loading, no "ready" within READY_TIMEOUT_MS) are reported once
 * through `onError`; the parent shows the error view.
 * ------------------------------------------------------------------
 */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ActivityIndicator, Linking, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import type {
  ShouldStartLoadRequest,
  WebViewMessageEvent,
  WebViewOpenWindowEvent,
} from 'react-native-webview/lib/WebViewTypes';
import { Colors } from '@theme';
import { logError } from '@services/telemetry';
import {
  PLAYER_STATE_PLAYING,
  buildYouTubePlayerHtml,
  getYouTubePlayerBaseUrl,
  parsePlayerMessage,
} from '../utils/playerHtml';

/** How long to wait for the player before treating it as failed. */
export const READY_TIMEOUT_MS = 20_000;

export type YouTubePlayerErrorCode = number | string;

export type YouTubePlayerProps = {
  videoId: string;
  width: number;
  height: number;
  /** Called once per mount when the player cannot play. */
  onError: (code: YouTubePlayerErrorCode) => void;
  /** Called once per mount, the first time playback starts. */
  onFirstPlay?: () => void;
};

function openExternally(url: string): void {
  Linking.openURL(url).catch(error => {
    logError(error, { boundary: 'brochures.player.openExternal' });
  });
}

export const YouTubePlayer: React.FC<YouTubePlayerProps> = ({
  videoId,
  width,
  height,
  onError,
  onFirstPlay,
}) => {
  const baseUrl = useMemo(() => getYouTubePlayerBaseUrl(), []);
  const source = useMemo(
    () => ({ html: buildYouTubePlayerHtml(videoId, baseUrl), baseUrl }),
    [videoId, baseUrl],
  );

  const [ready, setReady] = useState(false);
  const failed = useRef(false);
  const played = useRef(false);

  // Latest callbacks without re-creating the handlers below.
  const callbacks = useRef({ onError, onFirstPlay });
  useEffect(() => {
    callbacks.current = { onError, onFirstPlay };
  });

  const fail = useCallback((code: YouTubePlayerErrorCode) => {
    if (failed.current) return;
    failed.current = true;
    callbacks.current.onError(code);
  }, []);

  useEffect(() => {
    if (ready) return;
    const timer = setTimeout(() => fail('timeout'), READY_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [ready, fail]);

  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      const message = parsePlayerMessage(event.nativeEvent.data);
      if (!message) return;
      if (message.type === 'ready') {
        setReady(true);
      } else if (message.type === 'error') {
        fail(message.code);
      } else if (message.state === PLAYER_STATE_PLAYING && !played.current) {
        played.current = true;
        callbacks.current.onFirstPlay?.();
      }
    },
    [fail],
  );

  const onShouldStartLoadWithRequest = useCallback(
    (request: ShouldStartLoadRequest): boolean => {
      // Everything inside the player iframe is YouTube's own.
      if (!request.isTopFrame) return true;
      const { url } = request;
      if (url === 'about:blank' || url.startsWith(baseUrl)) return true;
      openExternally(url);
      return false;
    },
    [baseUrl],
  );

  const onOpenWindow = useCallback((event: WebViewOpenWindowEvent) => {
    openExternally(event.nativeEvent.targetUrl);
  }, []);

  return (
    <View style={{ width, height }}>
      <WebView
        source={source}
        originWhitelist={['https://*', 'about:*']}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        allowsFullscreenVideo
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction
        setSupportMultipleWindows
        scrollEnabled={false}
        bounces={false}
        onMessage={onMessage}
        onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
        onOpenWindow={onOpenWindow}
        onError={() => fail('webview_error')}
        onHttpError={event => {
          // Only the page itself matters; sub-resources are YouTube's.
          if (event.nativeEvent.url.startsWith(baseUrl)) {
            fail(`http_${event.nativeEvent.statusCode}`);
          }
        }}
        onRenderProcessGone={() => fail('render_process_gone')}
        accessibilityLabel="YouTube video player"
      />
      {!ready ? (
        <View style={styles.loading} pointerEvents="none">
          <ActivityIndicator color={Colors.white} />
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  webview: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  loading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.black,
  },
});
