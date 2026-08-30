/* eslint-disable react-native/no-inline-styles */
/**
 * ------------------------------------------------------------------
 * CustomerFilterSheet
 * ------------------------------------------------------------------
 * Bottom sheet with animated slide-up (via @gorhom/bottom-sheet).
 *
 * Sections:
 *   - Customer Type         (All / Personal / Corporate / Agent — 2×2 radio pills)
 *   - Registration Date     (From / To — date pickers)
 *   - Sort By               (Newest / Oldest / Name A–Z / Most Trips)
 *   - Trips (Total)         (All / No Trips / 1–10 / 10+)
 *
 * The sheet keeps a LOCAL DRAFT of the filters while open. The parent
 * only sees the values when the user taps "Apply Filters". Tapping
 * "Cancel" or panning down discards the draft. "Reset" restores the
 * defaults inside the draft (still needs Apply to take effect).
 *
 * Layout:
 *   - Fixed 70% snap. enableDynamicSizing={false}. Sheet never grows.
 *   - Header (Filters + Reset + divider) sits OUTSIDE the ScrollView
 *     so it stays pinned when content scrolls.
 *   - Sort dropdown menu is absolutely positioned so opening it does
 *     NOT push Trips + buttons down.
 *   - Customer Type pills use a 2×2 grid — 4 pills in a single row
 *     forced "Corporate"/"Personal" to wrap mid-word.
 * ------------------------------------------------------------------
 */

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import {
  Calendar as CalendarIcon,
  ChevronDown,
  ArrowUpDown,
  RotateCcw,
} from 'lucide-react-native';
import DateTimePicker, {
  DateTimePickerAndroid,
} from '@react-native-community/datetimepicker';

import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';

import {
  DEFAULT_CUSTOMER_FILTERS,
  type CustomerFilter,
  type CustomerFilters,
  type CustomerSortBy,
  type CustomerTripsBucket,
} from '../types';

/* ------------------------------------------------------------------ */
/* Props                                                              */
/* ------------------------------------------------------------------ */

type Props = {
  initialFilters: CustomerFilters;
  onApply: (filters: CustomerFilters) => void;
};

/* ------------------------------------------------------------------ */
/* Constants                                                          */
/* ------------------------------------------------------------------ */

const TYPE_OPTIONS: { value: CustomerFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'personal', label: 'Personal' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'agent', label: 'Agent' },
];

const SORT_OPTIONS: { value: CustomerSortBy; label: string }[] = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'nameAsc', label: 'Name (A–Z)' },
  { value: 'mostTrips', label: 'Most Trips' },
];

const TRIPS_OPTIONS: { value: CustomerTripsBucket; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'none', label: 'No Trips' },
  { value: '1to10', label: '1 – 10' },
  { value: '10plus', label: '10+' },
];

const SNAP_POINTS = ['70%'];

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

const fmtDate = (iso: string | null): string => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const toISODate = (d: Date): string => d.toISOString();

/* ================================================================== */
/* Component                                                          */
/* ================================================================== */

export const CustomerFilterSheet = forwardRef<BottomSheetModal, Props>(
  ({ initialFilters, onApply }, ref) => {
    const internalRef = useRef<BottomSheetModal>(null);
    useImperativeHandle(ref, () => internalRef.current as BottomSheetModal, []);

    const [draft, setDraft] = useState<CustomerFilters>(initialFilters);

    useEffect(() => {
      setDraft(initialFilters);
    }, [initialFilters]);

    const [iosPicker, setIosPicker] = useState<{
      target: 'from' | 'to';
      value: Date;
    } | null>(null);

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

    const dismiss = useCallback(() => internalRef.current?.dismiss(), []);

    const handleReset = useCallback(() => {
      setDraft(DEFAULT_CUSTOMER_FILTERS);
    }, []);

    const handleApply = useCallback(() => {
      onApply(draft);
      dismiss();
    }, [onApply, draft, dismiss]);

    /* -------- Date pickers -------- */

    const openDatePicker = useCallback(
      (target: 'from' | 'to') => {
        const currentIso = target === 'from' ? draft.dateFrom : draft.dateTo;
        const current = currentIso ? new Date(currentIso) : new Date();

        const onSet = (date: Date) => {
          setDraft(d => ({
            ...d,
            [target === 'from' ? 'dateFrom' : 'dateTo']: toISODate(date),
          }));
        };

        if (Platform.OS === 'android') {
          DateTimePickerAndroid.open({
            value: current,
            mode: 'date',
            onValueChange: (_event, date: Date) => {
              if (date) onSet(date);
            },
          });
        } else {
          setIosPicker({ target, value: current });
        }
      },
      [draft.dateFrom, draft.dateTo],
    );

    const onIosValueChange = useCallback(
      (_event: unknown, date: Date) => {
        if (!iosPicker || !date) return;
        setDraft(d => ({
          ...d,
          [iosPicker.target === 'from' ? 'dateFrom' : 'dateTo']:
            toISODate(date),
        }));
      },
      [iosPicker],
    );

    const onIosDismiss = useCallback(() => {
      setIosPicker(null);
    }, []);

    /* -------- Sort dropdown -------- */

    const [sortOpen, setSortOpen] = useState(false);
    const sortLabel = useMemo(
      () => SORT_OPTIONS.find(o => o.value === draft.sortBy)?.label ?? '',
      [draft.sortBy],
    );

    /* -------- Render -------- */

    return (
      <BottomSheetModal
        ref={internalRef}
        snapPoints={SNAP_POINTS}
        index={0}
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={styles.handle}
        backgroundStyle={styles.sheetBg}
        enablePanDownToClose
        enableDynamicSizing={false}
        enableOverDrag={false}
      >
        {/* Pinned header — stays visible while content scrolls */}
        <View style={styles.pinnedHeader}>
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>Filters</Text>
            <Pressable
              onPress={handleReset}
              hitSlop={8}
              style={styles.resetBtn}
              accessibilityLabel="Reset filters"
            >
              <RotateCcw size={16} color={Colors.primary} strokeWidth={2.2} />
              <Text style={styles.resetText}>Reset</Text>
            </Pressable>
          </View>
          <View style={styles.divider} />
        </View>

        <BottomSheetScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Customer Type */}
          <Text style={styles.sectionLabel}>Customer Type</Text>
          <View style={styles.pillRow}>
            {TYPE_OPTIONS.map(opt => {
              const selected = draft.type === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => setDraft(d => ({ ...d, type: opt.value }))}
                  style={[styles.pill, selected && styles.pillSelected]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                >
                  <View
                    style={[styles.radioOuter, selected && styles.radioOuterOn]}
                  >
                    {selected ? <View style={styles.radioInner} /> : null}
                  </View>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.pillLabel,
                      selected && styles.pillLabelSelected,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Registration Date */}
          <Text style={styles.sectionLabel}>Registration Date</Text>
          <View style={styles.dateRow}>
            <DateField
              label="From"
              value={fmtDate(draft.dateFrom)}
              onPress={() => openDatePicker('from')}
            />
            <Text style={styles.dateDash}>–</Text>
            <DateField
              label="To"
              value={fmtDate(draft.dateTo)}
              onPress={() => openDatePicker('to')}
            />
          </View>

          {/* Sort By */}
          <Text style={styles.sectionLabel}>Sort By</Text>
          <View style={styles.sortWrap}>
            <Pressable
              style={styles.sortField}
              onPress={() => setSortOpen(v => !v)}
              accessibilityRole="button"
            >
              <View style={styles.sortLeft}>
                <ArrowUpDown size={18} color={Colors.textSecondary} />
                <Text style={styles.sortValue}>{sortLabel}</Text>
              </View>
              <ChevronDown
                size={18}
                color={Colors.textSecondary}
                style={{
                  transform: [{ rotate: sortOpen ? '180deg' : '0deg' }],
                }}
              />
            </Pressable>
            {sortOpen ? (
              <View style={styles.sortMenu}>
                {SORT_OPTIONS.map(opt => {
                  const selected = draft.sortBy === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      style={[
                        styles.sortItem,
                        selected && styles.sortItemSelected,
                      ]}
                      onPress={() => {
                        setDraft(d => ({ ...d, sortBy: opt.value }));
                        setSortOpen(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.sortItemText,
                          selected && styles.sortItemTextSelected,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </View>

          {/* Trips */}
          <Text style={styles.sectionLabel}>Trips (Total Completed)</Text>
          <View style={styles.tripsRow}>
            {TRIPS_OPTIONS.map(opt => {
              const selected = draft.tripsBucket === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  style={styles.tripsOption}
                  onPress={() =>
                    setDraft(d => ({ ...d, tripsBucket: opt.value }))
                  }
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                >
                  <View
                    style={[
                      styles.radioOuter,
                      styles.radioSm,
                      selected && styles.radioOuterOn,
                    ]}
                  >
                    {selected ? (
                      <View style={[styles.radioInner, styles.radioInnerSm]} />
                    ) : null}
                  </View>
                  <Text style={styles.tripsLabel}>{opt.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Actions */}
          <Pressable style={styles.applyBtn} onPress={handleApply}>
            <Text style={styles.applyText}>Apply Filters</Text>
          </Pressable>
          <Pressable style={styles.cancelBtn} onPress={dismiss}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </BottomSheetScrollView>

        {/* iOS inline date picker */}
        {Platform.OS === 'ios' && iosPicker ? (
          <DateTimePicker
            value={iosPicker.value}
            mode="date"
            display="spinner"
            onValueChange={onIosValueChange}
            onDismiss={onIosDismiss}
          />
        ) : null}
      </BottomSheetModal>
    );
  },
);

CustomerFilterSheet.displayName = 'CustomerFilterSheet';

/* ------------------------------------------------------------------ */
/* Sub-components                                                     */
/* ------------------------------------------------------------------ */

const DateField: React.FC<{
  label: string;
  value: string;
  onPress: () => void;
}> = ({ label, value, onPress }) => (
  <Pressable style={styles.dateField} onPress={onPress}>
    <View style={styles.dateTextWrap}>
      <Text style={styles.dateLabel}>{label}</Text>
      <Text
        style={[
          styles.dateValue,
          !value && { color: Colors.textTertiary, fontWeight: '400' },
        ]}
        numberOfLines={1}
      >
        {value || 'Select date'}
      </Text>
    </View>
    <CalendarIcon size={18} color={Colors.textSecondary} />
  </Pressable>
);

/* ------------------------------------------------------------------ */
/* Styles                                                             */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  handle: { backgroundColor: Colors.border, width: 44 },
  sheetBg: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  scroll: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },

  /* Pinned header (outside ScrollView) */
  pinnedHeader: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    backgroundColor: Colors.background,
  },

  /* Header row */
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  headerTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  resetText: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: '600',
  },

  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginBottom: Spacing.lg,
  },

  /* Section */
  sectionLabel: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '700',
    marginBottom: Spacing.md,
    marginTop: Spacing.lg,
  },

  /* Pills (Customer Type) — 2×2 grid.
   *
   * `flexWrap: 'wrap'` lets the 4 pills flow onto 2 rows. `width: '48%'`
   * (not `flex: 1`) keeps every pill the same size across rows —
   * with `flex: 1`, a wrapped row would stretch its items to fill
   * 100% width, breaking the grid. The 4% gap gap between pairs
   * covers the row-gap. */
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  pill: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: Spacing.sm,
    paddingVertical: 14,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
  },
  pillSelected: {
    borderColor: Colors.primary,
    borderWidth: 1.5,
  },
  pillLabel: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  pillLabelSelected: {
    color: Colors.textPrimary,
    fontWeight: '600',
  },

  /* Radio dot */
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  radioOuterOn: {
    borderColor: Colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  radioSm: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  radioInnerSm: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },

  /* Date row */
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dateField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    minHeight: 56,
  },
  dateTextWrap: { flex: 1 },
  dateLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontSize: 11,
    marginBottom: 2,
  },
  dateValue: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  dateDash: {
    ...Typography.body,
    color: Colors.textSecondary,
    fontWeight: '600',
    paddingHorizontal: 2,
  },

  /* Sort */
  sortWrap: {
    position: 'relative',
    zIndex: 10,
  },
  sortField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md + 2,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
  },
  sortLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  sortValue: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  sortMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
    zIndex: 20,
    ...Shadows.sm,
  },
  sortItem: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  sortItemSelected: {
    backgroundColor: '#E7F7EC',
  },
  sortItemText: {
    ...Typography.body,
    color: Colors.textPrimary,
  },
  sortItemTextSelected: {
    color: Colors.primary,
    fontWeight: '700',
  },

  /* Trips */
  tripsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  tripsOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
    paddingVertical: Spacing.xs,
  },
  tripsLabel: {
    ...Typography.body,
    color: Colors.textPrimary,
  },

  /* Actions */
  applyBtn: {
    marginTop: Spacing.xxl,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md + 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyText: {
    ...Typography.body,
    color: Colors.white,
    fontWeight: '700',
    fontSize: 16,
  },
  cancelBtn: {
    marginTop: Spacing.sm + 2,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md + 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  cancelText: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 16,
  },
});
