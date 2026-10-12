/**
 * ------------------------------------------------------------------
 * QuotationFilterSheet — refine the UC quotations list
 * ------------------------------------------------------------------
 * Service type, trip type and sort order. Status is NOT here — it
 * lives on the chip strip so it stays one tap away.
 *
 * Edits are staged in local state and only committed on "Apply";
 * dismissing the sheet discards them. The draft re-syncs from
 * `initialFilters` every time the sheet opens (onChange index 0),
 * so a discarded edit never leaks into the next open.
 * ------------------------------------------------------------------
 */

import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check } from 'lucide-react-native';

import { Colors, Radius, Spacing, Typography } from '@theme';

import {
  DEFAULT_UC_QUOTATION_FILTERS,
  UC_QUOTATION_SORT_LABEL,
  UC_SERVICE_TYPE_LABEL,
  UC_TRIP_TYPE_LABEL,
  type UcQuotationFilters,
  type UcQuotationSort,
  type UcServiceType,
  type UcTripType,
} from '../types';

type Props = {
  initialFilters: UcQuotationFilters;
  onApply: (next: UcQuotationFilters) => void;
};

const SERVICE_OPTIONS: readonly {
  key: 'all' | UcServiceType;
  label: string;
}[] = [
  { key: 'all', label: 'All' },
  ...(Object.keys(UC_SERVICE_TYPE_LABEL) as UcServiceType[]).map(k => ({
    key: k,
    label: UC_SERVICE_TYPE_LABEL[k],
  })),
];

const TRIP_OPTIONS: readonly { key: 'all' | UcTripType; label: string }[] = [
  { key: 'all', label: 'All' },
  ...(Object.keys(UC_TRIP_TYPE_LABEL) as UcTripType[]).map(k => ({
    key: k,
    label: UC_TRIP_TYPE_LABEL[k],
  })),
];

const SORT_OPTIONS: readonly { key: UcQuotationSort; label: string }[] = (
  Object.keys(UC_QUOTATION_SORT_LABEL) as UcQuotationSort[]
).map(k => ({ key: k, label: UC_QUOTATION_SORT_LABEL[k] }));

export const QuotationFilterSheet = forwardRef<BottomSheetModal, Props>(
  ({ initialFilters, onApply }, ref) => {
    const sheetRef = useRef<BottomSheetModal>(null);
    useImperativeHandle(ref, () => sheetRef.current as BottomSheetModal, []);
    const insets = useSafeAreaInsets();

    const [draft, setDraft] = useState<UcQuotationFilters>(initialFilters);

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

    /* Re-sync the draft each time the sheet opens. */
    const handleChange = useCallback(
      (index: number) => {
        if (index === 0) setDraft(initialFilters);
      },
      [initialFilters],
    );

    const handleReset = useCallback(() => {
      setDraft(DEFAULT_UC_QUOTATION_FILTERS);
    }, []);

    const handleApply = useCallback(() => {
      onApply(draft);
      sheetRef.current?.dismiss();
    }, [draft, onApply]);

    return (
      <BottomSheetModal
        ref={sheetRef}
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={styles.handle}
        backgroundStyle={styles.sheetBg}
        onChange={handleChange}
        enablePanDownToClose
      >
        <BottomSheetView
          style={[
            styles.content,
            { paddingBottom: Math.max(insets.bottom, Spacing.lg) },
          ]}
        >
          <View style={styles.headerRow}>
            <Text style={styles.title}>Filter quotations</Text>
            <Pressable
              onPress={handleReset}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Reset filters"
            >
              <Text style={styles.reset}>Reset</Text>
            </Pressable>
          </View>

          <Section title="Service type">
            <ChipGroup
              options={SERVICE_OPTIONS}
              value={draft.serviceType}
              onChange={serviceType => setDraft(d => ({ ...d, serviceType }))}
            />
          </Section>

          <Section title="Trip type">
            <ChipGroup
              options={TRIP_OPTIONS}
              value={draft.tripType}
              onChange={tripType => setDraft(d => ({ ...d, tripType }))}
            />
          </Section>

          <Section title="Sort by">
            <View style={styles.sortList}>
              {SORT_OPTIONS.map(opt => {
                const active = draft.sortBy === opt.key;
                return (
                  <Pressable
                    key={opt.key}
                    onPress={() => setDraft(d => ({ ...d, sortBy: opt.key }))}
                    style={({ pressed }) => [
                      styles.sortRow,
                      pressed && styles.sortRowPressed,
                    ]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                  >
                    <Text
                      style={[
                        styles.sortLabel,
                        active && styles.sortLabelActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                    {active ? (
                      <Check
                        size={18}
                        color={Colors.primary}
                        strokeWidth={2.5}
                      />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </Section>

          <Pressable
            onPress={handleApply}
            style={({ pressed }) => [styles.apply, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Apply filters"
          >
            <Text style={styles.applyText}>Apply filters</Text>
          </Pressable>
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);

QuotationFilterSheet.displayName = 'QuotationFilterSheet';

/* ================================================================
 * Pieces
 * ================================================================ */

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

function ChipGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.chipWrap}>
      {options.map(opt => {
        const active = opt.key === value;
        return (
          <Pressable
            key={opt.key}
            onPress={() => onChange(opt.key)}
            style={[styles.chip, active && styles.chipActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ================================================================
 * Styles
 * ================================================================ */

const styles = StyleSheet.create({
  handle: { backgroundColor: Colors.border, width: 44 },
  sheetBg: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    gap: Spacing.xl,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    ...Typography.title,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  reset: {
    ...Typography.body,
    color: Colors.primaryDark,
    fontWeight: '600',
  },

  section: { gap: Spacing.sm },
  sectionTitle: {
    ...Typography.label,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surfaceMuted,
    borderWidth: 1,
    borderColor: Colors.surfaceMuted,
  },
  chipActive: {
    backgroundColor: Colors.primaryTint,
    borderColor: Colors.primary,
  },
  chipText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  chipTextActive: {
    color: Colors.primaryDark,
    fontWeight: '700',
  },

  sortList: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.divider,
  },
  sortRowPressed: { backgroundColor: Colors.backgroundSecondary },
  sortLabel: {
    ...Typography.body,
    color: Colors.textPrimary,
  },
  sortLabelActive: {
    color: Colors.primaryDark,
    fontWeight: '600',
  },

  apply: {
    height: 52,
    borderRadius: Radius.md,
    backgroundColor: Colors.buttonPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyText: {
    ...Typography.button,
    color: Colors.buttonPrimaryText,
  },
  pressed: { opacity: 0.85 },
});