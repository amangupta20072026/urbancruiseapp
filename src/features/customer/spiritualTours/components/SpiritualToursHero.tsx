/**
 * ------------------------------------------------------------------
 * SpiritualToursHero — the white header with the temple
 * ------------------------------------------------------------------
 *   ┌───────────────────────────────────────────────┐
 *   │ ‹  [ Urban Cruise ]              ╱▲╲          │
 *   │                                ╱▲╲███╱▲╲      │
 *   │ Spiritual                      ██ TEMPLE ██   │
 *   │ Tours                          ███████████    │
 *   │ ───                            ▀▀▀▀▀▀▀▀▀▀▀    │
 *   │ Explore India’s divine …                      │
 *   └───────────────────────────────────────────────┘
 *
 * THE TEMPLE IS THE SHIPPED ILLUSTRATION
 *   `service-temple.png` (512×512, transparent background) — the same
 *   file the home screen's service switcher uses. It sits on the
 *   right, behind the copy, from the status-bar line down. Its size
 *   follows the screen width (about half of it, capped), so it keeps
 *   the design's proportions on small and large phones.
 *
 * THE TITLE NEVER RUNS UNDER THE TEMPLE
 *   The title column is as wide as the screen minus the temple, so
 *   "Spiritual Tours" wraps before it reaches the artwork. The PNG has
 *   a few points of transparent margin, which is why a small overlap
 *   of the column into the temple's box is harmless.
 *
 * THE SUBTITLE IS ALWAYS TWO LINES
 *   It sits below the temple, so it gets its own, wider box
 *   (SUBTITLE_MAX) and fits in two lines at the normal text size. With
 *   a very large system text size it shrinks (down to
 *   SUBTITLE_MIN_SCALE) rather than taking a third line.
 *
 * WHITE, SO THE STATUS BAR IS DARK
 *   HERO_BG is exported so the screen can paint the status bar and its
 *   own background with the same white.
 *
 * The temple is hidden from screen readers. The title is the heading.
 * ------------------------------------------------------------------ */
import React from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { ChevronLeft } from 'lucide-react-native';

import { BrandLockup } from '@shared/components';
import { Colors, Radius, Spacing, Typography } from '@theme';

type Props = {
  onBack: () => void;
  /** Safe-area top inset — the hero paints its own status-bar area. */
  topInset: number;
};

/** The hero, the status bar and the page behind it are all white. */
export const HERO_BG = Colors.surface;

/** The design's deep green title — darker than Colors.primaryDark so
 *  the large title reads as the heading, not as a button. */
const TITLE = '#1B5E20';
/** Dark grey subtitle from the design (≈ 10:1 on white). */
const SUBTITLE = '#374151';

const TEMPLE = require('@assets/images/service-temple.png');

/** Temple width as a share of the screen width, and its upper limit
 *  so tablets and foldables don't get a giant temple. */
const TEMPLE_SHARE = 0.5;
const TEMPLE_MAX = 260;

/** Widest the subtitle box gets: two lines at 14 pt. */
const SUBTITLE_MAX = 260;
/** Smallest the subtitle may shrink to keep two lines (70%). */
const SUBTITLE_MIN_SCALE = 0.7;

export const SpiritualToursHero: React.FC<Props> = ({ onBack, topInset }) => {
  const { width: screenWidth } = useWindowDimensions();

  const templeSize = Math.min(
    Math.round(screenWidth * TEMPLE_SHARE),
    TEMPLE_MAX,
  );
  // Everything left of the temple, minus the hero's left padding.
  const copyWidth = screenWidth - templeSize - Spacing.xl + Spacing.sm;
  // Below the temple, so it may run wider than the title column.
  const subtitleWidth = Math.min(screenWidth - Spacing.xl * 2, SUBTITLE_MAX);

  return (
    <View style={[styles.hero, { paddingTop: topInset + Spacing.sm }]}>
      {/* ── Temple ─────────────────────────────────────────────── */}
      <Image
        source={TEMPLE}
        resizeMode="contain"
        style={[
          styles.temple,
          { top: topInset, width: templeSize, height: templeSize },
        ]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />

      {/* ── Top row: back + logo, left aligned ─────────────────── */}
      <View style={styles.topRow}>
        <Pressable
          onPress={onBack}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
        >
          <ChevronLeft size={28} color={Colors.primaryDark} strokeWidth={2.4} />
        </Pressable>

        {/* On white the wordmark needs no plate. */}
        <BrandLockup width={116} variant="wordmark" />
      </View>

      {/* ── Title ──────────────────────────────────────────────── */}
      <View style={{ width: copyWidth }}>
        <Text
          style={styles.title}
          accessibilityRole="header"
          maxFontSizeMultiplier={1.3}
        >
          Spiritual Tours
        </Text>

        <View
          style={styles.rule}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      </View>

      {/* ── Subtitle: two lines, shrinks rather than wrapping to 3 ── */}
      <Text
        style={[styles.subtitle, { width: subtitleWidth }]}
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={SUBTITLE_MIN_SCALE}
        maxFontSizeMultiplier={1.5}
      >
        Explore India’s divine heritage and spiritual destinations with us!
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  hero: {
    backgroundColor: HERO_BG,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  temple: {
    position: 'absolute',
    right: Spacing.xs,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  title: {
    ...Typography.h1,
    marginTop: Spacing.xl,
    fontSize: 40,
    lineHeight: 44,
    fontWeight: '800',
    color: TITLE,
  },
  rule: {
    width: 48,
    height: 4,
    marginTop: Spacing.md,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primaryDark,
  },
  subtitle: {
    ...Typography.body,
    marginTop: Spacing.md,
    fontSize: 14,
    lineHeight: 20,
    color: SUBTITLE,
  },
});
