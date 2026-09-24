/**
 * useReceiptActions
 * =================
 * Handles Download Receipt and Share Receipt for a paid payment.
 *
 * HOW IT WORKS
 * ─────────────
 * Both actions call the backend endpoint:
 *   GET /api/v1/customer/payments/:id/receipt
 * with a Bearer token. The backend generates the PDF server-side and
 * streams bytes back. react-native-blob-util writes them straight to
 * the device filesystem — no base64 bridge, no memory spike.
 *
 * DOWNLOAD
 *   Android → Android DownloadManager saves to Downloads folder +
 *             shows a system notification ("Download complete")
 *   iOS     → saved to DocumentDirectory (visible in Files.app)
 *
 * SHARE
 *   Downloads to CacheDir (temp), then opens the native share sheet
 *   via react-native-share. Every app that handles PDFs appears:
 *   WhatsApp, Gmail, Telegram, Google Drive, Mail, AirDrop, etc.
 *
 * PACKAGE NEEDED (add once):
 *   npm install react-native-share
 *   cd ios && pod install
 *   (react-native-blob-util is already in package.json)
 */

import { useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import Share from 'react-native-share';

import { ENV } from '@config/env';
import { getAccessToken } from '@services/storage/secureStorage';
import { toast } from '@services/toast';
import type { CustomerPaymentDetail } from '../types';

/* ─── internal helpers ───────────────────────────────────────── */

function receiptUrl(paymentId: string): string {
  return `${ENV.apiUrl}/customer/payments/${encodeURIComponent(
    paymentId,
  )}/receipt`;
}

function receiptFilename(paymentId: string): string {
  return `UC-Receipt-${paymentId}.pdf`;
}

async function buildAuthHeaders(): Promise<Record<string, string>> {
  const token = await getAccessToken();
  return {
    Authorization: token ? `Bearer ${token}` : '',
    Accept: 'application/pdf',
  };
}

/* ─── hook ───────────────────────────────────────────────────── */

export function useReceiptActions() {
  // Prevent double-tap from firing two simultaneous downloads
  const busy = useRef(false);

  /* ══════════════════════════════════════════════════════════════
   * downloadReceipt
   * ──────────────────────────────────────────────────────────────
   * Saves PDF to the device's Downloads folder (Android) or Files
   * app (iOS). Shows a toast for loading → success / error.
   * ══════════════════════════════════════════════════════════════ */
  const downloadReceipt = useCallback(
    async (payment: CustomerPaymentDetail): Promise<void> => {
      if (busy.current) return;
      busy.current = true;

      const toastId = toast.loading('Downloading receipt…');

      try {
        const headers = await buildAuthHeaders();
        const url = receiptUrl(payment.id);
        const filename = receiptFilename(payment.id);
        const { dirs } = ReactNativeBlobUtil.fs;

        if (Platform.OS === 'android') {
          /*
           * Android DownloadManager
           * ─────────────────────────────────────────────────────
           * useDownloadManager: true  → uses the OS DownloadManager API
           * notification: true        → system "Download complete" notification
           *                             in the notification shade; user taps to open
           * mediaScannable: true      → PDF shows up in Files / Downloads app
           * path                      → exact save location in Downloads folder
           */
          await ReactNativeBlobUtil.config({
            addAndroidDownloads: {
              useDownloadManager: true,
              notification: true,
              title: 'Urban Cruise Receipt',
              description: `Receipt for payment ${payment.id}`,
              mime: 'application/pdf',
              mediaScannable: true,
              path: `${dirs.DownloadDir}/${filename}`,
            },
          }).fetch('GET', url, headers);

          toast.success('Receipt saved to Downloads', { id: toastId });
        } else {
          /*
           * iOS
           * ─────────────────────────────────────────────────────
           * DocumentDirectory is the app's Files.app-visible folder.
           * User can find it under Files → On My iPhone → Urban Cruise.
           */
          await ReactNativeBlobUtil.config({
            path: `${dirs.DocumentDir}/${filename}`,
            overwrite: true,
          }).fetch('GET', url, headers);

          toast.success('Receipt saved to Files', { id: toastId });
        }
      } catch (err) {
        toast.error('Download failed', {
          id: toastId,
          description: err instanceof Error ? err.message : 'Please try again.',
        });
      } finally {
        busy.current = false;
      }
    },
    [],
  );

  /* ══════════════════════════════════════════════════════════════
   * shareReceipt
   * ──────────────────────────────────────────────────────────────
   * Downloads PDF to CacheDir, then opens the native share sheet.
   * The share sheet lists every app that can receive a PDF:
   * WhatsApp, Gmail, Telegram, Google Drive, Mail, AirDrop, etc.
   * The user picks one — the PDF is attached and opened in that app.
   * ══════════════════════════════════════════════════════════════ */
  const shareReceipt = useCallback(
    async (payment: CustomerPaymentDetail): Promise<void> => {
      if (busy.current) return;
      busy.current = true;

      const toastId = toast.loading('Preparing receipt…');

      try {
        const headers = await buildAuthHeaders();
        const url = receiptUrl(payment.id);
        const filename = receiptFilename(payment.id);
        const { dirs } = ReactNativeBlobUtil.fs;

        /*
         * Step 1 — download to a temp cache path.
         * CacheDir is managed by the OS — it cleans it up automatically
         * on low storage. Perfect for share-only files we don't need to
         * keep permanently.
         */
        const res = await ReactNativeBlobUtil.config({
          path: `${dirs.CacheDir}/${filename}`,
          overwrite: true,
        }).fetch('GET', url, headers);

        toast.dismiss(toastId);

        /*
         * Step 2 — open native share sheet.
         * react-native-share requires a file:// URI (not base64).
         * type: 'application/pdf' is mandatory so Android shows only
         * PDF-capable apps; without it Android may show no apps at all.
         * failOnCancel: false means closing the sheet is not an error.
         */
        const fileUri = `file://${res.path()}`;

        await Share.open({
          url: fileUri,
          type: 'application/pdf',
          filename,
          title: 'Share Payment Receipt',
          subject: `Urban Cruise Receipt – ${payment.id}`,
          failOnCancel: false,
        });
      } catch (err: unknown) {
        /*
         * react-native-share throws with a user-cancel message when the
         * share sheet is dismissed without sharing — that is normal user
         * behaviour, not an error we should surface as a toast.
         */
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
        busy.current = false;
      }
    },
    [],
  );

  return { downloadReceipt, shareReceipt };
}
