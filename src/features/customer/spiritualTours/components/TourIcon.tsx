/**
 * ------------------------------------------------------------------
 * TourIcon — the line glyph beside a tour title
 * ------------------------------------------------------------------
 * Five marks: temple, trishul, Om, Ganesh, shivling.
 *
 * WHY THESE ARE HAND-DRAWN
 *   lucide-react-native (the app's icon set) has none of them, and
 *   the nearest stand-ins — Landmark for a temple, Church for a
 *   shrine — carry the wrong cultural reading entirely. So each is a
 *   path set here, on the same 24-unit grid and 1.7 stroke weight
 *   Lucide uses, so they sit correctly beside Lucide icons elsewhere
 *   on the screen.
 *
 * WHY OM IS A TEXT GLYPH, NOT A PATH
 *   ॐ is a real Devanagari character (U+0950) with a defined form.
 *   Approximating it in bezier curves produces something that is
 *   recognisably "not quite right" to anyone who reads the script —
 *   the one failure mode worth avoiding on this screen above all
 *   others. Both platforms ship Devanagari in their system font, so
 *   the character renders correctly and scales cleanly. It is sized
 *   against the same box as the drawn marks so the row stays even.
 *
 * All marks inherit `color` and never set their own, so the caller
 * controls the tint.
 * ------------------------------------------------------------------ */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { Colors } from '@theme';
import type { SpiritualTourIcon } from '../types';

type Props = {
  name: SpiritualTourIcon;
  size?: number;
  color?: string;
};

const STROKE = 1.7;

/** Shared stroke setup — matches Lucide's defaults. */
const strokeProps = (color: string) => ({
  stroke: color,
  strokeWidth: STROKE,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  fill: 'none' as const,
});

/* ================================================================
 * The marks
 * ================================================================ */

/** A shikhara-topped shrine: finial, roof, pillared body, arched door. */
const TempleMark: React.FC<{ color: string }> = ({ color }) => {
  const s = strokeProps(color);
  return (
    <>
      <Path d="M12 1.8 V4.2" {...s} />
      <Path d="M4 10 L12 4.2 L20 10" {...s} />
      <Path d="M6.2 10 V21" {...s} />
      <Path d="M17.8 10 V21" {...s} />
      <Path d="M3 21 H21" {...s} />
      <Path d="M9.8 21 V15.4 a2.2 2.2 0 0 1 4.4 0 V21" {...s} />
    </>
  );
};

/** A trishul: three pointed tines on a curved bar, over a shaft. */
const TrishulMark: React.FC<{ color: string }> = ({ color }) => {
  const s = strokeProps(color);
  return (
    <>
      {/* Tines */}
      <Path d="M7 12.2 V6.4" {...s} />
      <Path d="M17 12.2 V6.4" {...s} />
      <Path d="M12 12.2 V4" {...s} />
      {/* Pointed tips */}
      <Path d="M5.8 6.8 L7 4.4 L8.2 6.8" {...s} />
      <Path d="M15.8 6.8 L17 4.4 L18.2 6.8" {...s} />
      <Path d="M10.6 4.4 L12 1.9 L13.4 4.4" {...s} />
      {/* Curved bar and shaft */}
      <Path d="M7 12.2 Q12 15 17 12.2" {...s} />
      <Path d="M12 13.8 V22" {...s} />
    </>
  );
};

/**
 * An elephant face under a crown mark, inside a pointed arch — the
 * design's Ganesh tile reduced to the few strokes that survive 28 dp.
 */
const GaneshMark: React.FC<{ color: string }> = ({ color }) => {
  const s = strokeProps(color);
  return (
    <>
      {/* Arch frame */}
      <Path
        d="M4 21.5 V10 C4 5.9 7.6 2.5 12 2.5 C16.4 2.5 20 5.9 20 10 V21.5"
        {...s}
      />
      {/* Crown mark */}
      <Path d="M10.7 6.6 L12 4.4 L13.3 6.6" {...s} />
      {/* Head dome */}
      <Path d="M8.4 12.4 C8.4 9.6 10 8 12 8 C14 8 15.6 9.6 15.6 12.4" {...s} />
      {/* Ears */}
      <Path
        d="M8.4 10 C6.1 10 5.1 11.7 5.6 13.6 C5.9 14.8 7 15.3 8.4 14.9"
        {...s}
      />
      <Path
        d="M15.6 10 C17.9 10 18.9 11.7 18.4 13.6 C18.1 14.8 17 15.3 15.6 14.9"
        {...s}
      />
      {/* Trunk */}
      <Path
        d="M12 12 C12 15 10.6 16.2 10.6 18 C10.6 19.4 12.1 19.9 12.9 18.9"
        {...s}
      />
      {/* Eyes */}
      <Circle cx={10.1} cy={11.6} r={0.85} fill={color} />
      <Circle cx={13.9} cy={11.6} r={0.85} fill={color} />
    </>
  );
};

/** A lingam on its base, inside the same pointed arch. */
const ShivlingMark: React.FC<{ color: string }> = ({ color }) => {
  const s = strokeProps(color);
  return (
    <>
      {/* Arch frame */}
      <Path
        d="M4 21.5 V10 C4 5.9 7.6 2.5 12 2.5 C16.4 2.5 20 5.9 20 10 V21.5"
        {...s}
      />
      {/* Lingam */}
      <Path
        d="M9.6 14.4 C9.6 11 10.7 8.6 12 8.6 C13.3 8.6 14.4 11 14.4 14.4"
        {...s}
      />
      {/* Yoni base */}
      <Path
        d="M7.4 17.6 C7.4 15.8 9.1 14.4 12 14.4 C14.9 14.4 16.6 15.8 16.6 17.6"
        {...s}
      />
      <Path d="M6.6 17.6 H17.4" {...s} />
    </>
  );
};

/* ================================================================
 * Component
 * ================================================================ */

export const TourIcon: React.FC<Props> = ({
  name,
  size = 30,
  color = Colors.primaryDark,
}) => {
  if (name === 'om') {
    return (
      <View
        style={[styles.omBox, { width: size, height: size }]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Text
          allowFontScaling={false}
          style={[styles.om, { fontSize: size * 0.94, color }]}
        >
          ॐ
        </Text>
      </View>
    );
  }

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {name === 'trishul' ? <TrishulMark color={color} /> : null}
      {name === 'ganesh' ? <GaneshMark color={color} /> : null}
      {name === 'shivling' ? <ShivlingMark color={color} /> : null}
      {/* 'temple' is also the schema's fallback for an unknown icon. */}
      {name === 'temple' ? <TempleMark color={color} /> : null}
    </Svg>
  );
};

const styles = StyleSheet.create({
  omBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  om: {
    // allowFontScaling is off above: this is a glyph used as an icon,
    // and a large system font setting would push it out of its box
    // and break the card's alignment. The card's TEXT still scales.
    includeFontPadding: false,
    textAlign: 'center',
  },
});
