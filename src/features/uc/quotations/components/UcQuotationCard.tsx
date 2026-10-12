/**
 * ------------------------------------------------------------------
 * UcQuotationCard — one row on the UC Quotations tab
 * ------------------------------------------------------------------
 *   [AV]  Customer name                     [● Status]  ⋮
 *         #Q-2025-00128 • 10:30 AM                ₹12,500 ›
 *         📞 +91 98765 43210
 *   🚗 Car Rental      📅 12 Sep 2025      📍 Delhi → Agra
 *      Sedan             1 Day                One Way
 *
 * Two touch targets: the card (→ onPress) and the kebab (→ onMore).
 * The kebab is a sibling Pressable with its own hitSlop, so a tap on
 * it never also fires the card press.
 *
 * Memoised: FlashList re-renders rows on scroll; props are stable
 * (item reference + useCallback handlers from the screen).
 * ------------------------------------------------------------------
 */

import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Bus,
  CalendarCheck,
  Car,
  ChevronRight,
  EllipsisVertical,
  MapPin,
  Phone,
  TrainFront,
  type LucideIcon,
} from 'lucide-react-native';

import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';
import { avatarColorFor, initials } from '@shared/utils';

import {
  UC_QUOTATION_STATUS_LABEL,
  UC_SERVICE_TYPE_LABEL,
  type UcQuotationListItem,
  type UcServiceType,
} from '../types';
import {
  STATUS_TONE,
  formatCreatedStamp,
  formatDayMonthYear,
  formatDays,
  formatQuoteAmount,
  formatRoute,
  formatTripType,
} from '../utils/format';

const SERVICE_ICON: Readonly<Record<UcServiceType, LucideIcon>> = {
  car_rental: Car,
  bus_rental: Bus,
  tempo_traveller: Bus,
  rail_rental: TrainFront,
};

type Props = {
  item: UcQuotationListItem;
  onPress: (item: UcQuotationListItem) => void;
  onMore: (item: UcQuotationListItem) => void;
};

const UcQuotationCardBase: React.FC<Props> = ({ item, onPress, onMore }) => {
  const avatar = avatarColorFor(item.customerId);
  const tone = STATUS_TONE[item.status];
  const amount = formatQuoteAmount(item.amountPaise);
  const ServiceIcon = SERVICE_ICON[item.serviceType];
  const statusLabel = UC_QUOTATION_STATUS_LABEL[item.status];

  return (
    <Pressable
      onPress={() => onPress(item)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Quotation ${item.quotationNumber} for ${
        item.customerName
      }, ${statusLabel}${amount ? `, ${amount}` : ', not priced'}`}
    >
      {/* ---------- Top: identity + status/amount ---------- */}
      <View style={styles.topRow}>
        <View style={[styles.avatar, { backgroundColor: avatar.bg }]}>
          <Text style={[styles.avatarText, { color: avatar.fg }]}>
            {initials(item.customerName)}
          </Text>
        </View>

        <View style={styles.identity}>
          <Text style={styles.name} numberOfLines={1}>
            {item.customerName}
          </Text>
          <Text style={styles.metaText} numberOfLines={1}>
            #{item.quotationNumber}
            {'  •  '}
            {formatCreatedStamp(item.createdAt)}
          </Text>
          <View style={styles.phoneRow}>
            <Phone size={13} color={Colors.textSecondary} strokeWidth={2} />
            <Text style={styles.metaText} numberOfLines={1}>
              {item.customerPhone}
            </Text>
          </View>
        </View>

        <View style={styles.trailing}>
          <View style={styles.statusRow}>
            <View style={[styles.pill, { backgroundColor: tone.bg }]}>
              <View style={[styles.dot, { backgroundColor: tone.fg }]} />
              <Text style={[styles.pillText, { color: tone.fg }]}>
                {statusLabel}
              </Text>
            </View>
            <Pressable
              onPress={() => onMore(item)}
              hitSlop={10}
              style={({ pressed }) => [
                styles.moreBtn,
                pressed && styles.morePressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`More actions for ${item.quotationNumber}`}
            >
              <EllipsisVertical
                size={20}
                color={Colors.iconSecondary}
                strokeWidth={2}
              />
            </Pressable>
          </View>

          <View style={styles.amountRow}>
            {amount ? (
              <Text style={styles.amount} numberOfLines={1}>
                {amount}
              </Text>
            ) : (
              <Text style={styles.amountPending} numberOfLines={1}>
                Not priced
              </Text>
            )}
            <ChevronRight
              size={18}
              color={Colors.textPrimary}
              strokeWidth={2.25}
            />
          </View>
        </View>
      </View>

      {/* ---------- Bottom: service / date / route ---------- */}
      <View style={styles.detailsRow}>
        <DetailCell
          Icon={ServiceIcon}
          primary={UC_SERVICE_TYPE_LABEL[item.serviceType]}
          secondary={item.vehicleLabel}
          flex={1.05}
        />
        <DetailCell
          Icon={CalendarCheck}
          primary={formatDayMonthYear(item.travelDate)}
          secondary={formatDays(item.days)}
          flex={0.95}
        />
        <DetailCell
          Icon={MapPin}
          primary={formatRoute(item)}
          secondary={formatTripType(item)}
          flex={1.15}
        />
      </View>
    </Pressable>
  );
};

export const UcQuotationCard = memo(UcQuotationCardBase);

/* ================================================================
 * Detail cell
 * ================================================================ */

const DetailCell: React.FC<{
  Icon: LucideIcon;
  primary: string;
  secondary: string;
  flex: number;
}> = ({ Icon, primary, secondary, flex }) => (
  <View style={[styles.cell, { flex }]}>
    <Icon size={20} color={Colors.iconSecondary} strokeWidth={1.75} />
    <View style={styles.cellText}>
      <Text style={styles.cellPrimary} numberOfLines={1}>
        {primary}
      </Text>
      <Text style={styles.cellSecondary} numberOfLines={1}>
        {secondary}
      </Text>
    </View>
  </View>
);

/* ================================================================
 * Styles
 * ================================================================ */

const AVATAR = 48;

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.lg,
    ...Shadows.xs,
  },
  pressed: { opacity: 0.9 },

  /* Top */
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...Typography.body,
    fontWeight: '700',
  },
  identity: {
    flex: 1,
    gap: 3,
  },
  name: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  metaText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    flexShrink: 1,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  /* Trailing column */
  trailing: {
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: Radius.pill,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  pillText: {
    ...Typography.label,
    fontWeight: '600',
  },
  moreBtn: {
    width: 28,
    height: 28,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -Spacing.xs,
  },
  morePressed: {
    backgroundColor: Colors.surfaceMuted,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  amount: {
    ...Typography.title,
    color: Colors.textPrimary,
    fontWeight: '800',
  },
  amountPending: {
    ...Typography.bodySmall,
    color: Colors.textMuted,
    fontWeight: '600',
  },

  /* Details */
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  cell: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    minWidth: 0,
  },
  cellText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  cellPrimary: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  cellSecondary: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
});
