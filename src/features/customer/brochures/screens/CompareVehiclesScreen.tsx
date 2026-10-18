/**
 * ------------------------------------------------------------------
 * CompareVehiclesScreen (Customer)
 * ------------------------------------------------------------------
 * Every vehicle option of a pending quotation side by side. The
 * labels column stays fixed; the vehicle columns scroll sideways.
 * The column the customer tapped "Compare" on is highlighted and
 * scrolled into view on open.
 *
 * Data:
 *   price, seats      → the quotation's vehicle options
 *   facility rows     → each option's brochure `specs` (backend
 *                       catalog). Missing brochure or value → "—",
 *                       which means "not provided", never "No".
 *
 * If the catalog cannot load, prices and seats still show; the
 * facility rows show "—" and a notice offers Retry. The screen never
 * blocks on the catalog.
 * ------------------------------------------------------------------
 */
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AlertCircle, Play } from 'lucide-react-native';

import { SafeScreen, ScreenHeader, Skeleton } from '@shared/components';
import { Colors, Radius, Spacing, Typography } from '@theme';
import { logEvent } from '@services/telemetry';
import type { CustomerStackParamList } from '@navigation/types';
import {
  VEHICLE_OPTIONS,
  type VehicleOption,
} from '@features/customer/quotations/vehicleTierOptions';

import { useBrochures } from '../hooks/useBrochures';
import { findBrochure, hasVideo, lookupForVehicleOption } from '../utils/match';
import { TierPill } from '../components/TierPill';
import type { BrochureEntry, BrochureSpecs } from '../types';

type Nav = NativeStackNavigationProp<CustomerStackParamList, 'CompareVehicles'>;
type Route = RouteProp<CustomerStackParamList, 'CompareVehicles'>;

const NOT_PROVIDED = '—';

const SPEC_ROWS: ReadonlyArray<{ key: keyof BrochureSpecs; label: string }> = [
  { key: 'modelYear', label: 'Model year' },
  { key: 'airConditioning', label: 'A/C' },
  { key: 'seatType', label: 'Seat type' },
  { key: 'chargingPoint', label: 'Charging' },
  { key: 'musicSystem', label: 'Music' },
  { key: 'sofaBed', label: 'Sofa / Bed' },
  { key: 'tv', label: 'TV' },
  { key: 'panoramicWindow', label: 'Panoramic window' },
];

const LABEL_W = 112;
const COL_W = 152;
const HEADER_H = 176;
const ROW_H = 60;
const ACTION_H = 60;

const PLACEHOLDER_IMG = require('@assets/images/service-car.png');

function formatAmount(rupees: number): string {
  return `₹${rupees.toLocaleString('en-IN')}`;
}

type Column = {
  option: VehicleOption;
  brochure: BrochureEntry | null;
  focused: boolean;
};

const CompareVehiclesScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { quotationId, focusOptionId } = useRoute<Route>().params;
  const { data, isLoading, isError, refetch } = useBrochures();
  const specsLoading = !data && isLoading;
  const specsFailed = !data && isError;

  useEffect(() => {
    logEvent('brochure.compare_opened', { focusOptionId });
  }, [focusOptionId]);

  const columns: Column[] = useMemo(
    () =>
      VEHICLE_OPTIONS.map(option => ({
        option,
        brochure: data
          ? findBrochure(data, lookupForVehicleOption(option))
          : null,
        focused: option.id === focusOptionId,
      })),
    [data, focusOptionId],
  );

  /* Scroll the tapped column into view once, after layout. */
  const scrollRef = useRef<ScrollView>(null);
  const didScroll = useRef(false);
  const focusIndex = columns.findIndex(c => c.focused);
  const onColumnsLayout = useCallback(() => {
    if (didScroll.current || focusIndex <= 0) return;
    didScroll.current = true;
    scrollRef.current?.scrollTo({ x: focusIndex * COL_W, animated: false });
  }, [focusIndex]);

  const onSelect = useCallback(
    (optionId: string) => {
      navigation.popTo(
        'QuotationDetail',
        { quotationId, selectVehicleOptionId: optionId },
        { merge: true },
      );
    },
    [navigation, quotationId],
  );

  const onWatch = useCallback(
    (column: Column) => {
      if (!column.brochure) return;
      navigation.navigate('VehicleVideo', {
        groupKey: column.brochure.groupKey,
        tier: column.brochure.tier,
        select: { quotationId, optionId: column.option.id },
      });
    },
    [navigation, quotationId],
  );

  return (
    <SafeScreen edges={['top']} backgroundColor={Colors.background}>
      <View style={styles.headerBlock}>
        <ScreenHeader
          title="Compare Vehicles"
          subtitle={`${columns.length} vehicles · swipe left or right to see all`}
          onBack={() => navigation.goBack()}
        />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {specsFailed ? (
          <View style={styles.notice} accessibilityRole="alert">
            <AlertCircle size={18} color={Colors.pendingDark} strokeWidth={2} />
            <Text style={styles.noticeText}>
              Some vehicle details couldn’t load.
            </Text>
            <Pressable
              onPress={() => {
                refetch().catch(() => {});
              }}
              style={({ pressed }) => [
                styles.noticeBtn,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Retry loading vehicle details"
            >
              <Text style={styles.noticeBtnText}>Retry</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.table}>
          {/* Fixed labels column */}
          <View style={styles.labelCol}>
            <View style={[styles.labelCell, { height: HEADER_H }]}>
              <Text style={styles.labelText}>Vehicle</Text>
            </View>
            <LabelCell label="Price per vehicle" />
            <LabelCell label="Seats" />
            {SPEC_ROWS.map(row => (
              <LabelCell key={row.key} label={row.label} />
            ))}
            <LabelCell label="Video" height={ACTION_H} />
            <View style={[styles.labelCell, { height: ACTION_H }]} />
          </View>

          {/* Scrolling vehicle columns */}
          <ScrollView
            ref={scrollRef}
            horizontal
            showsHorizontalScrollIndicator
            onLayout={onColumnsLayout}
          >
            <View style={styles.columns}>
              {columns.map(column => (
                <View
                  key={column.option.id}
                  style={[styles.col, column.focused && styles.colFocused]}
                >
                  <HeaderCell column={column} />
                  <ValueCell
                    text={formatAmount(column.option.pricePerVehicle)}
                    emphasis
                  />
                  <ValueCell text={String(column.option.seats)} />
                  {SPEC_ROWS.map(row => (
                    <ValueCell
                      key={row.key}
                      loading={specsLoading}
                      text={column.brochure?.specs[row.key] ?? NOT_PROVIDED}
                    />
                  ))}
                  <View style={[styles.cell, { height: ACTION_H }]}>
                    <VideoAction
                      column={column}
                      loading={specsLoading}
                      onWatch={onWatch}
                    />
                  </View>
                  <View style={[styles.cell, { height: ACTION_H }]}>
                    <Pressable
                      onPress={() => onSelect(column.option.id)}
                      style={({ pressed }) => [
                        styles.actionBtn,
                        styles.selectBtn,
                        pressed && styles.pressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Select ${column.option.model}, ${column.option.seats} seats`}
                    >
                      <Text style={styles.selectText}>Select</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </ScrollView>
    </SafeScreen>
  );
};

export default CompareVehiclesScreen;

/* ================================================================
 * Cells
 * ================================================================ */

const LabelCell: React.FC<{ label: string; height?: number }> = ({
  label,
  height = ROW_H,
}) => (
  <View style={[styles.labelCell, { height }]}>
    <Text style={styles.labelText} numberOfLines={2}>
      {label}
    </Text>
  </View>
);

const ValueCell: React.FC<{
  text: string;
  emphasis?: boolean;
  loading?: boolean;
}> = ({ text, emphasis = false, loading = false }) => (
  <View style={[styles.cell, { height: ROW_H }]}>
    {loading ? (
      <Skeleton width="70%" height={14} />
    ) : (
      <Text
        style={[
          styles.valueText,
          text === NOT_PROVIDED && styles.valueMissing,
          emphasis && styles.valueEmphasis,
        ]}
        numberOfLines={2}
        accessibilityLabel={text === NOT_PROVIDED ? 'Not provided' : text}
      >
        {text}
      </Text>
    )}
  </View>
);

const HeaderCell: React.FC<{ column: Column }> = ({ column }) => (
  <View style={[styles.cell, styles.headerCell, { height: HEADER_H }]}>
    {column.focused ? (
      <View style={styles.focusBadge}>
        <Text style={styles.focusBadgeText}>YOU TAPPED</Text>
      </View>
    ) : null}
    <View style={styles.headerImage}>
      <Image
        source={column.option.image ?? PLACEHOLDER_IMG}
        style={styles.headerImageInner}
        resizeMode="contain"
      />
    </View>
    <TierPill tier={column.option.tier} />
    <Text style={styles.headerModel} numberOfLines={1}>
      {column.option.model}
    </Text>
  </View>
);

const VideoAction: React.FC<{
  column: Column;
  loading: boolean;
  onWatch: (column: Column) => void;
}> = ({ column, loading, onWatch }) => {
  if (loading) return <Skeleton width="80%" height={36} radius={Radius.md} />;
  if (!column.brochure) {
    return (
      <Text style={[styles.valueText, styles.valueMissing]}>
        {NOT_PROVIDED}
      </Text>
    );
  }
  if (!hasVideo(column.brochure)) {
    return <Text style={styles.soonText}>Coming soon</Text>;
  }
  return (
    <Pressable
      onPress={() => onWatch(column)}
      style={({ pressed }) => [
        styles.actionBtn,
        styles.watchBtn,
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Watch video of ${column.brochure.title}`}
    >
      <Play
        size={14}
        color={Colors.primaryDark}
        fill={Colors.primaryDark}
        strokeWidth={2}
      />
      <Text style={styles.watchText}>Watch</Text>
    </Pressable>
  );
};

/* ================================================================
 * Styles
 * ================================================================ */

const styles = StyleSheet.create({
  headerBlock: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  scroll: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingBottom: Spacing.xxxxl,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.warningTint,
  },
  noticeText: {
    ...Typography.bodySmall,
    flex: 1,
    color: Colors.textPrimary,
  },
  noticeBtn: {
    minHeight: 36,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeBtnText: {
    ...Typography.label,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  table: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  labelCol: {
    width: LABEL_W,
    backgroundColor: Colors.backgroundSecondary,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
  },
  labelCell: {
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  labelText: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  columns: {
    flexDirection: 'row',
  },
  col: {
    width: COL_W,
    backgroundColor: Colors.surface,
  },
  colFocused: {
    backgroundColor: Colors.primaryWash,
  },
  cell: {
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  headerCell: {
    gap: Spacing.xs,
    justifyContent: 'flex-start',
    paddingTop: Spacing.sm,
  },
  focusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primaryDark,
  },
  focusBadgeText: {
    ...Typography.caption,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
    color: Colors.textOnPrimary,
    includeFontPadding: false,
  },
  headerImage: {
    height: 72,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryWash,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  headerImageInner: {
    width: 64,
    height: 64,
  },
  headerModel: {
    ...Typography.label,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  valueText: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
  },
  valueMissing: {
    color: Colors.textTertiary,
  },
  valueEmphasis: {
    ...Typography.subtitle,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  soonText: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  actionBtn: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: Radius.md,
  },
  watchBtn: {
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    backgroundColor: Colors.primaryTint,
  },
  watchText: {
    ...Typography.label,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  selectBtn: {
    backgroundColor: Colors.primaryDark,
  },
  selectText: {
    ...Typography.label,
    fontWeight: '700',
    color: Colors.textOnPrimary,
  },
  pressed: {
    opacity: 0.75,
  },
});
