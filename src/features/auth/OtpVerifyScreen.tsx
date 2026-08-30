/* eslint-disable no-void */
/**
 * ------------------------------------------------------------------
 * OtpVerifyScreen — Production
 * ------------------------------------------------------------------
 * Reached from LoginScreen after "Login with OTP" is tapped, with
 * `{ role, phone }` route params. On successful verification,
 * dispatches `loginSuccess(role)` — RootNavigator then swaps to the
 * matching role stack automatically (see RootNavigator branch logic),
 * so this screen never needs to navigate away manually.
 *
 * OTP input:
 *   A single hidden TextInput captures digits (keyboard +
 *   iOS/Android SMS autofill via textContentType/autoComplete);
 *   six boxes render the value visually. Tapping any box focuses
 *   the hidden input.
 *
 * ------------------------------------------------------------------
 * HEADER PATTERN
 * ------------------------------------------------------------------
 * Uses `SafeScreen` + `ScreenHeader` — same identity as every other
 * stack screen (Profile, Settings, Support, Referrals, …).
 *
 * The "Verify your number" hero + phone pill + illustration sit
 * BELOW as feature content. Hero title yielded from h1@24 to h3@22
 * so the ScreenHeader owns "screen identity" and the hero owns
 * "what you're doing here."
 * ------------------------------------------------------------------
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
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
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import {
  Colors,
  Dimensions,
  Radius,
  Shadows,
  Spacing,
  Typography,
} from '../../theme';
import { useAppDispatch } from '../../store/hooks';
import { loginSuccess } from '../../store/slices/appSlice';
import { saveTokens } from '../../services/storage/secureStorage';
import type { AuthParamList } from '../../navigation/types';
import { withAlpha } from '../../components/roles';
import { SafeScreen, ScreenHeader } from '@shared/components';

/* -----------------------------------------------------------------
 * Constants
 * ----------------------------------------------------------------- */

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;
const COUNTRY_CODE = '+91';

/* -----------------------------------------------------------------
 * Types
 * ----------------------------------------------------------------- */

type OtpVerifyRoute = RouteProp<AuthParamList, 'OtpVerify'>;
type OtpVerifyNavProp = NativeStackNavigationProp<AuthParamList, 'OtpVerify'>;

/* -----------------------------------------------------------------
 * Helpers
 * ----------------------------------------------------------------- */

const formatPhone = (phone: string) => {
  const digits = phone.replace(/\D/g, '');
  const first = digits.slice(0, 5);
  const second = digits.slice(5, 10);
  return second ? `${first} ${second}` : first;
};

const formatTimer = (seconds: number) => {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

/* -----------------------------------------------------------------
 * Icons
 * ----------------------------------------------------------------- */

type IconProps = { color: string; size: number };

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

const ShieldCheckFilledIcon: React.FC<IconProps> = ({ color, size }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 2.5 4.5 5.2v6c0 4.9 3.2 9.3 7.5 10.5 4.3-1.2 7.5-5.6 7.5-10.5v-6L12 2.5z"
      fill={color}
    />
    <Path
      d="m8.75 12 2.25 2.25L15.5 9.75"
      stroke={Colors.textInverse}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/** Phone + message-bubble illustration used in the hero. */
const PhoneOtpIllustration: React.FC<IconProps> = ({ color, size }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    {/* Phone body */}
    <Rect
      x={26}
      y={10}
      width={40}
      height={70}
      rx={7}
      stroke={color}
      strokeWidth={2.5}
    />
    <Path
      d="M40 16h12"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
    />
    {/* Chat bubble */}
    <Rect x={38} y={34} width={30} height={22} rx={7} fill={color} />
    <Path d="M46 60 42 68 54 60" fill={color} />
    <Circle cx={47} cy={45} r={2.2} fill={Colors.background} />
    <Circle cx={53} cy={45} r={2.2} fill={Colors.background} />
    <Circle cx={59} cy={45} r={2.2} fill={Colors.background} />
    {/* Shield badge */}
    <Circle cx={70} cy={72} r={16} fill={Colors.background} />
    <Path
      d="M70 60.5 60.5 64v6.4c0 5.5 3.9 10.4 9.5 11.6 5.6-1.2 9.5-6.1 9.5-11.6V64L70 60.5Z"
      fill={color}
    />
    <Path
      d="m65.8 71.2 2.9 2.9 5.5-5.6"
      stroke={Colors.background}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/* -----------------------------------------------------------------
 * OTP boxes input
 * ----------------------------------------------------------------- */

type OtpBoxesInputProps = {
  value: string;
  onChangeValue: (v: string) => void;
  onSubmitEditing: () => void;
  error?: boolean;
};

const OtpBoxesInput: React.FC<OtpBoxesInputProps> = ({
  value,
  onChangeValue,
  onSubmitEditing,
  error,
}) => {
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);

  const handlePress = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const handleChangeText = useCallback(
    (text: string) => {
      onChangeValue(text.replace(/\D/g, '').slice(0, OTP_LENGTH));
    },
    [onChangeValue],
  );

  const activeIndex = value.length < OTP_LENGTH ? value.length : OTP_LENGTH - 1;

  return (
    <Pressable
      style={styles.otpRow}
      onPress={handlePress}
      accessibilityRole="none"
    >
      {Array.from({ length: OTP_LENGTH }).map((_, index) => {
        const digit = value[index] ?? '';
        const isActive = focused && index === activeIndex;
        return (
          <View
            key={index}
            style={[
              styles.otpBox,
              isActive && styles.otpBoxActive,
              error && styles.otpBoxError,
            ]}
          >
            <Text style={styles.otpDigit}>{digit}</Text>
            {isActive && !digit ? <View style={styles.otpCaret} /> : null}
          </View>
        );
      })}

      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onSubmitEditing={onSubmitEditing}
        keyboardType="number-pad"
        maxLength={OTP_LENGTH}
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        caretHidden
        style={styles.hiddenInput}
        accessibilityLabel="Enter OTP"
      />
    </Pressable>
  );
};

/* -----------------------------------------------------------------
 * Screen
 * ----------------------------------------------------------------- */

const OtpVerifyScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const { params } = useRoute<OtpVerifyRoute>();
  const navigation = useNavigation<OtpVerifyNavProp>();
  const { role, phone } = params;

  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft(s => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const handleChangeOtp = useCallback((v: string) => {
    setOtp(v);
    setError(null);
  }, []);

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  const handleChangeNumber = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  const canVerify = otp.length === OTP_LENGTH && !verifying;

  const handleVerify = useCallback(async () => {
    if (!canVerify) return;
    setVerifying(true);
    setError(null);
    try {
      // TODO: replace with real OTP verify mutation, e.g.:
      //   const { data } = await apiClient.post(endpoints.auth.verifyOtp(), {
      //     phone,
      //     otp,
      //     role,
      //   });
      //   await saveTokens({
      //     accessToken: data.accessToken,
      //     refreshToken: data.refreshToken,
      //   });
      //   dispatch(loginSuccess({
      //     userId: data.userId,
      //     role: data.role,
      //     subRole: data.subRole,
      //     entityId: data.entityId,
      //   }));
      //
      // Until the endpoint is live, we mock both the tokens AND the
      // identity that /me would return. Replace both blocks when
      // wiring the real API.
      await new Promise<void>(resolve => {
        setTimeout(() => resolve(), 500);
      });

      // 1. Save mock tokens to Keychain — this is what makes login
      //    persist across app kills. On next cold start, bootstrap's
      //    readKeychainTokens() finds these, calls /me (which fails
      //    since backend is mocked), falls back to 'provisional' auth,
      //    and RootNavigator lands the user on their role home.
      await saveTokens({
        accessToken: `mock-access-${role}-${Date.now()}`,
        refreshToken: `mock-refresh-${role}-${Date.now()}`,
      });

      // 2. Update Redux with identity for the current session.
      dispatch(
        loginSuccess({
          userId: `mock-${role}-user`,
          role,
          subRole: null,
          entityId: `mock-${role}-entity`,
        }),
      );
    } catch {
      setError('That code didn\u2019t work. Please try again.');
    } finally {
      setVerifying(false);
    }
  }, [canVerify, dispatch, role]);

  const handleResend = useCallback(async () => {
    if (resending || secondsLeft > 0) return;
    setResending(true);
    setError(null);
    try {
      // TODO: replace with real OTP resend mutation
      //   (apiClient.post(endpoints.auth.requestOtp(), { phone, role }))
      await new Promise<void>(resolve => {
        setTimeout(() => resolve(), 400);
      });
      setOtp('');
      setSecondsLeft(RESEND_SECONDS);
    } finally {
      setResending(false);
    }
  }, [resending, secondsLeft]);

  const formattedPhone = useMemo(() => formatPhone(phone), [phone]);
  // Bottom pad on the scroll content only — SafeScreen owns the top
  // inset, but scroll content must clear the home indicator on its own.
  const bottomPad = Math.max(insets.bottom, Spacing.lg);

  return (
    <SafeScreen edges={['top']}>
      {/* App-standard header — matches every other stack screen. */}
      <View style={styles.headerWrap}>
        <ScreenHeader title="Verify OTP" onBack={handleBack} />
      </View>

      <KeyboardAwareScrollView
        style={styles.flex}
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bottomOffset={20}
      >
        {/* Hero — task context, not screen title. Yielded from h1@24
            to h3@22 so the ScreenHeader owns "screen identity." */}
        <Animated.View
          entering={FadeInDown.delay(60).duration(400)}
          style={styles.hero}
        >
          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>Verify your number</Text>
            <Text style={styles.heroSubtitle}>
              Enter the 6-digit OTP sent to
            </Text>

            <View style={styles.phonePill}>
              <PhoneIcon color={Colors.primary} size={15} />
              <Text style={styles.phonePillText}>
                {COUNTRY_CODE} {formattedPhone}
              </Text>
              <Pressable
                onPress={handleChangeNumber}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Change mobile number"
              >
                <Text style={styles.phonePillChange}>Change</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.heroIconWrap}>
            <PhoneOtpIllustration color={Colors.primary} size={72} />
          </View>
        </Animated.View>

        {/* OTP card */}
        <Animated.View
          entering={FadeInUp.delay(140).duration(400)}
          style={styles.card}
        >
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardIconWrap}>
              <LockIcon color={Colors.primary} size={20} />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>Enter OTP</Text>
              <Text style={styles.cardSubtitle}>
                We&apos;ve sent a 6-digit verification code to your mobile
                number.
              </Text>
            </View>
          </View>

          <OtpBoxesInput
            value={otp}
            onChangeValue={handleChangeOtp}
            onSubmitEditing={() => void handleVerify()}
            error={!!error}
          />

          {error ? (
            <Text style={styles.otpErrorText}>{error}</Text>
          ) : (
            <View style={styles.autoReadRow}>
              <ShieldCheckIcon color={Colors.primary} size={13} />
              <Text style={styles.autoReadText}>
                OTP will be auto read if SMS is received
              </Text>
            </View>
          )}
        </Animated.View>

        {/* Resend */}
        <Animated.View
          entering={FadeInUp.delay(200).duration(400)}
          style={styles.resendWrap}
        >
          <Text style={styles.resendPrompt}>Didn&apos;t receive OTP?</Text>
          {secondsLeft > 0 ? (
            <Text style={styles.resendTimerText}>
              Resend OTP in{' '}
              <Text style={styles.resendTimerAccent}>
                {formatTimer(secondsLeft)}
              </Text>
            </Text>
          ) : (
            <Pressable
              onPress={() => void handleResend()}
              disabled={resending}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Resend OTP"
            >
              {resending ? (
                <ActivityIndicator color={Colors.primary} size="small" />
              ) : (
                <Text style={styles.resendLink}>Resend OTP</Text>
              )}
            </Pressable>
          )}
        </Animated.View>

        {/* Secure & Private */}
        <Animated.View
          entering={FadeInUp.delay(260).duration(400)}
          style={styles.trustStrip}
        >
          <View style={styles.trustIconWrap}>
            <ShieldCheckFilledIcon color={Colors.primary} size={18} />
          </View>
          <View style={styles.trustTextWrap}>
            <Text style={styles.trustTitle}>Secure &amp; Private</Text>
            <Text style={styles.trustSubtitle}>
              Your information is safe with us and will never be shared with
              anyone.
            </Text>
          </View>
        </Animated.View>

        {/* CTA */}
        <Pressable
          onPress={() => void handleVerify()}
          disabled={!canVerify}
          accessibilityRole="button"
          accessibilityLabel="Verify and continue"
          style={({ pressed }) => [
            styles.cta,
            !canVerify && styles.ctaDisabled,
            pressed && canVerify && styles.ctaPressed,
          ]}
        >
          {verifying ? (
            <ActivityIndicator color={Colors.buttonPrimaryText} />
          ) : (
            <Text
              style={[styles.ctaText, !canVerify && styles.ctaTextDisabled]}
            >
              Verify &amp; Continue
            </Text>
          )}
        </Pressable>
      </KeyboardAwareScrollView>
    </SafeScreen>
  );
};

export default OtpVerifyScreen;

/* -----------------------------------------------------------------
 * Styles
 * ----------------------------------------------------------------- */

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  /* ScreenHeader wrapper — matches every other stack screen. */
  headerWrap: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },

  scroll: {
    paddingHorizontal: Dimensions.screenHorizontalPadding,
    paddingTop: Spacing.lg,
  },

  /* Hero — yielded from h1@24 to h3@22 so the ScreenHeader above
     owns "screen identity" and the hero owns "task context." */
  hero: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.xxl,
    gap: Spacing.md,
  },
  heroText: {
    flex: 1,
  },
  heroTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
    fontWeight: '800',
    fontSize: 22,
    lineHeight: 28,
  },
  heroSubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  heroIconWrap: {
    width: 84,
    height: 84,
    borderRadius: Radius.circle,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withAlpha(Colors.primary, 0.08),
  },

  /* Phone pill */
  phonePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    height: 40,
    borderRadius: Radius.pill,
    backgroundColor: withAlpha(Colors.primary, 0.1),
  },
  phonePillText: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  phonePillChange: {
    ...Typography.bodySmall,
    color: Colors.primary,
    fontWeight: '700',
  },

  /* OTP card */
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: Spacing.lg,
    ...Shadows.xs,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  cardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: Radius.circle,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withAlpha(Colors.primary, 0.12),
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    fontWeight: '700',
    fontSize: 18,
  },
  cardSubtitle: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginTop: 3,
    lineHeight: 18,
    fontSize: 13,
  },

  /* OTP boxes */
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    position: 'relative',
  },
  otpBox: {
    width: 44,
    height: 52,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxActive: {
    borderColor: Colors.primary,
  },
  otpBoxError: {
    borderColor: Colors.error,
  },
  otpDigit: {
    ...Typography.h4,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  otpCaret: {
    position: 'absolute',
    width: 2,
    height: 22,
    borderRadius: 1,
    backgroundColor: Colors.primary,
  },
  hiddenInput: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0,
  },

  /* Auto-read note */
  autoReadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: Spacing.lg,
  },
  autoReadText: {
    ...Typography.bodySmall,
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 13,
  },
  otpErrorText: {
    ...Typography.bodySmall,
    color: Colors.error,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },

  /* Resend */
  resendWrap: {
    alignItems: 'center',
    marginTop: Spacing.xl,
    gap: 4,
  },
  resendPrompt: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    fontWeight: '700',
    fontSize: 14,
  },
  resendTimerText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    fontSize: 13,
  },
  resendTimerAccent: {
    color: Colors.primary,
    fontWeight: '700',
  },
  resendLink: {
    ...Typography.bodySmall,
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 14,
  },

  /* Secure & Private */
  trustStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: withAlpha(Colors.primary, 0.06),
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.xxl,
    gap: Spacing.md,
  },
  trustIconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radius.circle,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  trustTextWrap: {
    flex: 1,
  },
  trustTitle: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    fontWeight: '700',
    fontSize: 14,
  },
  trustSubtitle: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 17,
    fontSize: 13,
  },

  /* CTA */
  cta: {
    marginTop: Spacing.xxl,
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
    fontSize: 18,
  },
  ctaTextDisabled: {
    color: Colors.textInverse,
  },
});
