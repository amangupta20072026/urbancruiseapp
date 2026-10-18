/**
 * ------------------------------------------------------------------
 * VehicleBrochuresScreen (Customer)
 * ------------------------------------------------------------------
 * Opened from "View all vehicles" on a pending quotation. Lists every
 * brochure grouped as vehicle type → seater → tier (catalog order).
 *
 *   loading (no cache) → skeleton cards
 *   error   (no cache) → ErrorView + Try again
 *   empty catalog      → EmptyState
 *   tier with video    → tappable card → VehicleVideo
 *   tier without video → "Coming soon" card, not tappable
 *
 * "Select this vehicle" is passed on to VehicleVideo only when exactly
 * one vehicle option of the quotation matches the brochure.
 * ------------------------------------------------------------------
 */
import React, { useCallback, useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Bus } from 'lucide-react-native';

import {
  EmptyState,
  ErrorView,
  SafeScreen,
  ScreenHeader,
  Skeleton,
} from '@shared/components';
import { Colors, Radius, Spacing, Typography } from '@theme';
import { logEvent } from '@services/telemetry';
import type { CustomerStackParamList } from '@navigation/types';
import { VEHICLE_OPTIONS } from '@features/customer/quotations/vehicleTierOptions';

import { useGroupedBrochures } from '../hooks/useBrochures';
import { vehicleOptionIdsFor } from '../utils/match';
import { BrochureCard } from '../components/BrochureCard';
import type { BrochureEntry } from '../types';

type Nav = NativeStackNavigationProp<
  CustomerStackParamList,
  'VehicleBrochures'
>;
type Route = RouteProp<CustomerStackParamList, 'VehicleBrochures'>;

const VehicleBrochuresScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { quotationId } = useRoute<Route>().params;
  const { groups, isLoading, isError, refetch } = useGroupedBrochures();

  useEffect(() => {
    logEvent('brochure.list_opened');
  }, []);

  const onOpen = useCallback(
    (entry: BrochureEntry) => {
      const optionIds = vehicleOptionIdsFor(entry, VEHICLE_OPTIONS);
      const onlyOption = optionIds.length === 1 ? optionIds[0] : undefined;
      navigation.navigate('VehicleVideo', {
        groupKey: entry.groupKey,
        tier: entry.tier,
        ...(onlyOption !== undefined
          ? { select: { quotationId, optionId: onlyOption } }
          : {}),
      });
    },
    [navigation, quotationId],
  );

  let body: React.ReactNode;
  if (isLoading) {
    body = <LoadingList />;
  } else if (isError) {
    body = (
      <ErrorView
        title="Couldn’t load vehicle brochures"
        message="Check your internet connection and try again. Your quotation is not affected."
        onRetry={refetch}
      />
    );
  } else if (groups.length === 0) {
    body = (
      <EmptyState
        title="Vehicle brochures coming soon"
        message="Videos of our vehicles will appear here."
      />
    );
  } else {
    body = (
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {groups.map(type => (
          <View key={type.vehicleType} style={styles.typeBlock}>
            <View style={styles.typeHeader}>
              <View style={styles.typeIcon}>
                <Bus size={18} color={Colors.primaryDark} strokeWidth={2} />
              </View>
              <View style={styles.typeText}>
                <Text style={styles.typeName} accessibilityRole="header">
                  {type.vehicleType}
                </Text>
                <Text style={styles.typeCount}>
                  {type.seaters.length === 1
                    ? '1 seater option'
                    : `${type.seaters.length} seater options`}
                </Text>
              </View>
            </View>

            {type.seaters.map(seater => (
              <View key={seater.groupKey} style={styles.seaterBlock}>
                <Text style={styles.seaterLabel}>{seater.seater} Seater</Text>
                {seater.entries.map(entry => (
                  <BrochureCard
                    key={`${entry.groupKey}|${entry.tier}`}
                    entry={entry}
                    onPress={onOpen}
                  />
                ))}
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    );
  }

  return (
    <SafeScreen edges={['top']} backgroundColor={Colors.background}>
      <View style={styles.headerBlock}>
        <ScreenHeader
          title="Vehicle Brochures"
          subtitle="Watch videos of every vehicle before you choose"
          onBack={() => navigation.goBack()}
        />
      </View>
      {body}
    </SafeScreen>
  );
};

export default VehicleBrochuresScreen;

const LoadingList: React.FC = () => (
  <View
    style={styles.scrollContent}
    accessibilityLabel="Loading vehicle brochures"
  >
    <Skeleton width="50%" height={20} />
    {[0, 1, 2].map(i => (
      <Skeleton key={i} height={92} radius={Radius.lg} />
    ))}
  </View>
);

const styles = StyleSheet.create({
  headerBlock: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  scroll: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxxl,
    gap: Spacing.xxl,
  },
  typeBlock: {
    gap: Spacing.md,
  },
  typeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  typeIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeText: {
    flex: 1,
  },
  typeName: {
    ...Typography.subtitle,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  typeCount: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  seaterBlock: {
    gap: Spacing.sm,
  },
  seaterLabel: {
    ...Typography.caption,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: Colors.textSecondary,
  },
});
