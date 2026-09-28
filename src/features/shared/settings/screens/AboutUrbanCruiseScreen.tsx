/* eslint-disable no-void */
/**
 * ------------------------------------------------------------------
 * AboutUrbanCruiseScreen — SHARED, STACK SCREEN
 * ------------------------------------------------------------------
 * Landing screen reached from the "About Urban Cruise" row inside
 * SettingsScreen (Support & Legal section). Replaces the previous
 * in-place Alert-with-version so users get a real, marketing-worthy
 * surface that also carries the app's version/build and a single
 * jumping-off point to the contact hub and legal docs.
 *
 * LAYOUT (top → bottom):
 *   ScreenHeader ("About Urban Cruise" + "Learn more about our app,
 *                 version and company information")
 *   Hero
 *     - Full-width logo image (assets/images/ucwithdesignandtext.png)
 *       renders end-to-end — no rounded tile, no brand text, no
 *       tagline. The logo already contains the wordmark, so any
 *       extra "Urban Cruise" text would be a duplicate.
 *   Primary info card (rounded surface, 1px border)
 *     - About Us          → expands
 *     - Our Services      → expands
 *     - Our Mission       → expands
 *     - Why Choose Us     → expands
 *     - Contact Us        → expands (WhatsApp / Call / Email actions
 *                          pulled from remote AppConfig)
 *   Footer
 *     - "Version <version> (<build>)"
 *     - "© <year> Urban Cruise. All rights reserved."
 *     - "Built for safe, reliable and comfortable travel."
 *
 * ANIMATION:
 *   Row expand/collapse animates the surrounding card height via
 *   react-native-reanimated's `LinearTransition`. LayoutAnimation
 *   is a no-op under the New Architecture (Fabric) and prints a
 *   warning when `setLayoutAnimationEnabledExperimental` is called,
 *   so it is intentionally NOT used here — same reason ToastHost
 *   uses Reanimated for its layout transitions.
 *
 * REGISTRATION:
 *   Wired in the Customer ✅ and UC ✅ stacks (the two role stacks
 *   that also register Settings). Vendor / Driver stacks do NOT
 *   register Settings today — see the SHARED-SCREEN REGISTRATION
 *   STATUS block in `useMoreActions.ts`. When those roles get
 *   Settings, register this route there too — no other change
 *   needed.
 *
 * DESIGN INVARIANTS:
 *   - SafeScreen + ScreenHeader parity with every other stack screen.
 *   - Theme tokens only. Icon fg/bg pairs mirror SettingsScreen's row
 *     palette so the visual language is consistent — same file uses
 *     the same PURPLE_/PINK_ local pair pattern documented there.
 *   - Rows are inline-expandable rather than pushing a new screen
 *     per section: the content is short, static, and reads better
 *     scanned together. The chevron rotates 90° on expand.
 *   - The hero logo spans the full horizontal padding — the ScrollView
 *     paddingHorizontal is neutralised for this element only via a
 *     negative margin so downstream cards keep their gutter.
 * ------------------------------------------------------------------
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import DeviceInfo from 'react-native-device-info';
import {
  ChevronDown,
  FileText,
  Info,
  Mail,
  MessageCircle,
  Phone,
  ShieldCheck,
  Users,
  type LucideProps,
} from 'lucide-react-native';

import { SafeScreen, ScreenHeader } from '@shared/components';
import { Colors, Radius, Spacing, Typography } from '@theme';
import { toast } from '@services/toast';
import { useAppSelector } from '@store/hooks';

/* -----------------------------------------------------------------
 * Local color pair — purple has no theme token yet. Same named
 * module-scope constant pattern used in SettingsScreen /
 * HelpSupportScreen so a future `Colors.purple*` swap is a one-line
 * change.
 * ----------------------------------------------------------------- */

const PURPLE_FG = '#7C3AED';
const PURPLE_BG = '#EDE9FE';
const PINK_FG = '#EC4899';
const PINK_BG = '#FCE7F3';

/* -----------------------------------------------------------------
 * Row model
 * ----------------------------------------------------------------- */

type RowId =
  | 'aboutUs'
  | 'ourServices'
  | 'ourMission'
  | 'whyChooseUs'
  | 'contactUs';

type Row = {
  id: RowId;
  title: string;
  subtitle: string;
  Icon: React.ComponentType<LucideProps>;
  iconFg: string;
  iconBg: string;
  /**
   * Body content shown when the row is expanded. Kept as a paragraph
   * array so bullet-style rendering can layer on later without
   * touching this file's shape.
   */
  body: string[];
};

/* -----------------------------------------------------------------
 * Shared transition preset for the expandable card.
 *
 * springify().damping(20).stiffness(200) mirrors the ToastHost's
 * layout preset so all Reanimated-driven layout transitions in the
 * app feel consistent. Kept at module scope because the preset
 * object is stable and can be reused across every render.
 * ----------------------------------------------------------------- */

const CARD_LAYOUT = LinearTransition.springify().damping(20).stiffness(200);

/* -----------------------------------------------------------------
 * Screen
 * ----------------------------------------------------------------- */

const AboutUrbanCruiseScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { width: screenWidth } = useWindowDimensions();

  // Contact + legal come from remote AppConfig (Ops-owned). Empty-
  // string fallbacks trigger a graceful toast on tap rather than a
  // dud `Linking.openURL('')`.
  const support = useAppSelector(s => s.app.appConfig?.support);

  const [openId, setOpenId] = useState<RowId | null>(null);

  // Bottom pad accommodates the footer text + home indicator.
  const bottomPad = Math.max(insets.bottom, Spacing.lg) + Spacing.lg;

  /* -------- Static content --------
   *
   * Declared inside the component so icon fg/bg pairs read against
   * Colors in scope. The array reference isn't stable across renders
   * but the list length + content are, so React reconciles cleanly. */
  const ROWS: readonly Row[] = useMemo(
    () => [
      {
        id: 'aboutUs',
        title: 'About Us',
        subtitle: 'Know more about Urban Cruise',
        Icon: Info,
        iconFg: Colors.info,
        iconBg: Colors.infoTint,
        body: [
          'Urban Cruise is a modern travel and mobility platform built to make road journeys simple, safe and reliable for everyone — from personal trips and family holidays to corporate travel and large group tours.',
          'We work with a curated network of vendors, drivers and vehicles, coordinated by our in-house operations team, so every ride you book is backed by real people and clear accountability from booking to drop-off.',
        ],
      },
      {
        id: 'ourServices',
        title: 'Our Services',
        subtitle: 'Explore the services we offer',
        Icon: FileText,
        iconFg: Colors.primary,
        iconBg: Colors.primaryTint,
        body: [
          'One-way rides, round trips, airport transfers and multi-day outstation journeys across our service cities.',
          'Corporate travel programmes, agent and tour-operator partnerships, and dedicated wedding, event and pilgrimage packages.',
          'Live trip tracking, transparent fare estimates, and a single support channel for changes, escalations and invoices.',
        ],
      },
      {
        id: 'ourMission',
        title: 'Our Mission',
        subtitle: 'Our vision and commitment',
        Icon: Users,
        iconFg: Colors.accent,
        iconBg: Colors.accentTint,
        body: [
          'To make every journey feel effortless — a ride you can book in a minute, trust in the moment, and remember for the destination and not the trouble it took to get there.',
          'We commit to fair pricing for travellers, fair earnings for vendors and drivers, and clear communication for both — on time, every time.',
        ],
      },
      {
        id: 'whyChooseUs',
        title: 'Why Choose Us',
        subtitle: 'What makes Urban Cruise different',
        Icon: ShieldCheck,
        iconFg: PURPLE_FG,
        iconBg: PURPLE_BG,
        body: [
          'Verified vendors and drivers — every partner on the platform passes documentation, vehicle and background checks before their first assignment.',
          'Transparent quotations — see the breakup, choose your vehicle tier, and confirm without hidden surprises.',
          'Human support — real people on WhatsApp, phone and email, not a maze of menus.',
          'Built for India — city coverage, GST invoicing and regional-language support baked in from day one.',
        ],
      },
      {
        id: 'contactUs',
        title: 'Contact Us',
        subtitle: 'Get in touch with our team',
        Icon: Mail,
        iconFg: PINK_FG,
        iconBg: PINK_BG,
        // Contact row's body is rendered as a special "actions" block
        // (see ExpandedBody below) — this text is a fallback used
        // when the AppConfig support block hasn't loaded yet.
        body: [
          'We are available 24 × 7 for booking assistance, live trip help and anything else you need. Reach us on WhatsApp, phone or email using the buttons below.',
        ],
      },
    ],
    [],
  );

  /* -------- Handlers -------- */

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
  }, [navigation]);

  const toggleRow = useCallback((id: RowId) => {
    // No LayoutAnimation call — Reanimated's LinearTransition on the
    // wrapping Animated.View animates the height change for us,
    // Fabric-compatible and without the New Architecture no-op warning.
    setOpenId(prev => (prev === id ? null : id));
  }, []);

  const openTel = useCallback((phone: string | undefined) => {
    if (!phone) {
      toast.info('Not available', {
        description: 'Phone support details will be available shortly.',
      });
      return;
    }
    void Linking.openURL(`tel:${phone}`).catch(() => {
      toast.error("Couldn't start the call", {
        description: 'Please dial from your phone app.',
      });
    });
  }, []);

  const openWhatsApp = useCallback((waNumber: string | undefined) => {
    if (!waNumber) {
      toast.info('Not available', {
        description: 'WhatsApp support details will be available shortly.',
      });
      return;
    }
    // wa.me expects the number without a leading `+` — matches the
    // shape stored in AppConfig.support.whatsapp.
    void Linking.openURL(`https://wa.me/${waNumber}`).catch(() => {
      toast.error("Couldn't open WhatsApp", {
        description: 'Please try again in a moment.',
      });
    });
  }, []);

  const openEmail = useCallback((email: string | undefined) => {
    if (!email) {
      toast.info('Not available', {
        description: 'Email support details will be available shortly.',
      });
      return;
    }
    void Linking.openURL(`mailto:${email}`).catch(() => {
      toast.error("Couldn't open your mail app", {
        description: 'Please try again in a moment.',
      });
    });
  }, []);

  /* -------- Render -------- */

  const appVersion = DeviceInfo.getVersion();
  const buildNumber = DeviceInfo.getBuildNumber();
  const year = new Date().getFullYear();

  return (
    <SafeScreen edges={['top']} backgroundColor={Colors.backgroundSecondary}>
      <View style={styles.headerWrap}>
        <ScreenHeader
          title="About Urban Cruise"
          subtitle="Learn more about our app, version and company information"
          onBack={handleBack}
        />
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
      >
        {/* -------- Hero: full-width logo image --------
         *
         * The image is pulled to the ScrollView's edges using a
         * negative horizontal margin equal to the ScrollView pad,
         * and its width is pinned to the screen width. Height is a
         * fixed proportion of the screen width so the layout is
         * stable before the image resolves. resizeMode="contain"
         * keeps the source aspect ratio; the logo already carries
         * the wordmark, so no separate "Urban Cruise" text renders.
         */}
        <View style={styles.heroWrap}>
          <Image
            source={require('@assets/images/ucwithdesignandtext.png')}
            style={{ width: screenWidth, height: screenWidth * 0.85 }}
            resizeMode="contain"
            accessible
            accessibilityLabel="Urban Cruise logo"
          />
        </View>

        {/* -------- Primary info card --------
         *
         * Wrapped in an Animated.View so the height change when a row
         * opens or closes is smoothly interpolated. `layout` on the
         * container drives all descendants' repositioning too, so we
         * don't need to spring each row individually. */}
        <Animated.View layout={CARD_LAYOUT} style={styles.card}>
          {ROWS.map((row, idx) => {
            const isOpen = openId === row.id;
            return (
              <React.Fragment key={row.id}>
                <RowItem
                  row={row}
                  isOpen={isOpen}
                  onPress={() => toggleRow(row.id)}
                />
                {isOpen ? (
                  <ExpandedBody
                    row={row}
                    onWhatsApp={() => openWhatsApp(support?.whatsapp)}
                    onCall={() => openTel(support?.phone)}
                    onEmail={() => openEmail(support?.email)}
                  />
                ) : null}
                {idx < ROWS.length - 1 ? (
                  <View style={styles.rowDivider} />
                ) : null}
              </React.Fragment>
            );
          })}
        </Animated.View>

        {/* -------- Footer --------
         *
         * Version now lives ABOVE the copyright line (per design
         * update) — the hero no longer prints it. Order matters:
         *   1. divider
         *   2. Version + build
         *   3. © line
         *   4. tagline
         */}
        <View style={styles.footer}>
          <View style={styles.footerDivider} />
          <Text style={styles.footerVersion}>
            Version {appVersion}
            {buildNumber ? ` (${buildNumber})` : ''}
          </Text>
          <Text style={styles.footerLine}>
            © {year} Urban Cruise. All rights reserved.
          </Text>
          <Text style={styles.footerLine}>
            Built for safe, reliable and comfortable travel.
          </Text>
        </View>
      </ScrollView>
    </SafeScreen>
  );
};

export default AboutUrbanCruiseScreen;

/* =================================================================
 * Local subcomponents
 * ================================================================= */

const RowItem: React.FC<{
  row: Row;
  isOpen: boolean;
  onPress: () => void;
}> = ({ row, isOpen, onPress }) => {
  const Icon = row.Icon;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${row.title}. ${row.subtitle}`}
      accessibilityState={{ expanded: isOpen }}
    >
      <View style={[styles.rowIconTile, { backgroundColor: row.iconBg }]}>
        <Icon size={20} color={row.iconFg} strokeWidth={2.25} />
      </View>
      <View style={styles.rowTextCol}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {row.title}
        </Text>
        <Text style={styles.rowSubtitle} numberOfLines={2}>
          {row.subtitle}
        </Text>
      </View>
      {/* Chevron rotates 90° down when the row is open. Reanimated's
          card `layout` transition handles the surrounding height
          change; the chevron flip itself is a plain style toggle. */}
      <View style={[styles.chevronBox, isOpen && styles.chevronBoxOpen]}>
        <ChevronDown size={20} color={Colors.textTertiary} strokeWidth={2.25} />
      </View>
    </Pressable>
  );
};

/**
 * ExpandedBody
 * -----------------------------------------------------------------
 * Rendered directly under an open row, still inside the same card
 * so the border and divider system continues cleanly. For the
 * `contactUs` row we render three action buttons (WhatsApp / Call
 * / Email) instead of paragraph text — the point of that row is to
 * DO something, not to READ.
 */
const ExpandedBody: React.FC<{
  row: Row;
  onWhatsApp: () => void;
  onCall: () => void;
  onEmail: () => void;
}> = ({ row, onWhatsApp, onCall, onEmail }) => {
  if (row.id === 'contactUs') {
    return (
      <View style={styles.expandedBox}>
        {row.body.map((p, i) => (
          <Text key={i} style={styles.expandedPara}>
            {p}
          </Text>
        ))}
        <View style={styles.contactActions}>
          <ContactBtn
            Icon={MessageCircle}
            label="WhatsApp"
            fg={Colors.primary}
            bg={Colors.primaryTint}
            onPress={onWhatsApp}
          />
          <ContactBtn
            Icon={Phone}
            label="Call"
            fg={Colors.info}
            bg={Colors.infoTint}
            onPress={onCall}
          />
          <ContactBtn
            Icon={Mail}
            label="Email"
            fg={Colors.accent}
            bg={Colors.accentTint}
            onPress={onEmail}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.expandedBox}>
      {row.body.map((p, i) => (
        <Text key={i} style={styles.expandedPara}>
          {p}
        </Text>
      ))}
    </View>
  );
};

const ContactBtn: React.FC<{
  Icon: React.ComponentType<LucideProps>;
  label: string;
  fg: string;
  bg: string;
  onPress: () => void;
}> = ({ Icon, label, fg, bg, onPress }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      styles.contactBtn,
      { backgroundColor: bg },
      pressed && styles.pressed,
    ]}
    accessibilityRole="button"
    accessibilityLabel={label}
  >
    <Icon size={18} color={fg} strokeWidth={2.25} />
    <Text style={[styles.contactBtnLabel, { color: fg }]}>{label}</Text>
  </Pressable>
);

/* =================================================================
 * Styles
 * ================================================================= */

const styles = StyleSheet.create({
  flex: { flex: 1 },

  headerWrap: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },

  scroll: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
  },

  /* ---- Hero: full-width logo ----
   *
   * The wrapper cancels the ScrollView's Spacing.lg horizontal pad
   * with a negative margin, so the image can go edge-to-edge without
   * changing the pad for downstream siblings. alignItems centers
   * the (contain-fitted) image within the wrapper. */
  heroWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: -Spacing.lg,
    marginTop: -80,
    marginBottom: -50,
  },

  /* ---- Primary card ---- */
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  rowIconTile: {
    width: 40,
    height: 40,
    borderRadius: Radius.circle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTextCol: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '800',
  },
  rowSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  rowDivider: {
    height: 1,
    marginLeft: Spacing.md + 40 + Spacing.md, // align under text column
    backgroundColor: Colors.borderLight,
  },
  chevronBox: {
    transform: [{ rotate: '0deg' }],
  },
  chevronBoxOpen: {
    transform: [{ rotate: '180deg' }],
  },

  /* ---- Expanded body ---- */
  expandedBox: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    paddingLeft: Spacing.md + 40 + Spacing.md, // align with row text col
    gap: Spacing.sm,
  },
  expandedPara: {
    ...Typography.body,
    color: Colors.textSecondary,
    lineHeight: 20,
  },

  /* ---- Contact actions ---- */
  contactActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
    marginLeft: -(Spacing.md + 40 + Spacing.md - Spacing.md),
    // ^ the parent expandedBox left-pads by the icon column so the
    //   paragraph text aligns with the row title; the action tiles
    //   look better spanning the full card width, so we cancel that
    //   pad here.
  },
  contactBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
    gap: 4,
  },
  contactBtnLabel: {
    ...Typography.body,
    fontWeight: '800',
  },

  /* ---- Footer ---- */
  footer: {
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.md,
  },
  footerDivider: {
    alignSelf: 'stretch',
    height: 1,
    backgroundColor: Colors.borderLight,
    marginBottom: Spacing.md,
  },
  footerVersion: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  footerLine: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  pressed: {
    opacity: 0.85,
  },
});
