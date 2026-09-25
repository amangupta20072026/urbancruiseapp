/**
 * ------------------------------------------------------------------
 * FaqAccordionList
 * ------------------------------------------------------------------
 * Shared vertical list of expand/collapse FAQ cards used by every
 * topic-help screen (QuotationHelp, BookingHelp, and the Payments /
 * Account / Safety / Feedback screens still to land). Extracted from
 * the first draft of QuotationHelpScreen once the second consumer
 * appeared — the FAQ shape and the interaction model are identical
 * across topics, so the UI belongs in one place.
 *
 * INTERACTION MODEL:
 *   - Single-open accordion. Tapping a closed item opens it and
 *     closes whichever item was open before. Tapping the currently
 *     open item collapses it. This matches the reference mockup and
 *     avoids the "wall of text" failure mode of every item being
 *     open at once.
 *   - Chevron flips from ChevronDown (collapsed) → ChevronUp
 *     (expanded), mirroring the VehicleCard accordion in
 *     QuotationDetailScreen so the app has ONE accordion idiom.
 *   - `accessibilityState={{ expanded }}` on every row so screen
 *     readers announce state correctly.
 *
 * "WAS THIS HELPFUL?" WIDGET:
 *   Rendered inside every expanded answer body when (and only when)
 *   the caller passes an `onFeedback` prop. Per-question, per-answer
 *   feedback is the industry standard (Stripe, Zendesk, Google Help)
 *   — page-level feedback is ambiguous about which answer was rated.
 *
 *   Once a question is rated, the widget swaps to a "Thanks for your
 *   feedback" confirmation state that stays for the session. This
 *   prevents double-voting AND — because the item unmounts on
 *   collapse — the rated-set MUST live on the LIST (not on the
 *   item), otherwise collapsing and re-expanding an item would
 *   reset it. Bug guard: the ratedIds state is deliberately owned
 *   by this component.
 *
 * COMPONENT vs LIST:
 *   - Only `FaqAccordionList` is exported. The internal `FaqItem`
 *     and `HelpfulPrompt` stay private; callers pass data and one
 *     callback, not JSX. This keeps the single-open state, the
 *     rated-set, and the item-rendering rules in one place — a
 *     caller cannot accidentally allow multi-open behaviour or
 *     double-voting by forgetting to lift state.
 *
 * DATA SHAPE:
 *   Callers pass a `Faq[]` with `{ id, question, answer }`. Ids are
 *   stable strings (not array indices) so telemetry and any future
 *   deep-link ("open FAQ #cancel-booking") continue to resolve when
 *   the list is reordered.
 *
 * TELEMETRY OWNERSHIP:
 *   This component does NOT call logEvent directly. It only fires
 *   the caller's `onFeedback(faqId, helpful)` callback — the caller
 *   knows the topic and is the right place to emit the analytics
 *   event with topic + faqId + helpful properties. Keeping the
 *   component telemetry-free means it can be reused inside a
 *   Storybook / example harness with no side effects.
 *
 * DESIGN INVARIANTS:
 *   - Theme tokens only — no hardcoded colors / spacings / radii.
 *   - Each FAQ is an independent rounded surface card (matches the
 *     reference), NOT a shared card with dividers — the visual
 *     separation makes the expanded state read as "belonging to
 *     this row" rather than "spilling into the next".
 * ------------------------------------------------------------------
 */

import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react-native';

import { Colors, Radius, Spacing, Typography } from '@theme';

export type Faq = {
  /** Stable id — never an array index. Used for state key + future deep links. */
  id: string;
  question: string;
  answer: string;
};

type Props = {
  faqs: readonly Faq[];
  /**
   * Fired when the user rates an answer. When omitted, the "Was
   * this helpful?" widget is not rendered — callers who don't
   * intend to record feedback opt out simply by not passing this.
   */
  onFeedback?: (faqId: string, helpful: boolean) => void;
};

export const FaqAccordionList: React.FC<Props> = ({ faqs, onFeedback }) => {
  /**
   * Single-open accordion state. `null` means every item is
   * collapsed. Storing the open item's id (rather than an index)
   * keeps the state stable across any future reordering of `faqs`.
   */
  const [openId, setOpenId] = useState<string | null>(null);

  /**
   * Set of faqIds that have been rated this session. Owned by the
   * LIST (not the item) because item bodies unmount on collapse —
   * item-owned state would silently reset when a user collapses and
   * re-expands an item they already rated. Session-only for now;
   * when a backend endpoint (POST /support/faqs/:id/feedback) lands,
   * hydrate this on mount from the server's per-user record so
   * ratings persist across app launches.
   */
  const [ratedIds, setRatedIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  const handleToggle = useCallback((faqId: string) => {
    setOpenId(current => (current === faqId ? null : faqId));
  }, []);

  const handleFeedback = useCallback(
    (faqId: string, helpful: boolean) => {
      // Guard against a double-fire: if the user somehow taps the
      // widget while it's transitioning, treat the second call as a
      // no-op. The rated-set is the source of truth.
      if (ratedIds.has(faqId)) return;
      setRatedIds(prev => {
        const next = new Set(prev);
        next.add(faqId);
        return next;
      });
      onFeedback?.(faqId, helpful);
    },
    [ratedIds, onFeedback],
  );

  return (
    <View style={styles.list}>
      {faqs.map(faq => (
        <FaqItem
          key={faq.id}
          question={faq.question}
          answer={faq.answer}
          expanded={openId === faq.id}
          rated={ratedIds.has(faq.id)}
          showFeedback={Boolean(onFeedback)}
          onToggle={() => handleToggle(faq.id)}
          onFeedback={helpful => handleFeedback(faq.id, helpful)}
        />
      ))}
    </View>
  );
};

/* ================================================================
 * FaqItem — private accordion card
 * ================================================================ */

const FaqItem: React.FC<{
  question: string;
  answer: string;
  expanded: boolean;
  rated: boolean;
  showFeedback: boolean;
  onToggle: () => void;
  onFeedback: (helpful: boolean) => void;
}> = ({
  question,
  answer,
  expanded,
  rated,
  showFeedback,
  onToggle,
  onFeedback,
}) => {
  const Chevron = expanded ? ChevronUp : ChevronDown;

  return (
    <View style={[styles.card, expanded && styles.cardOpen]}>
      <Pressable
        onPress={onToggle}
        style={({ pressed }) => [styles.header, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${question}. ${expanded ? 'Collapse' : 'Expand'}`}
      >
        <Text style={styles.question} numberOfLines={3}>
          {question}
        </Text>
        <Chevron size={20} color={Colors.textSecondary} strokeWidth={2} />
      </Pressable>

      {expanded ? (
        <View style={styles.body}>
          <Text style={styles.answer}>{answer}</Text>
          {showFeedback ? (
            <HelpfulPrompt rated={rated} onFeedback={onFeedback} />
          ) : null}
        </View>
      ) : null}
    </View>
  );
};

/* ================================================================
 * HelpfulPrompt — private "Was this helpful?" widget
 * ================================================================
 * Two states:
 *   1. Unrated → prompt + Yes / No pill buttons
 *   2. Rated   → "Thanks for your feedback" confirmation
 *
 * The swap (not "grey out the un-tapped one") is a deliberate
 * choice: it removes the visual noise of a picked-vs-unpicked pair
 * and confirms unambiguously that the vote was recorded. It also
 * naturally prevents the user from tapping the OTHER option after
 * they've already voted.
 * ================================================================ */

const HelpfulPrompt: React.FC<{
  rated: boolean;
  onFeedback: (helpful: boolean) => void;
}> = ({ rated, onFeedback }) => {
  if (rated) {
    return (
      <View style={styles.helpfulThanksRow}>
        <CheckCircle2 size={16} color={Colors.success} strokeWidth={2.5} />
        <Text style={styles.helpfulThanksText}>Thanks for your feedback</Text>
      </View>
    );
  }

  return (
    <View style={styles.helpfulWrap}>
      <View style={styles.helpfulDivider} />
      <Text style={styles.helpfulPrompt}>Was this helpful?</Text>
      <View style={styles.helpfulButtons}>
        <Pressable
          onPress={() => onFeedback(true)}
          style={({ pressed }) => [
            styles.helpfulBtn,
            styles.helpfulBtnYes,
            pressed && styles.helpfulBtnYesPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Yes, this answer was helpful"
        >
          <ThumbsUp size={16} color={Colors.success} strokeWidth={2.5} />
          <Text style={[styles.helpfulBtnText, { color: Colors.success }]}>
            Yes
          </Text>
        </Pressable>

        <Pressable
          onPress={() => onFeedback(false)}
          style={({ pressed }) => [
            styles.helpfulBtn,
            styles.helpfulBtnNo,
            pressed && styles.helpfulBtnNoPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="No, this answer was not helpful"
        >
          <ThumbsDown size={16} color={Colors.error} strokeWidth={2.5} />
          <Text style={[styles.helpfulBtnText, { color: Colors.error }]}>
            No
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

/* ================================================================
 * Styles
 * ================================================================ */

const styles = StyleSheet.create({
  list: {
    gap: Spacing.md,
  },

  /* Per-item card */
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
  },
  /* Slightly stronger border when open — subtle affordance that the
   * card "belongs to" the answer below without needing a heavier
   * shadow or accent bar. */
  cardOpen: {
    borderColor: Colors.border,
  },

  /* Header row — question + chevron */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    gap: Spacing.md,
  },
  pressed: {
    backgroundColor: Colors.surfaceMuted,
  },
  question: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '600',
    flexShrink: 1,
  },

  /* Body — revealed on expand */
  body: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    // Negative top margin pulls the answer closer to the question
    // without needing a divider — matches the reference mockup where
    // the two read as one visual block.
    marginTop: -Spacing.xs,
  },
  answer: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    lineHeight: 20,
  },

  /* "Was this helpful?" widget */
  helpfulWrap: {
    marginTop: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  helpfulDivider: {
    alignSelf: 'stretch',
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.borderLight,
    marginBottom: Spacing.xs,
  },
  helpfulPrompt: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  helpfulButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },

  /* Yes / No pill — border-only style matches the reference. Text
   * color per-button (inline above) keeps the token pairing
   * (Colors.success ↔ Colors.error) obvious at the call site. */
  helpfulBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minWidth: 92,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2, // 10 — sits between sm (8) and md (12)
    borderRadius: Radius.md,
    borderWidth: 1.5,
    backgroundColor: Colors.surface,
  },
  helpfulBtnText: {
    ...Typography.bodySmall,
    fontWeight: '700',
  },

  helpfulBtnYes: {
    borderColor: Colors.success,
  },
  helpfulBtnYesPressed: {
    backgroundColor: Colors.successTint,
  },

  helpfulBtnNo: {
    borderColor: Colors.error,
  },
  helpfulBtnNoPressed: {
    backgroundColor: Colors.errorTint,
  },

  /* Rated confirmation row — replaces the prompt in place */
  helpfulThanksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.borderLight,
  },
  helpfulThanksText: {
    ...Typography.bodySmall,
    color: Colors.success,
    fontWeight: '600',
  },
});
