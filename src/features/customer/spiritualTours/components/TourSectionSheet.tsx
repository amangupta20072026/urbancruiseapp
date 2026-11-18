/**
 * ------------------------------------------------------------------
 * TourSectionSheet — one section's content, in a bottom sheet
 * ------------------------------------------------------------------
 *   ╭──────────────────────────────────────╮
 *   │               ─────                  │  handle
 *   │  📅  Itinerary                    ✕  │  header row
 *   │  ● Day 1  Delhi to Haridwar          │
 *   │  │                                   │
 *   │  ● Day 2  …                          │
 *   ╰──────────────────────────────────────╯
 *
 * ONE HEADER ROW, NOT STICKY
 *   Icon and title on the left, ✕ on the right. The header is a plain
 *   first child of the scroll view: making it sticky
 *   (stickyHeaderIndices) wraps it in a way that broke the row on
 *   Android and stacked icon, title and ✕ on top of each other. With
 *   long content the header simply scrolls up with it.
 *
 * CONTROLLED BY THE SCREEN
 *   `section` non-null opens the sheet, null closes it. When the
 *   customer closes it (✕, backdrop, swipe down, Android back),
 *   `onClose` tells the screen to set it back to null.
 *
 *   The last opened section stays rendered while the sheet animates
 *   closed, so the content doesn't blank out mid-slide.
 *
 * SIZE
 *   Fits its content (dynamic sizing) up to MAX_HEIGHT_SHARE of the
 *   screen; longer content scrolls inside the sheet.
 *
 * ANDROID BACK
 *   BottomSheetModalProvider sits above the navigator (App.tsx), so
 *   the sheet lives in a portal outside the screen. Without the
 *   listener below, back would pop the detail screen and leave the
 *   sheet floating. While open, back closes the sheet instead.
 * ------------------------------------------------------------------ */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { X } from 'lucide-react-native';

import { Colors, Radius, Spacing, Typography } from '@theme';
import { SectionBody } from './sectionBodies';
import { SectionIcon } from './TourSectionRow';
import type { SpiritualTourInfoSection } from '../types';

type Props = {
  /** The section to show; null closes the sheet. */
  section: SpiritualTourInfoSection | null;
  onClose: () => void;
  /** Safe-area bottom inset, so the last line clears the home bar. */
  bottomInset: number;
};

/** The sheet never grows taller than this share of the screen. */
const MAX_HEIGHT_SHARE = 0.85;

export const TourSectionSheet: React.FC<Props> = ({
  section,
  onClose,
  bottomInset,
}) => {
  const sheetRef = useRef<BottomSheetModal>(null);
  const { height: screenHeight } = useWindowDimensions();

  // Kept while the sheet slides closed, see the header note.
  const [shown, setShown] = useState<SpiritualTourInfoSection | null>(section);
  const isOpenRef = useRef(false);

  useEffect(() => {
    if (section) {
      setShown(section);
      isOpenRef.current = true;
      sheetRef.current?.present();
    } else if (isOpenRef.current) {
      sheetRef.current?.dismiss();
    }
  }, [section]);

  const handleDismiss = useCallback(() => {
    isOpenRef.current = false;
    onClose();
  }, [onClose]);

  const close = useCallback(() => {
    sheetRef.current?.dismiss();
  }, []);

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (!isOpenRef.current) return false;
        sheetRef.current?.dismiss();
        return true;
      },
    );
    return () => subscription.remove();
  }, []);

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

  return (
    <BottomSheetModal
      ref={sheetRef}
      enableDynamicSizing
      maxDynamicContentSize={Math.round(screenHeight * MAX_HEIGHT_SHARE)}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={styles.handle}
      backgroundStyle={styles.sheetBg}
      onDismiss={handleDismiss}
    >
      <BottomSheetScrollView
        contentContainerStyle={{ paddingBottom: bottomInset + Spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header row: icon + title on the left, ✕ on the right. */}
        <View style={styles.header}>
          {shown ? (
            <>
              <View
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                <SectionIcon name={shown.icon} size={24} />
              </View>
              <Text
                style={styles.title}
                accessibilityRole="header"
                numberOfLines={1}
                maxFontSizeMultiplier={1.4}
              >
                {shown.title}
              </Text>
            </>
          ) : (
            <View style={styles.titleSpacer} />
          )}

          <Pressable
            onPress={close}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={({ pressed }) => [styles.close, pressed && styles.pressed]}
          >
            <X size={22} color={Colors.textSecondary} strokeWidth={2} />
          </Pressable>
        </View>

        <View style={styles.body}>
          {shown ? <SectionBody section={shown} /> : null}
        </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  handle: {
    backgroundColor: Colors.border,
    width: 44,
  },
  sheetBg: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xxl + Spacing.xs,
    borderTopRightRadius: Radius.xxl + Spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xs,
  },
  title: {
    ...Typography.title,
    flex: 1,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  titleSpacer: {
    flex: 1,
  },
  close: {
    width: 32,
    height: 32,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  body: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
  },
});
