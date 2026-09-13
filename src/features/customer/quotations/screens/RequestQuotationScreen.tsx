/**
 * ------------------------------------------------------------------
 * RequestQuotationScreen  (Customer)
 * ------------------------------------------------------------------
 * Multi-section form that captures a customer's travel intent so
 * the ops team can prepare a customised quotation.
 *
 * SECTIONS (top → bottom):
 *   1. Journey Details       — from / to / travel date / trip type
 *                              / pickup time
 *   2. Vehicle Requirement   — passenger count + preferred vehicle
 *                              type (Car / Tempo Traveller / Urbania /
 *                              Bus) or an explicit "Not sure — suggest
 *                              the best option for me" opt-out
 *   3. Additional Information — purpose / occasion + free-form notes
 *
 * SCOPE (this pass — UI only):
 *   No backend integration. Submit runs client-side "required" checks
 *   and, on success, generates a placeholder Request ID of the form
 *   QREQ-YYYY-##### and navigates to QuotationSuccess with it. When
 *   the backend lands, the ID will come from POST /customer/enquiries
 *   and this screen will switch to a mutation hook — the navigation
 *   contract with QuotationSuccess stays the same.
 *
 * FORM STATE:
 *   Plain useState. The wider app uses react-hook-form + zod for
 *   real forms; that will layer in when the endpoint is wired and
 *   we have a canonical request DTO to schematise. For a UI-only
 *   prototype the extra machinery would be dead weight.
 * ------------------------------------------------------------------
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
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
  ArrowLeftRight,
  Bus,
  Calendar,
  Car,
  CarFront,
  ChevronDown,
  Clock,
  FileText,
  MapPin,
  MessageSquare,
  Plane,
  RefreshCw,
  Star,
  Truck,
  Users,
} from 'lucide-react-native';

import { SafeScreen, ScreenHeader } from '@shared/components';
import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';
import type { CustomerStackParamList } from '@navigation/types';

type Nav = NativeStackNavigationProp<
  CustomerStackParamList,
  'RequestQuotation'
>;

/* ================================================================
 * Domain constants
 * ================================================================ */

type TripType = 'one_way' | 'round_trip' | 'pickup_drop';

type TripTypeOption = {
  key: TripType;
  label: string;
  Icon: React.ComponentType<{
    size?: number;
    color?: string;
    strokeWidth?: number;
  }>;
};

/**
 * Icon set mirrors the Quotations-tab filter chips so the same
 * trip concept reads identically wherever it appears in the app.
 */
const TRIP_TYPE_OPTIONS: readonly TripTypeOption[] = [
  { key: 'one_way', label: 'One Way', Icon: Plane },
  { key: 'round_trip', label: 'Round Trip', Icon: RefreshCw },
  { key: 'pickup_drop', label: 'Pickup & Drop', Icon: ArrowLeftRight },
];

type VehicleKey = 'car' | 'tempo' | 'urbania' | 'bus';

type VehicleOption = {
  key: VehicleKey;
  label: string;
  Icon: React.ComponentType<{
    size?: number;
    color?: string;
    strokeWidth?: number;
  }>;
};

const VEHICLE_OPTIONS: readonly VehicleOption[] = [
  { key: 'car', label: 'Car', Icon: Car },
  { key: 'tempo', label: 'Tempo Traveller', Icon: CarFront },
  { key: 'urbania', label: 'Urbania', Icon: Truck },
  { key: 'bus', label: 'Bus', Icon: Bus },
];

const OCCASION_OPTIONS: readonly string[] = [
  'Family Trip',
  'Wedding',
  'Corporate Travel',
  'Airport Transfer',
  'Religious / Pilgrimage',
  'Outstation Tour',
  'Local Sightseeing',
  'Other',
];

/* ================================================================
 * Formatting helpers
 * ================================================================ */

const formatDate = (d: Date): string =>
  d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

const formatTime = (d: Date): string =>
  d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

/**
 * Client-side placeholder Request ID.
 * Shape mirrors the backend format (QREQ-YYYY-#####) so the success
 * screen doesn't have to guess about spacing / length. When the
 * backend takes over, delete this function and read the id from the
 * mutation response.
 */
const generatePlaceholderRequestId = (): string => {
  const year = new Date().getFullYear();
  const n = Math.floor(10_000 + Math.random() * 90_000); // 5-digit
  return `QREQ-${year}-${String(n).padStart(5, '0')}`;
};

/* ================================================================
 * Screen
 * ================================================================ */

const RequestQuotationScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();

  /* -------- Form state -------- */
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [travelDate, setTravelDate] = useState<Date | null>(null);
  const [pickupTime, setPickupTime] = useState<Date | null>(null);
  const [tripType, setTripType] = useState<TripType>('one_way');

  const [passengers, setPassengers] = useState('');
  const [vehicle, setVehicle] = useState<VehicleKey | null>(null);
  const [vehicleNotSure, setVehicleNotSure] = useState(false);

  const [occasion, setOccasion] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  /* -------- Picker UI state -------- */
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showVehiclePicker, setShowVehiclePicker] = useState(false);
  const [showOccasionPicker, setShowOccasionPicker] = useState(false);

  const [triedSubmit, setTriedSubmit] = useState(false);

  /* -------- Handlers -------- */
  const onVehicleSelect = useCallback((key: VehicleKey) => {
    setVehicle(key);
    setVehicleNotSure(false);
  }, []);

  const onNotSureToggle = useCallback(() => {
    setVehicleNotSure(prev => {
      const next = !prev;
      if (next) setVehicle(null);
      return next;
    });
  }, []);

  /* -------- Validation -------- *
   * Required: from, to, travelDate, pickupTime, passengers, and
   * either a vehicle or the explicit "Not sure" opt-out. Errors
   * only surface after the first submit attempt so users aren't
   * yelled at while they're still filling the form.
   */
  const errors = useMemo(
    () => ({
      from: from.trim().length === 0,
      to: to.trim().length === 0,
      travelDate: travelDate === null,
      pickupTime: pickupTime === null,
      passengers: passengers.trim().length === 0 || Number(passengers) <= 0,
      vehicle: vehicle === null && !vehicleNotSure,
    }),
    [from, to, travelDate, pickupTime, passengers, vehicle, vehicleNotSure],
  );

  const hasErrors = Object.values(errors).some(Boolean);
  const showError = (key: keyof typeof errors) => triedSubmit && errors[key];

  const onSubmit = useCallback(() => {
    setTriedSubmit(true);
    if (hasErrors) return;

    const requestId = generatePlaceholderRequestId();
    navigation.replace('QuotationSuccess', { requestId });
  }, [hasErrors, navigation]);

  /* -------- Render -------- */
  return (
    <SafeScreen edges={['top']} backgroundColor={Colors.background}>
      <View style={styles.headerWrap}>
        <ScreenHeader
          title="Request a Quotation"
          onBack={() => navigation.goBack()}
        />
      </View>

      {/*
        KeyboardAwareScrollView (react-native-keyboard-controller)
        auto-scrolls the focused input into view when the software
        keyboard opens. Without it, the "Additional Requirements"
        textarea — the last field on the form — sits behind the
        keyboard on Android and the user types blind.

        `bottomOffset` reserves clearance so the caret is not flush
        against the keyboard top; the value pairs with the sticky
        submit bar height (~52 + insets) plus a small margin so a
        newly focused input is scrolled clear of BOTH the keyboard
        and the CTA. Requires <KeyboardProvider> higher in the tree,
        which App.tsx already mounts.

        The inner horizontal chip strip stays a plain RN ScrollView —
        keyboard-aware behaviour is only for vertical scroll.
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
            Let's plan{'\n'}your next{' '}
            <Text style={styles.heroTitleAccent}>journey</Text>
          </Text>
          <Text style={styles.heroSubtitle}>
            Tell us your travel plan and our team will prepare the best options
            for you.
          </Text>
        </View>

        {/* ── Section 1: Journey Details ──────────────────── */}
        <SectionCard
          Icon={MapPin}
          title="Journey Details"
          subtitle="Where would you like to travel?"
        >
          <FieldLabel text="From" required />
          <InputRow
            LeadingIcon={MapPin}
            placeholder="Enter pickup location"
            value={from}
            onChangeText={setFrom}
            hasError={showError('from')}
          />

          <View style={styles.fieldGap} />

          <FieldLabel text="To" required />
          <InputRow
            LeadingIcon={MapPin}
            placeholder="Enter drop location"
            value={to}
            onChangeText={setTo}
            hasError={showError('to')}
          />

          <View style={styles.fieldGap} />

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <FieldLabel text="Travel Date" required />
              <PressableRow
                LeadingIcon={Calendar}
                placeholder="Select date"
                value={travelDate ? formatDate(travelDate) : ''}
                onPress={() => setShowDatePicker(true)}
                hasError={showError('travelDate')}
              />
            </View>

            <View style={styles.rowRight}>
              <FieldLabel text="Pickup Time" required />
              <PressableRow
                LeadingIcon={Clock}
                placeholder="Select time"
                value={pickupTime ? formatTime(pickupTime) : ''}
                onPress={() => setShowTimePicker(true)}
                hasError={showError('pickupTime')}
              />
            </View>
          </View>

          <View style={styles.fieldGap} />

          <FieldLabel text="Trip Type" />
          {/*
            Chip strip (not a plain segmented control) so the icons +
            longest label ("Pickup & Drop") stay readable at any
            width. Horizontal scroll is enabled as a safety net —
            it never actually scrolls on typical phones but prevents
            clipping on 320-wide devices.
          */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tripChipRow}
          >
            {TRIP_TYPE_OPTIONS.map(opt => (
              <TripTypeChip
                key={opt.key}
                option={opt}
                active={tripType === opt.key}
                onPress={() => setTripType(opt.key)}
              />
            ))}
          </ScrollView>
        </SectionCard>

        {/* ── Section 2: Vehicle Requirement ──────────────── */}
        <SectionCard
          Icon={Car}
          title="Vehicle Requirement"
          subtitle="How many people are travelling?"
        >
          <FieldLabel text="Number of Passengers" required />
          <InputRow
            LeadingIcon={Users}
            placeholder="Enter number"
            value={passengers}
            onChangeText={t => setPassengers(t.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            hasError={showError('passengers')}
          />

          <View style={styles.fieldGap} />

          <FieldLabel text="Preferred Vehicle Type" />
          {/*
            Dropdown row (opens VehiclePickerModal). The leading icon
            mirrors the current selection so the closed row reads at
            a glance; falls back to the generic Car icon before the
            user has picked anything.
          */}
          <PressableRow
            LeadingIcon={
              vehicle
                ? VEHICLE_OPTIONS.find(o => o.key === vehicle)?.Icon ?? Car
                : Car
            }
            placeholder="Select vehicle type"
            value={
              vehicle
                ? VEHICLE_OPTIONS.find(o => o.key === vehicle)?.label ?? ''
                : ''
            }
            onPress={() => setShowVehiclePicker(true)}
            trailingChevron
          />

          <Pressable
            onPress={onNotSureToggle}
            style={({ pressed }) => [
              styles.notSureRow,
              vehicleNotSure && styles.notSureRowActive,
              pressed && styles.pressed,
            ]}
            accessibilityRole="radio"
            accessibilityState={{ checked: vehicleNotSure }}
          >
            <View style={styles.notSureIcon}>
              <Star
                size={18}
                color={vehicleNotSure ? Colors.primary : Colors.textTertiary}
                strokeWidth={2}
                fill={vehicleNotSure ? Colors.primary : 'transparent'}
              />
            </View>
            <View style={styles.notSureBody}>
              <Text style={styles.notSureTitle}>Not sure</Text>
              <Text style={styles.notSureSubtitle}>
                Suggest the best option for me
              </Text>
            </View>
            <View style={[styles.radio, vehicleNotSure && styles.radioActive]}>
              {vehicleNotSure ? <View style={styles.radioDot} /> : null}
            </View>
          </Pressable>

          {showError('vehicle') ? (
            <Text style={styles.errorText}>
              Pick a vehicle type or choose "Not sure".
            </Text>
          ) : null}
        </SectionCard>

        {/* ── Section 3: Additional Information ───────────── */}
        <SectionCard
          Icon={FileText}
          title="Additional Information"
          subtitle="Help us serve you better."
        >
          <FieldLabel text="Purpose / Occasion" />
          <PressableRow
            LeadingIcon={Calendar}
            placeholder="Select occasion"
            value={occasion ?? ''}
            onPress={() => setShowOccasionPicker(true)}
            trailingChevron
          />

          <View style={styles.fieldGap} />

          <FieldLabel text="Additional Requirements" />
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
                'Tell us if you have any special requests...\n(e.g. luggage, stops, driver preference, etc.)'
              }
              placeholderTextColor={Colors.textTertiary}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </SectionCard>

        <View style={{ height: Spacing.xxl }} />
      </KeyboardAwareScrollView>

      {/* ── Submit CTA (sticky) ─────────────────────────── */}
      <View style={styles.submitBar}>
        <Pressable
          onPress={onSubmit}
          style={({ pressed }) => [styles.submitBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Submit request"
        >
          <Text style={styles.submitText}>Submit Request</Text>
        </Pressable>
      </View>

      {/* ── Native pickers ──────────────────────────────── *
       *
       * v9 split the old `onChange(event, date)` into three
       * callbacks: `onValueChange` (a value was picked),
       * `onDismiss` (cancelled), `onNeutralButtonPress` (the
       * Android neutral/clear button). We use the first two —
       * we do not render a neutral button, so the third is n/a.
       *
       * Both handlers unmount the picker so the toggle-and-remount
       * pattern keeps working on Android; on iOS spinner-style, the
       * caller can move to the inline `display="spinner"` layout
       * without touching this file's state machine.
       * -------------------------------------------------- */}
      {showDatePicker ? (
        <DateTimePicker
          value={travelDate ?? new Date()}
          mode="date"
          minimumDate={new Date()}
          onValueChange={(_event, selected) => {
            setShowDatePicker(false);
            setTravelDate(selected);
          }}
          onDismiss={() => setShowDatePicker(false)}
        />
      ) : null}
      {showTimePicker ? (
        <DateTimePicker
          value={pickupTime ?? new Date()}
          mode="time"
          onValueChange={(_event, selected) => {
            setShowTimePicker(false);
            setPickupTime(selected);
          }}
          onDismiss={() => setShowTimePicker(false)}
        />
      ) : null}

      {/* ── Vehicle picker modal ────────────────────────── */}
      <VehiclePickerModal
        visible={showVehiclePicker}
        selected={vehicle}
        onSelect={key => {
          onVehicleSelect(key);
          setShowVehiclePicker(false);
        }}
        onDismiss={() => setShowVehiclePicker(false)}
      />

      {/* ── Occasion picker modal ───────────────────────── */}
      <OccasionPickerModal
        visible={showOccasionPicker}
        selected={occasion}
        onSelect={val => {
          setOccasion(val);
          setShowOccasionPicker(false);
        }}
        onDismiss={() => setShowOccasionPicker(false)}
      />
    </SafeScreen>
  );
};

export default RequestQuotationScreen;

/* ================================================================
 * Presentational subcomponents
 *
 * Kept local — they only exist to keep the main screen readable
 * and have no reuse outside this flow. Promote to
 * `components/` if a second screen needs them.
 * ================================================================ */

type SectionCardProps = {
  Icon: React.ComponentType<{
    size?: number;
    color?: string;
    strokeWidth?: number;
  }>;
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

const FieldLabel: React.FC<{ text: string; required?: boolean }> = ({
  text,
  required,
}) => (
  <Text style={styles.fieldLabel}>
    {text}
    {required ? <Text style={styles.required}> *</Text> : null}
  </Text>
);

type InputRowProps = {
  LeadingIcon: React.ComponentType<{
    size?: number;
    color?: string;
    strokeWidth?: number;
  }>;
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  keyboardType?: 'default' | 'number-pad';
  hasError?: boolean;
  trailingChevron?: boolean;
};

const InputRow: React.FC<InputRowProps> = ({
  LeadingIcon,
  placeholder,
  value,
  onChangeText,
  keyboardType = 'default',
  hasError,
  trailingChevron,
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
    />
    {trailingChevron ? (
      <ChevronDown size={18} color={Colors.textTertiary} strokeWidth={2} />
    ) : null}
  </View>
);

type PressableRowProps = {
  LeadingIcon: React.ComponentType<{
    size?: number;
    color?: string;
    strokeWidth?: number;
  }>;
  placeholder: string;
  value: string;
  onPress: () => void;
  hasError?: boolean;
  trailingChevron?: boolean;
};

const PressableRow: React.FC<PressableRowProps> = ({
  LeadingIcon,
  placeholder,
  value,
  onPress,
  hasError,
  trailingChevron,
}) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      styles.inputRow,
      hasError && styles.inputRowError,
      pressed && styles.pressed,
    ]}
  >
    <LeadingIcon size={18} color={Colors.textTertiary} strokeWidth={2} />
    <Text
      style={[styles.inputText, !value && { color: Colors.textTertiary }]}
      numberOfLines={1}
    >
      {value || placeholder}
    </Text>
    {trailingChevron ? (
      <ChevronDown size={18} color={Colors.textTertiary} strokeWidth={2} />
    ) : null}
  </Pressable>
);

const TripTypeChip: React.FC<{
  option: TripTypeOption;
  active: boolean;
  onPress: () => void;
}> = ({ option, active, onPress }) => {
  const { Icon, label } = option;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.tripChip,
        active && styles.tripChipActive,
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Icon
        size={16}
        color={active ? Colors.textOnPrimary : Colors.textSecondary}
        strokeWidth={2}
      />
      <Text
        style={[styles.tripChipText, active && styles.tripChipTextActive]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
};

/* -------- Vehicle picker modal ---------------------------------- *
 * Bottom-sheet variant of OccasionPickerModal that also renders
 * each option's icon so the list reads at a glance. Split from the
 * occasion modal instead of parametrising because the two option
 * shapes differ (string vs typed object with an Icon) and merging
 * them would make the props confusing for a small win.
 * ----------------------------------------------------------------- */
const VehiclePickerModal: React.FC<{
  visible: boolean;
  selected: VehicleKey | null;
  onSelect: (key: VehicleKey) => void;
  onDismiss: () => void;
}> = ({ visible, selected, onSelect, onDismiss }) => (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    onRequestClose={onDismiss}
  >
    <Pressable style={styles.modalBackdrop} onPress={onDismiss}>
      <Pressable style={styles.modalSheet} onPress={() => undefined}>
        <View style={styles.modalHandle} />
        <Text style={styles.modalTitle}>Preferred Vehicle Type</Text>
        {VEHICLE_OPTIONS.map(opt => {
          const isActive = opt.key === selected;
          return (
            <Pressable
              key={opt.key}
              onPress={() => onSelect(opt.key)}
              style={({ pressed }) => [
                styles.modalOption,
                isActive && styles.modalOptionActive,
                pressed && styles.pressed,
              ]}
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

/* -------- Occasion picker modal --------------------------------- */

const OccasionPickerModal: React.FC<{
  visible: boolean;
  selected: string | null;
  onSelect: (value: string) => void;
  onDismiss: () => void;
}> = ({ visible, selected, onSelect, onDismiss }) => (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    onRequestClose={onDismiss}
  >
    <Pressable style={styles.modalBackdrop} onPress={onDismiss}>
      <Pressable style={styles.modalSheet} onPress={() => undefined}>
        <View style={styles.modalHandle} />
        <Text style={styles.modalTitle}>Purpose / Occasion</Text>
        {OCCASION_OPTIONS.map(opt => {
          const isActive = opt === selected;
          return (
            <Pressable
              key={opt}
              onPress={() => onSelect(opt)}
              style={({ pressed }) => [
                styles.modalOption,
                isActive && styles.modalOptionActive,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.modalOptionText,
                  isActive && styles.modalOptionTextActive,
                ]}
              >
                {opt}
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

  /* Row split (Travel Date | Trip Type) */
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  rowLeft: {
    flex: 1,
  },
  rowRight: {
    flex: 1,
  },

  /* Trip-type chip strip */
  tripChipRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingRight: Spacing.xs,
  },
  tripChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 40,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  tripChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tripChipText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  tripChipTextActive: {
    color: Colors.textOnPrimary,
    fontWeight: '700',
  },

  /* Not-sure row */
  notSureRow: {
    marginTop: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  notSureRowActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryTint,
  },
  notSureIcon: {
    width: 32,
    height: 32,
    borderRadius: Radius.circle,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceMuted,
  },
  notSureBody: {
    flex: 1,
    gap: 2,
  },
  notSureTitle: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  notSureSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: Radius.circle,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    borderColor: Colors.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: Radius.circle,
    backgroundColor: Colors.primary,
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
