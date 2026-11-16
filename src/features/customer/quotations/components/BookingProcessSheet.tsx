/**
 * ------------------------------------------------------------------
 * BookingProcessSheet — "Booking Process" explainer
 * ------------------------------------------------------------------
 * Opens from the floating "Booking process" pill on
 * QuotationDetailScreen. Read-only: it answers "what happens after I
 * accept?" and nothing else. No form, no submit, no side effects.
 *
 *   ┌──────────── ▁▁▁ ────────────────────────────┐
 *   │            [ Urban Cruise ]            (X)  │
 *   │  Booking Process          ╭─ hero artwork ─╮│
 *   │  Three simple steps…      ╰────────────────╯│
 *   ├─────────────────────────────────────────────┤
 *   │ ┌───────────────────────────────────────┐   │
 *   │ │(01)  ( 🚌 ) │ Select Vehicle          │   │
 *   │ │   ┊         │ ───                     │   │
 *   │ │   ┊         │ Select the most …       │   │
 *   │ │   ┊         │ ⓘ If required, take …   │◣  │
 *   │ └───┊───────────────────────────────────┘   │
 *   │ ┌───┊───────────────────────────────────┐   │
 *   │ │(02)  ( 🧾 ) │ Pay Advance & Confirm   │◣  │
 *   │ └───┊───────────────────────────────────┘   │
 *   │ ┌───┊───────────────────────────────────┐   │
 *   │ │(03)  ( 👪 ) │ Enjoy your Trip         │◣  │
 *   │ └───────────────────────────────────────┘   │
 *   └─────────────────────────────────────────────┘
 *
 * COPY IS OPS'S, VERBATIM
 *   Every line in STEPS below is taken from the Booking Process
 *   artwork ops already publishes, with only sentence case applied.
 *   Nothing here was written for the app, and nothing promises the
 *   customer anything that artwork doesn't.
 *
 *   TODO(api): ops will want to edit this without an app release.
 *   The natural home is GET /config/app, like the brochure catalog:
 *   when that lands, `STEPS` becomes the server's array and only the
 *   icon lookup stays here.
 *
 * ARTWORK SLOTS — WHY THEY ARE EMPTY
 *   The approved design has two pieces of illustration this repo
 *   does not ship: a bus-and-car hero beside the title, and a custom
 *   drawing inside each step's green disc. Rather than invent
 *   lookalikes, both are optional slots: `HERO_ARTWORK` and each
 *   step's `artwork`. While they are null the sheet falls back to
 *   lucide icons, which is how it renders today. Drop the PNGs into
 *   `@assets/images/` and point these at them — no other change.
 *
 * DASHED CONNECTOR
 *   Drawn as a column of short segments, not `borderStyle: 'dashed'`,
 *   because QuotationTripCard already found that unreliable on a
 *   single side on Android. Same technique as `DashedLine` there,
 *   rotated to vertical.
 *
 * PATTERNS FOLLOWED (same as NeedChangesSheet / CustomerFilterSheet)
 *   - `forwardRef<BottomSheetModal, Props>` so the parent presents
 *     and dismisses imperatively through a ref.
 *   - `BottomSheetBackdrop`, `pressBehavior="close"`, opacity 0.55.
 *   - `handleIndicatorStyle` + `backgroundStyle` give the same
 *     rounded top bar every sheet in the app shares.
 *   - No keyboard props: there is no input here.
 * ------------------------------------------------------------------
 */

import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
} from 'react';
import {
  Image,
  type ImageSourcePropType,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import {
  Bus,
  Info,
  ReceiptIndianRupee,
  Users,
  X,
  type LucideProps,
} from 'lucide-react-native';

import { BrandLockup } from '@shared/components/BrandLockup';
import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';

/* ================================================================
 * Palette
 * ================================================================
 * Carries ops's artwork language into the app's light theme: deep
 * green numbers and headings, a pale green disc behind each icon, a
 * gold rule under each heading, and a lime corner flash. Local to
 * this file — nothing else in the app uses the gold or the lime.
 * ================================================================ */

const DEEP_GREEN = '#1B5E20';
const DISC_BG = '#EAF7EC';
const GOLD = '#FFB300';
const CORNER_FLASH = '#8BC34A';
const NOTE_BG = '#F1FAF2';

/* ================================================================
 * Artwork slots
 * ================================================================ */

/**
 * Bus-and-car illustration beside the title. Null until the asset
 * ships; the header then renders title and subtitle full width,
 * which reads fine on its own.
 *
 * TODO(design): set to
 *   require('@assets/images/booking-process-hero.png')
 */
const HERO_ARTWORK: ImageSourcePropType | null = null;

/* ================================================================
 * Content
 * ================================================================ */

type Step = {
  /** Rendered in the green disc; two digits, as ops writes them. */
  number: string;
  title: string;
  /** The instruction. */
  body: string;
  /** The note inside the pale info box. */
  note: string;
  /** Fallback drawn inside the disc until `artwork` is supplied. */
  Icon: React.ComponentType<LucideProps>;
  /**
   * Ops's own drawing for this step. Null until the assets ship.
   * TODO(design): require('@assets/images/booking-step-1.png') etc.
   */
  artwork: ImageSourcePropType | null;
};

const STEPS: readonly Step[] = [
  {
    number: '01',
    title: 'Select Vehicle',
    body: 'Select the most suitable vehicle from the options above.',
    note: 'If required, take help from our travel experts.',
    Icon: Bus,
    artwork: null,
  },
  {
    number: '02',
    title: 'Pay Advance & Confirm',
    body: 'Pay the booking advance via the payment options above.',
    note: 'Shortly, you will receive a booking confirmation document with a unique Booking ID for your trip.',
    Icon: ReceiptIndianRupee,
    artwork: null,
  },
  {
    number: '03',
    title: 'Enjoy your Trip',
    body: 'Our customer support & operations team will manage your trip end to end from here onwards, along with your travel advisor.',
    note: 'Vehicle & driver details will be provided 1 day before the trip date.',
    Icon: Users,
    artwork: null,
  },
];

/**
 * Tall enough for the header plus the first two steps, so the
 * customer can see the process is three steps long without
 * scrolling, while the quotation stays visible behind — the sheet is
 * a reference, not a destination.
 */
const SNAP_POINTS = ['88%'];

/* ================================================================
 * Geometry
 * ================================================================ */

/**
 * Measured off the approved mockup (879 px artboard / 2.254 = dp):
 *   card 360 dp wide · number circle 31 dp, inset 11 dp from the card's
 *   left edge · icon disc 75 dp · text column 201 dp, i.e. 56% of the
 *   card.
 *
 * The number circle sits INSIDE the card, not straddling its edge.
 * That one decision is what keeps the cards short: an outside circle
 * costs the scroll 42 dp of left padding, which comes straight out of
 * the text column, and a 183 dp column wraps "Pay Advance & Confirm"
 * onto two lines and every body onto four.
 */
const NUMBER_SIZE = 34;
const DISC_SIZE = 60;
/** Gap from the card's left edge to the number circle. */
const NUMBER_INSET = Spacing.md;
/** Card content clears the number circle; the icon disc starts here. */
const CARD_LEFT = NUMBER_INSET + NUMBER_SIZE + Spacing.xs;

/* ================================================================
 * VerticalDashes — the connector between number discs
 * ================================================================
 * A column of short segments. RN's `borderStyle: 'dashed'` is
 * unreliable on a single side on Android, so the app draws dashes as
 * real views (see DashedLine in QuotationTripCard). `overflow:
 * 'hidden'` lets the column be longer than any gap it must fill
 * without the extra dashes showing.
 * ================================================================ */

const DASHES = Array.from({ length: 40 }, (_, i) => i);

const VerticalDashes: React.FC = () => (
  <View style={styles.dashColumn} pointerEvents="none">
    <View style={styles.dashStack}>
      {DASHES.map(i => (
        <View key={i} style={styles.dash} />
      ))}
    </View>
  </View>
);

/* ================================================================
 * Sheet
 * ================================================================ */

type Props = {
  /** Fired when the sheet closes, however it closed. Optional. */
  onClose?: () => void;
};

export const BookingProcessSheet = forwardRef<BottomSheetModal, Props>(
  ({ onClose }, ref) => {
    /* Two refs: `internalRef` drives the sheet; the outer ref is
       bridged so callers can use `.present()` / `.dismiss()`. Same
       bridge as NeedChangesSheet. */
    const internalRef = useRef<BottomSheetModal>(null);
    useImperativeHandle(ref, () => internalRef.current as BottomSheetModal, []);

    const handleSheetChange = useCallback(
      (index: number) => {
        if (index === -1) onClose?.();
      },
      [onClose],
    );

    const onDismissPress = useCallback(() => {
      internalRef.current?.dismiss();
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
        ref={internalRef}
        snapPoints={SNAP_POINTS}
        index={0}
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={styles.handle}
        backgroundStyle={styles.sheetBg}
        enablePanDownToClose
        enableDynamicSizing={false}
        enableOverDrag={false}
        onChange={handleSheetChange}
      >
        {/* ── Brand row. The close button is absolute so the logo
               stays optically centred in the sheet, not centred in
               the space left over beside the button. ── */}
        <View style={styles.brandRow}>
          <BrandLockup width={150} variant="wordmark" />

          <Pressable
            onPress={onDismissPress}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={({ pressed }) => [
              styles.closeBtn,
              pressed && styles.pressed,
            ]}
          >
            <X size={20} color={Colors.textSecondary} strokeWidth={2.6} />
          </Pressable>
        </View>

        {/* ── Title ── */}
        <View style={styles.titleRow}>
          <View style={styles.titleCol}>
            <Text style={styles.title}>Booking Process</Text>
            <Text style={styles.subtitle}>
              Three simple steps from booking to your trip.
            </Text>
          </View>

          {HERO_ARTWORK ? (
            <Image
              source={HERO_ARTWORK}
              style={styles.hero}
              resizeMode="contain"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            />
          ) : null}
        </View>

        <BottomSheetScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {STEPS.map((step, index) => {
            const isLast = index === STEPS.length - 1;
            return (
              <View key={step.number} style={styles.stepWrap}>
                <View style={styles.card}>
                  <View style={styles.cardRow}>
                    {/* Disc holding ops's drawing, or its fallback. */}
                    <View style={styles.disc}>
                      {step.artwork ? (
                        <Image
                          source={step.artwork}
                          style={styles.discArtwork}
                          resizeMode="contain"
                          accessibilityElementsHidden
                          importantForAccessibility="no-hide-descendants"
                        />
                      ) : (
                        <step.Icon
                          size={32}
                          color={Colors.primaryDark}
                          strokeWidth={1.8}
                        />
                      )}
                    </View>

                    <View style={styles.cardDivider} />

                    <View style={styles.cardBody}>
                      <Text style={styles.cardTitle}>{step.title}</Text>
                      <View style={styles.rule} />
                      <Text style={styles.bodyText}>{step.body}</Text>

                      <View style={styles.note}>
                        <Info
                          size={17}
                          color={Colors.primary}
                          strokeWidth={2}
                          style={styles.noteIcon}
                        />
                        <Text style={styles.noteText}>{step.note}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Lime corner flash, bottom-right. A rotated square
                      clipped by the card's own overflow — cheaper
                      than an SVG triangle and it follows the card's
                      corner radius for free. */}
                  <View
                    style={styles.cornerFlash}
                    pointerEvents="none"
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                  />
                </View>

                {/* Connector runs from under this disc into the gap
                    above the next card. Not drawn after the last. */}
                {isLast ? null : <VerticalDashes />}

                {/* Number disc, drawn last so it sits above both the
                    card edge and the dashes. */}
                <View style={styles.numberDisc}>
                  <Text style={styles.numberText}>{step.number}</Text>
                </View>
              </View>
            );
          })}
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  },
);

BookingProcessSheet.displayName = 'BookingProcessSheet';

/* ================================================================
 * Styles
 * ================================================================ */

const styles = StyleSheet.create({
  handle: {
    backgroundColor: Colors.border,
    width: 44,
  },
  sheetBg: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },

  /* ── Brand row ── */
  brandRow: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  closeBtn: {
    position: 'absolute',
    right: Spacing.xl,
    top: Spacing.sm,
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
  },

  /* ── Title ── */
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  titleCol: {
    flex: 1,
  },
  title: {
    ...Typography.h1,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '800',
    color: DEEP_GREEN,
  },
  subtitle: {
    ...Typography.bodySmall,
    marginTop: Spacing.sm,
    lineHeight: 19,
    color: Colors.textSecondary,
  },
  hero: {
    width: 128,
    height: 76,
  },

  /* ── Steps ── */
  scroll: {
    // Narrow gutters: every dp here comes out of the text column, and
    // the text column is what decides how tall the cards get.
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xxxxl,
  },
  stepWrap: {
    position: 'relative',
    marginBottom: Spacing.md,
  },
  card: {
    paddingVertical: Spacing.md + 2,
    paddingRight: Spacing.lg,
    paddingLeft: CARD_LEFT,
    // Leaves ~207 dp for the text column on a 390 dp phone, so each
    // step title fits on one line.
    borderRadius: Radius.xl,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  cardRow: {
    flexDirection: 'row',
    // Top-aligned, not centred: with centring, step 3's long body
    // leaves a tall empty column under the disc and the card grows
    // for nothing.
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  disc: {
    marginTop: Spacing.xs,
    width: DISC_SIZE,
    height: DISC_SIZE,
    borderRadius: Radius.pill,
    backgroundColor: DISC_BG,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  discArtwork: {
    width: DISC_SIZE - Spacing.lg,
    height: DISC_SIZE - Spacing.lg,
  },
  cardDivider: {
    width: StyleSheet.hairlineWidth,
    // Stretches the full row height even though the row is
    // top-aligned.
    alignSelf: 'stretch',
    backgroundColor: Colors.borderLight,
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    ...Typography.subtitle,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '800',
    color: DEEP_GREEN,
  },
  rule: {
    width: 42,
    height: 3,
    borderRadius: Radius.pill,
    backgroundColor: GOLD,
    marginTop: 6,
    marginBottom: Spacing.sm,
  },
  bodyText: {
    ...Typography.bodySmall,
    fontSize: 13.5,
    lineHeight: 19,
    color: Colors.textPrimary,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginTop: 10,
    paddingVertical: Spacing.sm,
    paddingLeft: Spacing.sm + 2,
    // Clears the corner flash so it never sits over the note copy.
    paddingRight: Spacing.lg,
    borderRadius: Radius.md,
    backgroundColor: NOTE_BG,
  },
  noteIcon: {
    marginTop: 1,
  },
  noteText: {
    flex: 1,
    ...Typography.caption,
    fontSize: 11.5,
    lineHeight: 16,
    color: Colors.textSecondary,
  },
  cornerFlash: {
    position: 'absolute',
    right: -28,
    bottom: -28,
    width: 56,
    height: 56,
    borderRadius: Radius.md,
    backgroundColor: CORNER_FLASH,
    transform: [{ rotate: '45deg' }],
  },

  /* ── Number disc + connector ── */
  numberDisc: {
    position: 'absolute',
    left: NUMBER_INSET,
    top: Spacing.lg,
    width: NUMBER_SIZE,
    height: NUMBER_SIZE,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: {
    ...Typography.subtitle,
    fontSize: 13,
    fontWeight: '800',
    color: Colors.surface,
  },
  dashColumn: {
    position: 'absolute',
    // Gap between cards shrank to Spacing.md, so the rail's tail
    // must shrink with it or it would overshoot the next circle.
    // Dead-centre under the circle: inset + half the circle, less
    // half the dash width.
    left: NUMBER_INSET + NUMBER_SIZE / 2 - 1.5,
    // Starts under the circle and runs into the gap below the card,
    // where the next circle picks it up.
    top: Spacing.lg + NUMBER_SIZE + Spacing.xs,
    bottom: -Spacing.md,
    width: 3,
    overflow: 'hidden',
  },
  dashStack: {
    position: 'absolute',
    top: 0,
    left: 0,
    gap: 5,
  },
  dash: {
    width: 3,
    height: 6,
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
});
