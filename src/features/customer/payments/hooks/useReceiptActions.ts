/**
 * useReceiptActions
 * =================
 * Handles Download Receipt and Share Receipt for a paid payment.
 *
 * HOW IT WORKS
 * ─────────────
 * Both actions call the backend endpoint:
 *   GET /api/v1/customer/payments/:id/receipt
 * with a Bearer token. The backend streams the PDF back.
 * react-native-blob-util writes bytes straight to the device
 * filesystem — no base64 bridge, no memory spike.
 *
 * DOWNLOAD ARCHITECTURE (Android)
 *   Cache-first, Downloads-derived — required for Android 10+ scoped storage.
 *
 *   Step 1: Fetch → CacheDir (plain file, valid PDF, works with FileViewer)
 *   Step 2: Copy CacheDir → DownloadDir via fs.cp() (public visible copy)
 *   Step 3: fs.scanFile() so it appears in Files app immediately
 *   Step 4: FileViewer.open(cachePath) → opens in device PDF viewer
 *
 *   Why NOT useDownloadManager for the primary fetch:
 *     On Android 10+ scoped storage, DownloadManager registers the file
 *     in MediaStore and returns a content:// URI. fs.cp() from that path
 *     reads zero bytes → the copy for FileViewer is 0-byte → PDF viewer
 *     rejects it as "invalid format". Fetching to CacheDir first gives
 *     us a real file:// path that always works.
 *
 * UNIQUE FILENAME PER OPEN — the critical fix for "second tap fails"
 * ─────────────────────────────────────────────────────────────────
 *   react-native-file-viewer wraps the cache file in a content:// URI
 *   via its FileProvider (see the library's AndroidManifest — provider
 *   authorities="${applicationId}.provider"). Google Drive receives that
 *   URI, opens it, and caches the parsed PDF against the URI string as
 *   the key. On a repeat download it receives the SAME URI string and
 *   returns its cached (or stale/locked) parse result — "invalid format".
 *
 *   The fix used by every production app that behaves correctly
 *   (Gmail, Chrome, WhatsApp): write a fresh file with a unique name
 *   every time. Drive sees a new URI, does a fresh parse, opens cleanly.
 *
 *   We prune stale receipt files (older than 5 min) at the start of
 *   each new download so CacheDir doesn't grow forever. Also on app
 *   next cold start Android will clean CacheDir automatically on
 *   low storage.
 *
 * SECOND-TAP SAFETY
 *   `inFlight` is a module-level Set — survives PaymentDetailSheet
 *   unmount/remount cycles. Refs would reset; a module-level Set does not.
 */

import { useCallback } from 'react';
import { Platform } from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import FileViewer from 'react-native-file-viewer';
import Share from 'react-native-share';

import { ENV } from '@config/env';
import { getAccessToken } from '@services/storage/secureStorage';
import { toast } from '@services/toast';
import type { CustomerPaymentDetail } from '../types';

/* ─── module-level in-flight guard ──────────────────────────── */

const inFlight = new Set<string>();

/* ─── constants ──────────────────────────────────────────────── */

/** How long a cached receipt file stays on disk before it is pruned. */
const CACHE_TTL_MS = 5 * 60 * 1000;

/** Filename prefix used to identify our receipts for pruning. */
const RECEIPT_PREFIX = 'UC-Receipt-';

/* ─── helpers ────────────────────────────────────────────────── */

function receiptUrl(paymentId: string): string {
  return `${ENV.apiUrl}/customer/payments/${encodeURIComponent(
    paymentId,
  )}/receipt`;
}

/**
 * Stable filename for the permanent copy in DownloadDir. This is what
 * shows up in the user's Files/Downloads app — we want it stable so a
 * repeat download replaces (rather than duplicates) the file.
 */
function permanentFilename(paymentId: string): string {
  return `${RECEIPT_PREFIX}${paymentId}.pdf`;
}

/**
 * Unique filename for each open. Timestamp suffix ensures FileProvider
 * generates a new content:// URI, forcing the PDF viewer (Google Drive,
 * Adobe, Samsung) to do a fresh parse instead of reusing stale cache.
 */
function uniqueOpenFilename(paymentId: string): string {
  return `${RECEIPT_PREFIX}${paymentId}-${Date.now()}.pdf`;
}

async function buildAuthHeaders(): Promise<Record<string, string>> {
  const token = await getAccessToken();
  return {
    Authorization: token ? `Bearer ${token}` : '',
    Accept: 'application/pdf',
  };
}

/**
 * Delete any UC-Receipt-*.pdf in CacheDir older than CACHE_TTL_MS.
 * Best-effort — never throws. Prevents CacheDir bloat from the
 * unique-filename-per-open strategy.
 */
async function pruneOldCachedReceipts(): Promise<void> {
  try {
    const { dirs } = ReactNativeBlobUtil.fs;
    const entries = await ReactNativeBlobUtil.fs.ls(dirs.CacheDir);
    const now = Date.now();

    await Promise.all(
      entries
        .filter(
          name => name.startsWith(RECEIPT_PREFIX) && name.endsWith('.pdf'),
        )
        .map(async name => {
          const full = `${dirs.CacheDir}/${name}`;
          try {
            const stat = await ReactNativeBlobUtil.fs.stat(full);
            const modTime = Number(stat.lastModified);
            if (Number.isFinite(modTime) && now - modTime > CACHE_TTL_MS) {
              await ReactNativeBlobUtil.fs.unlink(full).catch(() => undefined);
            }
          } catch {
            /* ignore per-file failures */
          }
        }),
    );
  } catch {
    /* ls or dir access failed — skip pruning entirely */
  }
}

/**
 * Fetch the receipt PDF to a fresh CacheDir file. Returns the local path.
 *
 * IMPLEMENTATION — WHY WE DON'T STREAM TO A FILE:
 *
 *   react-native-blob-util's streaming-to-file mode
 *   (`config({ path })...fetch(...)`) has a known race in its
 *   ProgressReportingSource on fast small downloads:
 *   `bytesDownloaded` is checked before the final read increments it,
 *   so `isDownloadComplete()` returns false and the library throws
 *   "Download interrupted." — but worse, on very fast responses the
 *   stream can also be flushed to disk before all bytes arrive,
 *   producing a truncated PDF file. That's exactly what happened here:
 *   the file starts with %PDF- (passes magic-byte check) but the
 *   trailer/xref at the end is missing, so Google Drive rejects it
 *   with "invalid format."
 *
 *   The bulletproof fix: don't stream. Fetch into memory as base64,
 *   then write the file atomically with fs.writeFile(). No streaming
 *   race → no truncation possible. Response has to be fully received
 *   before we hand it to writeFile. This is safe for PDFs of any
 *   reasonable receipt size (< a few MB).
 *
 * Always writes to a UNIQUE path (timestamped) so FileProvider gives
 * PDF viewers a new content:// URI on every open. Stale files are
 * pruned by pruneOldCachedReceipts().
 */
async function fetchReceiptToFreshCacheFile(
  payment: CustomerPaymentDetail,
): Promise<string> {
  const { dirs } = ReactNativeBlobUtil.fs;
  const filename = uniqueOpenFilename(payment.id);
  const cachePath = `${dirs.CacheDir}/${filename}`;

  const headers = await buildAuthHeaders();
  const url = receiptUrl(payment.id);

  /*
   * Fetch WITHOUT a `path` option — blob-util keeps the response in
   * memory and returns it. res.base64() gives us the entire body as
   * a base64 string once the network transfer is fully complete.
   * No progress-reporting race, no streaming truncation.
   */
  const res = await ReactNativeBlobUtil.fetch('GET', url, headers);
  const status = res.info().status;

  if (status < 200 || status >= 300) {
    // Backend returned an error (401, 404, 500 …). res.text() has the
    // JSON error body but we don't need it — just surface a clean error.
    throw new Error(`Server returned HTTP ${status}`);
  }

  /*
   * Convert response bytes to base64 and write atomically to CacheDir.
   * fs.writeFile does not truncate — it either writes the full buffer
   * or fails (in which case unlink() cleans up the partial file).
   */
  const base64 = res.base64();
  if (typeof base64 !== 'string' || base64.length === 0) {
    throw new Error('Empty response body');
  }

  try {
    await ReactNativeBlobUtil.fs.writeFile(cachePath, base64, 'base64');
  } catch (err) {
    await ReactNativeBlobUtil.fs.unlink(cachePath).catch(() => undefined);
    throw err;
  }

  return cachePath;
}

/* ─── hook ───────────────────────────────────────────────────── */

export function useReceiptActions() {
  /* ════════════════════════════════════════════════════════════
   * downloadReceipt
   * ════════════════════════════════════════════════════════════ */
  const downloadReceipt = useCallback(
    async (payment: CustomerPaymentDetail): Promise<void> => {
      if (inFlight.has(payment.id)) return;
      inFlight.add(payment.id);

      const toastId = toast.loading('Downloading receipt…');

      try {
        // Best-effort cleanup of stale receipt files — never blocks
        await pruneOldCachedReceipts();

        // Fetch to a UNIQUE cache path — see uniqueOpenFilename() rationale
        const cachePath = await fetchReceiptToFreshCacheFile(payment);

        if (Platform.OS === 'android') {
          const { dirs } = ReactNativeBlobUtil.fs;
          const stableName = permanentFilename(payment.id);
          const downloadPath = `${dirs.DownloadDir}/${stableName}`;

          /*
           * Copy fresh cache file → DownloadDir with STABLE name so
           * repeat downloads replace rather than duplicate the file
           * users see in Files / Downloads. cp() works because the
           * source is a plain file (not a MediaStore URI).
           *
           * If the copy fails (permission edge cases on some devices)
           * the primary goal — opening the PDF — still succeeds from
           * CacheDir, so we swallow the error silently.
           */
          try {
            // Delete any existing copy first so cp() doesn't fail on Android <29
            await ReactNativeBlobUtil.fs
              .unlink(downloadPath)
              .catch(() => undefined);
            await ReactNativeBlobUtil.fs.cp(cachePath, downloadPath);

            // Tell MediaScanner about the new file so it appears in
            // Files / Downloads immediately. Silent no-op on failure.
            await ReactNativeBlobUtil.fs
              .scanFile([{ path: downloadPath, mime: 'application/pdf' }])
              .catch(() => undefined);
          } catch {
            /* proceed to open — Downloads copy is nice-to-have */
          }

          toast.success('Receipt downloaded', { id: toastId });

          /*
           * Open the fresh CacheDir file. Each open uses a new
           * filename → new content:// URI from FileProvider →
           * PDF viewer does a fresh parse every time.
           */
          await FileViewer.open(cachePath, {
            displayName: `Receipt – ${payment.id}`,
            showOpenWithDialog: true,
            showAppsSuggestions: true,
          });
        } else {
          /*
           * iOS — QuickLook (used by FileViewer on iOS) does NOT have
           * the FileProvider content:// URI caching problem. But we
           * still copy to DocumentDirectory with a stable name so the
           * file appears in the Files app under On My iPhone.
           */
          const { dirs } = ReactNativeBlobUtil.fs;
          const stableName = permanentFilename(payment.id);
          const docPath = `${dirs.DocumentDir}/${stableName}`;

          try {
            await ReactNativeBlobUtil.fs.unlink(docPath).catch(() => undefined);
            await ReactNativeBlobUtil.fs.cp(cachePath, docPath);
          } catch {
            /* proceed — open from cache */
          }

          toast.success('Receipt downloaded', { id: toastId });

          const openPath = (await ReactNativeBlobUtil.fs.exists(docPath))
            ? docPath
            : cachePath;

          await FileViewer.open(openPath, {
            displayName: `Receipt – ${payment.id}`,
            showOpenWithDialog: true,
            showAppsSuggestions: true,
          });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message.toLowerCase() : '';
        const noApp =
          msg.includes('no app') ||
          msg.includes('no activity') ||
          msg.includes('unable to open');

        if (noApp) {
          toast.info('Receipt saved to Downloads', {
            id: toastId,
            description: 'No PDF viewer found. Open from your Files app.',
          });
        } else {
          toast.error('Download failed', {
            id: toastId,
            description:
              err instanceof Error ? err.message : 'Please try again.',
          });
        }
      } finally {
        inFlight.delete(payment.id);
      }
    },
    [],
  );

  /* ════════════════════════════════════════════════════════════
   * shareReceipt
   * ────────────────────────────────────────────────────────────
   * Same unique-filename pattern — WhatsApp/Gmail/Drive all cache
   * against content:// URI. Fresh path per share = fresh parse.
   * ════════════════════════════════════════════════════════════ */
  const shareReceipt = useCallback(
    async (payment: CustomerPaymentDetail): Promise<void> => {
      if (inFlight.has(payment.id)) return;
      inFlight.add(payment.id);

      const toastId = toast.loading('Preparing receipt…');

      try {
        await pruneOldCachedReceipts();

        const cachePath = await fetchReceiptToFreshCacheFile(payment);
        const shareName = permanentFilename(payment.id); // user-friendly name in share sheet

        toast.dismiss(toastId);

        await Share.open({
          url: `file://${cachePath}`,
          type: 'application/pdf',
          filename: shareName,
          title: 'Share Payment Receipt',
          subject: `Urban Cruise Receipt – ${payment.id}`,
          failOnCancel: false,
        });
      } catch (err: unknown) {
        const isUserCancel =
          err instanceof Error &&
          (err.message.includes('User did not share') ||
            err.message.includes('dismissed') ||
            err.message.includes('cancel'));

        if (!isUserCancel) {
          toast.error('Could not share receipt', {
            description:
              err instanceof Error ? err.message : 'Please try again.',
          });
        }
      } finally {
        inFlight.delete(payment.id);
      }
    },
    [],
  );

  return { downloadReceipt, shareReceipt };
}
