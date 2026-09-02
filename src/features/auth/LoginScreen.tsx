/**
 * ------------------------------------------------------------------
 * LoginScreen — Production
 * ------------------------------------------------------------------
 * Role is read from Redux (`selectedRole`) with route param as a
 * fallback for the very first render after navigation. Tapping
 * "Change" opens a bottom sheet that dispatches selectRole(new)
 * on confirm — RootNavigator does NOT swap back to onboarding.
 *
 * Keyboard behavior:
 *   Uses KeyboardAwareScrollView from react-native-keyboard-controller.
 *   The library sets up native keyboard listeners at module init
 *   (before any component mounts), so cold-start races don't happen.
 *   `bottomOffset` gives breathing room between the focused input
 *   and the top of the keyboard.
 * ------------------------------------------------------------------
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Button,
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Controller, useForm } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import { z } from 'zod';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { getCrashlytics, crash } from '@react-native-firebase/crashlytics';

import {
  Colors,
  Dimensions,
  Radius,
  Shadows,
  Spacing,
  Typography,
} from '../../theme';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectRole, type UserRole } from '../../store/slices/appSlice';
import type { AuthParamList } from '../../navigation/types';
import {
  ROLE_MAP,
  RoleSelectionSheet,
  type RoleSelectionSheetRef,
  withAlpha,
} from '../../components/roles';
import { ApiError } from '@api/errors';
import { useRequestOtp } from './hooks';

/* -----------------------------------------------------------------
 * Types & schema
 * ----------------------------------------------------------------- */

type LoginRoute = RouteProp<AuthParamList, 'Login'>;
type LoginNavProp = NativeStackNavigationProp<AuthParamList, 'Login'>;

const phoneSchema = z.object({
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'),
});
type PhoneForm = z.infer<typeof phoneSchema>;

/* -----------------------------------------------------------------
 * Constants
 * ----------------------------------------------------------------- */

const TERMS_URL = 'https://urbancruise.in/terms-conditions-2/';
const PRIVACY_URL = 'https://urbancruise.in/privacy/';
const COUNTRY_CODE = '+91';

// Adjust based on where `assets/` lives:
//   • assets/ at project root  →  '../../../assets/icons/ucwithtext.png'
//   • assets/ inside src/      →  '../../assets/icons/ucwithtext.png'  (current)
const UC_LOGO = require('../../assets/icons/ucwithtext.png');

/* -----------------------------------------------------------------
 * Helpers
 * ----------------------------------------------------------------- */

const phoneResolver: Resolver<PhoneForm> = async values => {
  const result = phoneSchema.safeParse(values);
  if (result.success) {
    return { values: result.data, errors: {} };
  }
  const fieldErrors: Record<string, { type: string; message: string }> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join('.') || 'phone';
    if (!fieldErrors[key]) {
      fieldErrors[key] = { type: 'validation', message: issue.message };
    }
  }
  return { values: {} as PhoneForm, errors: fieldErrors as never };
};

const openUrl = (url: string) => {
  Linking.openURL(url).catch(() => undefined);
};

/* -----------------------------------------------------------------
 * Icons
 * ----------------------------------------------------------------- */

type IconProps = { color: string; size: number };

const ShieldCheckIcon: React.FC<IconProps> = ({ color, size }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 2.5 4.5 5.2v6c0 4.9 3.2 9.3 7.5 10.5 4.3-1.2 7.5-5.6 7.5-10.5v-6L12 2.5z"
      stroke={color}
      strokeWidth={1.8}
      strokeLinejoin="round"
    />
    <Path
      d="m8.75 12 2.25 2.25L15.5 9.75"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const PhoneIcon: React.FC<IconProps> = ({ color, size }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M5 4.5c0-.6.4-1 1-1h2.4c.4 0 .8.3.9.7l1.2 3.5c.2.4 0 .9-.3 1.2l-1.5 1.3a12 12 0 0 0 5.1 5.1l1.3-1.5c.3-.3.8-.5 1.2-.3l3.5 1.2c.4.1.7.5.7.9V18c0 .6-.4 1-1 1a15.5 15.5 0 0 1-14.5-14.5z"
      stroke={color}
      strokeWidth={1.7}
      strokeLinejoin="round"
    />
  </Svg>
);

const ChevronDownIcon: React.FC<IconProps> = ({ color, size }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="m6 9 6 6 6-6"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const ChevronRightIcon: React.FC<IconProps> = ({ color, size }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="m9 6 6 6-6 6"
      stroke={color}
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const LockIcon: React.FC<IconProps> = ({ color, size }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect
      x={4.5}
      y={10.5}
      width={15}
      height={10}
      rx={2}
      stroke={color}
      strokeWidth={1.6}
    />
    <Path
      d="M8 10.5V7a4 4 0 0 1 8 0v3.5"
      stroke={color}
      strokeWidth={1.6}
      strokeLinecap="round"
    />
    <Circle cx={12} cy={15.5} r={1.2} fill={color} />
  </Svg>
);

/* -----------------------------------------------------------------
 * Screen
 * ----------------------------------------------------------------- */

const LoginScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const { params } = useRoute<LoginRoute>();
  const navigation = useNavigation<LoginNavProp>();

  const roleFromStore = useAppSelector(s => s.app.selectedRole);
  const role: UserRole = roleFromStore ?? params.role;
  const meta = ROLE_MAP[role] ?? {
    shortLabel: role,
    description: '',
  };

  const sheetRef = useRef<RoleSelectionSheetRef>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const { requestOtp, isPending: submitting } = useRequestOtp();

  const {
    control,
    handleSubmit,
    formState: { isValid, errors },
  } = useForm<PhoneForm>({
    mode: 'onChange',
    defaultValues: { phone: '' },
    resolver: phoneResolver,
  });

  const handleOpenRoleSheet = useCallback(() => {
    sheetRef.current?.present();
  }, []);

  const handleSheetConfirm = useCallback(
    (newRole: UserRole) => {
      dispatch(selectRole(newRole));
    },
    [dispatch],
  );

  const handleContactSupport = useCallback(() => {
    navigation.navigate('Support');
  }, [navigation]);

  const handleSendOtp = useMemo(
    () =>
      handleSubmit(async ({ phone }) => {
        if (submitting) return;
        setServerError(null);
        try {
          const res = await requestOtp({
            phone,
            countryCode: COUNTRY_CODE,
            role,
          });
          navigation.navigate('OtpVerify', {
            role,
            phone,
            // Passed through so verify can echo it back to the server
            // and the timer can align with server-side throttling.
            requestId: res.requestId,
            resendAfterSeconds: res.resendAfterSeconds,
          });
        } catch (err) {
          // apiClient's error interceptor normalises everything to
          // ApiError, but keep the instanceof check for the case where
          // something upstream throws a plain Error.
          if (err instanceof ApiError) {
            switch (err.kind) {
              case 'rateLimited':
                setServerError(
                  'Too many requests. Please wait a moment and try again.',
                );
                break;
              case 'network':
                setServerError('Network error. Check your connection.');
                break;
              case 'timeout':
                setServerError('Request timed out. Please try again.');
                break;
              case 'validation':
                setServerError(err.message);
                break;
              default:
                setServerError('Something went wrong. Please try again.');
            }
          } else {
            setServerError('Something went wrong. Please try again.');
          }
        }
      }),
    [handleSubmit, navigation, requestOtp, role, submitting],
  );

  const canSubmit = isValid && !submitting;
  const topPad = Math.max(insets.top, Spacing.md);
  const bottomPad = Math.max(insets.bottom, Spacing.md);

  return (
    <View style={styles.flex}>
      <KeyboardAwareScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topPad, paddingBottom: bottomPad },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bottomOffset={20}
      >
        {/* Logo */}
        <Animated.View entering={FadeIn.duration(450)} style={styles.logoWrap}>
          <Image
            source={UC_LOGO}
            style={styles.logoImage}
            resizeMode="contain"
            accessible
            accessibilityRole="image"
            accessibilityLabel="Urban Cruise"
          />
        </Animated.View>

        <Button title="Test crash" onPress={() => crash(getCrashlytics())} />

        {/* Welcome */}
        <Animated.View entering={FadeInDown.delay(80).duration(450)}>
          <Text style={styles.welcome} accessibilityRole="header">
            Welcome!
          </Text>
          <Text style={styles.welcomeSub}>
            Login to continue as{' '}
            <Text style={styles.welcomeSubEmphasis}>{meta.shortLabel}</Text>
          </Text>
        </Animated.View>

        {/* Selected Role card */}
        <Animated.View entering={FadeInUp.delay(160).duration(450)}>
          <Pressable
            onPress={handleOpenRoleSheet}
            accessibilityRole="button"
            accessibilityLabel={`Selected role ${meta.shortLabel}. Tap to change.`}
            style={({ pressed }) => [
              styles.roleCard,
              pressed && styles.roleCardPressed,
            ]}
          >
            <View style={styles.roleIconWrap}>
              <ShieldCheckIcon color={Colors.primary} size={22} />
            </View>
            <View style={styles.roleTextWrap}>
              <Text style={styles.roleLabel}>Selected Role</Text>
              <Text style={styles.roleTitle} numberOfLines={1}>
                {meta.shortLabel}
              </Text>
              <Text style={styles.roleDesc} numberOfLines={2}>
                {meta.description}
              </Text>
            </View>
            <View style={styles.roleChangeWrap} pointerEvents="none">
              <Text style={styles.roleChangeText}>Change</Text>
              <ChevronRightIcon color={Colors.primary} size={16} />
            </View>
          </Pressable>
        </Animated.View>

        {/* Mobile Number card */}
        <Animated.View entering={FadeInUp.delay(240).duration(450)}>
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Enter Mobile Number</Text>
            <Text style={styles.formSubtitle}>
              We will send OTP to verify your number
            </Text>

            <Controller
              control={control}
              name="phone"
              render={({ field: { onChange, onBlur, value } }) => {
                const hasError = !!errors.phone;
                return (
                  <View
                    style={[styles.inputRow, hasError && styles.inputRowError]}
                  >
                    <Pressable
                      style={styles.ccButton}
                      accessibilityRole="button"
                      accessibilityLabel="Country code +91"
                    >
                      <Text style={styles.ccText}>{COUNTRY_CODE}</Text>
                      <ChevronDownIcon color={Colors.textSecondary} size={14} />
                    </Pressable>
                    <View style={styles.inputDivider} />
                    <View style={styles.phoneInputWrap}>
                      <PhoneIcon color={Colors.textSecondary} size={18} />
                      <TextInput
                        style={styles.phoneInput}
                        placeholder="Enter mobile number"
                        placeholderTextColor={Colors.textSecondary}
                        keyboardType="phone-pad"
                        autoComplete="tel"
                        textContentType="telephoneNumber"
                        maxLength={10}
                        value={value}
                        onChangeText={t => onChange(t.replace(/\D/g, ''))}
                        onBlur={onBlur}
                        returnKeyType="done"
                        accessibilityLabel="Mobile number"
                      />
                    </View>
                  </View>
                );
              }}
            />

            {errors.phone && (
              <Text style={styles.errorText} accessibilityLiveRegion="polite">
                {errors.phone.message}
              </Text>
            )}

            {!errors.phone && serverError && (
              <Text style={styles.errorText} accessibilityLiveRegion="polite">
                {serverError}
              </Text>
            )}

            {/* Send OTP */}
            <Pressable
              onPress={handleSendOtp}
              disabled={!canSubmit}
              accessibilityRole="button"
              accessibilityLabel="Send OTP"
              accessibilityState={{ disabled: !canSubmit, busy: submitting }}
              style={({ pressed }) => [
                styles.cta,
                !canSubmit && styles.ctaDisabled,
                pressed && canSubmit && styles.ctaPressed,
              ]}
            >
              {submitting ? (
                <ActivityIndicator color={Colors.buttonPrimaryText} />
              ) : (
                <>
                  <Text
                    style={[
                      styles.ctaText,
                      !canSubmit && styles.ctaTextDisabled,
                    ]}
                  >
                    Login with OTP
                  </Text>
                </>
              )}
            </Pressable>

            {/* Reassurance */}
            <View style={styles.reassure}>
              <LockIcon color={Colors.textSecondary} size={14} />
              <Text style={styles.reassureText}>
                Your number is safe with us
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Support */}
        <Animated.View
          entering={FadeIn.delay(320).duration(450)}
          style={styles.support}
        >
          <Text style={styles.supportPrompt}>Facing issues? </Text>
          <Pressable
            onPress={handleContactSupport}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Contact Support"
          >
            <Text style={styles.supportLink}>Contact Support</Text>
          </Pressable>
        </Animated.View>

        {/* Legal footer */}
        <Animated.View
          entering={FadeIn.delay(400).duration(450)}
          style={styles.legal}
        >
          <View style={styles.legalDivider} />
          <Text style={styles.legalIntro}>By continuing, you agree to our</Text>
          <View style={styles.legalRow}>
            <Pressable
              onPress={() => openUrl(TERMS_URL)}
              hitSlop={8}
              accessibilityRole="link"
              accessibilityLabel="Terms and Conditions"
            >
              <Text style={styles.legalLink}>Terms & Conditions</Text>
            </Pressable>
            <Text style={styles.legalDot}>•</Text>
            <Pressable
              onPress={() => openUrl(PRIVACY_URL)}
              hitSlop={8}
              accessibilityRole="link"
              accessibilityLabel="Privacy Policy"
            >
              <Text style={styles.legalLink}>Privacy Policy</Text>
            </Pressable>
          </View>
          <Text style={styles.copyright}>
            © {new Date().getFullYear()} Urban Cruise India. All rights
            reserved.
          </Text>
        </Animated.View>
      </KeyboardAwareScrollView>

      {/* Role switcher sheet */}
      <RoleSelectionSheet
        ref={sheetRef}
        currentRole={role}
        onConfirm={handleSheetConfirm}
      />
    </View>
  );
};

export default LoginScreen;

/* -----------------------------------------------------------------
 * Styles
 * ----------------------------------------------------------------- */

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    paddingHorizontal: Dimensions.screenHorizontalPadding,
  },

  /* Logo */
  logoWrap: {
    alignItems: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
  },
  logoImage: {
    width: 160,
    height: 140,
  },

  /* Welcome */
  welcome: {
    ...Typography.h1,
    color: Colors.textPrimary,
    textAlign: 'center',
    fontWeight: '800',
  },
  welcomeSub: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  welcomeSubEmphasis: {
    color: Colors.primary,
    fontWeight: '700',
  },

  /* Selected role card */
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: withAlpha(Colors.primary, 0.08),
    borderWidth: 1,
    borderColor: withAlpha(Colors.primary, 0.15),
    gap: Spacing.md,
  },
  roleCardPressed: {
    opacity: 0.85,
  },
  roleIconWrap: {
    width: 44,
    height: 44,
    borderRadius: Radius.circle,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withAlpha(Colors.primary, 0.12),
  },
  roleTextWrap: {
    flex: 1,
  },
  roleLabel: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    fontSize: 12,
  },
  roleTitle: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    fontWeight: '700',
    marginTop: 1,
  },
  roleDesc: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  roleChangeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  roleChangeText: {
    ...Typography.button,
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },

  /* Mobile Number card */
  formCard: {
    marginTop: Spacing.lg,
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.xs,
  },
  formTitle: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  formSubtitle: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginTop: 2,
    marginBottom: Spacing.md,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: Radius.md ?? Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    overflow: 'hidden',
    height: 52,
  },
  inputRowError: {
    borderColor: Colors.error ?? '#DC2626',
  },
  ccButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    gap: 6,
    backgroundColor: withAlpha(Colors.border, 0.35),
  },
  ccText: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  inputDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },
  phoneInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  phoneInput: {
    flex: 1,
    ...Typography.body,
    color: Colors.textPrimary,
    padding: 0,
  },
  errorText: {
    ...Typography.bodySmall,
    color: Colors.error ?? '#DC2626',
    marginTop: 6,
  },

  /* CTA */
  cta: {
    marginTop: Spacing.lg,
    height: Dimensions.buttonHeightLarge,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  ctaDisabled: {
    backgroundColor: Colors.buttonDisabled,
    shadowOpacity: 0,
    elevation: 0,
  },
  ctaPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  ctaText: {
    ...Typography.button,
    color: Colors.buttonPrimaryText,
  },
  ctaTextDisabled: {
    color: Colors.textInverse,
  },
  ctaIcon: {
    position: 'absolute',
    right: Spacing.md,
  },

  /* Reassurance */
  reassure: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: Spacing.md,
  },
  reassureText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },

  /* Support */
  support: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  supportPrompt: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
  supportLink: {
    ...Typography.bodySmall,
    color: Colors.primary,
    fontWeight: '600',
  },

  /* Legal */
  legal: {
    marginTop: Spacing.xxl,
    alignItems: 'center',
  },
  legalDivider: {
    height: 1,
    alignSelf: 'stretch',
    backgroundColor: Colors.borderLight,
    marginBottom: Spacing.lg,
  },
  legalIntro: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: Spacing.sm,
  },
  legalLink: {
    ...Typography.bodySmall,
    color: Colors.primary,
    fontWeight: '600',
  },
  legalDot: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
  copyright: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
});
