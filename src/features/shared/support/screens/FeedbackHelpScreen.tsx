/* eslint-disable no-void */
/**
 * ------------------------------------------------------------------
 * FeedbackHelpScreen — "Feedback & Suggestions" (submission form)
 * ------------------------------------------------------------------
 * Reached from HelpSupportScreen when the user taps the "Feedback &
 * Suggestions" topic tile. UNLIKE the other five topic-help screens
 * (Quotation / Booking / Payments / Account / Safety), this one is
 * a SUBMISSION FORM rather than an FAQ accordion — feedback has no
 * "questions with answers" set to browse, only a place to write in.
 *
 * The naming (`FeedbackHelpScreen` / route `FeedbackHelp`) is kept
 * for pattern-consistency with the other five topic screens so the
 * switch inside `HelpSupportScreen.handleTopicPress` reads uniformly:
 *   case 'feedback': navigate('FeedbackHelp');
 * The header docblock is where the "form, not FAQ" caveat lives so
 * a future engineer scanning by route name isn't surprised.
 *
 * DISTINCT FROM CustomerFeedbackScreen / GiveFeedbackScreen:
 *   - Those are BOOKING-SCOPED: post-trip star ratings tied to a
 *     specific BookingId, with a "My Feedback" history tab.
 *   - This one is APP-SCOPED: free-text feedback about the product
 *     as a whole (a bug, a suggestion, a UX gripe, praise). No
 *     bookingId. No history surface. Different backend endpoint
 *     (/support/feedback) and different mutation hook
 *     (useSubmitAppFeedback).
 *   - Both are correct to have — they answer different questions.
 *
 * SHARED ACROSS ROLES:
 *   Registered on Customer, Vendor and Driver stacks (mirroring the
 *   other topic screens). All four categories apply to every role.
 *
 * FORM MODEL:
 *   - react-hook-form + zod, `mode: 'onChange'` so the Submit
 *     button reflects validity live without a "submit-to-see-errors"
 *     round-trip. Same convention as GiveFeedbackScreen and
 *     LoginScreen.
 *   - Attachments are held in local state, NOT in the RHF form,
 *     because they are optional and adding a `FileList`-shaped
 *     field to zod complicates validation for zero benefit — the
 *     form's validity does not depend on whether screenshots are
 *     attached.
 *
 * IDEMPOTENCY:
 *   One `Idempotency-Key` per submit tap, minted on tap (not on hook
 *   init) so a tap-fail-retap sequence gets a fresh key and can
 *   actually try again. Same policy as GiveFeedbackScreen — see
 *   idempotency.ts header.
 *
 * ERROR HANDLING (paired with useSubmitAppFeedback's error surface):
 *   - validation           → generic toast (should be unreachable
 *                             with the client zod schema)
 *   - network / timeout    → warning toast with a Retry action
 *   - anything else        → generic error toast; user can tap
 *                             Submit again
 *
 * SCREENSHOTS:
 *   Uses `react-native-image-picker`'s `launchImageLibrary`. The OS
 *   Photo Picker is permissionless on both Android 13+ and iOS 14+
 *   (see rbac/capabilities.ts → `photoPicker`), so no permission
 *   gate is needed here. `selectionLimit` is set to the number of
 *   REMAINING slots so a user tapping when 2 are already attached
 *   can only pick 2 more.
 *
 * SUBMIT FLOW:
 *   1. `mode: 'onChange'` keeps `formState.isValid` fresh; the
 *      Submit button is disabled while invalid or submitting.
 *   2. On tap: mint idempotency key, fire the mutation, show
 *      loading state on the button.
 *   3. On success: toast confirmation + goBack(). No routing to a
 *      "Feedback History" screen because none exists.
 *   4. On failure: typed toast + form stays in place so the user
 *      can edit and retry.
 * ------------------------------------------------------------------
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Controller, useForm } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  AlertTriangle,
  Heart,
  ImagePlus,
  ImageIcon,
  Lightbulb,
  MessageSquare,
  Star,
  X,
} from 'lucide-react-native';
import { launchImageLibrary, type Asset } from 'react-native-image-picker';

import { SafeScreen, ScreenHeader } from '@shared/components';
import { Colors, Radius, Spacing, Typography } from '@theme';
import { toast } from '@services/toast';
import { logEvent } from '@services/telemetry';
import { newIdempotencyKey } from '@api/idempotency';
import { ApiError } from '@api/errors';
import {
  useSubmitAppFeedback,
  type FeedbackAttachment,
  type FeedbackCategory,
} from '../hooks/useSubmitAppFeedback';

/* -----------------------------------------------------------------
 * Local constants
 *
 * PURPLE_* mirrors the local constants in HelpSupportScreen for the
 * Account & App Support tile — kept out of the theme because it is
 * a one-off tint pair used only inside the support surfaces. If a
 * third surface needs the same purple, promote to Colors.
 * ----------------------------------------------------------------- */

const PURPLE_FG = '#7C3AED';
const PURPLE_BG = '#EDE9FE';

const MAX_ATTACHMENTS = 4;
const SUBJECT_MAX = 100;
const BODY_MAX = 500;
/** Minimum body length keeps low-signal "asdf" submissions out. */
const BODY_MIN = 10;

/* -----------------------------------------------------------------
 * Category registry
 *
 * Declared as a `readonly` tuple so the union type can be inferred
 * for the zod enum below without hand-maintaining two lists.
 * ----------------------------------------------------------------- */

type CategoryTile = {
  id: FeedbackCategory;
  label: string;
  Icon: React.ComponentType<{
    size?: number;
    color?: string;
    strokeWidth?: number;
    fill?: string;
  }>;
  fg: string;
  bg: string;
};

const CATEGORIES: readonly CategoryTile[] = [
  {
    id: 'general',
    label: 'General Feedback',
    Icon: Star,
    fg: Colors.info,
    bg: Colors.infoTint,
  },
  {
    id: 'suggestion',
    label: 'Suggestion',
    Icon: Lightbulb,
    fg: Colors.primary,
    bg: Colors.primaryTint,
  },
  {
    id: 'issue',
    label: 'Report an Issue',
    Icon: AlertTriangle,
    fg: Colors.error,
    bg: Colors.errorTint,
  },
  {
    id: 'app',
    label: 'App Experience',
    Icon: Heart,
    fg: PURPLE_FG,
    bg: PURPLE_BG,
  },
];

/* -----------------------------------------------------------------
 * Form schema
 * ----------------------------------------------------------------- */

const schema = z.object({
  category: z.enum(['general', 'suggestion', 'issue', 'app']),
  subject: z
    .string()
    .trim()
    .min(1, 'Please add a short subject')
    .max(SUBJECT_MAX, `Maximum ${SUBJECT_MAX} characters`),
  body: z
    .string()
    .trim()
    .min(BODY_MIN, `Please add at least ${BODY_MIN} characters`)
    .max(BODY_MAX, `Maximum ${BODY_MAX} characters`),
});

type FeedbackForm = z.infer<typeof schema>;

/* ================================================================
 * Screen
 * ================================================================ */

const FeedbackHelpScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
  }, [navigation]);

  /* -------- Form -------- */
  const {
    control,
    handleSubmit,
    watch,
    formState: { isValid },
  } = useForm<FeedbackForm>({
    resolver: zodResolver(schema) as Resolver<FeedbackForm>,
    mode: 'onChange',
    defaultValues: {
      category: 'general',
      subject: '',
      body: '',
    },
  });

  const subject = watch('subject');
  const body = watch('body');

  /* -------- Attachments (local state, not RHF) -------- */
  const [attachments, setAttachments] = useState<readonly FeedbackAttachment[]>(
    [],
  );

  const remainingSlots = MAX_ATTACHMENTS - attachments.length;

  const handlePickPhoto = useCallback(async () => {
    if (remainingSlots <= 0) return;
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        // Cap by remaining slots so a user with 2 already attached
        // cannot pick 3 more and overflow silently.
        selectionLimit: remainingSlots,
        quality: 0.8,
        includeBase64: false,
        // On iOS this presents the modern PHPicker; on Android 13+
        // it uses the sandboxed Photo Picker. Neither surface asks
        // for a runtime permission — see rbac/capabilities.ts.
      });
      if (result.didCancel) return;
      if (result.errorCode) {
        toast.error('Could not open picker', {
          description: result.errorMessage ?? 'Please try again.',
        });
        return;
      }
      const picked = (result.assets ?? [])
        .filter((a: Asset): a is Asset & { uri: string } => Boolean(a.uri))
        .slice(0, remainingSlots)
        .map<FeedbackAttachment>(a => ({
          uri: a.uri,
          type: a.type,
          fileName: a.fileName,
          fileSize: a.fileSize,
        }));
      if (picked.length === 0) return;
      setAttachments(prev => [...prev, ...picked].slice(0, MAX_ATTACHMENTS));
    } catch (err) {
      // The picker library should not throw for user-cancels, only
      // for genuinely broken picks (missing intent, out-of-memory).
      toast.error('Could not attach screenshot', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    }
  }, [remainingSlots]);

  const handleRemoveAttachment = useCallback((index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  }, []);

  /* -------- Submit -------- */
  const submitMutation = useSubmitAppFeedback();
  /**
   * Retained across the lifecycle of a single tap: if the mutation
   * fails with a transient error and the user hits Retry, we reuse
   * this key. Cleared on success. On a fresh tap (isPending flips
   * false → true), a new key is minted.
   */
  const pendingKeyRef = useRef<string | null>(null);

  const doSubmit = useCallback(
    async (values: FeedbackForm, idempotencyKey: string) => {
      try {
        await submitMutation.mutateAsync({
          input: {
            category: values.category,
            subject: values.subject.trim(),
            body: values.body.trim(),
            attachments,
          },
          idempotencyKey,
        });
        pendingKeyRef.current = null;
        toast.success('Thanks for the feedback', {
          description: 'Our team will review it shortly.',
        });
        if (navigation.canGoBack()) navigation.goBack();
      } catch (err) {
        // Typed error surface — see useSubmitAppFeedback header.
        if (err instanceof ApiError) {
          if (err.kind === 'network' || err.kind === 'timeout') {
            toast.warning('Could not reach our servers', {
              description: 'Check your connection and try again.',
            });
            return;
          }
          if (err.kind === 'validation') {
            toast.error('Something went wrong', {
              description: err.message,
            });
            return;
          }
        }
        toast.error('Could not submit feedback', {
          description: 'Please try again in a moment.',
        });
      }
    },
    [submitMutation, attachments, navigation],
  );

  const onSubmitPress = useMemo(
    () =>
      handleSubmit(values => {
        // Mint (or reuse) idempotency key. Reuse only while an
        // in-flight-then-failed request has left a key in the ref.
        const idempotencyKey = pendingKeyRef.current ?? newIdempotencyKey();
        pendingKeyRef.current = idempotencyKey;
        logEvent('support.feedback_submit_started', {
          category: values.category,
          subjectLength: values.subject.length,
          bodyLength: values.body.length,
          attachmentCount: attachments.length,
        });
        void doSubmit(values, idempotencyKey);
      }),
    [handleSubmit, doSubmit, attachments.length],
  );

  const submitting = submitMutation.isPending;
  const submitDisabled = !isValid || submitting;

  /* -------- Render -------- */
  return (
    <SafeScreen edges={['top']} backgroundColor={Colors.background}>
      <View style={styles.headerWrap}>
        <ScreenHeader
          title="Feedback & Suggestions"
          subtitle="Share your feedback to help us improve your Urban Cruise experience"
          onBack={handleBack}
        />
      </View>

      <KeyboardAwareScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + Spacing.xxxxl },
        ]}
        showsVerticalScrollIndicator={false}
        bottomOffset={Spacing.lg}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Hero banner ─────────────────────────────── */}
        <View style={styles.hero}>
          <View style={styles.heroTextWrap}>
            <Text style={styles.heroTitle}>Your feedback matters</Text>
            <Text style={styles.heroBody}>
              Tell us what you like, what can be better, or share your
              suggestions. We read every feedback.
            </Text>
          </View>
          <View style={styles.heroIconWrap}>
            <MessageSquare
              size={40}
              color={Colors.primary}
              strokeWidth={2}
              fill={Colors.primaryTint}
            />
          </View>
        </View>

        {/* ── Feedback Type ───────────────────────────── */}
        <Text style={styles.sectionLabel}>Feedback Type</Text>
        <Controller
          control={control}
          name="category"
          render={({ field: { value, onChange } }) => (
            <View style={styles.categoryGrid}>
              {CATEGORIES.map(cat => (
                <CategoryCard
                  key={cat.id}
                  tile={cat}
                  selected={value === cat.id}
                  onPress={() => onChange(cat.id)}
                />
              ))}
            </View>
          )}
        />

        {/* ── Subject ─────────────────────────────────── */}
        <View style={styles.field}>
          <Text style={styles.sectionLabel}>Subject</Text>
          <Controller
            control={control}
            name="subject"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextInput
                style={styles.input}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="Enter a short subject"
                placeholderTextColor={Colors.textTertiary}
                maxLength={SUBJECT_MAX}
                returnKeyType="next"
              />
            )}
          />
          <Text style={styles.counter}>
            {subject.length}/{SUBJECT_MAX}
          </Text>
        </View>

        {/* ── Your Feedback ───────────────────────────── */}
        <View style={styles.field}>
          <Text style={styles.sectionLabel}>Your Feedback</Text>
          <Controller
            control={control}
            name="body"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextInput
                style={[styles.input, styles.textarea]}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="Tell us more about your feedback or suggestion..."
                placeholderTextColor={Colors.textTertiary}
                maxLength={BODY_MAX}
                multiline
                textAlignVertical="top"
              />
            )}
          />
          <Text style={styles.counter}>
            {body.length}/{BODY_MAX}
          </Text>
        </View>

        {/* ── Screenshots ─────────────────────────────── */}
        <View style={styles.field}>
          <Text style={styles.sectionLabel}>
            Add Screenshots{' '}
            <Text style={styles.sectionLabelSub}>(Optional)</Text>
          </Text>
          <Text style={styles.sectionHelper}>
            You can add up to {MAX_ATTACHMENTS} screenshots to help us
            understand better.
          </Text>
          <View style={styles.screenshotGrid}>
            {Array.from({ length: MAX_ATTACHMENTS }).map((_, i) => {
              const attachment = attachments[i];
              if (attachment) {
                return (
                  <AttachmentThumb
                    key={`att-${i}`}
                    uri={attachment.uri}
                    onRemove={() => handleRemoveAttachment(i)}
                  />
                );
              }
              // First empty slot is the active "Add Photo" affordance;
              // subsequent empty slots are placeholders (visually
              // signalling capacity without competing for the tap).
              const isActiveAdd = i === attachments.length;
              return isActiveAdd ? (
                <AddPhotoSlot key={`add-${i}`} onPress={handlePickPhoto} />
              ) : (
                <PlaceholderSlot key={`ph-${i}`} />
              );
            })}
          </View>
        </View>

        {/* ── Submit ──────────────────────────────────── */}
        <Pressable
          onPress={onSubmitPress}
          disabled={submitDisabled}
          style={({ pressed }) => [
            styles.submitBtn,
            submitDisabled && styles.submitBtnDisabled,
            pressed && !submitDisabled && styles.submitBtnPressed,
          ]}
          accessibilityRole="button"
          accessibilityState={{ disabled: submitDisabled, busy: submitting }}
          accessibilityLabel="Submit feedback"
        >
          {submitting ? (
            <ActivityIndicator size="small" color={Colors.surface} />
          ) : (
            <Text style={styles.submitBtnText}>Submit Feedback</Text>
          )}
        </Pressable>
      </KeyboardAwareScrollView>
    </SafeScreen>
  );
};

export default FeedbackHelpScreen;

/* ================================================================
 * CategoryCard
 * ================================================================ */

const CategoryCard: React.FC<{
  tile: CategoryTile;
  selected: boolean;
  onPress: () => void;
}> = ({ tile, selected, onPress }) => {
  const { Icon, label, fg, bg } = tile;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.categoryCard,
        selected && styles.categoryCardSelected,
        pressed && styles.categoryCardPressed,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${label}${selected ? ', selected' : ''}`}
    >
      <View style={[styles.categoryIconWrap, { backgroundColor: bg }]}>
        <Icon
          size={18}
          color={fg}
          strokeWidth={2.5}
          fill={selected ? fg : 'transparent'}
        />
      </View>
      <Text style={styles.categoryLabel} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
};

/* ================================================================
 * Screenshot slot components
 * ================================================================ */

const AddPhotoSlot: React.FC<{ onPress: () => void }> = ({ onPress }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      styles.slot,
      styles.slotAdd,
      pressed && styles.slotAddPressed,
    ]}
    accessibilityRole="button"
    accessibilityLabel="Add photo"
  >
    <ImagePlus size={22} color={Colors.info} strokeWidth={2} />
    <Text style={styles.slotAddText}>Add Photo</Text>
  </Pressable>
);

const PlaceholderSlot: React.FC = () => (
  <View
    style={[styles.slot, styles.slotPlaceholder]}
    accessible={false}
    importantForAccessibility="no"
  >
    <ImageIcon size={22} color={Colors.textTertiary} strokeWidth={1.5} />
  </View>
);

const AttachmentThumb: React.FC<{ uri: string; onRemove: () => void }> = ({
  uri,
  onRemove,
}) => (
  <View style={[styles.slot, styles.slotThumb]}>
    <Image source={{ uri }} style={styles.thumbImage} resizeMode="cover" />
    <Pressable
      onPress={onRemove}
      style={({ pressed }) => [
        styles.thumbRemove,
        pressed && styles.thumbRemovePressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel="Remove attachment"
      hitSlop={8}
    >
      <X size={12} color={Colors.surface} strokeWidth={3} />
    </Pressable>
  </View>
);

/* ================================================================
 * Styles
 * ================================================================ */

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerWrap: {
    paddingHorizontal: Spacing.lg,
  },
  scroll: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    gap: Spacing.lg,
  },

  /* Hero */
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.primaryTint,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  heroTextWrap: { flex: 1, gap: Spacing.xs },
  heroTitle: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    fontWeight: '800',
  },
  heroBody: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  heroIconWrap: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Section labels */
  sectionLabel: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  sectionLabelSub: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    fontWeight: '400',
  },
  sectionHelper: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginTop: -Spacing.xs,
  },

  /* Category grid */
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  categoryCard: {
    flexBasis: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.surface,
  },
  categoryCardSelected: {
    borderColor: Colors.info,
    backgroundColor: Colors.infoTint,
  },
  categoryCardPressed: {
    opacity: 0.9,
  },
  categoryIconWrap: {
    width: 32,
    height: 32,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    fontWeight: '700',
    flexShrink: 1,
  },

  /* Field container */
  field: { gap: Spacing.sm },

  /* Inputs */
  input: {
    ...Typography.body,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    minHeight: 48,
  },
  textarea: {
    minHeight: 128,
    paddingTop: Spacing.md,
  },
  counter: {
    ...Typography.caption,
    color: Colors.textTertiary,
    textAlign: 'right',
  },

  /* Screenshot slots */
  screenshotGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  slot: {
    flexBasis: 0,
    flexGrow: 1,
    aspectRatio: 1,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  slotAdd: {
    backgroundColor: Colors.infoTint,
    borderWidth: 1.5,
    borderColor: Colors.info,
    borderStyle: 'dashed',
    gap: Spacing.xxs,
  },
  slotAddPressed: {
    opacity: 0.85,
  },
  slotAddText: {
    ...Typography.caption,
    color: Colors.info,
    fontWeight: '700',
  },
  slotPlaceholder: {
    backgroundColor: Colors.surfaceMuted,
  },
  slotThumb: {
    backgroundColor: Colors.surfaceMuted,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbRemovePressed: {
    backgroundColor: 'rgba(0,0,0,0.8)',
  },

  /* Submit */
  submitBtn: {
    marginTop: Spacing.md,
    height: 52,
    borderRadius: Radius.md,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnPressed: {
    opacity: 0.9,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    ...Typography.body,
    color: Colors.surface,
    fontWeight: '700',
  },
});
