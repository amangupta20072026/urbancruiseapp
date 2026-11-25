/**
 * ------------------------------------------------------------------
 * PlanTripScreen  (Customer)
 * ------------------------------------------------------------------
 * "Plan a Trip" form. The customer tells us the trip, and our travel
 * expert calls them back and prepares the quotation in Pinaak. This
 * replaces the old "Request a Quotation" form.
 *
 * FIELDS (all required except Notes):
 *   1. Trip details — trip type (dropdown from the backend list),
 *      pickup city, drop city, pickup date + time, return date
 *      (only when the trip type needs it, e.g. Round Trip)
 *   2. Travellers   — number of passengers, notes (optional)
 *
 * The customer's name and phone come from their login, so they are
 * not asked here.
 *
 * ROUTE:
 *   Registered as "RequestQuotation" so every existing entry point
 *   (Home card, Quotations tab, Bookings "Book Again", Quotation
 *   detail "Request New") opens this form without changes. On submit
 *   it replaces itself with "QuotationSuccess" (PlanTripSuccessScreen)
 *   so Back does not return to a filled form.
 *
 * DATA (dummy for now):
 *   Trip types come from MOCK_PLAN_TRIP_TYPES and submit goes to the
 *   in-memory store in ../planTrip. When the backend is connected,
 *   swap those two for the API; this screen keeps the same shape.
 * ------------------------------------------------------------------
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Calendar,
  CalendarCheck,
  ChevronDown,
  Clock,
  MapPin,
  MessageSquare,
  Route,
  Users,
} from 'lucide-react-native';

import { SafeScreen, ScreenHeader } from '@shared/components';
import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';
import type { CustomerStackParamList } from '@navigation/types';

import {
  MOCK_PLAN_TRIP_TYPES,
  combineDateAndTime,
  formatDate,
  formatTime,
  startOfDay,
  submitTripRequest,
  type PlanTripTypeOption,
} from '../planTrip';

type Nav = NativeStackNavigationProp<
  CustomerStackParamList,
  'RequestQuotation'
>;

type IconType = React.ComponentType<{
  size?: number;
  color?: string;
  strokeWidth?: number;
}>;

const CITY_MAX_LENGTH = 60;
const NOTES_MAX_LENGTH = 500;
const PASSENGERS_MAX_DIGITS = 3;

/* ================================================================
 * Screen
 * ================================================================ */

const PlanTripScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();

  /* -------- Form state -------- */
  const [tripType, setTripType] = useState<PlanTripTypeOption | null>(null);
  const [pickupCity, setPickupCity] = useState('');
  const [dropCity, setDropCity] = useState('');
  const [pickupDate, setPickupDate] = useState<Date | null>(null);
  const [pickupTime, setPickupTime] = useState<Date | null>(null);
  const [returnDate, setReturnDate] = useState<Date | null>(null);
  const [passengers, setPassengers] = useState('');
  const [notes, setNotes] = useState('');

  /* -------- Picker UI state -------- */
  const [showTripTypePicker, setShowTripTypePicker] = useState(false);
  const [showPickupDatePicker, setShowPickupDatePicker] = useState(false);
  const [showPickupTimePicker, setShowPickupTimePicker] = useState(false);
  const [showReturnDatePicker, setShowReturnDatePicker] = useState(false);

  const [triedSubmit, setTriedSubmit] = useState(false);

  const needsReturnDate = tripType?.needsReturnDate ?? false;

  /* -------- Handlers -------- */
  const onTripTypeSelect = useCallback((option: PlanTripTypeOption) => {
    setTripType(option);
    // A return date only belongs to trip types that ask for it.
    if (!option.needsReturnDate) setReturnDate(null);
    setShowTripTypePicker(false);
  }, []);

  /* -------- Validation -------- *
   * Errors only show after the first submit attempt, so the customer
   * is not warned while still filling the form.
   */
  const errors = useMemo(() => {
    const pickupAt =
      pickupDate && pickupTime
        ? combineDateAndTime(pickupDate, pickupTime)
        : null;
    const passengerCount = Number(passengers);
    return {
      tripType: tripType === null,
      pickupCity: pickupCity.trim().length === 0,
      dropCity: dropCity.trim().length === 0,
      pickupDate: pickupDate === null,
      pickupTime: pickupTime === null,
      pickupInPast: pickupAt !== null && pickupAt.getTime() <= Date.now(),
      returnDate: needsReturnDate && returnDate === null,
      returnBeforePickup:
        needsReturnDate &&
        returnDate !== null &&
        pickupDate !== null &&
        startOfDay(returnDate).getTime() < startOfDay(pickupDate).getTime(),
      passengers:
        passengers.trim().length === 0 ||
        !Number.isInteger(passengerCount) ||
        passengerCount <= 0,
    };
  }, [
    tripType,
    pickupCity,
    dropCity,
    pickupDate,
    pickupTime,
    needsReturnDate,
    returnDate,
    passengers,
  ]);

  const hasErrors = Object.values(errors).some(Boolean);
  const showError = (key: keyof typeof errors) => triedSubmit && errors[key];

  const onSubmit = useCallback(() => {
    setTriedSubmit(true);
    if (hasErrors || !tripType || !pickupDate || !pickupTime) return;

    const trimmedNotes = notes.trim();
    const request = submitTripRequest({
      tripType: tripType.value,
      tripTypeLabel: tripType.label,
      pickupCity: pickupCity.trim(),
      dropCity: dropCity.trim(),
      pickupAt: combineDateAndTime(pickupDate, pickupTime).toISOString(),
      returnAt:
        needsReturnDate && returnDate
          ? startOfDay(returnDate).toISOString()
          : null,
      passengers: Number(passengers),
      notes: trimmedNotes.length > 0 ? trimmedNotes : null,
    });

    navigation.replace('QuotationSuccess', { requestId: request.id });
  }, [
    hasErrors,
    tripType,
    pickupDate,
    pickupTime,
    notes,
    pickupCity,
    dropCity,
    needsReturnDate,
    returnDate,
    passengers,
    navigation,
  ]);

  /* -------- Render -------- */
  return (
    <SafeScreen edges={['top']} backgroundColor={Colors.background}>
      <View style={styles.headerWrap}>
        <ScreenHeader title="Plan a Trip" onBack={() => navigation.goBack()} />
      </View>

      {/*
        KeyboardAwareScrollView scrolls the focused input above the
        keyboard (the Notes box is the last field). `bottomOffset`
        keeps it clear of the sticky Submit bar too. Needs
        <KeyboardProvider>, which App.tsx already mounts.
      */}
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bottomOffset={120}
      >
        {/* ── Hero ────────────────────────────────────────── */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>
            Plan your{'\n'}next{' '}
            <Text style={styles.heroTitleAccent}>journey</Text>
          </Text>
          <Text style={styles.heroSubtitle}>
            Tell us your plan. Our travel expert will call you and prepare your
            quotation.
          </Text>
        </View>

        {/* ── Section 1: Trip details ─────────────────────── */}
        <SectionCard
          Icon={Route}
          title="Trip Details"
          subtitle="Where and when are you travelling?"
        >
          <FieldLabel text="Trip Type" required />
          <PressableRow
            LeadingIcon={Route}
            placeholder="Select trip type"
            value={tripType?.label ?? ''}
            onPress={() => setShowTripTypePicker(true)}
            hasError={showError('tripType')}
            trailingChevron
            accessibilityLabel="Trip type"
          />

          <View style={styles.fieldGap} />

          <FieldLabel text="Pickup City" required />
          <InputRow
            LeadingIcon={MapPin}
            placeholder="Enter pickup city"
            value={pickupCity}
            onChangeText={setPickupCity}
            hasError={showError('pickupCity')}
            autoCapitalize="words"
            maxLength={CITY_MAX_LENGTH}
            accessibilityLabel="Pickup city"
          />

          <View style={styles.fieldGap} />

          <FieldLabel text="Drop City" required />
          <InputRow
            LeadingIcon={MapPin}
            placeholder="Enter drop city"
            value={dropCity}
            onChangeText={setDropCity}
            hasError={showError('dropCity')}
            autoCapitalize="words"
            maxLength={CITY_MAX_LENGTH}
            accessibilityLabel="Drop city"
          />

          <View style={styles.fieldGap} />

          <View style={styles.row}>
            <View style={styles.rowItem}>
              <FieldLabel text="Pickup Date" required />
              <PressableRow
                LeadingIcon={Calendar}
                placeholder="Select date"
                value={pickupDate ? formatDate(pickupDate) : ''}
                onPress={() => setShowPickupDatePicker(true)}
                hasError={showError('pickupDate')}
                accessibilityLabel="Pickup date"
              />
            </View>
            <View style={styles.rowItem}>
              <FieldLabel text="Pickup Time" required />
              <PressableRow
                LeadingIcon={Clock}
                placeholder="Select time"
                value={pickupTime ? formatTime(pickupTime) : ''}
                onPress={() => setShowPickupTimePicker(true)}
                hasError={showError('pickupTime') || showError('pickupInPast')}
                accessibilityLabel="Pickup time"
              />
            </View>
          </View>
          {showError('pickupInPast') ? (
            <Text style={styles.errorText}>
              Pickup time has already passed. Choose a later time.
            </Text>
          ) : null}

          {needsReturnDate ? (
            <>
              <View style={styles.fieldGap} />
              <FieldLabel text="Return Date" required />
              <PressableRow
                LeadingIcon={CalendarCheck}
                placeholder="Select return date"
                value={returnDate ? formatDate(returnDate) : ''}
                onPress={() => setShowReturnDatePicker(true)}
                hasError={
                  showError('returnDate') || showError('returnBeforePickup')
                }
                accessibilityLabel="Return date"
              />
              {showError('returnBeforePickup') ? (
                <Text style={styles.errorText}>
                  Return date can't be before the pickup date.
                </Text>
              ) : null}
            </>
          ) : null}
        </SectionCard>

        {/* ── Section 2: Travellers ───────────────────────── */}
        <SectionCard
          Icon={Users}
          title="Travellers"
          subtitle="How many people are travelling?"
        >
          <FieldLabel text="Number of Passengers" required />
          <InputRow
            LeadingIcon={Users}
            placeholder="Enter number"
            value={passengers}
            onChangeText={t => setPassengers(t.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            maxLength={PASSENGERS_MAX_DIGITS}
            hasError={showError('passengers')}
            accessibilityLabel="Number of passengers"
          />

          <View style={styles.fieldGap} />

          <FieldLabel text="Notes" optional />
          <View style={styles.textareaWrap}>
            <View style={styles.textareaIcon}>
              <MessageSquare
                size={18}
                color={Colors.textTertiary}
                strokeWidth={2}
              />
            </View>
            <TextInput
              style={styles.textarea}
              placeholder={
                'Anything we should know?\n(luggage, stops, vehicle preference)'
              }
              placeholderTextColor={Colors.textTertiary}
              value={notes}
              onChangeText={setNotes}
              maxLength={NOTES_MAX_LENGTH}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              accessibilityLabel="Notes"
            />
          </View>
        </SectionCard>

        <View style={{ height: Spacing.xxl }} />
      </KeyboardAwareScrollView>

      {/* ── Submit CTA (sticky) ─────────────────────────── */}
      <View style={styles.submitBar}>
        {triedSubmit && hasErrors ? (
          <Text style={styles.submitHint}>
            Fill in the fields marked in red.
          </Text>
        ) : null}
        <Pressable
          onPress={onSubmit}
          style={({ pressed }) => [styles.submitBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Submit trip plan"
        >
          <Text style={styles.submitText}>Submit</Text>
        </Pressable>
      </View>

      {/* ── Native pickers ──────────────────────────────── *
       * datetimepicker v9: `onValueChange` when a value is picked,
       * `onDismiss` when cancelled. Both unmount the picker so the
       * toggle-and-remount pattern keeps working on Android.
       * -------------------------------------------------- */}
      {showPickupDatePicker ? (
        <DateTimePicker
          value={pickupDate ?? new Date()}
          mode="date"
          minimumDate={startOfDay(new Date())}
          onValueChange={(_event, selected) => {
            setShowPickupDatePicker(false);
            setPickupDate(selected);
          }}
          onDismiss={() => setShowPickupDatePicker(false)}
        />
      ) : null}
      {showPickupTimePicker ? (
        <DateTimePicker
          value={pickupTime ?? new Date()}
          mode="time"
          onValueChange={(_event, selected) => {
            setShowPickupTimePicker(false);
            setPickupTime(selected);
          }}
          onDismiss={() => setShowPickupTimePicker(false)}
        />
      ) : null}
      {showReturnDatePicker ? (
        <DateTimePicker
          value={returnDate ?? pickupDate ?? new Date()}
          mode="date"
          minimumDate={startOfDay(pickupDate ?? new Date())}
          onValueChange={(_event, selected) => {
            setShowReturnDatePicker(false);
            setReturnDate(selected);
          }}
          onDismiss={() => setShowReturnDatePicker(false)}
        />
      ) : null}

      {/* ── Trip type picker ────────────────────────────── */}
      <TripTypePickerModal
        visible={showTripTypePicker}
        options={MOCK_PLAN_TRIP_TYPES}
        selected={tripType?.value ?? null}
        onSelect={onTripTypeSelect}
        onDismiss={() => setShowTripTypePicker(false)}
      />
    </SafeScreen>
  );
};

export default PlanTripScreen;

/* ================================================================
 * Presentational subcomponents (local to this screen)
 * ================================================================ */

type SectionCardProps = {
  Icon: IconType;
  title: string;
  subtitle: string;
  children: React.ReactNode;
};

const SectionCard: React.FC<SectionCardProps> = ({
  Icon,
  title,
  subtitle,
  children,
}) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <View style={styles.cardHeaderIcon}>
        <Icon size={22} color={Colors.primary} strokeWidth={2} />
      </View>
      <View style={styles.cardHeaderText}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSubtitle}>{subtitle}</Text>
      </View>
    </View>
    <View style={styles.cardDivider} />
    {children}
  </View>
);

const FieldLabel: React.FC<{
  text: string;
  required?: boolean;
  optional?: boolean;
}> = ({ text, required, optional }) => (
  <Text style={styles.fieldLabel}>
    {text}
    {required ? <Text style={styles.required}> *</Text> : null}
    {optional ? <Text style={styles.optional}> (optional)</Text> : null}
  </Text>
);

type InputRowProps = {
  LeadingIcon: IconType;
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  keyboardType?: 'default' | 'number-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words';
  maxLength?: number;
  hasError?: boolean;
  accessibilityLabel: string;
};

const InputRow: React.FC<InputRowProps> = ({
  LeadingIcon,
  placeholder,
  value,
  onChangeText,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  maxLength,
  hasError,
  accessibilityLabel,
}) => (
  <View style={[styles.inputRow, hasError && styles.inputRowError]}>
    <LeadingIcon size={18} color={Colors.textTertiary} strokeWidth={2} />
    <TextInput
      style={styles.inputText}
      placeholder={placeholder}
      placeholderTextColor={Colors.textTertiary}
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
      maxLength={maxLength}
      accessibilityLabel={accessibilityLabel}
    />
  </View>
);

type PressableRowProps = {
  LeadingIcon: IconType;
  placeholder: string;
  value: string;
  onPress: () => void;
  hasError?: boolean;
  trailingChevron?: boolean;
  accessibilityLabel: string;
};

const PressableRow: React.FC<PressableRowProps> = ({
  LeadingIcon,
  placeholder,
  value,
  onPress,
  hasError,
  trailingChevron,
  accessibilityLabel,
}) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      styles.inputRow,
      hasError && styles.inputRowError,
      pressed && styles.pressed,
    ]}
    accessibilityRole="button"
    accessibilityLabel={`${accessibilityLabel}, ${value || 'not selected'}`}
  >
    <LeadingIcon size={18} color={Colors.textTertiary} strokeWidth={2} />
    <Text
      style={[styles.inputText, !value && styles.placeholderText]}
      numberOfLines={1}
    >
      {value || placeholder}
    </Text>
    {trailingChevron ? (
      <ChevronDown size={18} color={Colors.textTertiary} strokeWidth={2} />
    ) : null}
  </Pressable>
);

/* -------- Trip type picker (bottom sheet) ----------------------- */

const TripTypePickerModal: React.FC<{
  visible: boolean;
  options: readonly PlanTripTypeOption[];
  selected: string | null;
  onSelect: (option: PlanTripTypeOption) => void;
  onDismiss: () => void;
}> = ({ visible, options, selected, onSelect, onDismiss }) => (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    onRequestClose={onDismiss}
  >
    <Pressable style={styles.modalBackdrop} onPress={onDismiss}>
      <Pressable style={styles.modalSheet} onPress={() => undefined}>
        <View style={styles.modalHandle} />
        <Text style={styles.modalTitle}>Trip Type</Text>
        {options.map(opt => {
          const isActive = opt.value === selected;
          return (
            <Pressable
              key={opt.value}
              onPress={() => onSelect(opt)}
              style={({ pressed }) => [
                styles.modalOption,
                isActive && styles.modalOptionActive,
                pressed && styles.pressed,
              ]}
              accessibilityRole="radio"
              accessibilityState={{ checked: isActive }}
            >
              <Text
                style={[
                  styles.modalOptionText,
                  isActive && styles.modalOptionTextActive,
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </Pressable>
    </Pressable>
  </Modal>
);

/* ================================================================
 * Styles
 * ================================================================ */

const styles = StyleSheet.create({
  headerWrap: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  scroll: {
    paddingBottom: Spacing.section,
  },

  /* Hero */
  hero: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  heroTitle: {
    ...Typography.h2,
    color: Colors.textPrimary,
    fontWeight: '800',
    lineHeight: 40,
  },
  heroTitleAccent: {
    color: Colors.accent,
  },
  heroSubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    lineHeight: 20,
  },

  /* Section card */
  card: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.xs,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  cardHeaderIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.circle,
    backgroundColor: Colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderText: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  cardSubtitle: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
  cardDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: Spacing.lg,
  },

  /* Field primitives */
  fieldLabel: {
    ...Typography.label,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
    fontWeight: '600',
  },
  required: {
    color: Colors.error,
    fontWeight: '700',
  },
  optional: {
    color: Colors.textTertiary,
    fontWeight: '400',
  },
  fieldGap: {
    height: Spacing.md,
  },
  errorText: {
    ...Typography.caption,
    color: Colors.error,
    marginTop: Spacing.sm,
  },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    height: 48,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  inputRowError: {
    borderColor: Colors.error,
  },
  inputText: {
    ...Typography.body,
    color: Colors.textPrimary,
    flex: 1,
    padding: 0, // remove Android default vertical padding
  },
  placeholderText: {
    color: Colors.textTertiary,
  },

  /* Row split (Pickup Date | Pickup Time) */
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  rowItem: {
    flex: 1,
  },

  /* Textarea */
  textareaWrap: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    minHeight: 96,
  },
  textareaIcon: {
    paddingTop: 2,
  },
  textarea: {
    ...Typography.body,
    color: Colors.textPrimary,
    flex: 1,
    padding: 0,
    minHeight: 72,
  },

  /* Sticky submit */
  submitBar: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    gap: Spacing.sm,
  },
  submitHint: {
    ...Typography.caption,
    color: Colors.error,
    textAlign: 'center',
  },
  submitBtn: {
    height: 52,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  submitText: {
    ...Typography.button,
    color: Colors.textOnPrimary,
    fontWeight: '700',
  },

  /* Modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: Radius.pill,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  modalTitle: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  modalOption: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.sm,
  },
  modalOptionActive: {
    backgroundColor: Colors.primaryTint,
  },
  modalOptionText: {
    ...Typography.body,
    color: Colors.textPrimary,
  },
  modalOptionTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },

  pressed: {
    opacity: 0.75,
  },
});
