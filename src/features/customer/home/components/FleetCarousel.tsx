/**
 * ------------------------------------------------------------------
 * FleetCarousel — "Explore our fleet" on Customer Home
 * ------------------------------------------------------------------
 * Horizontal row of vehicle cards built from the REAL brochure
 * catalog (GET /config/brochures). One card per brochure group
 * (`groupKey` = one vehicle type at one seater count):
 *
 *   ┌──────────────────────┐ ┌──────────────────────┐
 *   │      [ photo ]  ▶ Watch│ │      [ photo ]       │…
 *   ├──────────────────────┤ ├──────────────────────┤
 *   │ Force Traveller      │ │ Force Traveller      │
 *   │ 13 Seater · 3 options│ │ 26 Seater            │
 *   │ [ECONOMY][PREMIUM]…  │ │ [ROYAL]              │
 *   └──────────────────────┘ └──────────────────────┘
 *
 * Backend-driven: ops adds a vehicle, photo or video on the backend
 * and it shows here without an app release. Order = catalog order.
 *
 * PHOTO (first one that exists wins)
 *   1. The first non-null `imageUrl` among the group's tiers (a real
 *      photo uploaded by ops).
 *   2. Otherwise the YouTube thumbnail (mqdefault, 16:9, no black
 *      bars) of the first tier that has a video.
 *   3. No photo and no video, or the image fails to load → a green
 *      tile with a bus icon. A missing photo is a normal state.
 *   Rule 1–2 is brochureImageUrl() from the brochures feature, so the
 *   Vehicle Brochures list shows the same pictures. Once ops adds a
 *   real imageUrl it replaces the thumbnail — no app change needed.
 *
 * TAPS
 *   Card → VehicleVideo for the group's first tier that has a video
 *   (else its first tier, which shows "Video coming soon"). No
 *   `select` is passed: Home has no quotation, so it is browse-only.
 *
 * STATES
 *   loading (no cached catalog) → skeleton cards
 *   error with no cache, or empty catalog → renders nothing, so the
 *   brochure catalog can never break the Home screen.
 * ------------------------------------------------------------------ */
import React, { useCallback, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Bus, Play } from 'lucide-react-native';

import { Colors, Radius, Spacing, Typography } from '@theme';
import { Skeleton } from '@shared/components';
import {
  TierPill,
  brochureImageUrl,
  groupBrochures,
  hasVideo,
  useBrochures,
  type BrochureEntry,
} from '@features/customer/brochures';

const CARD_WIDTH = 210;
const IMAGE_HEIGHT = 112;
const CARD_GAP = Spacing.md;

/** What one card needs, derived from a brochure group. */
export type FleetCardItem = {
  groupKey: string;
  vehicleType: string;
  seater: number;
  /** Tiers in catalog order. */
  entries: BrochureEntry[];
  /** Real photo, else YouTube thumbnail, else null (bus icon). */
  imageUrl: string | null;
  /** The tier a tap opens. */
  openEntry: BrochureEntry;
  hasAnyVideo: boolean;
};

/** Flattens the type → seater tree into one card per group. */
export function toFleetCards(
  entries: readonly BrochureEntry[],
): FleetCardItem[] {
  const cards: FleetCardItem[] = [];
  for (const type of groupBrochures(entries)) {
    for (const group of type.seaters) {
      const first = group.entries[0];
      if (!first) continue;
      const withVideo = group.entries.find(hasVideo);
      const photo = group.entries.find(e => e.imageUrl)?.imageUrl ?? null;
      cards.push({
        groupKey: group.groupKey,
        vehicleType: type.vehicleType,
        seater: group.seater,
        entries: group.entries,
        imageUrl: photo ?? (withVideo ? brochureImageUrl(withVideo) : null),
        openEntry: withVideo ?? first,
        hasAnyVideo: withVideo !== undefined,
      });
    }
  }
  return cards;
}

type Props = {
  onOpenVehicle: (entry: BrochureEntry) => void;
};

export const FleetCarousel: React.FC<Props> = ({ onOpenVehicle }) => {
  const { data, isLoading } = useBrochures();
  const cards = useMemo(() => toFleetCards(data ?? []), [data]);

  if (!data && isLoading) {
    return (
      <View
        style={styles.row}
        accessibilityLabel="Loading our fleet"
        accessible
      >
        {[0, 1].map(i => (
          <Skeleton
            key={i}
            width={CARD_WIDTH}
            height={IMAGE_HEIGHT + 92}
            radius={Radius.lg}
          />
        ))}
      </View>
    );
  }

  if (cards.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      decelerationRate="fast"
      snapToInterval={CARD_WIDTH + CARD_GAP}
      snapToAlignment="start"
    >
      {cards.map(card => (
        <FleetCard key={card.groupKey} card={card} onPress={onOpenVehicle} />
      ))}
    </ScrollView>
  );
};

/* ------------------------------------------------------------------ */
/* One card                                                           */
/* ------------------------------------------------------------------ */

const FleetCard: React.FC<{
  card: FleetCardItem;
  onPress: (entry: BrochureEntry) => void;
}> = ({ card, onPress }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = card.imageUrl !== null && !imageFailed;

  const handlePress = useCallback(() => {
    onPress(card.openEntry);
  }, [onPress, card.openEntry]);

  const onImageError = useCallback(() => setImageFailed(true), []);

  const optionCount = card.entries.length;
  const subtitle =
    optionCount > 1
      ? `${card.seater} Seater · ${optionCount} options`
      : `${card.seater} Seater`;

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${card.vehicleType}, ${subtitle}${
        card.hasAnyVideo ? ', watch video' : ''
      }`}
    >
      <View style={styles.imageWrap}>
        {showImage ? (
          <Image
            source={{ uri: card.imageUrl as string }}
            style={styles.image}
            resizeMode="cover"
            onError={onImageError}
          />
        ) : (
          <Bus size={44} color={Colors.primaryDark} strokeWidth={1.6} />
        )}
        {card.hasAnyVideo ? (
          <View style={styles.watchBadge}>
            <Play
              size={11}
              color={Colors.textOnPrimary}
              fill={Colors.textOnPrimary}
              strokeWidth={2}
            />
            <Text style={styles.watchText}>Watch</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {card.vehicleType}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
        <View style={styles.tiers}>
          {card.entries.map(e => (
            <TierPill key={e.tier} tier={e.tier} />
          ))}
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: CARD_GAP,
    paddingHorizontal: Spacing.xl,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
  },
  pressed: { opacity: 0.85 },
  imageWrap: {
    height: IMAGE_HEIGHT,
    backgroundColor: Colors.greenWash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  watchBadge: {
    position: 'absolute',
    right: Spacing.sm,
    bottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(17, 24, 39, 0.7)',
  },
  watchText: {
    ...Typography.caption,
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textOnPrimary,
  },
  body: {
    padding: Spacing.md,
    gap: 2,
  },
  title: {
    ...Typography.body,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  subtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  tiers: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
});
