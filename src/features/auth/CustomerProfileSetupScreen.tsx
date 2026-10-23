/**
 * ------------------------------------------------------------------
 * CustomerProfileSetupScreen — "Complete your profile"
 * ------------------------------------------------------------------
 * Shown once, to a NEW customer, after /auth/otp/verify returned
 * 'onboarding_required'. Collects first name, last name (optional),
 * email (optional), customer type and city, then calls
 * POST /auth/customer/onboard. On success the user is logged in and
 * RootNavigator swaps to Customer Home, where the first-time welcome
 * plays (only when the server created a new account).
 *
 * LAYOUT: plain white page; each field is one bordered box with its
 * icon inside; customer type is three stacked cards (icon, label,
 * description) so no label is cut off; city gets the full width with
 * "Use my current location" below it; Continue is pinned at the
 * bottom and rides above the keyboard.
 *
 * NO WAY BACK: the OTP is already spent and the onboarding ticket is
 * single-use, so there is no back arrow, no swipe-back, and Android
 * hardware back is blocked. If the ticket expires, the only way on is
 * "Verify mobile again", which resets to Login.
 *
 * Validation mirrors the backend's CustomerOnboardBody exactly
 * (lengths match the customers columns). The server stays the
 * authority; its errors are shown here too.
 *
 * City: typed, or filled by "Use my current location"
 * (services/location/detectCity: OS geocoder, no paid API). A
 * detected city stays editable and is saved exactly as shown.
 * ------------------------------------------------------------------
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  KeyboardAwareScrollView,
  KeyboardStickyView,
} from 'react-native-keyboard-controller';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import { z } from 'zod';
import {
  ArrowRight,
  Briefcase,
  Building2,
  Check,
  CircleCheck,
  LocateFixed,
  Mail,
  MapPin,
  User,
  X,
  type LucideIcon,
} from 'lucide-react-native';

import { Colors, Dimensions, Radius, Spacing, Typography } from '../../theme';
import type { AuthParamList } from '../../navigation/types';
import { ApiError } from '@api/errors';
import { formatIndianMobile } from '@shared/utils';
import { openLocationSettings } from '@services/permissions';
import {
  detectCity,
  type DetectCityResult,
} from '@services/location/detectCity';
import { logEvent } from '@services/telemetry/logEvent';
import { useCustomerOnboard } from './hooks';
import type { CustomerSignupType } from './hooks/useCustomerOnboard';

/* -----------------------------------------------------------------
 * Types & schema (mirrors backend modules/auth/schemas.ts)
 * ----------------------------------------------------------------- */

type ScreenRoute = RouteProp<AuthParamList, 'CustomerProfileSetup'>;
type ScreenNav = NativeStackNavigationProp<
  AuthParamList,
  'CustomerProfileSetup'
>;

type ProfileForm = {
  firstName: string;
  lastName: string;
  email: string;
  customerType: CustomerSignupType | null;
  city: string;
};

type FieldName = 'firstName' | 'lastName' | 'email' | 'city';

const NAME_RE = /^[\p{L}][\p{L}\p{M} .'-]*$/u;
const CITY_RE = /^[\p{L}][\p{L}\p{M} .'()-]*$/u;

const profileSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, 'Enter your first name')
    .max(50, 'Use 50 characters or fewer')
    .regex(NAME_RE, 'Use letters only'),
  lastName: z
    .string()
    .trim()
    .max(50, 'Use 50 characters or fewer')
    .refine(v => v === '' || NAME_RE.test(v), 'Use letters only'),
  email: z
    .string()
    .trim()
    .max(100, 'Use 100 characters or fewer')
    .refine(v => v === '' || z.email().safeParse(v).success, {
      message: 'Enter a valid email',
    }),
  customerType: z
    .enum(['personal', 'corporate', 'agent'])
    .nullable()
    .refine(v => v !== null, 'Choose how you\u2019re booking'),
  city: z
    .string()
    .transform(v => v.trim().replace(/\s+/g, ' '))
    .pipe(
      z
        .string()
        .min(1, 'Enter your city')
        .max(100, 'Use 100 characters or fewer')
        .regex(CITY_RE, 'Use letters only')
        .refine(v => v.toLowerCase() !== 'unknown', 'Enter your city'),
    ),
});

const profileResolver: Resolver<ProfileForm> = async values => {
  const result = profileSchema.safeParse(values);
  if (result.success) {
    return { values: result.data, errors: {} };
  }
  const fieldErrors: Record<string, { type: string; message: string }> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? 'firstName');
    if (!fieldErrors[key]) {
      fieldErrors[key] = { type: 'validation', message: issue.message };
    }
  }
  return { values: {} as ProfileForm, errors: fieldErrors as never };
};

/* -----------------------------------------------------------------
 * Static config
 * ----------------------------------------------------------------- */

const CUSTOMER_TYPES: ReadonlyArray<{
  value: CustomerSignupType;
  label: string;
  description: string;
  Icon: LucideIcon;
}> = [
  {
    value: 'personal',
    label: 'Personal',
    description: 'For myself or family',
    Icon: User,
  },
  {
    value: 'corporate',
    label: 'Corporate',
    description: 'For my company',
    Icon: Building2,
  },
  {
    value: 'agent',
    label: 'Agent',
    description: 'For my clients',
    Icon: Briefcase,
  },
];

type CityNote = {
  tone: 'success' | 'warning';
  text: string;
  /** Offered when the device's location switch is off. */
  showLocationSettings?: boolean;
};

function noteForDetect(result: DetectCityResult): CityNote {
  switch (result.status) {
    case 'found':
      return {
        tone: 'success',
        text: 'City detected. You can edit it if it\u2019s wrong.',
      };
    case 'denied':
      return {
        tone: 'warning',
        text: 'Location access wasn\u2019t allowed. Type your city instead.',
      };
    case 'blocked':
      return {
        tone: 'warning',
        text: 'Location access is off for Urban Cruise. Type your city, or allow it in Settings.',
      };
    case 'locationOff':
      return {
        tone: 'warning',
        text: 'Your phone\u2019s location is off. Turn it on, or type your city.',
        showLocationSettings: true,
      };
    case 'notFound':
      return {
        tone: 'warning',
        text: 'Couldn\u2019t detect your city. Type it instead.',
      };
  }
}

type SubmitError = {
  text: string;
  /** 'restart': the ticket is gone; only verifying again helps. */
  kind: 'retry' | 'restart';
};

function submitErrorFrom(err: unknown): SubmitError {
  if (!(err instanceof ApiError)) {
    return { kind: 'retry', text: 'Something went wrong. Try again.' };
  }
  switch (err.code) {
    case 'onboarding_expired':
    case 'onboarding_invalid':
      return {
        kind: 'restart',
        text: 'This sign-up session expired. Verify your mobile number again to continue.',
      };
    case 'mobile_blocked':
      return {
        kind: 'restart',
        text: 'This number can\u2019t be used for Urban Cruise. Contact support for help.',
      };
  }
  switch (err.kind) {
    case 'network':
      return {
        kind: 'retry',
        text: 'Couldn\u2019t reach Urban Cruise. Check your connection and try again.',
      };
    case 'timeout':
      return { kind: 'retry', text: 'This took too long. Try again.' };
    case 'validation':
      return { kind: 'retry', text: err.message };
    case 'rateLimited':
      return {
        kind: 'retry',
        text: 'Too many attempts. Wait a moment and try again.',
      };
    default:
      return { kind: 'retry', text: 'Something went wrong. Try again.' };
  }
}

const EXPIRED_ERROR: SubmitError = {
  kind: 'restart',
  text: 'This sign-up session expired. Verify your mobile number again to continue.',
};

/* -----------------------------------------------------------------
 * Screen
 * ----------------------------------------------------------------- */

const CustomerProfileSetupScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<ScreenNav>();
  const { params } = useRoute<ScreenRoute>();
  const { onboard, isPending } = useCustomerOnboard();

  // Local deadline, started after the server issued the ticket, so it
  // never expires before the server's own expiry.
  const deadlineRef = useRef(Date.now() + params.expiresInSeconds * 1000);
  const citySourceRef = useRef<'detected' | 'typed'>('typed');
  const lastNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const cityRef = useRef<TextInput>(null);
  const mountedRef = useRef(true);

  const [focused, setFocused] = useState<FieldName | null>(null);
  const [locating, setLocating] = useState(false);
  const [cityNote, setCityNote] = useState<CityNote | null>(null);
  const [submitError, setSubmitError] = useState<SubmitError | null>(null);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ProfileForm>({
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      customerType: null,
      city: '',
    },
    resolver: profileResolver,
  });

  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    [],
  );

  /* Android hardware back: blocked (see header). */
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
      return () => sub.remove();
    }, []),
  );

  const restart = useCallback(() => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login', params: { role: 'customer' } }],
    });
  }, [navigation]);

  const handleUseLocation = useCallback(async () => {
    if (locating || isPending) return;
    setLocating(true);
    setCityNote(null);
    const result = await detectCity();
    logEvent('auth.city_detect_result', { status: result.status });
    if (!mountedRef.current) return;
    setLocating(false);
    if (result.status === 'found') {
      citySourceRef.current = 'detected';
      setValue('city', result.city, {
        shouldValidate: true,
        shouldDirty: true,
      });
    } else {
      cityRef.current?.focus();
    }
    setCityNote(noteForDetect(result));
  }, [isPending, locating, setValue]);

  const onValid = useCallback(
    async (values: ProfileForm) => {
      if (isPending || values.customerType === null) return;
      setSubmitError(null);

      if (Date.now() >= deadlineRef.current) {
        setSubmitError(EXPIRED_ERROR);
        return;
      }

      try {
        // On success the hook logs the user in; RootNavigator then
        // swaps to Customer Home. No navigation call here.
        await onboard({
          onboardingToken: params.onboardingToken,
          firstName: values.firstName,
          lastName: values.lastName === '' ? null : values.lastName,
          email: values.email === '' ? null : values.email,
          customerType: values.customerType,
          city: values.city,
          citySource: citySourceRef.current,
        });
      } catch (err) {
        if (mountedRef.current) setSubmitError(submitErrorFrom(err));
      }
    },
    [isPending, onboard, params.onboardingToken],
  );

  const isRestart = submitError?.kind === 'restart';
  const onContinue = isRestart ? restart : handleSubmit(onValid);
  const busy = isPending || locating;
  const footerBottom = Math.max(insets.bottom, Spacing.lg);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <KeyboardAwareScrollView
        style={styles.flex}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        bottomOffset={FOOTER_HEIGHT + Spacing.lg}
        showsVerticalScrollIndicator={false}
      >
        {/* Verified badge */}
        <View style={styles.verified}>
          <CircleCheck
            size={16}
            color={Colors.primaryDark}
            strokeWidth={2.25}
          />
          <Text style={styles.verifiedText}>
            +91 {formatIndianMobile(params.phone)} verified
          </Text>
        </View>

        <Text style={styles.title} accessibilityRole="header">
          Complete your profile
        </Text>
        <Text style={styles.subtitle}>
          Tell us a little about you to set up your account.
        </Text>

        {/* First name */}
        <View style={styles.group}>
          <Text style={styles.label}>First name</Text>
          <Controller
            control={control}
            name="firstName"
            render={({ field: { onChange, onBlur, value } }) => (
              <Field
                Icon={User}
                focused={focused === 'firstName'}
                error={errors.firstName?.message}
                value={value}
                onChangeText={onChange}
                onFocus={() => setFocused('firstName')}
                onBlur={() => {
                  setFocused(null);
                  onBlur();
                }}
                placeholder="Enter first name"
                autoCapitalize="words"
                autoComplete="name-given"
                textContentType="givenName"
                maxLength={50}
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => lastNameRef.current?.focus()}
                editable={!isPending}
                accessibilityLabel="First name, required"
              />
            )}
          />
        </View>

        {/* Last name */}
        <View style={styles.group}>
          <Text style={styles.label}>
            Last name <Text style={styles.optional}>(optional)</Text>
          </Text>
          <Controller
            control={control}
            name="lastName"
            render={({ field: { onChange, onBlur, value } }) => (
              <Field
                inputRef={lastNameRef}
                Icon={User}
                focused={focused === 'lastName'}
                error={errors.lastName?.message}
                value={value}
                onChangeText={onChange}
                onFocus={() => setFocused('lastName')}
                onBlur={() => {
                  setFocused(null);
                  onBlur();
                }}
                placeholder="Enter last name"
                autoCapitalize="words"
                autoComplete="name-family"
                textContentType="familyName"
                maxLength={50}
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => emailRef.current?.focus()}
                editable={!isPending}
                accessibilityLabel="Last name, optional"
              />
            )}
          />
        </View>

        {/* Email */}
        <View style={styles.group}>
          <Text style={styles.label}>
            Email <Text style={styles.optional}>(optional)</Text>
          </Text>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <Field
                inputRef={emailRef}
                Icon={Mail}
                focused={focused === 'email'}
                error={errors.email?.message}
                value={value}
                onChangeText={onChange}
                onFocus={() => setFocused('email')}
                onBlur={() => {
                  setFocused(null);
                  onBlur();
                }}
                placeholder="name@example.com"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                keyboardType="email-address"
                maxLength={100}
                returnKeyType="done"
                editable={!isPending}
                accessibilityLabel="Email, optional"
              />
            )}
          />
        </View>

        {/* Customer type */}
        <View style={styles.group}>
          <Text style={styles.label}>I{'\u2019'}m booking as</Text>
          <Controller
            control={control}
            name="customerType"
            render={({ field: { onChange, value } }) => (
              <View
                style={styles.typeRow}
                accessibilityRole="radiogroup"
                accessibilityLabel="I'm booking as"
              >
                {CUSTOMER_TYPES.map(
                  ({ value: v, label, description, Icon }) => {
                    const selected = value === v;
                    return (
                      <Pressable
                        key={v}
                        onPress={() => onChange(v)}
                        disabled={isPending}
                        accessibilityRole="radio"
                        accessibilityState={{ selected, disabled: isPending }}
                        accessibilityLabel={`${label}, ${description}`}
                        style={({ pressed }) => [
                          styles.typeCard,
                          selected && styles.typeCardSelected,
                          errors.customerType && !value && styles.boxError,
                          pressed && styles.pressed,
                        ]}
                      >
                        {selected ? (
                          <View style={styles.typeCheck}>
                            <Check
                              size={12}
                              color={Colors.textInverse}
                              strokeWidth={3}
                            />
                          </View>
                        ) : null}
                        <View
                          style={[
                            styles.typeIcon,
                            selected && styles.typeIconSelected,
                          ]}
                        >
                          <Icon
                            size={22}
                            color={
                              selected
                                ? Colors.primaryDark
                                : Colors.textSecondary
                            }
                            strokeWidth={2}
                          />
                        </View>
                        <Text
                          style={[
                            styles.typeLabel,
                            selected && styles.typeLabelSelected,
                          ]}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.85}
                        >
                          {label}
                        </Text>
                        <Text style={styles.typeDescription} numberOfLines={2}>
                          {description}
                        </Text>
                      </Pressable>
                    );
                  },
                )}
              </View>
            )}
          />
          {errors.customerType?.message ? (
            <Text style={styles.errorText} accessibilityLiveRegion="polite">
              {errors.customerType.message}
            </Text>
          ) : null}
        </View>

        {/* City */}
        <View style={styles.groupLast}>
          <Text style={styles.label}>City</Text>
          <Controller
            control={control}
            name="city"
            render={({ field: { onChange, onBlur, value } }) => (
              <Field
                inputRef={cityRef}
                Icon={MapPin}
                focused={focused === 'city'}
                error={errors.city?.message}
                value={value}
                onChangeText={text => {
                  citySourceRef.current = 'typed';
                  setCityNote(null);
                  onChange(text);
                }}
                onFocus={() => setFocused('city')}
                onBlur={() => {
                  setFocused(null);
                  onBlur();
                }}
                placeholder="Enter your city"
                autoCapitalize="words"
                autoComplete="postal-address-locality"
                textContentType="addressCity"
                maxLength={100}
                returnKeyType="done"
                onSubmitEditing={handleSubmit(onValid)}
                editable={!busy}
                accessibilityLabel="City"
                trailing={
                  value !== '' && !busy ? (
                    <Pressable
                      onPress={() => {
                        citySourceRef.current = 'typed';
                        setCityNote(null);
                        onChange('');
                        cityRef.current?.focus();
                      }}
                      hitSlop={12}
                      accessibilityRole="button"
                      accessibilityLabel="Clear city"
                    >
                      <X
                        size={18}
                        color={Colors.textTertiary}
                        strokeWidth={2}
                      />
                    </Pressable>
                  ) : null
                }
              />
            )}
          />

          <Pressable
            onPress={handleUseLocation}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Use my current location to fill in the city"
            accessibilityState={{ disabled: busy, busy: locating }}
            style={({ pressed }) => [
              styles.locationBtn,
              pressed && styles.pressed,
            ]}
          >
            {locating ? (
              <ActivityIndicator size="small" color={Colors.primaryDark} />
            ) : (
              <LocateFixed
                size={18}
                color={Colors.primaryDark}
                strokeWidth={2}
              />
            )}
            <Text style={styles.locationText}>
              {locating ? 'Finding your city\u2026' : 'Use my current location'}
            </Text>
          </Pressable>

          {cityNote && !errors.city ? (
            <Text
              style={[
                styles.cityNote,
                cityNote.tone === 'success'
                  ? styles.cityNoteSuccess
                  : styles.cityNoteWarning,
              ]}
              accessibilityLiveRegion="polite"
            >
              {cityNote.text}
              {cityNote.showLocationSettings ? (
                <Text
                  style={styles.inlineLink}
                  onPress={() => {
                    openLocationSettings().catch(() => undefined);
                  }}
                  accessibilityRole="link"
                >
                  {' '}
                  Open settings
                </Text>
              ) : null}
            </Text>
          ) : null}
        </View>

        {submitError ? (
          <View
            style={[styles.submitError, isRestart && styles.submitErrorRestart]}
            accessibilityLiveRegion="assertive"
          >
            <Text
              style={[
                styles.submitErrorText,
                isRestart && styles.submitErrorTextRestart,
              ]}
            >
              {submitError.text}
            </Text>
          </View>
        ) : null}
      </KeyboardAwareScrollView>

      {/* Pinned footer; rides above the keyboard. */}
      <KeyboardStickyView offset={{ opened: footerBottom - Spacing.md }}>
        <View style={[styles.footer, { paddingBottom: footerBottom }]}>
          <Pressable
            onPress={onContinue}
            disabled={busy}
            accessibilityRole="button"
            accessibilityState={{ disabled: busy, busy: isPending }}
            accessibilityLabel={isRestart ? 'Verify mobile again' : 'Continue'}
            style={({ pressed }) => [
              styles.cta,
              busy && styles.ctaBusy,
              pressed && !busy && styles.ctaPressed,
            ]}
          >
            {isPending ? (
              <>
                <ActivityIndicator size="small" color={Colors.textInverse} />
                <Text style={styles.ctaText}>
                  Creating your account{'\u2026'}
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.ctaText}>
                  {isRestart ? 'Verify mobile again' : 'Continue'}
                </Text>
                <ArrowRight
                  size={20}
                  color={Colors.textInverse}
                  strokeWidth={2.25}
                />
              </>
            )}
          </Pressable>
        </View>
      </KeyboardStickyView>
    </View>
  );
};

/* -----------------------------------------------------------------
 * Field — one bordered box: icon, input, optional trailing action
 * ----------------------------------------------------------------- */

type FieldProps = Omit<TextInputProps, 'style'> & {
  Icon: LucideIcon;
  focused: boolean;
  error?: string;
  inputRef?: React.Ref<TextInput>;
  trailing?: React.ReactNode;
};

const Field: React.FC<FieldProps> = ({
  Icon,
  focused,
  error,
  inputRef,
  trailing,
  ...inputProps
}) => (
  <View>
    <View
      style={[
        styles.field,
        focused && styles.fieldFocused,
        error ? styles.boxError : null,
      ]}
    >
      <Icon
        size={20}
        color={focused ? Colors.primaryDark : Colors.textTertiary}
        strokeWidth={2}
      />
      <TextInput
        ref={inputRef}
        style={styles.input}
        placeholderTextColor={Colors.textTertiary}
        {...inputProps}
      />
      {trailing}
    </View>
    {error ? (
      <Text style={styles.errorText} accessibilityLiveRegion="polite">
        {error}
      </Text>
    ) : null}
  </View>
);

export default CustomerProfileSetupScreen;

/* -----------------------------------------------------------------
 * Styles
 * ----------------------------------------------------------------- */

const FIELD_HEIGHT = 52;
const FOOTER_HEIGHT = Dimensions.buttonHeightLarge + Spacing.md * 2;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: Dimensions.screenHorizontalPadding,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  pressed: {
    opacity: 0.85,
  },

  /* Header */
  verified: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.circle,
    backgroundColor: Colors.primaryTint,
  },
  verifiedText: {
    ...Typography.bodySmall,
    color: Colors.primaryDark,
    fontWeight: '600',
  },
  title: {
    ...Typography.h3,
    color: Colors.textPrimary,
    fontWeight: '800',
    marginTop: Spacing.lg,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    marginBottom: Spacing.xxl,
  },

  /* Groups & labels */
  group: {
    marginBottom: Spacing.xl,
  },
  groupLast: {
    marginBottom: Spacing.lg,
  },
  label: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  optional: {
    color: Colors.textSecondary,
    fontWeight: '400',
  },

  /* Field */
  field: {
    height: FIELD_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  fieldFocused: {
    borderColor: Colors.primary,
  },
  boxError: {
    borderColor: Colors.error,
  },
  input: {
    flex: 1,
    ...Typography.bodyLarge,
    color: Colors.textPrimary,
    padding: 0,
  },
  errorText: {
    ...Typography.bodySmall,
    color: Colors.error,
    marginTop: 6,
  },

  /* Customer type */
  typeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  typeCard: {
    flex: 1,
    alignItems: 'center',
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.xs,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  typeCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryWash,
  },
  typeCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryDark,
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceMuted,
    marginBottom: 6,
  },
  typeIconSelected: {
    backgroundColor: Colors.primaryTint,
  },
  typeLabel: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  typeLabelSelected: {
    color: Colors.primaryDark,
  },
  typeDescription: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },

  /* City */
  locationBtn: {
    height: 44,
    marginTop: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.primaryLight,
    backgroundColor: Colors.primaryWash,
  },
  locationText: {
    ...Typography.body,
    color: Colors.primaryDark,
    fontWeight: '600',
  },
  cityNote: {
    ...Typography.bodySmall,
    marginTop: Spacing.sm,
  },
  cityNoteSuccess: {
    color: Colors.primaryDark,
  },
  cityNoteWarning: {
    color: Colors.pendingDark,
  },
  inlineLink: {
    color: Colors.primaryDark,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },

  /* Submit error */
  submitError: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.redWashBorder,
    backgroundColor: Colors.redWash,
  },
  submitErrorRestart: {
    borderColor: Colors.amberWashBorder,
    backgroundColor: Colors.amberWash,
  },
  submitErrorText: {
    ...Typography.bodySmall,
    color: Colors.error,
  },
  submitErrorTextRestart: {
    color: Colors.pendingDark,
  },

  /* Footer */
  footer: {
    paddingTop: Spacing.md,
    paddingHorizontal: Dimensions.screenHorizontalPadding,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    backgroundColor: Colors.background,
  },
  cta: {
    height: Dimensions.buttonHeightLarge,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  ctaBusy: {
    backgroundColor: Colors.primaryLight,
  },
  ctaPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  ctaText: {
    ...Typography.button,
    color: Colors.buttonPrimaryText,
  },
});
