/**
 * ------------------------------------------------------------------
 * FeedbackScreen — SHARED, STACK SCREEN
 * ------------------------------------------------------------------
 * Cross-role placeholder for the feedback form. Reached from every
 * role's More sheet ("Feedback" tile). Real UI will collect a
 * rating, free-text comments, optional attachments, and post to the
 * feedback endpoint.
 *
 * REGISTRATION:
 *   Mounted by EACH role's navigator. Route name "Feedback" must
 *   exist in each role's stack ParamList so
 *   `navigate('Feedback')` from useMoreActions.ts resolves in every
 *   role context.
 *
 * FOLDER NAMING:
 *   Lives under `shared/feedbacks/` (plural) to match the existing
 *   sibling folders (`shared/reviews/`, `shared/notifications/`) —
 *   a category folder, not a single-item folder. The route name and
 *   component name stay singular ("Feedback" / FeedbackScreen).
 * ------------------------------------------------------------------
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MessageSquare } from 'lucide-react-native';

import { SafeScreen, ScreenHeader, ComingSoon } from '@shared/components';
import { Spacing } from '@theme';

const FeedbackScreen: React.FC = () => {
  const navigation = useNavigation();
  return (
    <SafeScreen edges={['top']}>
      <View style={styles.headerWrap}>
        <ScreenHeader
          title="Feedback"
          subtitle="Share suggestions and report problems."
          onBack={() => navigation.goBack()}
        />
      </View>
      <ComingSoon feature="Feedback" Icon={MessageSquare} />
    </SafeScreen>
  );
};

export default FeedbackScreen;

const styles = StyleSheet.create({
  headerWrap: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
});