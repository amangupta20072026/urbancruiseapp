/**
 * ------------------------------------------------------------------
 * NeedHelpSheet — "Talk to your travel executive" bottom sheet
 * ------------------------------------------------------------------
 * Opens from the "Contact Support" CTA on any Need Help card
 * (currently the ongoing booking detail screen; future callers may
 * include the completed / upcoming detail variants). Presents the
 * customer's assigned travel executive front-and-centre with three
 * direct-contact actions (WhatsApp / Call / Email).
 *
 * LAYOUT (top → bottom, inside the sheet):
 *
 *   ┌───────────────────────────────────  X (close) ┐
 *
 *              Need Help?
 *              Talk directly with the executive
 *              who is handling your booking.
 *
 *                    (avatar circle)
 *
 *                    Rahul Sharma
 *                    Travel Consultant
 *              📞 +91 98765 43210
 *
 *              ● Usually replies within 5 minutes    (green pill)
 *
 *              ────────────────────────────────
 *
 *   [ 💬 WhatsApp ]                  [ 📞 Call Now ]
 *   [           ✉ Email Executive           ]
 *
 *              Close (text link)
 *
 * ------------------------------------------------------------------
 * PATTERNS FOLLOWED (from NeedChangesSheet)
 * ------------------------------------------------------------------
 *   - `forwardRef<BottomSheetModal, Props>` + `useImperativeHandle`
 *     so the parent presents / dismisses imperatively via a ref.
 *   - `BottomSheetBackdrop` w/ `pressBehavior="close"` + opacity
 *     0.55 (matches the other sheets in the app for consistency).
 *   - `handleIndicatorStyle` + `backgroundStyle` = the rounded top
 *     bar all sheets share.
 *   - Fixed snap point rather than dynamic sizing — dynamic sizing
 *     over-shrinks on the small Android surfaces the design was
 *     approved against and pushes the primary buttons under the
 *     safe-area inset on iPhone. Content-height-wise this sheet
 *     lands well under the 82% ceiling.
 *
 * ------------------------------------------------------------------
 * ACTION SEMANTICS
 * ------------------------------------------------------------------
 *   WhatsApp / Call / Email fire through `@services/contact`,
 *   exactly like the QuotationDetail advisor card — same
 *   error-handling contract (the service surfaces its own toast on
 *   failure), same pre-filled subject / body copy convention.
 *
 *   The Email button is disabled (soft) if the executive has no
 *   email on file — same rule the advisor card applies. Call +
 *   WhatsApp assume `phoneE164` is present because the type
 *   requires it; if a future refactor makes phone optional, add a
 *   parallel disabled state.
 * ------------------------------------------------------------------
 */

import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { Mail, MessageCircle, Phone, X } from 'lucide-react-native';

import { Colors, Radius, Spacing, Typography } from '@theme';
import { makePhoneCall, openWhatsApp, sendEmail } from '@services/contact';

import type { TravelExecutive } from '../types';

/* ================================================================
 * Props
 * ================================================================ */

type Props = {
  executive: TravelExecutive;
  /**
   * Short reference the sheet drops into the pre-filled WhatsApp
   * message and the email subject/body — e.g. a booking number
   * like "BK-2026-00122" or a quotation number. Optional; if
   * omitted the messages stay generic. Kept as a single string
   * (not a discriminated union) so the sheet doesn't need to
   * know the caller's domain vocabulary.
   */
  contextRef?: string;
};

/* ================================================================
 * Constants
 * ================================================================ */

const SNAP_POINTS = ['82%'];

/* ================================================================
 * Component
 * ================================================================ */

export const NeedHelpSheet = forwardRef<BottomSheetModal, Props>(
  ({ executive, contextRef }, ref) => {
    /* Two refs: `internalRef` drives the sheet itself; the outer
       ref exposed to the parent is bridged via useImperativeHandle
       so callers can call `.present()` / `.dismiss()` idiomatically.
       Matches the pattern in NeedChangesSheet. */
    const internalRef = useRef<BottomSheetModal>(null);
    useImperativeHandle(ref, () => internalRef.current as BottomSheetModal, []);

    /* -------- Handlers -------- */

    const dismiss = useCallback(() => {
      internalRef.current?.dismiss();
    }, []);

    /**
     * Pre-filled greeting reused across WhatsApp + email. If a
     * caller passes a `contextRef` we include it so ops can tie
     * the message back to a specific booking / quotation without
     * asking the customer.
     */
    const greetingSuffix = contextRef ? ` about ${contextRef}` : '';

    const handleWhatsApp = useCallback(() => {
      openWhatsApp(
        executive.phoneE164,
        `Hi ${executive.name}, I have a question${greetingSuffix}.`,
      ).catch(() => {
        // The contact service handles the failure path.
      });
    }, [executive.name, executive.phoneE164, greetingSuffix]);

    const handleCall = useCallback(() => {
      makePhoneCall(executive.phoneE164).catch(() => {
        // The contact service handles the failure path.
      });
    }, [executive.phoneE164]);

    const hasEmail = Boolean(executive.email);

    const handleEmail = useCallback(() => {
      if (!executive.email) return;
      sendEmail({
        to: executive.email,
        subject: contextRef
          ? `${contextRef} - Urban Cruise`
          : 'Urban Cruise support request',
        body: `Hi ${executive.name},\n\nI have a question${greetingSuffix}.\n\nThanks.`,
      }).catch(() => {
        // The contact service handles the failure path.
      });
    }, [executive.email, executive.name, contextRef, greetingSuffix]);

    /* -------- Backdrop -------- */

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          opacity={0.55}
          pressBehavior="close"
        />
      ),
      [],
    );

    /* Formatted phone. The sheet only needs to render it, not parse
       it — a naive space-inserter is enough for "+91XXXXXXXXXX" and
       leaves other formats alone. */
    const displayPhone = useMemo(
      () => formatPhoneForDisplay(executive.phoneE164),
      [executive.phoneE164],
    );

    /* -------- Render -------- */

    return (
      <BottomSheetModal
        ref={internalRef}
        snapPoints={SNAP_POINTS}
        index={0}
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={styles.handle}
        backgroundStyle={styles.sheetBg}
        enablePanDownToClose
        enableDynamicSizing={false}
        enableOverDrag={false}
      >
        {/* Pinned close row — the visual title lives in the scroll
            body (centered), so this row just carries the X. */}
        <View style={styles.pinnedHeader}>
          <Pressable
            onPress={dismiss}
            style={({ pressed }) => [
              styles.closeBtn,
              pressed && styles.pressed,
            ]}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <X size={22} color={Colors.textPrimary} strokeWidth={2.25} />
          </Pressable>
        </View>

        <BottomSheetScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Title + subtitle ── */}
          <Text style={styles.title}>Need Help?</Text>
          <Text style={styles.subtitle}>
            Talk directly with the executive who is handling your booking.
          </Text>

          {/* ── Executive identity block ── */}
          <View style={styles.identityBlock}>
            <View style={styles.avatarWrap}>
              <Image
                source={
                  executive.avatar ??
                  require('@assets/images/default-avatar.png')
                }
                style={styles.avatar}
                resizeMode="cover"
              />
            </View>
            <Text style={styles.name}>{executive.name}</Text>
            <Text style={styles.role}>{executive.role}</Text>
            <View style={styles.phoneRow}>
              <Phone
                size={16}
                color={Colors.textSecondary}
                strokeWidth={2.25}
              />
              <Text style={styles.phoneText}>{displayPhone}</Text>
            </View>

            <View style={styles.slaPill}>
              <View style={styles.slaDot} />
              <Text style={styles.slaText}>{executive.slaLine}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* ── Direct contact actions ── */}
          <View style={styles.actionRow}>
            <Pressable
              onPress={handleWhatsApp}
              style={({ pressed }) => [
                styles.actionBtn,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Contact ${executive.name} on WhatsApp`}
            >
              <MessageCircle
                size={18}
                color={Colors.primary}
                strokeWidth={2.25}
              />
              <Text style={styles.actionBtnText}>WhatsApp</Text>
            </Pressable>

            <Pressable
              onPress={handleCall}
              style={({ pressed }) => [
                styles.actionBtn,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Call ${executive.name}`}
            >
              <Phone size={18} color={Colors.primary} strokeWidth={2.25} />
              <Text style={styles.actionBtnText}>Call Now</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={handleEmail}
            disabled={!hasEmail}
            style={({ pressed }) => [
              styles.actionBtnWide,
              pressed && hasEmail && styles.pressed,
              !hasEmail && styles.disabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Email ${executive.name}`}
            accessibilityState={{ disabled: !hasEmail }}
          >
            <Mail size={18} color={Colors.primary} strokeWidth={2.25} />
            <Text style={styles.actionBtnText}>Email Executive</Text>
          </Pressable>

          {/* ── Close (text button) ── */}
          <Pressable
            onPress={dismiss}
            style={({ pressed }) => [
              styles.closeTextBtn,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  },
);

NeedHelpSheet.displayName = 'NeedHelpSheet';

/* ================================================================
 * Helpers
 * ================================================================ */

/**
 * Cheap formatter for the "+91XXXXXXXXXX" E.164 numbers this app
 * uses. Groups "+CC XXXXX XXXXX"; leaves anything unexpected
 * untouched so international numbers still render legibly.
 */
function formatPhoneForDisplay(e164: string): string {
  if (!e164.startsWith('+') || e164.length < 10) return e164;
  // Indian mobile — most common case.
  if (e164.startsWith('+91') && e164.length === 13) {
    return `${e164.slice(0, 3)} ${e164.slice(3, 8)} ${e164.slice(8)}`;
  }
  return e164;
}

/* ================================================================
 * Styles
 * ================================================================ */

const styles = StyleSheet.create({
  handle: {
    backgroundColor: Colors.border,
    width: 44,
  },
  sheetBg: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },

  /* Pinned close row (X only) */
  pinnedHeader: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
    alignItems: 'flex-end',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.circle,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Scroll */
  scroll: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxxxl,
    alignItems: 'center',
  },

  /* Title */
  title: {
    ...Typography.h2,
    color: Colors.textPrimary,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: Spacing.md,
  },

  /* Identity block */
  identityBlock: {
    alignItems: 'center',
    marginTop: Spacing.lg,
    gap: 4,
    width: '100%',
  },
  avatarWrap: {
    width: 96,
    height: 96,
    borderRadius: Radius.circle,
    backgroundColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  name: {
    ...Typography.h3,
    color: Colors.textPrimary,
    fontWeight: '800',
    textAlign: 'center',
  },
  role: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  phoneText: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    fontWeight: '800',
    fontSize: 16,
    includeFontPadding: false,
  },
  slaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryTint,
  },
  slaDot: {
    width: 8,
    height: 8,
    borderRadius: Radius.circle,
    backgroundColor: Colors.primary,
  },
  slaText: {
    ...Typography.bodySmall,
    color: Colors.primary,
    fontWeight: '700',
    includeFontPadding: false,
  },

  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    alignSelf: 'stretch',
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },

  /* Action buttons */
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignSelf: 'stretch',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.surface,
  },
  actionBtnWide: {
    marginTop: Spacing.sm,
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.surface,
  },
  actionBtnText: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: '800',
    includeFontPadding: false,
  },

  /* Close (text link) */
  closeTextBtn: {
    marginTop: Spacing.lg,
    alignSelf: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xl,
  },
  closeText: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '800',
  },

  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.4,
  },
});
