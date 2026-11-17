/**
 * ------------------------------------------------------------------
 * TourDetailFooter — "Need Help?" and "Enquire / Book Now"
 * ------------------------------------------------------------------
 * Pinned to the bottom of the detail screen, over the content.
 *
 * NEED HELP IS HIDDEN WITHOUT A NUMBER
 *   The support phone comes from app config (`s.app.appConfig?.support`,
 *   the same source AboutUrbanCruiseScreen reads). Config can be the
 *   bundled default on a cold start that never reached the server, so
 *   the number may be absent — and a "Talk to our Travel Expert"
 *   button that silently does nothing is worse than no button. With
 *   no number the CTA takes the full width instead.
 *
 * The bar pads itself with the bottom safe-area inset, so the CTA
 * clears the home indicator on a gesture-nav device.
 * ------------------------------------------------------------------ */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowRight, Headphones } from 'lucide-react-native';

import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';

type Props = {
  /** Null hides the Need Help block entirely — see the note above. */
  onNeedHelp: (() => void) | null;
  onEnquire: () => void;
  bottomInset: number;
};

export const TourDetailFooter: React.FC<Props> = ({
  onNeedHelp,
  onEnquire,
  bottomInset,
}) => (
  <View style={[styles.bar, { paddingBottom: bottomInset + Spacing.md }]}>
    {onNeedHelp ? (
      <Pressable
        onPress={onNeedHelp}
        accessibilityRole="button"
        accessibilityLabel="Need help? Talk to our travel expert"
        style={({ pressed }) => [styles.help, pressed && styles.pressed]}
      >
        <Headphones size={26} color={Colors.primaryDark} strokeWidth={2} />

        <View style={styles.helpCopy}>
          <Text style={styles.helpTitle} numberOfLines={1}>
            Need Help?
          </Text>
          <Text style={styles.helpBody} numberOfLines={1}>
            Talk to our Travel Expert
          </Text>
        </View>
      </Pressable>
    ) : null}

    <Pressable
      onPress={onEnquire}
      accessibilityRole="button"
      accessibilityLabel="Enquire or book this tour now"
      style={({ pressed }) => [
        styles.cta,
        // With no Need Help block the CTA owns the whole bar.
        onNeedHelp ? styles.ctaShared : styles.ctaFull,
        pressed && styles.pressed,
      ]}
    >
      <Text
        style={styles.ctaLabel}
        numberOfLines={1}
        maxFontSizeMultiplier={1.3}
      >
        Enquire / Book Now
      </Text>
      <ArrowRight size={21} color={Colors.textOnPrimary} strokeWidth={2.4} />
    </Pressable>
  </View>
);

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    backgroundColor: Colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  help: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 54,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primaryWash,
  },
  helpCopy: {
    flex: 1,
  },
  helpTitle: {
    ...Typography.bodySmall,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  helpBody: {
    ...Typography.caption,
    marginTop: Spacing.xxs,
    color: Colors.textSecondary,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    minHeight: 54,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primaryDark,
    ...Shadows.sm,
  },
  ctaShared: {
    flex: 1.25,
  },
  ctaFull: {
    flex: 1,
  },
  pressed: {
    opacity: 0.88,
  },
  ctaLabel: {
    ...Typography.button,
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textOnPrimary,
  },
});
