/**
 * ------------------------------------------------------------------
 * SpiritualToursHero — the green header
 * ------------------------------------------------------------------
 *   ┌───────────────────────────────────────────────┐
 *   │ ‹        [ Urban Cruise ]          ☀  ╱▲╲ ╱▲╲ │
 *   │ Spiritual Tours                   ▂▃▅███████▅ │
 *   │ ───                                           │
 *   │ Embark on sacred journeys to …                │
 *   └───────────────────────────────────────────────┘
 *
 * THE SKYLINE IS DRAWN, NOT AN ASSET
 *   The repo ships no temple-skyline artwork, and `service-temple.png`
 *   is a full-colour illustration — flattening it to a silhouette
 *   produces the green blob the old screen's notes warned about. So
 *   the sun, ridges, shrines and birds are paths here: they scale to
 *   any screen, cost nothing to download, and tint with the hero.
 *
 *   If design later supplies the real artwork, swap the <Svg> block
 *   for an <Image> — nothing else on the screen depends on it.
 *
 * It sits behind the text, is pinned to the right, and is hidden from
 * screen readers in full. The title is the heading.
 * ------------------------------------------------------------------ */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';
import { ChevronLeft } from 'lucide-react-native';

import { BrandLockup } from '@shared/components';
import { Colors, Radius, Spacing, Typography } from '@theme';

type Props = {
  onBack: () => void;
  /** Safe-area top inset — the hero paints its own status-bar area. */
  topInset: number;
};

/* Deeper than Colors.primaryDark so white text clears 7:1 on it, and
 * the two tints the silhouette is built from. Local: nothing else in
 * the app uses greens this dark. */
export const HERO_BG = '#1B5E20';
const RIDGE_FAR = '#2E7D32';
const RIDGE_NEAR = '#14491A';
const SUN = '#A5D96A';
const SUBTITLE = 'rgba(255, 255, 255, 0.90)';
/** The design's gold rule under the title. */
const RULE = '#F9A825';

/** One shrine: stepped base, body, dome, finial, flag. */
const Shrine: React.FC<{ x: number; scale: number; fill: string }> = ({
  x,
  scale,
  fill,
}) => (
  <G transform={`translate(${x}, 0) scale(${scale})`}>
    <Path
      d="M-16 100 L-16 52 L-11 52 L-11 40 L11 40 L11 52 L16 52 L16 100 Z"
      fill={fill}
    />
    {/* Dome */}
    <Path d="M-11 40 C-11 26 -5 18 0 12 C5 18 11 26 11 40 Z" fill={fill} />
    {/* Finial and flag */}
    <Path d="M-1.4 12 L-1.4 0 L1.4 0 L1.4 12 Z" fill={fill} />
    <Path d="M1.4 0.5 L13 4.5 L1.4 8.5 Z" fill={fill} />
  </G>
);

export const SpiritualToursHero: React.FC<Props> = ({ onBack, topInset }) => (
  <View style={[styles.hero, { paddingTop: topInset + Spacing.sm }]}>
    {/* ── Silhouette ───────────────────────────────────────────── */}
    <View
      style={styles.art}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 320 200"
        preserveAspectRatio="xMaxYMax slice"
      >
        {/* Rising sun behind everything */}
        <Circle cx={212} cy={74} r={46} fill={SUN} opacity={0.55} />

        {/* Birds */}
        <G
          stroke={RIDGE_FAR}
          strokeWidth={2.2}
          strokeLinecap="round"
          fill="none"
        >
          <Path d="M66 54 q7 -6 14 0" />
          <Path d="M92 36 q6 -5 12 0" />
          <Path d="M122 62 q5 -4 10 0" />
        </G>

        {/* Far ridge */}
        <Path
          d="M0 200 L0 136 L44 104 L86 138 L126 112 L170 150 L220 118 L268 146 L320 116 L320 200 Z"
          fill={RIDGE_FAR}
          opacity={0.75}
        />

        {/* Shrines sit on the near ridge's crest */}
        <G transform="translate(0, 72)">
          <Shrine x={150} scale={0.52} fill={RIDGE_NEAR} />
          <Shrine x={204} scale={0.86} fill={RIDGE_NEAR} />
          <Shrine x={264} scale={0.62} fill={RIDGE_NEAR} />
          <Shrine x={308} scale={0.44} fill={RIDGE_NEAR} />
        </G>

        {/* Near ridge, over the shrines' feet */}
        <Path
          d="M0 200 L0 176 L52 158 L104 174 L156 160 L212 172 L266 156 L320 170 L320 200 Z"
          fill={RIDGE_NEAR}
        />
      </Svg>
    </View>

    {/* ── Top row ──────────────────────────────────────────────── */}
    <View style={styles.topRow}>
      <Pressable
        onPress={onBack}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
      >
        <ChevronLeft size={26} color={Colors.surface} strokeWidth={2.4} />
      </Pressable>

      {/* White plate: the wordmark's "Urban" is brand green and would
          all but vanish against the hero. */}
      <View style={styles.brandPlate}>
        <BrandLockup width={150} variant="wordmark" />
      </View>

      {/* Balances the back button so the plate sits centred. */}
      <View style={styles.backBtn} />
    </View>

    {/* ── Copy ─────────────────────────────────────────────────── */}
    <Text
      style={styles.title}
      accessibilityRole="header"
      maxFontSizeMultiplier={1.5}
    >
      Spiritual Tours
    </Text>

    <View
      style={styles.rule}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />

    <Text style={styles.subtitle} maxFontSizeMultiplier={1.6}>
      Embark on sacred journeys to India&rsquo;s most revered destinations.
    </Text>
  </View>
);

const styles = StyleSheet.create({
  hero: {
    backgroundColor: HERO_BG,
    paddingHorizontal: Spacing.xl,
    // The white sheet lifts into this space.
    paddingBottom: Spacing.huge,
    overflow: 'hidden',
  },
  art: {
    // Insets written out rather than spreading StyleSheet.absoluteFill:
    // `left` is overridden below anyway, so the spread only hid which
    // edges this actually pins. (RN 0.86 also dropped
    // `absoluteFillObject` from StyleSheet's types — `absoluteFill` is
    // what survives, and it is a registered style, not a plain object.)
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    // Pinned right: the copy occupies the left, as in the design.
    left: '28%',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
  brandPlate: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
  },
  title: {
    ...Typography.h1,
    marginTop: Spacing.lg,
    fontSize: 38,
    lineHeight: 44,
    fontWeight: '800',
    color: Colors.surface,
  },
  rule: {
    width: 104,
    height: 5,
    marginTop: Spacing.md,
    borderRadius: Radius.pill,
    backgroundColor: RULE,
  },
  subtitle: {
    ...Typography.body,
    marginTop: Spacing.lg,
    lineHeight: 22,
    // Keeps the copy clear of the silhouette on a narrow phone.
    paddingRight: Spacing.sectionLarge,
    color: SUBTITLE,
  },
});
