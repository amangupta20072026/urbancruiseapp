/**
 * ------------------------------------------------------------------
 * VehicleVideoScreen (Customer)
 * ------------------------------------------------------------------
 * One brochure: the player (in-app on Android, opens YouTube on iOS —
 * see BrochurePlayer), the list of its videos (a tier can have
 * several), and the facilities checklist.
 *
 * Opened from:
 *   - a vehicle card / Compare column (pending)   → with `select`
 *   - the Vehicle Brochures list (pending)        → `select` only if
 *                                                   one option matches
 *   - the Vehicle Details card (accepted/expired) → no `select`
 *
 * With `select`, the screen shows the option's price and a
 * "Select this vehicle" CTA that returns to the quotation with that
 * option selected. Without it there is no CTA: the vehicle is either
 * already fixed or ambiguous.
 *
 * States: loading (no cache) → skeleton · error (no cache) → retry ·
 * brochure no longer in the catalog → message + back · no videos →
 * "coming soon".
 * ------------------------------------------------------------------
 */
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CheckCircle2, Play } from 'lucide-react-native';

import {
  EmptyState,
  ErrorView,
  SafeScreen,
  ScreenHeader,
  Skeleton,
} from '@shared/components';
import { Colors, Radius, Spacing, Typography } from '@theme';
import type { CustomerStackParamList } from '@navigation/types';
import { VEHICLE_OPTIONS } from '@features/customer/quotations/vehicleTierOptions';

import { useBrochures } from '../hooks/useBrochures';
import { findBrochureByGroupKey, hasVideo } from '../utils/match';
import { BrochurePlayer } from '../components/BrochurePlayer';
import { TierPill } from '../components/TierPill';

type Nav = NativeStackNavigationProp<CustomerStackParamList, 'VehicleVideo'>;
type Route = RouteProp<CustomerStackParamList, 'VehicleVideo'>;

function formatAmount(rupees: number): string {
  return `₹${rupees.toLocaleString('en-IN')}`;
}

const VehicleVideoScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { groupKey, tier, select } = useRoute<Route>().params;
  const { data, isLoading, isError, refetch } = useBrochures();

  const entry = useMemo(
    () => (data ? findBrochureByGroupKey(data, groupKey, tier) : null),
    [data, groupKey, tier],
  );
  const option = useMemo(
    () =>
      select ? VEHICLE_OPTIONS.find(o => o.id === select.optionId) : undefined,
    [select],
  );

  const [videoIndex, setVideoIndex] = useState(0);
  const videoCount = entry?.videoIds.length ?? 0;
  // Guard against a catalog refresh that removed videos.
  const currentIndex = videoIndex < videoCount ? videoIndex : 0;

  const onSelect = useCallback(() => {
    if (!select || !option) return;
    navigation.popTo(
      'QuotationDetail',
      { quotationId: select.quotationId, selectVehicleOptionId: option.id },
      { merge: true },
    );
  }, [navigation, select, option]);

  const header = (
    <View style={styles.headerBlock}>
      <ScreenHeader title="Vehicle Video" onBack={() => navigation.goBack()} />
    </View>
  );

  if (!data && isLoading) {
    return (
      <SafeScreen edges={['top']} backgroundColor={Colors.background}>
        {header}
        <View style={styles.loading} accessibilityLabel="Loading video">
          <Skeleton height={200} radius={0} />
          <View style={styles.loadingText}>
            <Skeleton width="30%" height={18} />
            <Skeleton width="80%" height={24} />
            <Skeleton width="60%" height={16} />
          </View>
        </View>
      </SafeScreen>
    );
  }

  if (!data && isError) {
    return (
      <SafeScreen edges={['top']} backgroundColor={Colors.background}>
        {header}
        <ErrorView
          title="Couldn’t load this video"
          message="Check your internet connection and try again."
          onRetry={() => {
            refetch().catch(() => {});
          }}
        />
      </SafeScreen>
    );
  }

  if (!entry) {
    return (
      <SafeScreen edges={['top']} backgroundColor={Colors.background}>
        {header}
        <EmptyState
          title="Video not available"
          message="This vehicle video is no longer available."
          ctaLabel="Go back"
          onCtaPress={() => navigation.goBack()}
        />
      </SafeScreen>
    );
  }

  if (!hasVideo(entry)) {
    return (
      <SafeScreen edges={['top']} backgroundColor={Colors.background}>
        {header}
        <EmptyState
          title="Video coming soon"
          message={`We are adding the video for ${entry.title}.`}
          ctaLabel="Go back"
          onCtaPress={() => navigation.goBack()}
        />
      </SafeScreen>
    );
  }

  return (
    <SafeScreen edges={['top', 'bottom']} backgroundColor={Colors.background}>
      {header}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <BrochurePlayer entry={entry} videoIndex={currentIndex} />

        <View style={styles.section}>
          <TierPill tier={entry.tier} />
          <Text style={styles.title} accessibilityRole="header">
            {entry.title}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.meta}>{entry.seater} Seats</Text>
            {option ? (
              <>
                <Text style={styles.metaDot}>·</Text>
                <Text style={styles.price}>
                  {formatAmount(option.pricePerVehicle)}
                </Text>
                <Text style={styles.meta}>per vehicle</Text>
              </>
            ) : null}
          </View>
        </View>

        {videoCount > 1 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Videos in this brochure</Text>
            {entry.videoIds.map((id, i) => {
              const playing = i === currentIndex;
              return (
                <Pressable
                  key={id}
                  onPress={() => setVideoIndex(i)}
                  style={({ pressed }) => [
                    styles.videoRow,
                    playing && styles.videoRowActive,
                    pressed && styles.pressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: playing }}
                  accessibilityLabel={`Video ${i + 1} of ${videoCount}`}
                >
                  <View style={styles.videoThumb}>
                    <Play
                      size={18}
                      color={Colors.textOnPrimary}
                      fill={Colors.textOnPrimary}
                      strokeWidth={2}
                    />
                  </View>
                  <View style={styles.videoRowText}>
                    <Text style={styles.videoRowTitle}>Video {i + 1}</Text>
                    {playing ? (
                      <Text style={styles.nowPlaying}>Now playing</Text>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {entry.features.length > 0 ? (
          <View style={[styles.section, styles.featureCard]}>
            <Text style={styles.sectionTitle}>Facilities</Text>
            {entry.features.map(feature => (
              <View key={feature} style={styles.featureRow}>
                <CheckCircle2
                  size={18}
                  color={Colors.primary}
                  strokeWidth={2.5}
                />
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>

      {select && option ? (
        <View style={styles.bottomBar}>
          <Pressable
            onPress={onSelect}
            style={({ pressed }) => [
              styles.selectBtn,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Select ${entry.title}`}
          >
            <Text style={styles.selectText}>Select this vehicle</Text>
          </Pressable>
        </View>
      ) : null}
    </SafeScreen>
  );
};

export default VehicleVideoScreen;

const styles = StyleSheet.create({
  headerBlock: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  loading: {
    gap: Spacing.lg,
  },
  loadingText: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  scroll: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingBottom: Spacing.xxxxl,
    gap: Spacing.lg,
  },
  section: {
    marginHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  title: {
    ...Typography.title,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  meta: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  metaDot: {
    ...Typography.body,
    color: Colors.textTertiary,
  },
  price: {
    ...Typography.subtitle,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  sectionTitle: {
    ...Typography.subtitle,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  videoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  videoRowActive: {
    borderWidth: 1.5,
    borderColor: Colors.primaryDark,
    backgroundColor: Colors.primaryWash,
  },
  videoThumb: {
    width: 128,
    height: 72,
    borderRadius: Radius.sm,
    backgroundColor: Colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoRowText: {
    flex: 1,
    gap: 2,
  },
  videoRowTitle: {
    ...Typography.label,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  nowPlaying: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  featureCard: {
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundSecondary,
    gap: Spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  featureText: {
    ...Typography.body,
    flex: 1,
    color: Colors.textPrimary,
  },
  bottomBar: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  selectBtn: {
    minHeight: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectText: {
    ...Typography.button,
    color: Colors.textOnPrimary,
  },
  pressed: {
    opacity: 0.75,
  },
});
